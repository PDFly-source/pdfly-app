'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { useRevokeOnUnmount } from '@/lib/use-revoke-on-unmount';
import { formatBytes, triggerDownload } from '@/lib/pdf-engine';
import { addRecentJob } from '@/lib/recent-jobs';
import {
  loadImage,
  assertDecodedSize,
  makeCanvas,
  encodeCanvas,
  extensionForFormat,
  drawTextWatermark,
  drawImageWatermark,
  pixelateRegion,
  blurRegion,
  highlightRegion,
  type ImageOutputFormat,
} from '@/lib/image-engine';
import {
  WATERMARK_POSITIONS,
  type WatermarkPositionId,
  type Rect,
} from '@/lib/image-geometry';
import {
  Stamp,
  RefreshCw,
  AlertTriangle,
  Download,
  ShieldCheck,
  Type,
  ArrowUpRight,
  Square,
  Circle,
  Highlighter,
  Droplets,
  Grid3x3,
  PenLine,
  MousePointer2,
  Undo2,
  Trash2,
  UploadCloud,
} from 'lucide-react';

/**
 * Watermark & Annotation Studio — every edit is rendered into the exported
 * pixels (no fake overlays). Annotations live in IMAGE-pixel coordinates so
 * preview and export match exactly.
 *
 * PRIVATE. POWERFUL. LOCAL.
 */

type ToolId = 'select' | 'text' | 'arrow' | 'rect' | 'circle' | 'highlight' | 'blur' | 'pixelate' | 'pen';

type Shape =
  | { kind: 'text'; x: number; y: number; text: string; sizePct: number; color: string }
  | { kind: 'arrow' | 'rect' | 'circle'; x: number; y: number; w: number; h: number; color: string; stroke: number }
  | { kind: 'highlight'; x: number; y: number; w: number; h: number; color: string }
  | { kind: 'blur' | 'pixelate'; x: number; y: number; w: number; h: number; strength: number }
  | { kind: 'pen'; pts: { x: number; y: number }[]; color: string; stroke: number };

const TOOLS: { id: ToolId; label: string; icon: React.ElementType; drag: boolean }[] = [
  { id: 'select', label: 'Select', icon: MousePointer2, drag: false },
  { id: 'text', label: 'Text', icon: Type, drag: false },
  { id: 'arrow', label: 'Arrow', icon: ArrowUpRight, drag: true },
  { id: 'rect', label: 'Rectangle', icon: Square, drag: true },
  { id: 'circle', label: 'Circle', icon: Circle, drag: true },
  { id: 'highlight', label: 'Highlight', icon: Highlighter, drag: true },
  { id: 'blur', label: 'Blur', icon: Droplets, drag: true },
  { id: 'pixelate', label: 'Pixelate', icon: Grid3x3, drag: true },
  { id: 'pen', label: 'Pen', icon: PenLine, drag: false },
];

const MIN_SIZE = 4;

/** Shapes that occupy a rectangle in image-pixel space. */
type RectShape = Extract<Shape, { kind: 'arrow' | 'rect' | 'circle' | 'highlight' | 'blur' | 'pixelate' }>;

