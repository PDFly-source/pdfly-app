'use client';

import React, { useRef, useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { useRevokeOnUnmount } from '@/lib/use-revoke-on-unmount';
import { formatBytes, triggerDownload } from '@/lib/pdf-engine';
import { addRecentJob } from '@/lib/recent-jobs';
import { loadImage, assertDecodedSize, resizeLoadedImage, extensionForFormat, type ImageOutputFormat } from '@/lib/image-engine';
import { Scaling, RefreshCw, AlertTriangle, Download, ShieldCheck, FileArchive, Lock, Unlock } from 'lucide-react';

/**
 * Image Resize & Convert — real pixel resizing + JPG/PNG/WebP conversion.
 * PRIVATE. POWERFUL. LOCAL.
 */

type ResizeMode = 'exact' | 'contain' | 'percent';

interface ItemState {
  id: string;
  file: File;
  width: number;
  height: number;
  status: 'queued' | 'processing' | 'done' | 'error';
  error?: string;
  resultBlob?: Blob;
  outBytes?: number;
  outDims?: { width: number; height: number };
  outName?: string;
}

const PRESETS = [
  { id: 'free', label: 'Custom', apply: null },
  { id: '1:1', label: '1:1', apply: { mode: 'exact' as ResizeMode, note: 'square' } },
  { id: '4:5', label: '4:5', apply: null },
  { id: '16:9', label: '16:9', apply: null },
  { id: 'hd', label: '1080p', apply: { mode: 'contain' as ResizeMode, width: 1920, height: 1080 } },
  { id: '4k', label: '4K', apply: { mode: 'contain' as ResizeMode, width: 3840, height: 2160 } },
] as const;

export const ImageResizeWorkspace: React.FC = () => {
  const [items, setItems] = useState<ItemState[]>([]);
  const [mode, setMode] = useState<ResizeMode>('exact');
  const [width, setWidth] = useState('1600');
  const [height, setHeight] = useState('1200');
  const [percent, setPercent] = useState('50');
  const [lockAspect, setLockAspect] = useState(true);
  const [format, setFormat] = useState<ImageOutputFormat>('image/jpeg');
  const [keepFormat, setKeepFormat] = useState(true);
  const [quality, setQuality] = useState(0.92);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [processStep, setProcessStep] = useState('Resizing…');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  useRevokeOnUnmount(zipUrl);
  const cancelRef = useRef(false);

  const reset = () => {
    if (zipUrl) URL.revokeObjectURL(zipUrl);
    setZipUrl(null);
    setItems([]);
    setErrorMessage(null);
  };

  const handleFiles = async (files: File[]) => {
    if (!files?.length) return;
    reset();
    const valid: ItemState[] = [];
    const rejected: string[] = [];
    for (const f of files.slice(0, 20)) {
      const ok = /\.(jpe?g|png|webp)$/i.test(f.name) || ['image/jpeg', 'image/png', 'image/webp'].includes(f.type);
      if (!ok) {
        rejected.push(f.name);
        continue;
      }
      valid.push({ id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 7)}`, file: f, width: 0, height: 0, status: 'queued' });
    }
    if (rejected.length) setErrorMessage(`${rejected.length} file(s) skipped — only JPG, PNG, and WebP are supported.`);
    setItems(valid);
    // read real dimensions locally for display + aspect locking
    for (const item of valid) {
      try {
        const img = await loadImage(item.file);
        item.width = img.width;
        item.height = img.height;
        img.dispose();
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, width: img.width, height: img.height } : i)));
      } catch (err) {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'error', error: (err as Error).message } : i)));
      }
    }
  };

  const applyPreset = (presetId: string) => {
    if (presetId === '1:1') {
      setMode('contain');
      setWidth('1080');
      setHeight('1080');
    } else if (presetId === '4:5') {
      setMode('contain');
      setWidth('1080');
      setHeight('1350');
    } else if (presetId === '16:9') {
      setMode('contain');
      setWidth('1920');
      setHeight('1080');
    } else if (presetId === 'hd') {
      setMode('contain');
      setWidth('1920');
      setHeight('1080');
    } else if (presetId === '4k') {
      setMode('contain');
      setWidth('3840');
      setHeight('2160');
    }
  };

  const resolvedFormat = (file: File): ImageOutputFormat => {
    if (keepFormat) {
      const t = (file.type || '').toLowerCase();
      if (t === 'image/png') return 'image/png';
      if (t === 'image/webp') return 'image/webp';
      return 'image/jpeg';
    }
    return format;
  };

  const handleResizeAll = async () => {
    if (!items.length || isProcessing) return;
    cancelRef.current = false;
    setIsProcessing(true);
    setErrorMessage(null);
    let processed = 0;
    let anySuccess = false;
    let totalOut = 0;

    for (const item of items) {
      if (cancelRef.current) break;
      if (item.status === 'done' || item.status === 'error') {
        processed += 1;
        continue;
      }
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'processing' } : i)));
      setProcessStep(`Resizing ${item.file.name}…`);
      try {
        const img = await loadImage(item.file);
        assertDecodedSize(img.width, img.height);
        const wNum = parseInt(width, 10);
        const hNum = parseInt(height, 10);
        const fmt = resolvedFormat(item.file);
        const { blob, output } = await resizeLoadedImage(img, {
          mode,
          width: Number.isFinite(wNum) && wNum > 0 ? wNum : undefined,
          height: Number.isFinite(hNum) && hNum > 0 ? hNum : undefined,
          percent: Math.max(1, Math.min(1000, parseFloat(percent) || 100)),
          lockAspect,
          format: fmt,
          quality,
        });
        img.dispose();
        const base = item.file.name.replace(/\.[^.]+$/, '');
        const outName = `${base}-${output.width}x${output.height}${extensionForFormat(fmt)}`;
        totalOut += blob.size;
        anySuccess = true;
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: 'done', resultBlob: blob, outBytes: blob.size, outDims: output, outName }
              : i
          )
        );
      } catch (err) {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'error', error: (err as Error).message } : i)));
      }
      processed += 1;
      setProgressPct(Math.round((processed / items.length) * 100));
    }

    if (anySuccess) {
      addRecentJob({
        toolId: 'image-resizer',
        toolName: 'Image Resize & Convert',
        fileName: items.length === 1 ? items[0].file.name : `${items.length} images resized`,
        fileSize: totalOut,
        status: 'completed',
      });
    }
    setIsProcessing(false);
    setProgressPct(100);
  };

  const handleDownloadItem = (item: ItemState) => {
    if (item.resultBlob && item.outName) triggerDownload(item.resultBlob, item.outName);
  };

  const handleDownloadAll = async () => {
    const done = items.filter((i) => i.status === 'done' && i.resultBlob);
    if (!done.length) return;
    if (done.length === 1) {
      handleDownloadItem(done[0]);
      return;
    }
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const used = new Set<string>();
    for (const item of done) {
      let name = item.outName!;
      let n = 1;
      while (used.has(name)) name = item.outName!.replace(/(\.[^.]+)$/, `-${n++}$1`);
      used.add(name);
      zip.file(name, item.resultBlob!);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    if (zipUrl) URL.revokeObjectURL(zipUrl);
    setZipUrl(URL.createObjectURL(blob));
    triggerDownload(blob, 'pdfminifly-resized-images.zip');
  };

  const doneCount = items.filter((i) => i.status === 'done').length;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        Processed locally in your browser. Images never leave your device.
      </p>

      {items.length === 0 && (
        <FileDropzone
          onFilesSelected={handleFiles}
          multiple
          maxFiles={20}
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          label="Drop images here"
          sublabel="JPG, PNG, or WebP — up to 20 files, resized entirely on your device"
        />
      )}

      {items.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div className="min-w-0">
              <p className="font-bold text-sm">{items.length} image{items.length > 1 ? 's' : ''} loaded</p>
              <p className="text-xs text-muted-foreground">Real dimensions shown after local decode.</p>
            </div>
            <button onClick={reset} className="shrink-0 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-accent min-h-[44px]">
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Start over
            </button>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-4">
            <p className="text-sm font-bold inline-flex items-center gap-2"><Scaling className="h-4 w-4 text-primary" aria-hidden="true" /> Size</p>

            <div className="flex flex-wrap gap-2" role="group" aria-label="Resize mode">
              {([
                { id: 'exact', label: 'Exact size' },
                { id: 'contain', label: 'Fit inside box' },
                { id: 'percent', label: 'Percentage' },
              ] as const).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  aria-pressed={mode === m.id}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${mode === m.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {mode !== 'percent' ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-muted-foreground space-y-1">
                  Width (px)
                  <input
                    type="number" min="1" max="20000" value={width}
                    onChange={(e) => {
                      setWidth(e.target.value);
                      if (lockAspect && items[0] && items[0].width > 0 && parseInt(e.target.value, 10) > 0) {
                        const ratio = items[0].height / items[0].width;
                        setHeight(String(Math.round(parseInt(e.target.value, 10) * ratio)));
                      }
                    }}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-semibold"
                  />
                </label>
                <label className="text-xs font-semibold text-muted-foreground space-y-1">
                  Height (px)
                  <input
                    type="number" min="1" max="20000" value={height}
                    onChange={(e) => {
                      setHeight(e.target.value);
                      if (lockAspect && items[0] && items[0].height > 0 && parseInt(e.target.value, 10) > 0) {
                        const ratio = items[0].width / items[0].height;
                        setWidth(String(Math.round(parseInt(e.target.value, 10) * ratio)));
                      }
                    }}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-semibold"
                  />
                </label>
                <button
                  onClick={() => setLockAspect((v) => !v)}
                  aria-pressed={lockAspect}
                  className={`col-span-2 inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${lockAspect ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  {lockAspect ? <Lock className="h-4 w-4" aria-hidden="true" /> : <Unlock className="h-4 w-4" aria-hidden="true" />}
                  {lockAspect ? 'Aspect ratio locked to the first image' : 'Aspect ratio free'}
                </button>
              </div>
            ) : (
              <label className="text-xs font-semibold text-muted-foreground space-y-1 block">
                Scale: {percent}% of original
                <input
                  type="range" min="1" max="400" step="1" value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                  className="w-full accent-[#6D1F35]" aria-label="Scale percentage"
                />
              </label>
            )}

            <div className="flex flex-wrap gap-2" role="group" aria-label="Quick presets">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Presets set the fit box — the aspect ratio is never distorted. Fit mode scales to the largest size that
              fits inside the box. DPI metadata is not modified: browsers cannot write print DPI honestly, so this
              tool changes real pixels only.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-4">
            <p className="text-sm font-bold">Output format</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Output format">
              {([
                { id: 'image/jpeg', label: 'JPG' },
                { id: 'image/png', label: 'PNG' },
                { id: 'image/webp', label: 'WebP' },
              ] as const).map((f) => (
                <button
                  key={f.id}
                  onClick={() => { setKeepFormat(false); setFormat(f.id); }}
                  aria-pressed={!keepFormat && format === f.id}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${!keepFormat && format === f.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                >
                  {f.label}
                </button>
              ))}
              <button
                onClick={() => setKeepFormat(true)}
                aria-pressed={keepFormat}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${keepFormat ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
              >
                Keep original
              </button>
            </div>
            {(!keepFormat && format !== 'image/png') && (
              <label className="text-xs font-semibold text-muted-foreground space-y-1 block">
                Quality: {Math.round(quality * 100)}%
                <input
                  type="range" min="40" max="100" step="2" value={Math.round(quality * 100)}
                  onChange={(e) => setQuality(Number(e.target.value) / 100)}
                  className="w-full accent-[#6D1F35]" aria-label="Output quality"
                />
              </label>
            )}
          </div>

          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="rounded-xl border bg-card p-3 flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.width > 0 ? `${item.width}×${item.height}` : 'reading…'} · {formatBytes(item.file.size)}
                    {item.status === 'done' && item.outDims && (
                      <> → <span className="font-semibold text-foreground">{item.outDims.width}×{item.outDims.height}</span> · {formatBytes(item.outBytes ?? 0)}</>
                    )}
                    {item.status === 'processing' && <> · resizing…</>}
                  </p>
                  {item.status === 'error' && (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" /> {item.error}
                    </p>
                  )}
                </div>
                {item.status === 'done' && (
                  <button onClick={() => handleDownloadItem(item)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-accent min-h-[44px]">
                    <Download className="h-4 w-4" aria-hidden="true" /> Save
                  </button>
                )}
              </li>
            ))}
          </ul>

          {doneCount > 1 && (
            <button
              onClick={handleDownloadAll}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 min-h-[48px]"
            >
              <FileArchive className="h-4 w-4" aria-hidden="true" /> Download all ({doneCount}) as ZIP
            </button>
          )}

          <button
            onClick={handleResizeAll}
            disabled={isProcessing}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[48px]"
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Resize {items.length} image{items.length > 1 ? 's' : ''}
          </button>

          {errorMessage && (
            <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}
        </>
      )}

      <ProcessingModal
        isOpen={isProcessing}
        stepName={processStep}
        percentage={progressPct}
        onCancel={() => {
          cancelRef.current = true;
          setIsProcessing(false);
          setItems((prev) => prev.map((i) => (i.status === 'processing' ? { ...i, status: 'queued' } : i)));
        }}
      />
    </div>
  );
};
