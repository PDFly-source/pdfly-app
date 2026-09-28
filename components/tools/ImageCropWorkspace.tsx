'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { useRevokeOnUnmount } from '@/lib/use-revoke-on-unmount';
import { formatBytes } from '@/lib/pdf-engine';
import { addRecentJob } from '@/lib/recent-jobs';
import { loadImage, assertDecodedSize, cropLoadedImage, extensionForFormat, type ImageOutputFormat } from '@/lib/image-engine';
import { ASPECT_PRESETS, rectFromAspect, clampCropRect, cropOutputSize, type Rect } from '@/lib/image-geometry';
import {
  Crop as CropIcon,
  RefreshCw,
  AlertTriangle,
  Download,
  ShieldCheck,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

/**
 * Advanced Crop Studio — interactive crop with zoom/pan/rotate/flip,
 * exported from the actual pixels (never a CSS crop).
 * PRIVATE. POWERFUL. LOCAL.
 *
 * Implementation notes:
 * - The image is drawn into a preview canvas at display scale; the crop
 *   rectangle lives in IMAGE pixel space and is mapped 1:1 for export.
 * - Pointer Events unify mouse + touch (drag crop, resize handles, pan).
 */

type Handle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e';

interface DragState {
  kind: 'move' | 'resize' | 'pan';
  handle?: Handle;
  startX: number;
  startY: number;
  startRect: Rect;
  startPanX: number;
  startPanY: number;
}

const MIN_CROP = 32; // preview px; clamped to >= 8 image px at export

export const ImageCropWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [img, setImg] = useState<{ width: number; height: number } | null>(null);
  const loadedRef = useRef<Awaited<ReturnType<typeof loadImage>> | null>(null);

  const [ratio, setRatio] = useState<number | null>(null); // null = free
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  const [rotation, setRotation] = useState(0); // quarter turns
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // viewport state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const [format, setFormat] = useState<ImageOutputFormat>('image/png');
  const [quality, setQuality] = useState(0.92);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultInfo, setResultInfo] = useState<{ bytes: number; dims: { width: number; height: number }; name: string } | null>(null);
  useRevokeOnUnmount(resultUrl);

  // ------------------------------------------------------------------
  // File loading
  // ------------------------------------------------------------------

  const reset = () => {
    loadedRef.current?.dispose();
    loadedRef.current = null;
    setFile(null);
    setImg(null);
    setRect({ x: 0, y: 0, width: 0, height: 0 });
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setErrorMessage(null);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setResultInfo(null);
  };

  const handleFiles = async (files: File[]) => {
    if (!files?.length) return;
    reset();
    const f = files[0];
    try {
      const loaded = await loadImage(f);
      assertDecodedSize(loaded.width, loaded.height);
      loadedRef.current = loaded;
      setFile(f);
      setImg({ width: loaded.width, height: loaded.height });
      setRect(rectFromAspect({ width: loaded.width, height: loaded.height }, ratio));
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  };

  /** Apply a ratio preset and re-seed a centered max crop. */
  const applyRatio = (r: number | null) => {
    setRatio(r);
    if (img) setRect(rectFromAspect(img, r));
  };

  // ------------------------------------------------------------------
  // Viewport geometry
  // ------------------------------------------------------------------

  // displayed image size (CSS px) inside the fixed-height container
  const view = (() => {
    if (!img || containerSize.w === 0) return { scale: 1, x: 0, y: 0, w: 0, h: 0 };
    const baseScale = Math.min(containerSize.w / img.width, containerSize.h / img.height);
    const scale = baseScale * zoom;
    const w = img.width * scale;
    const h = img.height * scale;
    // center + pan
    const x = (containerSize.w - w) / 2 + pan.x;
    const y = (containerSize.h - h) / 2 + pan.y;
    return { scale, x, y, w, h };
  })();

  // observe container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const box = entries[0].contentRect;
      setContainerSize({ w: box.width, h: box.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [file]);

  // ------------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    const src = loadedRef.current;
    if (!canvas || !src || !containerSize.w) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(containerSize.w * dpr);
    canvas.height = Math.round(containerSize.h * dpr);
    canvas.style.width = `${containerSize.w}px`;
    canvas.style.height = `${containerSize.h}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, containerSize.w, containerSize.h);

    // image
    ctx.save();
    ctx.imageSmoothingQuality = 'high';
    const cx = view.x + view.w / 2;
    const cy = view.y + view.h / 2;
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 2);
    if (flipH) ctx.scale(-1, 1);
    if (flipV) ctx.scale(1, -1);
    ctx.drawImage(src.source, -view.w / 2, -view.h / 2, view.w, view.h);
    ctx.restore();

    // dark overlay outside crop
    ctx.save();
    ctx.fillStyle = 'rgba(10, 8, 9, 0.62)';
    const rx = view.x + rect.x * view.scale;
    const ry = view.y + rect.y * view.scale;
    const rw = rect.width * view.scale;
    const rh = rect.height * view.scale;
    ctx.beginPath();
    ctx.rect(0, 0, containerSize.w, containerSize.h);
    ctx.rect(rx, ry, rw, rh);
    ctx.fill('evenodd');
    // crop border + rule-of-thirds guides
    ctx.strokeStyle = 'rgba(198, 161, 91, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.strokeStyle = 'rgba(198, 161, 91, 0.35)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(rx + (rw / 3) * i, ry);
      ctx.lineTo(rx + (rw / 3) * i, ry + rh);
      ctx.moveTo(rx, ry + (rh / 3) * i);
      ctx.lineTo(rx + rw, ry + (rh / 3) * i);
      ctx.stroke();
    }
    // handles
    const hs = 10;
    ctx.fillStyle = 'rgba(247, 241, 232, 0.95)';
    ctx.strokeStyle = 'rgba(29, 24, 26, 0.9)';
    const pts: [number, number][] = [
      [rx, ry], [rx + rw, ry], [rx, ry + rh], [rx + rw, ry + rh],
      [rx + rw / 2, ry], [rx + rw / 2, ry + rh], [rx, ry + rh / 2], [rx + rw, ry + rh / 2],
    ];
    for (const [px, py] of pts) {
      ctx.fillRect(px - hs / 2, py - hs / 2, hs, hs);
      ctx.strokeRect(px - hs / 2, py - hs / 2, hs, hs);
    }
    ctx.restore();
  }, [view, rect, rotation, flipH, flipV, containerSize]);

  // ------------------------------------------------------------------
  // Pointer interaction (mouse + touch unified)
  // ------------------------------------------------------------------

  const toImagePt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (clientX - bounds.left - view.x) / view.scale,
      y: (clientY - bounds.top - view.y) / view.scale,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!img) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toImagePt(e.clientX, e.clientY);
    const near = (hx: number, hy: number) => Math.hypot(p.x - hx, p.y - hy) < 18 / view.scale;
    const rx = rect.x, ry = rect.y, rEdge = rect.x + rect.width, bEdge = rect.y + rect.height;
    const mx = rect.x + rect.width / 2, my = rect.y + rect.height / 2;

    let handle: Handle | null = null;
    if (near(rx, ry)) handle = 'nw';
    else if (near(rEdge, ry)) handle = 'ne';
    else if (near(rx, bEdge)) handle = 'sw';
    else if (near(rEdge, bEdge)) handle = 'se';
    else if (near(mx, ry)) handle = 'n';
    else if (near(mx, bEdge)) handle = 's';
    else if (near(rx, my)) handle = 'w';
    else if (near(rEdge, my)) handle = 'e';

    const inside = p.x >= rx && p.x <= rEdge && p.y >= ry && p.y <= bEdge;

    if (handle) {
      dragRef.current = { kind: 'resize', handle, startX: p.x, startY: p.y, startRect: { ...rect }, startPanX: pan.x, startPanY: pan.y };
    } else if (inside) {
      dragRef.current = { kind: 'move', startX: p.x, startY: p.y, startRect: { ...rect }, startPanX: pan.x, startPanY: pan.y };
    } else {
      dragRef.current = { kind: 'pan', startX: e.clientX, startY: e.clientY, startRect: { ...rect }, startPanX: pan.x, startPanY: pan.y };
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || !img) return;
    const p = toImagePt(e.clientX, e.clientY);
    const dx = p.x - drag.startX;
    const dy = p.y - drag.startY;

    if (drag.kind === 'pan') {
      setPan({ x: drag.startPanX + (e.clientX - drag.startX), y: drag.startPanY + (e.clientY - drag.startY) });
      return;
    }

    if (drag.kind === 'move') {
      let next: Rect = {
        x: drag.startRect.x + dx,
        y: drag.startRect.y + dy,
        width: drag.startRect.width,
        height: drag.startRect.height,
      };
      // clamp inside image
      next = clampCropRect(next, img, 1);
      setRect(next);
      return;
    }

    // resize
    const h = drag.handle!;
    let x = drag.startRect.x;
    let y = drag.startRect.y;
    let w = drag.startRect.width;
    let hh = drag.startRect.height;
    const aspect = ratio ?? null;

    if (h.includes('w')) { x = drag.startRect.x + dx; w = drag.startRect.width - dx; }
    if (h.includes('e')) { w = drag.startRect.width + dx; }
    if (h.includes('n')) { y = drag.startRect.y + dy; hh = drag.startRect.height - dy; }
    if (h.includes('s')) { hh = drag.startRect.height + dy; }

    if (aspect) {
      // keep ratio: derive height from width (or width from height for n/s)
      if (h === 'n' || h === 's') {
        w = hh / aspect;
        if (h === 'n') x = drag.startRect.x + (drag.startRect.width - w) / 2;
      } else {
        hh = w * aspect;
        if (h === 'w' || h === 'e') y = drag.startRect.y + (drag.startRect.height - hh) / 2;
      }
    }

    setRect(clampCropRect({ x, y, width: w, height: hh }, img, MIN_CROP));
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag && img && drag.kind === 'resize') {
      // snap final rect to the enforced ratio if one is selected
      if (ratio != null) {
        const w = rect.width;
        setRect(clampCropRect({ ...rect, height: Math.round(w / ratio) }, img, MIN_CROP));
      }
    }
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!img) return;
    e.preventDefault();
    applyZoom(zoom * (e.deltaY < 0 ? 1.12 : 0.89));
  };

  const applyZoom = (next: number) => {
    const z = Math.max(1, Math.min(6, next));
    setZoom(z);
    if (z === 1) setPan({ x: 0, y: 0 });
  };

  // ------------------------------------------------------------------
  // Export
  // ------------------------------------------------------------------

  const handleExport = async () => {
    if (!file || !loadedRef.current || !img) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const exportRect = clampCropRect(rect, img, 8);
      const { blob, output } = await cropLoadedImage(
        loadedRef.current,
        { rect: exportRect, rotationQuarterTurns: rotation, flipH, flipV },
        format,
        quality
      );
      const name = `${file.name.replace(/\.[^.]+$/, '')}-crop${extensionForFormat(format)}`;
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultInfo({ bytes: blob.size, dims: output, name });
      addRecentJob({
        toolId: 'image-crop',
        toolName: 'Advanced Crop Studio',
        fileName: name,
        fileSize: blob.size,
        status: 'completed',
      });
    } catch (err) {
      setErrorMessage((err as Error).message || 'Export failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const outSize = img ? cropOutputSize(rect, rotation) : null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        Processed locally in your browser. Images never leave your device.
      </p>

      {!file && (
        <FileDropzone
          onFilesSelected={handleFiles}
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          label="Drop an image here"
          sublabel="JPG, PNG, or WebP — cropped with real pixel accuracy on your device"
        />
      )}

      {file && img && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div className="min-w-0">
              <p className="truncate font-bold text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground">{img.width}×{img.height} px · {formatBytes(file.size)}</p>
            </div>
            <button onClick={reset} className="shrink-0 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-accent min-h-[44px]">
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> New image
            </button>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => { setRotation((r) => (r + 1) % 4); setPan({ x: 0, y: 0 }); applyZoom(1); }}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-accent min-h-[44px]"
                aria-label="Rotate 90 degrees clockwise"
              >
                <RotateCw className="h-4 w-4" aria-hidden="true" /> Rotate 90°
              </button>
              <button
                onClick={() => setFlipH((v) => !v)}
                aria-pressed={flipH}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-accent min-h-[44px] ${flipH ? 'text-primary' : ''}`}
                aria-label="Flip horizontally"
              >
                <FlipHorizontal className="h-4 w-4" aria-hidden="true" /> Flip H
              </button>
              <button
                onClick={() => setFlipV((v) => !v)}
                aria-pressed={flipV}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-accent min-h-[44px] ${flipV ? 'text-primary' : ''}`}
                aria-label="Flip vertically"
              >
                <FlipVertical className="h-4 w-4" aria-hidden="true" /> Flip V
              </button>
              <span className="grow" />
              <button
                onClick={() => applyZoom(zoom - 0.25)}
                className="inline-flex items-center rounded-lg border px-2.5 py-2 hover:bg-accent min-h-[44px]"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="text-xs font-semibold tabular-nums" aria-live="polite">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => applyZoom(zoom + 0.25)}
                className="inline-flex items-center rounded-lg border px-2.5 py-2 hover:bg-accent min-h-[44px]"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div
              ref={containerRef}
              className="relative w-full h-[320px] sm:h-[420px] rounded-lg bg-[#0a0809] overflow-hidden touch-none select-none"
              role="application"
              aria-label="Crop editor. Drag to move the crop area, drag handles to resize, drag outside to pan."
            >
              <canvas
                ref={canvasRef}
                className="absolute inset-0 cursor-move"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onWheel={onWheel}
              />
            </div>

            <p className="text-[11px] text-muted-foreground">
              Crop: {Math.round(rect.width)}×{Math.round(rect.height)} px → export {outSize ? `${outSize.width}×${outSize.height}` : '—'} px (after rotation). Works with touch: one finger drags, handles resize, outside pans.
            </p>

            <div className="flex flex-wrap gap-2" role="group" aria-label="Aspect ratio">
              {ASPECT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyRatio(p.ratio)}
                  aria-pressed={ratio === p.ratio}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${ratio === p.ratio ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => { setRect(rectFromAspect(img, ratio)); applyZoom(1); }}
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
              >
                Reset crop
              </button>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-4">
            <p className="text-sm font-bold">Export</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Export format">
              {([
                { id: 'image/png', label: 'PNG' },
                { id: 'image/jpeg', label: 'JPG' },
                { id: 'image/webp', label: 'WebP' },
              ] as const).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  aria-pressed={format === f.id}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${format === f.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {format !== 'image/png' && (
              <label className="text-xs font-semibold text-muted-foreground space-y-1 block">
                Quality: {Math.round(quality * 100)}%
                <input
                  type="range" min="40" max="100" step="2" value={Math.round(quality * 100)}
                  onChange={(e) => setQuality(Number(e.target.value) / 100)}
                  className="w-full accent-[#6D1F35]" aria-label="Export quality"
                />
              </label>
            )}
            <button
              onClick={handleExport}
              disabled={isProcessing}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[48px]"
            >
              <Download className="h-4 w-4" aria-hidden="true" /> Export crop
            </button>
            {resultUrl && resultInfo && (
              <div className="space-y-3" role="status">
                <img
                  src={resultUrl}
                  alt="Cropped result"
                  className="w-full max-w-md mx-auto rounded-lg border bg-card"
                />
                <p className="text-xs text-muted-foreground text-center">
                  {resultInfo.dims.width}×{resultInfo.dims.height} px · {formatBytes(resultInfo.bytes)} — real pixels, exported locally.
                </p>
                <a
                  href={resultUrl}
                  download={resultInfo.name}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 min-h-[48px]"
                >
                  <Download className="h-4 w-4" aria-hidden="true" /> Save {resultInfo.name}
                </a>
              </div>
            )}
          </div>

          {errorMessage && (
            <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}
        </>
      )}

      <ProcessingModal isOpen={isProcessing} stepName="Building crop from real pixels…" percentage={isProcessing ? 60 : 0} />
    </div>
  );
};