export const ImageWatermarkWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [img, setImg] = useState<{ width: number; height: number } | null>(null);
  const loadedRef = useRef<Awaited<ReturnType<typeof loadImage>> | null>(null);
  const logoRef = useRef<{ source: CanvasImageSource; width: number; height: number } | null>(null);

  const [shapes, setShapes] = useState<Shape[]>([]);
  const [tool, setTool] = useState<ToolId>('select');
  const [penColor, setPenColor] = useState('#C6A15B');
  const [penWidth, setPenWidth] = useState(3);

  // text watermark
  const [wmText, setWmText] = useState('© PDFMiniFly');
  const [wmEnabled, setWmEnabled] = useState(false);
  const [wmTiled, setWmTiled] = useState(false);
  const [wmSize, setWmSize] = useState(4);
  const [wmOpacity, setWmOpacity] = useState(0.45);
  const [wmRotation, setWmRotation] = useState(-30);
  const [wmColor, setWmColor] = useState('#C6A15B');
  const [wmPosition, setWmPosition] = useState<WatermarkPositionId>('bottom-right');

  // logo watermark
  const [logoEnabled, setLogoEnabled] = useState(false);
  const [logoName, setLogoName] = useState<string | null>(null);
  const [logoReady, setLogoReady] = useState(false);
  const [logoScale, setLogoScale] = useState(18);
  const [logoOpacity, setLogoOpacity] = useState(0.9);
  const [logoRotation, setLogoRotation] = useState(0);
  const [logoPosition, setLogoPosition] = useState<WatermarkPositionId>('bottom-right');

  const [format, setFormat] = useState<ImageOutputFormat>('image/png');
  const [quality, setQuality] = useState(0.92);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultInfo, setResultInfo] = useState<{ blob: Blob; bytes: number; name: string } | null>(null);
  useRevokeOnUnmount(resultUrl);

  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; kind: ToolId; pts?: { x: number; y: number }[]; current?: RectShape } | null>(null);

  // ------------------------------------------------------------------
  // File handling
  // ------------------------------------------------------------------

  const reset = () => {
    loadedRef.current?.dispose();
    loadedRef.current = null;
    logoRef.current = null;
    setFile(null);
    setImg(null);
    setShapes([]);
    setLogoEnabled(false);
    setLogoName(null);
    setLogoReady(false);
    setErrorMessage(null);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setResultInfo(null);
  };

  const handleFiles = async (files: File[]) => {
    if (!files?.length) return;
    reset();
    try {
      const loaded = await loadImage(files[0]);
      assertDecodedSize(loaded.width, loaded.height);
      loadedRef.current = loaded;
      setFile(files[0]);
      setImg({ width: loaded.width, height: loaded.height });
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  };

  const handleLogo = async (files: File[]) => {
    if (!files?.length) return;
    try {
      const logo = await loadImage(files[0]);
      logoRef.current = { source: logo.source, width: logo.width, height: logo.height };
      setLogoName(files[0].name);
      setLogoReady(true);
      setLogoEnabled(true);
    } catch (err) {
      setErrorMessage(`Logo could not be loaded: ${(err as Error).message}`);
    }
  };

  // ------------------------------------------------------------------
  // Scene rendering (shared by preview + export)
  // ------------------------------------------------------------------

  const renderScene = useCallback(
    (ctx: CanvasRenderingContext2D, scale: number) => {
      const src = loadedRef.current;
      if (!src || !img) return;
      ctx.clearRect(0, 0, img.width * scale, img.height * scale);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(src.source, 0, 0, img.width * scale, img.height * scale);

      const rectOf = (s: RectShape): Rect => ({
        x: Math.min(s.x, s.x + s.w) * scale,
        y: Math.min(s.y, s.y + s.h) * scale,
        width: Math.abs(s.w) * scale,
        height: Math.abs(s.h) * scale,
      });

      // 1. destructive effects first (they modify the drawn image)
      for (const s of shapes) {
        if (s.kind === 'blur') {
          blurRegion(ctx, rectOf(s), Math.max(2, s.strength * scale));
        } else if (s.kind === 'pixelate') {
          pixelateRegion(ctx, rectOf(s), Math.max(4, Math.round(s.strength * scale)));
        }
      }
      // 2. semi-destructive highlight
      for (const s of shapes) {
        if (s.kind !== 'highlight') continue;
        highlightRegion(ctx, rectOf(s), s.color, 0.45);
      }
      // 3. vector shapes + text + pen
      for (const s of shapes) {
        ctx.save();
        if (s.kind === 'arrow') {
          const x1 = s.x * scale, y1 = s.y * scale, x2 = (s.x + s.w) * scale, y2 = (s.y + s.h) * scale;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.stroke * scale;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          // arrowhead
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const hl = 12 * scale + s.stroke * scale * 3;
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(x2 - hl * Math.cos(angle - Math.PI / 7), y2 - hl * Math.sin(angle - Math.PI / 7));
          ctx.moveTo(x2, y2);
          ctx.lineTo(x2 - hl * Math.cos(angle + Math.PI / 7), y2 - hl * Math.sin(angle + Math.PI / 7));
          ctx.stroke();
        } else if (s.kind === 'rect') {
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.stroke * scale;
          ctx.strokeRect(Math.min(s.x, s.x + s.w) * scale, Math.min(s.y, s.y + s.h) * scale, Math.abs(s.w) * scale, Math.abs(s.h) * scale);
        } else if (s.kind === 'circle') {
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.stroke * scale;
          ctx.beginPath();
          ctx.ellipse(
            (s.x + s.w / 2) * scale, (s.y + s.h / 2) * scale,
            Math.abs(s.w / 2) * scale, Math.abs(s.h / 2) * scale,
            0, 0, Math.PI * 2
          );
          ctx.stroke();
        } else if (s.kind === 'pen') {
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.stroke * scale;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          s.pts.forEach((p, i) => {
            const px = p.x * scale, py = p.y * scale;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
        } else if (s.kind === 'text') {
          const fontPx = Math.max(10, (s.sizePct / 100) * img.width * scale);
          ctx.fillStyle = s.color;
          ctx.font = `700 ${fontPx}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
          ctx.textBaseline = 'top';
          ctx.fillText(s.text, s.x * scale, s.y * scale);
        }
        ctx.restore();
      }
      // 4. watermarks on top
      if (wmEnabled && wmText.trim()) {
        drawTextWatermark(ctx, { width: img.width * scale, height: img.height * scale }, {
          text: wmText,
          fontSize: wmSize,
          opacity: wmOpacity,
          rotation: wmRotation,
          color: wmColor,
          font: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          bold: true,
          italic: false,
        }, { tiled: wmTiled, position: wmPosition, marginPercent: 3 });
      }
      const logo = logoRef.current;
      if (logoEnabled && logo) {
        drawImageWatermark(ctx, { width: img.width * scale, height: img.height * scale }, {
          source: logo.source,
          width: logo.width,
          height: logo.height,
          opacity: logoOpacity,
          rotation: logoRotation,
          scalePercent: logoScale,
          position: logoPosition,
          marginPercent: 3,
        });
      }
    },
    [img, shapes, wmEnabled, wmText, wmSize, wmOpacity, wmRotation, wmColor, wmPosition, wmTiled, logoEnabled, logoScale, logoOpacity, logoRotation, logoPosition]
  );

  // preview render
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !img) return;
    const container = containerRef.current;
    if (!container) return;
    const maxW = container.clientWidth;
    const scale = Math.min(1, maxW / img.width);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(img.width * scale * dpr);
    canvas.height = Math.round(img.height * scale * dpr);
    canvas.style.width = `${img.width * scale}px`;
    canvas.style.height = `${img.height * scale}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    // renderScene expects its own scale — draw at scale 1 with the transform above
    renderScene(ctx, 1);
    return () => {
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [img, renderScene]);

  // ------------------------------------------------------------------
  // Pointer interaction
  // ------------------------------------------------------------------

  const toImagePt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = previewRef.current!;
    const bounds = canvas.getBoundingClientRect();
    const scale = bounds.width / (img?.width || 1);
    return { x: (e.clientX - bounds.left) / scale, y: (e.clientY - bounds.top) / scale };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!img || tool === 'select') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toImagePt(e);
    if (tool === 'text') {
      setShapes((prev) => [...prev, { kind: 'text', x: p.x, y: p.y, text: wmText || 'Text', sizePct: 3, color: penColor }]);
      return;
    }
    dragRef.current = { startX: p.x, startY: p.y, kind: tool, pts: tool === 'pen' ? [p] : undefined };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || !img) return;
    const p = toImagePt(e);
    if (drag.kind === 'pen') {
      drag.pts!.push(p);
      // live-draw pen by mutating last shape during drag
      setShapes((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.kind === 'pen') return [...prev.slice(0, -1), { ...last, pts: [...drag.pts!] }];
        return [...prev, { kind: 'pen', pts: [...drag.pts!], color: penColor, stroke: penWidth }];
      });
      return;
    }
    const ghostShape: RectShape = {
      kind: drag.kind as RectShape['kind'],
      x: Math.min(drag.startX, p.x),
      y: Math.min(drag.startY, p.y),
      w: Math.abs(p.x - drag.startX),
      h: Math.abs(p.y - drag.startY),
      color: penColor,
      stroke: penWidth,
      strength: drag.kind === 'pixelate' ? 24 : 12,
    };
    drag.current = ghostShape;
    // live preview by replacing the "ghost" shape at the end
    setShapes((prev) => {
      const ghost = prev.find((s) => (s as { ghost?: boolean }).ghost);
      const marked = { ...drag.current!, ghost: true } as RectShape & { ghost: boolean };
      if (ghost) return prev.map((s) => (s === ghost ? marked : s));
      return [...prev, marked];
    });
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || !img) return;
    if (drag.kind === 'pen') return; // already committed live
    const cur = drag.current;
    if (!cur) return; // simple click, no drag
    if (cur.w < MIN_SIZE || cur.h < MIN_SIZE) {
      // too tiny — treat as accidental click, drop it
      setShapes((prev) => prev.filter((s) => !(s as { ghost?: boolean }).ghost));
      return;
    }
    setShapes((prev) => prev.map((s) => ((s as { ghost?: boolean }).ghost ? { ...s, ghost: undefined } : s)));
  };

  const undo = () => setShapes((prev) => prev.slice(0, -1));
  const clearAll = () => setShapes([]);

  // ------------------------------------------------------------------
  // Export (rendered at full resolution from the same scene)
  // ------------------------------------------------------------------

  const handleExport = async () => {
    const src = loadedRef.current;
    if (!src || !img || !file) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const canvas = makeCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Your browser could not create a 2D canvas.');
      // strip ghost flags for export
      const cleanShapes = shapes.map((s) => {
        const { ...rest } = s as Shape & { ghost?: boolean };
        return rest;
      });
      const savedShapes = shapes;
      setShapes(cleanShapes);
      renderScene(ctx, 1);
      setShapes(savedShapes);
      if (format === 'image/jpeg') {
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
      }
      const blob = await encodeCanvas(canvas, format, quality);
      canvas.width = 0;
      canvas.height = 0;
      const name = `${file.name.replace(/\.[^.]+$/, '')}-edited${extensionForFormat(format)}`;
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(URL.createObjectURL(blob));
      setResultInfo({ blob, bytes: blob.size, name });
      addRecentJob({
        toolId: 'image-watermark',
        toolName: 'Watermark & Annotation Studio',
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

  const effectiveCount = shapes.length + (wmEnabled && wmText.trim() ? 1 : 0) + (logoEnabled ? 1 : 0);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        Processed locally in your browser. Every watermark and annotation is burned into the exported pixels.
      </p>

      {!file && (
        <FileDropzone
          onFilesSelected={handleFiles}
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          label="Drop an image here"
          sublabel="Add watermarks and real annotations — nothing is uploaded"
        />
      )}

      {file && img && (
        <>
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div className="min-w-0">
              <p className="truncate font-bold text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground">{img.width}×{img.height} px · {formatBytes(file.size)}</p>
            </div>
            <button onClick={reset} className="shrink-0 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-accent min-h-[44px]">
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> New image
            </button>
          </div>

          {/* toolbar */}
          <div className="rounded-xl border bg-card p-3 flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Annotation tools">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                aria-pressed={tool === t.id}
                aria-label={t.label}
                title={t.label}
                className={`inline-flex items-center justify-center rounded-lg border px-2.5 py-2 min-h-[44px] min-w-[44px] ${tool === t.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
              >
                <t.icon className="h-4 w-4" aria-hidden="true" />
              </button>
            ))}
            <span className="grow" />
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold" aria-label="Annotation color">
              <input
                type="color" value={penColor}
                onChange={(e) => setPenColor(e.target.value)}
                className="h-9 w-10 rounded border bg-background cursor-pointer"
              />
            </label>
            <label className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              {penWidth}px
              <input
                type="range" min="1" max="20" value={penWidth}
                onChange={(e) => setPenWidth(Number(e.target.value))}
                className="w-16 accent-[#6D1F35]" aria-label="Stroke width"
              />
            </label>
            <button onClick={undo} disabled={!shapes.length} className="inline-flex items-center justify-center rounded-lg border px-2.5 py-2 hover:bg-accent disabled:opacity-40 min-h-[44px] min-w-[44px]" aria-label="Undo last annotation">
              <Undo2 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button onClick={clearAll} disabled={!shapes.length} className="inline-flex items-center justify-center rounded-lg border px-2.5 py-2 hover:bg-accent disabled:opacity-40 min-h-[44px] min-w-[44px]" aria-label="Clear all annotations">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* canvas */}
          <div ref={containerRef} className="rounded-xl border bg-card p-3 overflow-auto">
            <canvas
              ref={previewRef}
              className="max-w-full h-auto rounded-lg border cursor-crosshair touch-none select-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              aria-label="Image editor canvas"
            />
            <p className="text-[11px] text-muted-foreground mt-2">
              Drag to draw rectangles, circles, arrows, highlights, blur, and pixelation. Click to place text. Pen draws freehand.
            </p>
          </div>

          {/* watermark panel */}
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <p className="text-sm font-bold inline-flex items-center gap-2"><Stamp className="h-4 w-4 text-primary" aria-hidden="true" /> Text watermark</p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={wmEnabled} onChange={(e) => setWmEnabled(e.target.checked)} className="accent-[#6D1F35]" />
                Enable
              </label>
              <input
                type="text" value={wmText}
                onChange={(e) => setWmText(e.target.value)}
                placeholder="Watermark text"
                className="grow rounded-lg border bg-background px-3 py-2 text-sm"
                aria-label="Watermark text"
              />
              <label className="inline-flex items-center gap-1.5 text-sm font-semibold">
                <input type="checkbox" checked={wmTiled} onChange={(e) => setWmTiled(e.target.checked)} className="accent-[#6D1F35]" />
                Tiled
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <input
                  type="color" value={wmColor}
                  onChange={(e) => setWmColor(e.target.value)}
                  className="h-9 w-10 rounded border bg-background cursor-pointer" aria-label="Watermark color"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="text-xs font-semibold text-muted-foreground space-y-1 block">
                Size: {wmSize}% of width
                <input type="range" min="1" max="15" step="0.5" value={wmSize} onChange={(e) => setWmSize(Number(e.target.value))} className="w-full accent-[#6D1F35]" aria-label="Watermark size" />
              </label>
              <label className="text-xs font-semibold text-muted-foreground space-y-1 block">
                Opacity: {Math.round(wmOpacity * 100)}%
                <input type="range" min="5" max="100" value={Math.round(wmOpacity * 100)} onChange={(e) => setWmOpacity(Number(e.target.value) / 100)} className="w-full accent-[#6D1F35]" aria-label="Watermark opacity" />
              </label>
              <label className="text-xs font-semibold text-muted-foreground space-y-1 block">
                Rotation: {wmRotation}°
                <input type="range" min="-180" max="180" value={wmRotation} onChange={(e) => setWmRotation(Number(e.target.value))} className="w-full accent-[#6D1F35]" aria-label="Watermark rotation" />
              </label>
              <label className="text-xs font-semibold text-muted-foreground space-y-1 block">
                Position
                <select
                  value={wmPosition}
                  onChange={(e) => setWmPosition(e.target.value as WatermarkPositionId)}
                  className="w-full rounded-lg border bg-background px-2 py-2 text-xs font-semibold"
                  aria-label="Watermark position"
                >
                  {WATERMARK_POSITIONS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <p className="text-sm font-bold pt-2 border-t">Logo watermark</p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox" checked={logoEnabled}
                  onChange={(e) => { setLogoEnabled(e.target.checked && !!logoRef.current); }}
                  disabled={!logoReady}
                  className="accent-[#6D1F35]"
                />
                Enable
              </label>
              <label className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-accent cursor-pointer min-h-[44px]">
                <UploadCloud className="h-4 w-4" aria-hidden="true" />
                {logoName ? 'Change logo' : 'Upload logo (stays local)'}
                <input
                  type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                  onChange={(e) => handleLogo(Array.from(e.target.files ?? []))}
                  className="sr-only" aria-label="Upload logo image"
                />
              </label>
              {logoName && <span className="text-xs text-muted-foreground truncate max-w-[180px]">{logoName}</span>}
            </div>
            {logoReady && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="text-xs font-semibold text-muted-foreground space-y-1 block">
                  Size: {logoScale}% of width
                  <input type="range" min="4" max="60" value={logoScale} onChange={(e) => setLogoScale(Number(e.target.value))} className="w-full accent-[#6D1F35]" aria-label="Logo size" />
                </label>
                <label className="text-xs font-semibold text-muted-foreground space-y-1 block">
                  Opacity: {Math.round(logoOpacity * 100)}%
                  <input type="range" min="5" max="100" value={Math.round(logoOpacity * 100)} onChange={(e) => setLogoOpacity(Number(e.target.value) / 100)} className="w-full accent-[#6D1F35]" aria-label="Logo opacity" />
                </label>
                <label className="text-xs font-semibold text-muted-foreground space-y-1 block">
                  Rotation: {logoRotation}°
                  <input type="range" min="-180" max="180" value={logoRotation} onChange={(e) => setLogoRotation(Number(e.target.value))} className="w-full accent-[#6D1F35]" aria-label="Logo rotation" />
                </label>
                <label className="text-xs font-semibold text-muted-foreground space-y-1 block">
                  Position
                  <select
                    value={logoPosition}
                    onChange={(e) => setLogoPosition(e.target.value as WatermarkPositionId)}
                    className="w-full rounded-lg border bg-background px-2 py-2 text-xs font-semibold"
                    aria-label="Logo position"
                  >
                    {WATERMARK_POSITIONS.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>

          {/* export */}
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <p className="text-sm font-bold">Export ({effectiveCount} element{effectiveCount === 1 ? '' : 's'} rendered into the file)</p>
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
                <input type="range" min="40" max="100" step="2" value={Math.round(quality * 100)} onChange={(e) => setQuality(Number(e.target.value) / 100)} className="w-full accent-[#6D1F35]" aria-label="Export quality" />
              </label>
            )}
            <button
              onClick={handleExport}
              disabled={isProcessing}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[48px]"
            >
              <Download className="h-4 w-4" aria-hidden="true" /> Export edited image
            </button>
            {resultUrl && resultInfo && (
              <div className="space-y-3" role="status">
                <img src={resultUrl} alt="Exported result" className="w-full max-w-md mx-auto rounded-lg border bg-card" />
                <p className="text-xs text-muted-foreground text-center">{formatBytes(resultInfo.bytes)} — edits are inside these pixels.</p>
                <button
                  onClick={() => triggerDownload(resultInfo.blob, resultInfo.name)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 min-h-[48px]"
                >
                  <Download className="h-4 w-4" aria-hidden="true" /> Save {resultInfo.name}
                </button>
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

      <ProcessingModal isOpen={isProcessing} stepName="Rendering edits at full resolution…" percentage={70} />
    </div>
  );
};
