'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { FileNameInput } from '@/components/toolkit/FileNameInput';
import { splitPdfBySize, zipParts, SplitPart } from '@/lib/split-by-size';
import { triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { addRecentJob } from '@/lib/recent-jobs';
import { Package, RefreshCw, Download, AlertTriangle, Scissors } from 'lucide-react';

/**
 * Split by File Size — real measured sizes, page-boundary safe.
 * PRIVATE. POWERFUL. LOCAL.
 */
export const SplitBySizeWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [unit, setUnit] = useState<'KB' | 'MB'>('MB');
  const [value, setValue] = useState('5');
  const [pattern, setPattern] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Measuring pages...');
  const [progressPct, setProgressPct] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parts, setParts] = useState<SplitPart[] | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [zipUrl, setZipUrl] = useState<string | null>(null);

  const targetBytes = (() => {
    const v = parseFloat(value);
    if (!isFinite(v) || v <= 0) return 0;
    return Math.round(v * (unit === 'MB' ? 1024 * 1024 : 1024));
  })();

  const reset = () => {
    if (zipUrl) URL.revokeObjectURL(zipUrl);
    setFile(null); setParts(null); setErrorMessage(null); setZipUrl(null);
  };

  const handleFileSelected = (files: File[]) => {
    if (!files?.length) return;
    reset();
    setFile(files[0]);
    const stem = files[0].name.replace(/\.pdf$/i, '');
    setPattern(`${stem}_part_{n}.pdf`);
    // sensible default: aim for ~4 parts
    const quarter = files[0].size / 4;
    if (quarter > 1024 * 1024) { setUnit('MB'); setValue(String(Math.max(1, Math.round(quarter / 1048576)))); }
    else { setUnit('KB'); setValue(String(Math.max(100, Math.round(quarter / 1024)))); }
  };

  const handleSplit = async () => {
    if (!file || targetBytes <= 0) return;
    if (targetBytes >= file.size) {
      setErrorMessage(`The whole file (${formatBytes(file.size)}) already fits inside the target (${formatBytes(targetBytes)}). Increase the part size or use a smaller target.`);
      return;
    }
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const res = await splitPdfBySize(
        file,
        { targetBytes, filenamePattern: pattern || undefined, originalName: file.name },
        (msg, pct) => { setProcessStep(msg); setProgressPct(pct); }
      );
      setParts(res.parts);
      setOriginalSize(res.originalSize);
      const zip = await zipParts(res.parts);
      setZipUrl(URL.createObjectURL(zip));
      addRecentJob({
        toolId: 'split-by-size',
        toolName: 'Split by File Size',
        fileName: file.name.replace(/\.pdf$/i, '') + '_parts.zip',
        fileSize: zip.size,
        status: 'completed',
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Split failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadPart = (p: SplitPart) => triggerDownload(p.blob, p.filename);
  const downloadZip = () => {
    if (!zipUrl) return;
    const a = document.createElement('a');
    a.href = zipUrl;
    a.download = `${(file?.name ?? 'document').replace(/\.pdf$/i, '')}_parts.zip`;
    a.click();
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {!file && (
        <FileDropzone
          onFilesSelected={handleFileSelected}
          label="Drop your PDF here"
          sublabel="Large documents split into size-accurate parts — never mid-page"
        />
      )}

      {file && (
        <>
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div className="min-w-0">
              <p className="truncate font-bold text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground">Original size: {formatBytes(file.size)}</p>
            </div>
            <button onClick={reset} className="shrink-0 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-accent min-h-[44px]">
              <RefreshCw className="h-4 w-4" /> New file
            </button>
          </div>

          {!parts && (
            <div className="rounded-xl border bg-card p-4 space-y-4">
              <p className="text-sm font-bold inline-flex items-center gap-2"><Scissors className="h-4 w-4 text-primary" /> Target size per part</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Preset part sizes">
                {([
                  { label: '1 MB', v: '1' },
                  { label: '5 MB', v: '5' },
                  { label: '10 MB', v: '10' },
                ] as const).map((p) => (
                  <button
                    key={p.label}
                    onClick={() => { setValue(p.v); setUnit('MB'); }}
                    aria-pressed={unit === 'MB' && value === p.v}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold min-h-[44px] ${
                      unit === 'MB' && value === p.v ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  aria-label="Target size per part"
                  className="w-32 rounded-lg border bg-background px-3 py-2 text-sm"
                />
                <select value={unit} onChange={(e) => setUnit(e.target.value as 'KB' | 'MB')} aria-label="Size unit" className="rounded-lg border bg-background px-3 py-2 text-sm min-h-[44px]">
                  <option>KB</option>
                  <option>MB</option>
                </select>
                <span className="text-xs text-muted-foreground">
                  ≈ {Math.max(1, Math.ceil(file.size / Math.max(1, targetBytes)))} parts estimated
                </span>
              </div>
              <FileNameInput
                label="Filename pattern"
                value={pattern}
                onChange={setPattern}
                hint="{n} becomes the part number, e.g. document_part_01.pdf"
              />
              <p className="text-xs text-muted-foreground">
                Each part&apos;s size is measured for real after building — page counts are only the starting guess, so actual sizes always win. Splits happen only at page boundaries.
              </p>
              <button
                onClick={handleSplit}
                disabled={isProcessing || targetBytes <= 0}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[48px]"
              >
                <Scissors className="h-4 w-4" /> Split into parts
              </button>
            </div>
          )}

          {parts && (
            <div className="rounded-xl border bg-card p-4 space-y-4">
              <p className="text-sm font-bold inline-flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> {parts.length} parts created</p>
              <div className="space-y-2">
                {parts.map((p, i) => (
                  <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{p.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        Pages {p.pages[0]}–{p.pages[p.pages.length - 1]} • {p.pages.length} pages
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${p.size <= targetBytes ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {formatBytes(p.size)}
                      </span>
                      <button onClick={() => downloadPart(p)} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-accent min-h-[44px]">
                        <Download className="h-3.5 w-3.5" /> Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {parts.some((p) => p.size > targetBytes) && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Note: some parts exceed the target because a single page alone is larger than the target — it cannot be split further without breaking the page.
                </p>
              )}
              <button
                onClick={downloadZip}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 min-h-[48px]"
              >
                <Package className="h-4 w-4" /> Download all as ZIP
              </button>
              <button onClick={reset} className="w-full rounded-lg px-4 py-2 text-xs font-semibold text-muted-foreground hover:underline min-h-[44px]">
                Split another file
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
    </div>
  );
};
