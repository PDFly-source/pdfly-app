'use client';

import React, { useState, useEffect } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import {
  invertPdfColors,
  triggerDownload,
  formatBytes,
  InvertColorsOptions,
} from '@/lib/pdf-engine';
import { getPdfDocumentFromFile } from '@/lib/pdfjs-init';
import { addRecentJob } from '@/lib/recent-jobs';
import {
  Moon,
  Sun,
  Eye,
  Sliders,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Contrast,
  Printer,
  Palette,
} from 'lucide-react';

export const InvertColorsWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [previewPage, setPreviewPage] = useState(1);

  // Invert Options
  const [mode, setMode] = useState<InvertColorsOptions['mode']>('dark_reader');
  const [quality, setQuality] = useState<InvertColorsOptions['quality']>('balanced');
  const [pageSelection, setPageSelection] = useState<'all' | 'selected' | 'range'>('all');
  const [pageRange, setPageRange] = useState('');

  // Interactive Live Preview
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [invertedPreviewUrl, setInvertedPreviewUrl] = useState<string | null>(null);
  const [previewSplit, setPreviewSplit] = useState(50); // percentage for split-screen

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Inverting PDF colors...');
  const [progressPct, setProgressPct] = useState(0);

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setErrorMessage(null);
    setPreviewPage(1);

    try {
      const pdfJsDoc = await getPdfDocumentFromFile(selected);
      setTotalPages(pdfJsDoc.numPages);
    } catch {
      // Continue gracefully
    }
  };

  // Render before & after preview whenever file, previewPage, or mode changes
  useEffect(() => {
    if (!file) return;
    let isMounted = true;

    (async () => {
      try {
        const pdfJsDoc = await getPdfDocumentFromFile(file);
        const page = await pdfJsDoc.getPage(previewPage);
        const viewport = page.getViewport({ scale: 0.85 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx || !isMounted) return;

        await (page.render({ canvasContext: ctx, viewport } as any) as any).promise;
        const origUrl = canvas.toDataURL('image/jpeg', 0.85);

        // Compute inverted canvas
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const len = data.length;

        for (let px = 0; px < len; px += 4) {
          const r = data[px];
          const g = data[px + 1];
          const b = data[px + 2];

          if (mode === 'full') {
            data[px] = 255 - r;
            data[px + 1] = 255 - g;
            data[px + 2] = 255 - b;
          } else if (mode === 'black_white') {
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            if (lum > 180) {
              data[px] = 12;
              data[px + 1] = 12;
              data[px + 2] = 12;
            } else if (lum < 90) {
              data[px] = 245;
              data[px + 1] = 245;
              data[px + 2] = 245;
            } else {
              data[px] = 255 - r;
              data[px + 1] = 255 - g;
              data[px + 2] = 255 - b;
            }
          } else if (mode === 'dark_reader') {
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            if (lum > 200) {
              data[px] = 20;
              data[px + 1] = 20;
              data[px + 2] = 22;
            } else if (lum < 80) {
              data[px] = 226;
              data[px + 1] = 224;
              data[px + 2] = 216;
            } else {
              data[px] = Math.round((255 - r) * 0.85 + 20);
              data[px + 1] = Math.round((255 - g) * 0.85 + 20);
              data[px + 2] = Math.round((255 - b) * 0.85 + 22);
            }
          } else if (mode === 'inverted_print') {
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            if (lum < 100) {
              data[px] = 255;
              data[px + 1] = 255;
              data[px + 2] = 255;
            } else if (lum > 180) {
              data[px] = 20;
              data[px + 1] = 20;
              data[px + 2] = 20;
            } else {
              data[px] = 255 - r;
              data[px + 1] = 255 - g;
              data[px + 2] = 255 - b;
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const invUrl = canvas.toDataURL('image/jpeg', 0.85);

        if (isMounted) {
          setOriginalPreviewUrl(origUrl);
          setInvertedPreviewUrl(invUrl);
        }
      } catch (err) {
        console.error('Invert preview error:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [file, previewPage, mode]);

  const handleInvertPdf = async () => {
    if (!file) return;
    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPct(5);

    try {
      const outBlob = await invertPdfColors(
        file,
        {
          mode,
          quality,
          pageSelection,
          pageRange,
        },
        (step, pct) => {
          setProcessStep(step);
          setProgressPct(pct);
        }
      );

      const baseName = file.name.replace(/\.pdf$/i, '');
      const outName = `${baseName}_inverted.pdf`;
      setResultBlob(outBlob);
      setResultFileName(outName);

      addRecentJob({
        toolId: 'invert-colors',
        toolName: 'Invert Colors',
        fileName: outName,
        fileSize: outBlob.size,
        status: 'completed',
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Failed to invert PDF colors.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (resultBlob && resultFileName) {
      triggerDownload(resultBlob, resultFileName);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResultBlob(null);
    setResultFileName('');
    setErrorMessage(null);
    setOriginalPreviewUrl(null);
    setInvertedPreviewUrl(null);
  };

  if (resultBlob && file) {
    return (
      <SuccessView
        fileName={resultFileName}
        fileSize={resultBlob.size}
        pageCount={totalPages}
        downloadLabel="Download Inverted PDF"
        onDownload={handleDownload}
        onReset={handleReset}
        additionalNote="High-fidelity color transformation applied across pages for eye comfort and accessibility."
      />
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {!file ? (
        <FileDropzone
          onFilesSelected={handleFileSelected}
          multiple={false}
          accept=".pdf,application/pdf"
          title="Drop PDF to invert colors for dark mode & high contrast"
          subtitle="Supports scanned textbooks, dark mode reading, accessibility high contrast, and ink-saving inverted print"
        />
      ) : (
        <div className="space-y-6">
          {/* File Summary Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/40 bg-card/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-burgundy/10 text-burgundy border border-burgundy/20">
                <Contrast className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  {file.name}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-mono">
                    {totalPages} {totalPages === 1 ? 'page' : 'pages'}
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)} • Client-side rendering</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 self-start sm:self-auto"
            >
              Choose different file
            </button>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 2-Column Layout: Split Interactive Preview on Left, Settings on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Split-Screen Interactive Before/After Preview */}
            <div className="lg:col-span-6 rounded-2xl border border-border/50 bg-card/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-burgundy" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Interactive Before / After
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <button
                    disabled={previewPage <= 1}
                    onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded hover:bg-secondary disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-mono">
                    {previewPage} / {totalPages}
                  </span>
                  <button
                    disabled={previewPage >= totalPages}
                    onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 rounded hover:bg-secondary disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Side-by-side or Split Stage */}
              <div className="relative aspect-[1/1.414] w-full max-w-sm mx-auto bg-neutral-900 rounded-lg shadow-md border border-border/60 overflow-hidden select-none">
                {/* Original Layer (underneath) */}
                {originalPreviewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={originalPreviewUrl}
                    alt="Original page"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  />
                )}

                {/* Inverted Layer (clipped by split percentage) */}
                {invertedPreviewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={invertedPreviewUrl}
                    alt="Inverted page"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    style={{
                      clipPath: `polygon(${previewSplit}% 0, 100% 0, 100% 100%, ${previewSplit}% 100%)`,
                    }}
                  />
                )}

                {/* Split line indicator */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-burgundy shadow-[0_0_8px_rgba(122,28,48,0.8)] pointer-events-none"
                  style={{ left: `${previewSplit}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-burgundy text-white flex items-center justify-center text-[9px] font-bold shadow-md">
                    ⇄
                  </div>
                </div>

                {/* Floating Labels */}
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-medium backdrop-blur-sm">
                  Original
                </div>
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-burgundy/90 text-white text-[10px] font-medium backdrop-blur-sm">
                  Inverted
                </div>
              </div>

              {/* Split Slider Control */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Slide to inspect comparison:</span>
                  <span className="font-mono">{previewSplit}% Inverted</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={previewSplit}
                  onChange={(e) => setPreviewSplit(parseInt(e.target.value, 10))}
                  className="w-full accent-burgundy cursor-ew-resize"
                />
              </div>
            </div>

            {/* Options & Settings Column */}
            <div className="lg:col-span-6 space-y-6">
              {/* Color Inversion Mode Selector */}
              <div className="p-5 rounded-2xl border border-border/50 bg-card/60 space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-burgundy" />
                  Color Inversion Mode
                </h4>

                <div className="space-y-3">
                  {[
                    {
                      id: 'dark_reader',
                      title: 'Dark Reader (Eye-Friendly OLED)',
                      desc: 'Deep slate background with warm off-white typography. Reduces retinal fatigue while preserving color accent hues.',
                    },
                    {
                      id: 'black_white',
                      title: 'Black ↔ White High Contrast',
                      desc: 'Pure high-contrast inversion: white paper becomes deep black, and dark text becomes crisp white. Ideal for low-vision accessibility.',
                    },
                    {
                      id: 'full',
                      title: 'Full Negative (Color Inversion)',
                      desc: 'Inverts all RGB chromatic channels (255 - R, 255 - G, 255 - B). Standard photonegative effect.',
                    },
                    {
                      id: 'inverted_print',
                      title: 'Inverted Print (Ink Saver)',
                      desc: 'Converts dark scanned slides or blackboard notes into white paper with dark text for ink-efficient printing.',
                    },
                  ].map((item) => (
                    <label
                      key={item.id}
                      onClick={() => setMode(item.id as any)}
                      className={`flex items-start gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        mode === item.id
                          ? 'border-burgundy/60 bg-burgundy/5 shadow-sm'
                          : 'border-border/50 hover:bg-card/80'
                      }`}
                    >
                      <input
                        type="radio"
                        name="invertMode"
                        value={item.id}
                        checked={mode === item.id}
                        onChange={() => setMode(item.id as any)}
                        className="mt-0.5 accent-burgundy"
                      />
                      <div>
                        <span className="font-semibold text-sm text-foreground block">{item.title}</span>
                        <span className="text-xs text-muted-foreground mt-0.5 block">{item.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Quality Preset Selection */}
              <div className="p-5 rounded-2xl border border-border/50 bg-card/60 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Rendering Resolution & Quality
                </h4>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'balanced', label: 'Balanced', dpi: '150 DPI', note: 'Fast & Crisp' },
                    { id: 'high', label: 'High Fidelity', dpi: '300 DPI', note: 'Print Quality' },
                    { id: 'small', label: 'Compact', dpi: '96 DPI', note: 'Lightweight' },
                  ].map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setQuality(q.id as any)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        quality === q.id
                          ? 'border-burgundy bg-burgundy/10 text-burgundy font-semibold shadow-sm'
                          : 'border-border/50 bg-card hover:bg-card/80 text-foreground'
                      }`}
                    >
                      <span className="text-xs font-semibold block">{q.label}</span>
                      <span className="text-[11px] text-muted-foreground font-mono block mt-0.5">{q.dpi}</span>
                      <span className="text-[10px] text-muted-foreground/80 block mt-0.5">{q.note}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Page Selection Scope */}
              <div className="p-5 rounded-2xl border border-border/50 bg-card/60 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Page Scope
                </h4>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="pageSelection"
                      checked={pageSelection === 'all'}
                      onChange={() => setPageSelection('all')}
                      className="accent-burgundy"
                    />
                    <span>All Pages (1 to {totalPages})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="pageSelection"
                      checked={pageSelection === 'range'}
                      onChange={() => setPageSelection('range')}
                      className="accent-burgundy"
                    />
                    <span>Custom Range</span>
                  </label>
                </div>
                {pageSelection === 'range' && (
                  <input
                    type="text"
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    placeholder="e.g. 1-10, 15, 20-30"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-burgundy"
                  />
                )}
              </div>

              {/* Notice regarding rasterization */}
              <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/30 text-[11px] text-muted-foreground space-y-1">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-burgundy" />
                  Fidelity & Readability Guarantee
                </span>
                <p>
                  Pages are rendered at up to 300 DPI to guarantee crisp vector and font clarity under inverted dark backgrounds.
                </p>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleInvertPdf}
                className="w-full py-4 px-6 rounded-xl bg-burgundy hover:bg-burgundy-light text-white font-semibold shadow-lg shadow-burgundy/20 hover:shadow-burgundy/30 transition-all flex items-center justify-center gap-2 text-base"
              >
                <Contrast className="w-5 h-5" />
                Generate Inverted PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Processing Modal */}
      <ProcessingModal
        isOpen={isProcessing}
        stepText={processStep}
        progressPercentage={progressPct}
      />
    </div>
  );
};
