'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { FileNameInput } from '@/components/toolkit/FileNameInput';
import { PdfPreviewModal } from '@/components/toolkit/PdfPreviewModal';
import { compressToTargetSize, TARGET_PRESETS, TargetSizeMode } from '@/lib/compress-target';
import { useRevokeOnUnmount } from '@/lib/use-revoke-on-unmount';
import { triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { ensurePdfExtension } from '@/lib/suggest-filename';
import { addRecentJob } from '@/lib/recent-jobs';
import { Target, RefreshCw, CheckCircle2, AlertTriangle, Download, Zap } from 'lucide-react';

/**
 * Compress to Target Size — iterative local search, honest reporting.
 * PRIVATE. POWERFUL. LOCAL.
 */
export const CompressTargetWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('compressed');
  const [targetKb, setTargetKb] = useState<number | null>(200);
  const [customKb, setCustomKb] = useState('');
  const [unit, setUnit] = useState<'KB' | 'MB'>('KB');
  const [customValue, setCustomValue] = useState('500');
  const [mode, setMode] = useState<TargetSizeMode>('balanced');
  const [grayscale, setGrayscale] = useState(false);
  const [removeMetadata, setRemoveMetadata] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Searching for parameters...');
  const [progressPct, setProgressPct] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);
  useRevokeOnUnmount(resultBlobUrl);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [result, setResult] = useState<{
    blob: Blob; newSize: number; targetBytes: number; targetMet: boolean; quality: number; dpi: number; attempts: number;
  } | null>(null);

  const reset = () => {
    if (resultBlobUrl) URL.revokeObjectURL(resultBlobUrl);
    setFile(null); setResult(null); setResultBlobUrl(null); setErrorMessage(null);
  };

  const handleFileSelected = (files: File[]) => {
    if (!files?.length) return;
    reset();
    setFile(files[0]);
    setFileName(`compressed_${files[0].name.replace(/\.pdf$/i, '')}`);
    // sensible default target: half the original, snapped into KB range
    const halfKb = Math.max(50, Math.round(files[0].size / 2048));
    if (halfKb <= 512) { setTargetKb(halfKb < 100 ? 100 : halfKb < 200 ? 200 : 500); setUnit('KB'); }
    else { setTargetKb(null); setUnit('MB'); setCustomValue('1'); }
  };

  const targetBytes = targetKb !== null
    ? targetKb * 1024
    : (() => {
        const v = parseFloat(customValue);
        if (!isFinite(v) || v <= 0) return 0;
        return Math.round(v * (unit === 'MB' ? 1024 * 1024 : 1024));
      })();

  const handleCompress = async () => {
    if (!file || targetBytes <= 0) {
      setErrorMessage('Choose a valid target size first.');
      return;
    }
    if (targetBytes >= file.size) {
      setErrorMessage(`Your file is already ${formatBytes(file.size)} — smaller than the target. Nothing to compress.`);
      return;
    }
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const res = await compressToTargetSize(
        file,
        { targetBytes, mode, removeMetadata, grayscale },
        (msg, pct) => { setProcessStep(msg); setProgressPct(pct); }
      );
      setResultBlobUrl(URL.createObjectURL(res.blob));
      setResult({ blob: res.blob, newSize: res.newSize, targetBytes: res.targetBytes, targetMet: res.targetMet, quality: res.quality, dpi: res.dpi, attempts: res.attempts.length });
      addRecentJob({
        toolId: 'compress-to-target-size',
        toolName: 'Compress to Target Size',
        fileName: ensurePdfExtension(fileName),
        fileSize: res.newSize,
        status: 'completed',
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Compression failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (result) triggerDownload(result.blob, ensurePdfExtension(fileName));
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {!file && (
        <FileDropzone
          onFilesSelected={handleFileSelected}
          label="Drop your PDF here"
          sublabel="Hit an exact size — 100 KB, 200 KB, 5 MB — with an intelligent local search"
        />
      )}

      {file && (
        <>
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div className="min-w-0">
              <p className="truncate font-bold text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground">Current size: {formatBytes(file.size)}</p>
            </div>
            <button onClick={reset} className="shrink-0 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-accent min-h-[44px]">
              <RefreshCw className="h-4 w-4" /> New file
            </button>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-4">
            <p className="text-sm font-bold inline-flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Target size</p>
            <div className="flex flex-wrap gap-2">
              {TARGET_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => { setTargetKb(p.bytes / 1024); setCustomKb(''); }}
                  className={`rounded-lg border px-4 py-2 text-sm font-semibold min-h-[44px] ${targetKb === p.bytes / 1024 && !customKb ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => { setTargetKb(null); setCustomKb('x'); }}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold min-h-[44px] ${customKb ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
              >
                Custom
              </button>
            </div>
            {customKb && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  aria-label="Custom target size"
                  className="w-32 rounded-lg border bg-background px-3 py-2 text-sm"
                />
                <select value={unit} onChange={(e) => setUnit(e.target.value as 'KB' | 'MB')} aria-label="Size unit" className="rounded-lg border bg-background px-3 py-2 text-sm min-h-[44px]">
                  <option>KB</option>
                  <option>MB</option>
                </select>
                <span className="text-xs text-muted-foreground">= {targetBytes > 0 ? formatBytes(targetBytes) : '—'}</span>
              </div>
            )}

            <p className="text-xs font-semibold text-muted-foreground pt-2">Compression mode</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'best-quality', label: 'Best Quality', hint: 'Never below ~100 DPI' },
                { id: 'balanced', label: 'Balanced', hint: 'Recommended' },
                { id: 'smallest', label: 'Smallest Size', hint: 'Aggressive search' },
              ] as { id: TargetSizeMode; label: string; hint: string }[]).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-semibold min-h-[56px] flex flex-col items-center gap-0.5 ${mode === m.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                >
                  {m.label}
                  <span className="text-[10px] opacity-80 font-normal">{m.hint}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
              <label className="flex items-center gap-2 text-sm font-medium min-h-[44px]">
                <input type="checkbox" checked={removeMetadata} onChange={(e) => setRemoveMetadata(e.target.checked)} className="h-4 w-4 accent-[#6D1F35]" />
                Remove metadata
              </label>
              <label className="flex items-center gap-2 text-sm font-medium min-h-[44px]">
                <input type="checkbox" checked={grayscale} onChange={(e) => setGrayscale(e.target.checked)} className="h-4 w-4 accent-[#6D1F35]" />
                Convert to grayscale (helps size)
              </label>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-4">
            <FileNameInput label="Output filename" value={fileName} onChange={setFileName} extension=".pdf" hint="Saved to your device only" />
            <button
              onClick={handleCompress}
              disabled={isProcessing || targetBytes <= 0}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[48px]"
            >
              <Zap className="h-4 w-4" /> Compress to {targetBytes > 0 ? formatBytes(targetBytes) : 'target'}
            </button>
          </div>

          {result && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <p className="text-sm font-bold inline-flex items-center gap-2">
                {result.targetMet ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                {result.targetMet ? 'Target achieved' : 'Target could not be reached without excessive quality loss'}
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-[11px] font-semibold text-muted-foreground">TARGET</p>
                  <p className="text-lg font-black">{formatBytes(result.targetBytes)}</p>
                </div>
                <div className={`rounded-lg p-3 ${result.targetMet ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                  <p className="text-[11px] font-semibold text-muted-foreground">{result.targetMet ? 'ACTUAL' : 'BEST ACHIEVABLE'}</p>
                  <p className="text-lg font-black">{formatBytes(result.newSize)}</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-[11px] font-semibold text-muted-foreground">SEARCH RUNS</p>
                  <p className="text-lg font-black">{result.attempts}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {result.quality >= 0
                  ? `Final parameters: ${(result.quality * 100).toFixed(0)}% quality @ ${result.dpi} DPI.`
                  : 'Achieved with lossless structural optimization — no quality lost.'}
                {' '}Readable text is never destroyed — the search stops before that.
              </p>
              <button
                onClick={handleDownload}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 min-h-[48px]"
              >
                <Download className="h-4 w-4" /> Download {formatBytes(result.newSize)} PDF
              </button>
              <button onClick={() => setIsPreviewOpen(true)} className="w-full rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-accent min-h-[44px]">
                Preview result
              </button>
              <button onClick={reset} className="w-full rounded-lg px-4 py-2 text-xs font-semibold text-muted-foreground hover:underline min-h-[44px]">
                Start over
              </button>
            </div>
          )}

          {errorMessage && (
            <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </>
      )}

      <ProcessingModal isOpen={isProcessing} stepName={processStep} percentage={progressPct} fileName={file?.name} />
      <PdfPreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} blobUrl={resultBlobUrl ?? undefined} title="Compressed preview" />
    </div>
  );
};
