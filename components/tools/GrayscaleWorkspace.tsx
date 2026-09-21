'use client';

import React, { useState, useEffect } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { FileNameInput } from '@/components/toolkit/FileNameInput';
import { PdfPreviewModal } from '@/components/toolkit/PdfPreviewModal';
import { applyInkMode, renderInkPreview, InkMode } from '@/lib/ink-saver';
import { getPdfDocumentFromFile } from '@/lib/pdfjs-init';
import { triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { ensurePdfExtension } from '@/lib/suggest-filename';
import { addRecentJob } from '@/lib/recent-jobs';
import { Droplets, RefreshCw, AlertTriangle, Download } from 'lucide-react';

/**
 * Grayscale / Ink Saver — with live mode preview before export.
 * PRIVATE. POWERFUL. LOCAL.
 */
export const GrayscaleWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('grayscale');
  const [totalPages, setTotalPages] = useState(0);

  const [mode, setMode] = useState<InkMode>('grayscale');
  const [dpi, setDpi] = useState(150);
  const [quality, setQuality] = useState(0.8);
  const [bwThreshold, setBwThreshold] = useState(160);
  const [inkReduction, setInkReduction] = useState(0.5);

  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [convertedPreview, setConvertedPreview] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Converting...');
  const [progressPct, setProgressPct] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; size: number; pages: number } | null>(null);
  const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const reset = () => {
    if (resultBlobUrl) URL.revokeObjectURL(resultBlobUrl);
    setFile(null); setResult(null); setResultBlobUrl(null); setErrorMessage(null);
    setOriginalPreview(null); setConvertedPreview(null);
  };

  const handleFileSelected = (files: File[]) => {
    if (!files?.length) return;
    reset();
    setFile(files[0]);
    setFileName(`${files[0].name.replace(/\.pdf$/i, '')}_${mode === 'grayscale' ? 'gray' : mode === 'bw' ? 'bw' : 'ink-saver'}`);
    (async () => {
      try {
        const doc = await getPdfDocumentFromFile(await files[0].arrayBuffer());
        setTotalPages(doc.numPages);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to read the PDF.');
      }
    })();
  };

  // live before/after preview of page 1
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    let origUrl: string | null = null;
    (async () => {
      try {
        const orig = await renderInkPreview(file, 1, 'original', { bwThreshold, inkReduction });
        if (cancelled) return;
        origUrl = orig.dataUrl;
        setOriginalPreview(orig.dataUrl);
        if (mode !== 'original') {
          const conv = await renderInkPreview(file, 1, mode, { bwThreshold, inkReduction });
          if (cancelled) return;
          setConvertedPreview(conv.dataUrl);
        } else {
          setConvertedPreview(null);
        }
      } catch (err: any) {
        if (!cancelled) setErrorMessage(err?.message || 'Preview failed.');
      }
    })();
    return () => { cancelled = true; };
  }, [file, mode, bwThreshold, inkReduction]);

  const handleConvert = async () => {
    if (!file || mode === 'original') return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const res = await applyInkMode(
        file,
        {
          mode: mode as 'grayscale' | 'bw' | 'ink-saver',
          dpi,
          bwThreshold,
          inkReduction,
          quality,
        },
        (msg, pct) => { setProcessStep(msg); setProgressPct(pct); }
      );
      setResultBlobUrl(URL.createObjectURL(res.blob));
      setResult({ blob: res.blob, size: res.newSize, pages: res.convertedPages });
      addRecentJob({
        toolId: 'grayscale-ink-saver',
        toolName: 'Grayscale / Ink Saver',
        fileName: ensurePdfExtension(fileName),
        fileSize: res.newSize,
        status: 'completed',
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Conversion failed.');
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
          sublabel="Grayscale, pure black & white, or ink-saving output with a live preview"
        />
      )}

      {file && (
        <>
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div className="min-w-0">
              <p className="truncate font-bold text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)} • {totalPages} pages</p>
            </div>
            <button onClick={reset} className="shrink-0 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-accent min-h-[44px]">
              <RefreshCw className="h-4 w-4" /> New file
            </button>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-4">
            <p className="text-sm font-bold inline-flex items-center gap-2"><Droplets className="h-4 w-4 text-primary" /> Mode</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {([
                { id: 'original', label: 'Original', hint: 'No change' },
                { id: 'grayscale', label: 'Grayscale', hint: 'Print-friendly gray' },
                { id: 'bw', label: 'Black & White', hint: 'Pure threshold' },
                { id: 'ink-saver', label: 'Ink Saver', hint: 'Lighter fills, dark text' },
              ] as { id: InkMode; label: string; hint: string }[]).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-semibold min-h-[64px] flex flex-col items-center gap-0.5 ${mode === m.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                >
                  {m.label}
                  <span className="text-[10px] opacity-80 font-normal">{m.hint}</span>
                </button>
              ))}
            </div>

            {originalPreview && mode !== 'original' && (
              <div className="grid grid-cols-2 gap-3">
                <figure className="space-y-1">
                  <img src={originalPreview} alt="Original page" className="w-full h-auto rounded-md border" />
                  <figcaption className="text-xs text-muted-foreground text-center">Original</figcaption>
                </figure>
                <figure className="space-y-1">
                  {convertedPreview
                    ? <img src={convertedPreview} alt={`${mode} preview`} className="w-full h-auto rounded-md border" />
                    : <div className="w-full aspect-[1/1.414] rounded-md border bg-muted animate-pulse" />}
                  <figcaption className="text-xs text-muted-foreground text-center">{mode === 'grayscale' ? 'Grayscale' : mode === 'bw' ? 'Black & White' : 'Ink Saver'}</figcaption>
                </figure>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="text-xs font-semibold text-muted-foreground space-y-1">
                Render DPI: {dpi} {dpi >= 150 ? '(text stays sharp)' : '(smaller file)'}
                <input type="range" min="96" max="300" step="6" value={dpi} onChange={(e) => setDpi(Number(e.target.value))} className="w-full accent-[#6D1F35]" />
              </label>
              <label className="text-xs font-semibold text-muted-foreground space-y-1">
                Image quality: {Math.round(quality * 100)}%
                <input type="range" min="50" max="95" value={Math.round(quality * 100)} onChange={(e) => setQuality(Number(e.target.value) / 100)} className="w-full accent-[#6D1F35]" />
              </label>
              {mode === 'bw' && (
                <label className="text-xs font-semibold text-muted-foreground space-y-1">
                  B&W threshold: {bwThreshold} (lower = more black)
                  <input type="range" min="80" max="220" value={bwThreshold} onChange={(e) => setBwThreshold(Number(e.target.value))} className="w-full accent-[#6D1F35]" />
                </label>
              )}
              {mode === 'ink-saver' && (
                <label className="text-xs font-semibold text-muted-foreground space-y-1">
                  Ink reduction: {Math.round(inkReduction * 100)}%
                  <input type="range" min="10" max="90" step="5" value={Math.round(inkReduction * 100)} onChange={(e) => setInkReduction(Number(e.target.value) / 100)} className="w-full accent-[#6D1F35]" />
                </label>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Conversion re-renders pages at the chosen DPI and applies the ink profile per pixel — text stays readable, and this works for every PDF (vector or scanned). The original file is untouched until you export.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-4">
            <FileNameInput label="Output filename" value={fileName} onChange={setFileName} extension=".pdf" hint="Saved to your device only" />
            <button
              onClick={handleConvert}
              disabled={isProcessing || mode === 'original'}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[48px]"
            >
              <Download className="h-4 w-4" /> Convert & export {totalPages} pages
            </button>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {result && (
            <SuccessView
              fileName={ensurePdfExtension(fileName)}
              fileSize={result.size}
              title="Ink profile applied"
              downloadLabel="Download"
              onDownload={handleDownload}
              onReset={reset}
              resetLabel="Convert another"
              onPreview={() => setIsPreviewOpen(true)}
              previewLabel="Preview"
              additionalNote={`${result.pages} pages converted — processed 100% locally.`}
            />
          )}

          <PdfPreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} blobUrl={resultBlobUrl ?? undefined} title="Converted preview" />
        </>
      )}

      <ProcessingModal isOpen={isProcessing} stepName={processStep} percentage={progressPct} fileName={file?.name} />
    </div>
  );
};
