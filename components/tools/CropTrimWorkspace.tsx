'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { FileNameInput } from '@/components/toolkit/FileNameInput';
import { PdfPreviewModal } from '@/components/toolkit/PdfPreviewModal';
import { cropPdf, autoTrimPdf, parseRange, CropMargins, AutoTrimMode } from '@/lib/crop-trim';
import { autoDetectContentBox } from '@/lib/crop-trim';
import { getPdfDocumentFromFile } from '@/lib/pdfjs-init';
import { triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { ensurePdfExtension } from '@/lib/suggest-filename';
import { addRecentJob } from '@/lib/recent-jobs';
import { Crop, RefreshCw, AlertTriangle, Eye, Wand2, Download } from 'lucide-react';

/**
 * Crop & Auto-Trim PDF — visual crop with drag handles, before/after preview.
 * PRIVATE. POWERFUL. LOCAL.
 */
export const CropTrimWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('cropped');
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [pageDims, setPageDims] = useState<{ w: number; h: number } | null>(null);

  // crop overlay in page-relative fractions (0..1)
  const [crop, setCrop] = useState({ top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 });
  const [applyTo, setApplyTo] = useState<'current' | 'range' | 'all'>('current');
  const [rangeStr, setRangeStr] = useState('');
  const [manualMm, setManualMm] = useState(false);
  const [mmValues, setMmValues] = useState<CropMargins>({ top: 5, right: 5, bottom: 5, left: 5 });

  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Cropping...');
  const [progressPct, setProgressPct] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; size: number; pages: number[] } | null>(null);
  const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const dragRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'top' | 'right' | 'bottom' | 'left' | null>(null);

  const reset = () => {
    if (pageUrl) URL.revokeObjectURL(pageUrl);
    if (resultBlobUrl) URL.revokeObjectURL(resultBlobUrl);
    setFile(null); setResult(null); setResultBlobUrl(null); setErrorMessage(null);
    setPageUrl(null); setBeforeUrl(null); setAfterUrl(null); setShowCompare(false);
  };

  const handleFileSelected = (files: File[]) => {
    if (!files?.length) return;
    reset();
    setFile(files[0]);
    setFileName(`cropped_${files[0].name.replace(/\.pdf$/i, '')}`);
  };

  // render current page for the crop canvas
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    (async () => {
      try {
        const buf = await file.arrayBuffer();
        const doc = await getPdfDocumentFromFile(buf);
        if (cancelled) return;
        setTotalPages(doc.numPages);
        const page = await doc.getPage(currentPage);
        const v1 = page.getViewport({ scale: 1 });
        if (cancelled) return;
        setPageDims({ w: v1.width, h: v1.height });
        const scale = 640 / v1.width;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (cancelled) { canvas.width = 0; return; }
        if (pageUrl) URL.revokeObjectURL(pageUrl);
        canvas.toBlob((blob) => {
          if (blob && !cancelled) setPageUrl(URL.createObjectURL(blob));
          canvas.width = 0;
          canvas.height = 0;
        }, 'image/jpeg', 0.9);
      } catch (err: any) {
        if (!cancelled) setErrorMessage(err?.message || 'Failed to open the PDF.');
      }
    })();
    return () => { cancelled = true; };
  }, [file, currentPage]);

  // drag handle logic — converts pointer movement into crop fractions
  useEffect(() => {
    if (!dragging || !dragRef.current) return;
    const move = (e: PointerEvent) => {
      const rect = dragRef.current!.getBoundingClientRect();
      const fx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const fy = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
      setCrop((c) => {
        const next = { ...c };
        if (dragging === 'top') next.top = Math.min(0.45, Math.max(0, fy));
        if (dragging === 'bottom') next.bottom = Math.min(0.45, Math.max(0, 1 - fy));
        if (dragging === 'left') next.left = Math.min(0.45, Math.max(0, fx));
        if (dragging === 'right') next.right = Math.min(0.45, Math.max(0, 1 - fx));
        return next;
      });
    };
    const up = () => setDragging(null);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [dragging]);

  const runAutoTrim = useCallback(async (mode: AutoTrimMode) => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      // preview: detect box on the current page and show before/after
      const buf = await file.arrayBuffer();
      const doc = await getPdfDocumentFromFile(buf);
      const { box } = await autoDetectContentBox(doc, currentPage, mode);
      if (pageUrl) setBeforeUrl(pageUrl);
      // render the "after" image by cropping the rendered page canvas
      const page = await doc.getPage(currentPage);
      const scale = 640 / page.getViewport({ scale: 1 }).width;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const after = document.createElement('canvas');
      const sx = box.x * scale;
      const sy = (viewport.height - (box.y + box.height) * scale);
      after.width = Math.max(1, box.width * scale);
      after.height = Math.max(1, box.height * scale);
      const actx = after.getContext('2d')!;
      actx.drawImage(canvas, sx, sy, after.width, after.height, 0, 0, after.width, after.height);
      after.toBlob((b) => b && setAfterUrl(URL.createObjectURL(b)), 'image/jpeg', 0.9);
      canvas.width = 0; canvas.height = 0;
      setShowCompare(true);

      // apply to selection
      const res = await autoTrimPdf(
        file,
        mode,
        { mode: applyTo, rangeStr, currentPage, },
        (msg, pct) => { setProcessStep(msg); setProgressPct(pct); }
      );
      setResultBlobUrl(URL.createObjectURL(res.blob));
      setResult({ blob: res.blob, size: res.blob.size, pages: res.trimmedPages });
      addRecentJob({
        toolId: 'crop-trim-pdf',
        toolName: 'Crop & Auto-Trim PDF',
        fileName: ensurePdfExtension(fileName),
        fileSize: res.blob.size,
        status: 'completed',
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Auto-trim failed.');
    } finally {
      setIsProcessing(false);
    }
  }, [file, currentPage, applyTo, rangeStr, pageUrl, fileName]);

  const handleCrop = async () => {
    if (!file || !pageDims) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      let margins: CropMargins;
      if (manualMm) {
        const pt = 2.8346; // mm → pt
        margins = {
          top: mmValues.top * pt,
          right: mmValues.right * pt,
          bottom: mmValues.bottom * pt,
          left: mmValues.left * pt,
        };
      } else {
        margins = {
          top: crop.top * pageDims.h,
          right: crop.right * pageDims.w,
          bottom: crop.bottom * pageDims.h,
          left: crop.left * pageDims.w,
        };
      }
      const res = await cropPdf(
        file,
        margins,
        { mode: applyTo, rangeStr, currentPage },
        (msg, pct) => { setProcessStep(msg); setProgressPct(pct); }
      );
      setResultBlobUrl(URL.createObjectURL(res.blob));
      setResult({ blob: res.blob, size: res.blob.size, pages: res.croppedPages });
      addRecentJob({
        toolId: 'crop-trim-pdf',
        toolName: 'Crop & Auto-Trim PDF',
        fileName: ensurePdfExtension(fileName),
        fileSize: res.blob.size,
        status: 'completed',
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Crop failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (result) triggerDownload(result.blob, ensurePdfExtension(fileName));
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {!file && (
        <FileDropzone
          onFilesSelected={handleFileSelected}
          label="Drop your PDF here"
          sublabel="Visual crop, white-margin removal, and scanner-border cleanup"
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold inline-flex items-center gap-2"><Crop className="h-4 w-4 text-primary" /> Visual crop — page {currentPage} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40 min-h-[44px]">← Prev</button>
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40 min-h-[44px]">Next →</button>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div ref={dragRef} className="relative w-full max-w-md select-none touch-none">
                {pageUrl && (
                  <img src={pageUrl} alt={`Page ${currentPage} preview`} className="w-full h-auto rounded-md border" draggable={false} />
                )}
                {/* crop overlay */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    boxShadow: `inset 0 0 0 9999px rgba(0,0,0,0.45)`,
                    clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                  }}
                />
                <div
                  className="absolute border-2 border-primary pointer-events-none"
                  style={{
                    top: `${crop.top * 100}%`,
                    left: `${crop.left * 100}%`,
                    right: `${crop.right * 100}%`,
                    bottom: `${crop.bottom * 100}%`,
                  }}
                >
                  <div className="absolute inset-0 border border-dashed border-primary/40" />
                </div>
                {/* handles */}
                {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
                  <button
                    key={side}
                    aria-label={`Adjust ${side} crop edge`}
                    onPointerDown={(e) => { e.preventDefault(); setDragging(side); }}
                    className={`absolute bg-primary rounded-full h-6 w-6 touch-none z-10 cursor-pointer ${side === 'top' ? 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''} ${side === 'bottom' ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' : ''} ${side === 'left' ? 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2' : ''} ${side === 'right' ? 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2' : ''}`}
                    style={{ opacity: manualMm ? 0.35 : 1, pointerEvents: manualMm ? 'none' : 'auto' }}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Drag the handles to set crop edges (relative to this page). Original stays untouched until you export.</p>
            </div>

            <label className="flex items-center gap-3 text-sm font-medium min-h-[44px]">
              <input type="checkbox" checked={manualMm} onChange={(e) => setManualMm(e.target.checked)} className="h-4 w-4 accent-[#6D1F35]" />
              Use exact margins in millimeters instead of handles
            </label>
            {manualMm && (
              <div className="grid grid-cols-4 gap-2">
                {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                  <label key={side} className="text-xs font-semibold text-muted-foreground space-y-1">
                    {side[0].toUpperCase() + side.slice(1)} (mm)
                    <input
                      type="number"
                      min="0"
                      value={mmValues[side]}
                      onChange={(e) => setMmValues((v) => ({ ...v, [side]: Math.max(0, parseFloat(e.target.value) || 0) }))}
                      className="w-full rounded-lg border bg-background px-2 py-2 text-sm"
                    />
                  </label>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Apply crop to</p>
              <div className="flex flex-wrap gap-2">
                {([
                  { id: 'current', label: 'This page' },
                  { id: 'range', label: 'Page range' },
                  { id: 'all', label: 'All pages' },
                ] as const).map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setApplyTo(o.id)}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold min-h-[44px] ${applyTo === o.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {applyTo === 'range' && (
                <input
                  value={rangeStr}
                  onChange={(e) => setRangeStr(e.target.value)}
                  placeholder={`e.g. 1-3, 5 (of ${totalPages})`}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  aria-label="Page range"
                />
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-3">
            <p className="text-sm font-bold inline-flex items-center gap-2"><Wand2 className="h-4 w-4 text-primary" /> Auto-trim modes</p>
            <p className="text-xs text-muted-foreground">Each page&apos;s content boundaries are detected individually and cropped with 1.5% safety padding.</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => runAutoTrim('white')} disabled={isProcessing} className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-accent min-h-[44px]">Remove white margins</button>
              <button onClick={() => runAutoTrim('black')} disabled={isProcessing} className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-accent min-h-[44px]">Remove black scanner borders</button>
              <button onClick={() => runAutoTrim('content')} disabled={isProcessing} className="rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-accent min-h-[44px]">Auto-detect content bounds</button>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-4">
            <FileNameInput label="Output filename" value={fileName} onChange={setFileName} extension=".pdf" hint="The original file is never modified" />
            <button
              onClick={handleCrop}
              disabled={isProcessing}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[48px]"
            >
              <Crop className="h-4 w-4" /> Apply crop & export
            </button>
          </div>

          {showCompare && beforeUrl && afterUrl && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <p className="text-sm font-bold">Before / after</p>
              <div className="grid grid-cols-2 gap-3">
                <figure className="space-y-1">
                  <img src={beforeUrl} alt="Before trim" className="w-full h-auto rounded-md border" />
                  <figcaption className="text-xs text-muted-foreground text-center">Before</figcaption>
                </figure>
                <figure className="space-y-1">
                  <img src={afterUrl} alt="After trim" className="w-full h-auto rounded-md border" />
                  <figcaption className="text-xs text-muted-foreground text-center">After</figcaption>
                </figure>
              </div>
            </div>
          )}

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
              title="Cropped document ready"
              downloadLabel="Download"
              onDownload={handleDownload}
              onReset={reset}
              resetLabel="Crop another"
              onPreview={() => setIsPreviewOpen(true)}
              previewLabel="Preview"
              additionalNote={`${result.pages.length} page${result.pages.length > 1 ? 's' : ''} cropped — processed 100% locally.`}
            />
          )}

          <PdfPreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} blobUrl={resultBlobUrl ?? undefined} title="Cropped preview" />
        </>
      )}

      <ProcessingModal isOpen={isProcessing} stepName={processStep} percentage={progressPct} fileName={file?.name} />
    </div>
  );
};
