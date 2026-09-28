'use client';

import React, { useRef, useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { useRevokeOnUnmount } from '@/lib/use-revoke-on-unmount';
import { formatBytes } from '@/lib/pdf-engine';
import { triggerDownload } from '@/lib/pdf-engine';
import { addRecentJob } from '@/lib/recent-jobs';
import {
  loadImage,
  assertDecodedSize,
  compressLoadedImage,
  compressImageToTarget,
  extensionForFormat,
  type ImageOutputFormat,
} from '@/lib/image-engine';
import {
  RefreshCw,
  AlertTriangle,
  Download,
  ShieldCheck,
  ImageDown,
  FileArchive,
  Zap,
} from 'lucide-react';

/**
 * Image Compressor Pro — real, local-only JPG/PNG/WebP compression.
 * PRIVATE. POWERFUL. LOCAL.
 */

type OutputChoice = 'keep' | 'image/jpeg' | 'image/png' | 'image/webp';
type CompressMode = 'quality' | 'target';

interface ItemState {
  id: string;
  file: File;
  status: 'queued' | 'processing' | 'done' | 'error';
  error?: string;
  outBytes?: number;
  outQuality?: number;
  targetMet?: boolean;
  resultBlob?: Blob;
  outName?: string;
}

const OUTPUT_CHOICES: { id: OutputChoice; label: string; hint: string }[] = [
  { id: 'keep', label: 'Keep format', hint: 'JPG→JPG, PNG→PNG' },
  { id: 'image/webp', label: 'WebP', hint: 'Smallest, modern' },
  { id: 'image/jpeg', label: 'JPG', hint: 'Flatten to white' },
  { id: 'image/png', label: 'PNG', hint: 'Lossless + alpha' },
];

const mimeOf = (file: File, choice: OutputChoice): ImageOutputFormat => {
  if (choice !== 'keep') return choice as ImageOutputFormat;
  const t = (file.type || '').toLowerCase();
  if (t === 'image/png') return 'image/png';
  if (t === 'image/webp') return 'image/webp';
  return 'image/jpeg'; // jpg and anything else
};

export const ImageCompressorWorkspace: React.FC = () => {
  const [items, setItems] = useState<ItemState[]>([]);
  const [output, setOutput] = useState<OutputChoice>('keep');
  const [mode, setMode] = useState<CompressMode>('quality');
  const [quality, setQuality] = useState(0.8);
  const [targetKB, setTargetKB] = useState('300');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [processStep, setProcessStep] = useState('Compressing…');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  useRevokeOnUnmount(zipUrl);
  const cancelRef = useRef(false);

  const reset = () => {
    cancelRef.current = false;
    if (zipUrl) URL.revokeObjectURL(zipUrl);
    setZipUrl(null);
    setItems([]);
    setErrorMessage(null);
  };

  const handleFiles = (files: File[]) => {
    if (!files?.length) return;
    reset();
    const valid: ItemState[] = [];
    const rejected: string[] = [];
    for (const f of files.slice(0, 20)) {
      const ok = /\.(jpe?g|png|webp)$/i.test(f.name) || ['image/jpeg', 'image/png', 'image/webp'].includes(f.type);
      if (ok) {
        valid.push({ id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 7)}`, file: f, status: 'queued' });
      } else {
        rejected.push(f.name);
      }
    }
    if (rejected.length) {
      setErrorMessage(`${rejected.length} file(s) skipped — only JPG, PNG, and WebP images are supported.`);
    }
    setItems(valid);
  };

  const updateItem = (id: string, patch: Partial<ItemState>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const handleCompressAll = async () => {
    if (!items.length || isProcessing) return;
    cancelRef.current = false;
    setIsProcessing(true);
    setErrorMessage(null);
    let processed = 0;
    let anySuccess = false;
    let totalIn = 0;
    let totalOut = 0;

    for (const item of items) {
      if (cancelRef.current) {
        updateItem(item.id, { status: item.status === 'done' ? 'done' : 'queued' });
        continue;
      }
      if (item.status === 'done') {
        processed += 1;
        continue;
      }
      updateItem(item.id, { status: 'processing', error: undefined });
      const format = mimeOf(item.file, output);
      const ext = extensionForFormat(format);
      const baseName = item.file.name.replace(/\.[^.]+$/, '');
      setProcessStep(`Compressing ${item.file.name}…`);
      try {
        const img = await loadImage(item.file);
        assertDecodedSize(img.width, img.height);
        let blob: Blob;
        let bytes: number;
        let q: number | undefined;
        let met: boolean | undefined;

        if (mode === 'target') {
          const target = Math.max(5, parseFloat(targetKB) || 0) * 1024;
          const res = await compressImageToTarget(img, format, target, {
            onProgress: (pct, label) => {
              setProcessStep(`${label} ${item.file.name}`);
              setProgressPct(Math.round(((processed + pct / 100) / items.length) * 100));
            },
          });
          blob = res.blob;
          bytes = res.bytes;
          q = res.quality;
          met = res.targetMet;
        } else {
          const res = await compressLoadedImage(img, format, quality);
          blob = res.blob;
          bytes = res.bytes;
        }
        img.dispose();
        totalIn += item.file.size;
        totalOut += bytes;
        anySuccess = true;
        updateItem(item.id, {
          status: 'done',
          resultBlob: blob,
          outBytes: bytes,
          outQuality: q,
          targetMet: met,
          outName: `${baseName}-minified${ext}`,
        });
      } catch (err) {
        updateItem(item.id, { status: 'error', error: (err as Error).message || 'Compression failed.' });
      }
      processed += 1;
      setProgressPct(Math.round((processed / items.length) * 100));
    }

    if (anySuccess) {
      addRecentJob({
        toolId: 'image-compressor',
        toolName: 'Image Compressor Pro',
        fileName: items.length === 1 ? `${items[0].file.name.replace(/\.[^.]+$/, '')} (compressed)` : `${items.length} images (compressed)`,
        fileSize: totalOut || 0,
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
      while (used.has(name)) {
        name = item.outName!.replace(/(\.[^.]+)$/, `-${n++}$1`);
      }
      used.add(name);
      zip.file(name, item.resultBlob!);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    if (zipUrl) URL.revokeObjectURL(zipUrl);
    const url = URL.createObjectURL(blob);
    setZipUrl(url);
    triggerDownload(blob, 'pdfminifly-compressed-images.zip');
  };

  const doneCount = items.filter((i) => i.status === 'done').length;
  const totalSaved = items.reduce((acc, i) => acc + (i.status === 'done' && i.outBytes ? i.file.size - i.outBytes : 0), 0);
  const totalOriginal = items.reduce((acc, i) => acc + (i.status === 'done' ? i.file.size : 0), 0);

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
          sublabel="JPG, PNG, or WebP — up to 20 files, compressed entirely on your device"
        />
      )}

      {items.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div className="min-w-0">
              <p className="font-bold text-sm">{items.length} image{items.length > 1 ? 's' : ''} loaded</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(items.reduce((a, i) => a + i.file.size, 0))} total
              </p>
            </div>
            <button onClick={reset} className="shrink-0 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-accent min-h-[44px]">
              <RefreshCw className="h-4 w-4" /> Start over
            </button>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-4">
            <p className="text-sm font-bold inline-flex items-center gap-2"><ImageDown className="h-4 w-4 text-primary" /> Output format</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {OUTPUT_CHOICES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setOutput(c.id)}
                  aria-pressed={output === c.id}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-semibold min-h-[64px] flex flex-col items-center gap-0.5 ${output === c.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                >
                  {c.label}
                  <span className="text-[10px] opacity-80 font-normal">{c.hint}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2" role="group" aria-label="Compression mode">
              {([
                { id: 'quality', label: 'By quality', hint: 'One quality for all' },
                { id: 'target', label: 'Target file size', hint: 'Honest per-image search' },
              ] as const).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  aria-pressed={mode === m.id}
                  className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold min-h-[60px] flex flex-col items-center gap-0.5 ${mode === m.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                >
                  {m.label}
                  <span className="text-[10px] opacity-80 font-normal">{m.hint}</span>
                </button>
              ))}
            </div>

            {mode === 'quality' ? (
              <label className="text-xs font-semibold text-muted-foreground space-y-1 block">
                Quality: {Math.round(quality * 100)}%
                <input
                  type="range" min="30" max="95" step="5" value={Math.round(quality * 100)}
                  onChange={(e) => setQuality(Number(e.target.value) / 100)}
                  className="w-full accent-[#6D1F35]" aria-label="JPEG or WebP quality"
                />
                <span className="block font-normal">Lower = smaller files. PNG ignores quality (lossless).</span>
              </label>
            ) : (
              <label className="text-xs font-semibold text-muted-foreground space-y-1 block">
                Target size per image
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="5" max="51200" value={targetKB}
                    onChange={(e) => setTargetKB(e.target.value)}
                    className="w-32 rounded-lg border bg-background px-3 py-2 text-sm font-semibold"
                    aria-label="Target size in kilobytes"
                  />
                  <span className="text-sm font-normal">KB</span>
                </div>
                <span className="block font-normal">
                  PDFMiniFly encodes repeatedly until it finds the highest quality that truly fits. If a target is
                  impossible, the tool reports the best real result — it never fakes success.
                </span>
              </label>
            )}
          </div>

          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="rounded-xl border bg-card p-3 flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(item.file.size)}
                    {item.status === 'done' && item.outBytes != null && (
                      <> → <span className="font-semibold text-foreground">{formatBytes(item.outBytes)}</span>{' '}
                        ({Math.round((1 - item.outBytes / item.file.size) * 100)}% smaller)
                        {item.outQuality != null && <> · q{Math.round(item.outQuality * 100)}</>}
                        {item.targetMet === false && (
                          <span className="text-amber-600 dark:text-amber-400"> · target not reachable — best real result shown</span>
                        )}
                      </>
                    )}
                    {item.status === 'processing' && <> · compressing…</>}
                    {item.status === 'queued' && <> · waiting</>}
                  </p>
                  {item.status === 'error' && (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" /> {item.error}
                    </p>
                  )}
                </div>
                {item.status === 'done' && (
                  <button
                    onClick={() => handleDownloadItem(item)}
                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-accent min-h-[44px]"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" /> Save
                  </button>
                )}
              </li>
            ))}
          </ul>

          {doneCount > 0 && (
            <div className="rounded-xl border bg-card p-4 space-y-3" role="status">
              <p className="text-sm font-bold flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                {doneCount} image{doneCount > 1 ? 's' : ''} compressed — {formatBytes(Math.max(0, totalSaved))} saved
                {totalOriginal > 0 && <> ({Math.round((totalSaved / totalOriginal) * 100)}%)</>}
              </p>
              {doneCount > 1 && (
                <button
                  onClick={handleDownloadAll}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 min-h-[48px]"
                >
                  <FileArchive className="h-4 w-4" aria-hidden="true" /> Download all ({doneCount}) as ZIP
                </button>
              )}
            </div>
          )}

          <button
            onClick={handleCompressAll}
            disabled={isProcessing || items.length === 0}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[48px]"
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Compress {items.length} image{items.length > 1 ? 's' : ''}
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
