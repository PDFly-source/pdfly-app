'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import {
  applyBatesStamping,
  formatBatesNumber,
  triggerDownload,
  formatBytes,
  BatesStampingOptions,
} from '@/lib/pdf-engine';
import { getPdfDocumentFromFile, renderPageToCanvas } from '@/lib/pdfjs-init';
import { addRecentJob } from '@/lib/recent-jobs';
import {
  Hash,
  Eye,
  AlertCircle,
  FileText,
  RotateCw,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const BatesStampingWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [previewPage, setPreviewPage] = useState(1);

  // Bates Configuration Options
  const [prefix, setPrefix] = useState('CASE-2026-');
  const [suffix, setSuffix] = useState('');
  const [startNumber, setStartNumber] = useState(1);
  const [digits, setDigits] = useState(6);
  const [separator, setSeparator] = useState('-');
  const [font, setFont] = useState<'Helvetica' | 'HelveticaBold' | 'TimesRoman' | 'Courier'>('HelveticaBold');
  const [fontSize, setFontSize] = useState(10);
  const [opacity, setOpacity] = useState(1.0);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [position, setPosition] = useState<BatesStampingOptions['position']>('bottom-right');
  const [marginX, setMarginX] = useState(36);
  const [marginY, setMarginY] = useState(36);
  const [color, setColor] = useState('#000000');
  const [pageSelection, setPageSelection] = useState<'all' | 'selected' | 'range'>('all');
  const [pageRange, setPageRange] = useState('');

  // Preview & Processing state
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Applying legal Bates stamps...');
  const [progressPct, setProgressPct] = useState(0);

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Render thumbnail preview of current page
  useEffect(() => {
    if (!file) return;

    let isMounted = true;

    (async () => {
      try {
        const pdfJsDoc = await getPdfDocumentFromFile(file);
        const page = await pdfJsDoc.getPage(previewPage);
        const viewport = page.getViewport({ scale: 0.8 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        if (ctx && isMounted) {
          await (page.render({ canvasContext: ctx, viewport } as any) as any).promise;
          if (isMounted) {
            setPreviewDataUrl(canvas.toDataURL('image/jpeg', 0.85));
          }
        }
      } catch (err) {
        console.error('Preview render error', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [file, previewPage]);

  // Sample Bates stamp text for current preview page
  const sampleNumber = startNumber + (previewPage - 1);
  const sampleFormattedText = formatBatesNumber(prefix, sampleNumber, digits, suffix, separator);

  const handleApplyBates = async () => {
    if (!file) return;
    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPct(5);

    try {
      const outBlob = await applyBatesStamping(
        file,
        {
          prefix,
          suffix,
          startNumber,
          digits,
          separator,
          font,
          fontSize,
          opacity,
          rotation,
          position,
          marginX,
          marginY,
          color,
          pageSelection,
          pageRange,
        },
        (step, pct) => {
          setProcessStep(step);
          setProgressPct(pct);
        }
      );

      const baseName = file.name.replace(/\.pdf$/i, '');
      const outName = `${baseName}_bates.pdf`;
      setResultBlob(outBlob);
      setResultFileName(outName);

      addRecentJob({
        toolId: 'bates-stamping',
        toolName: 'Bates Stamping',
        fileName: outName,
        fileSize: outBlob.size,
        status: 'completed',
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Failed to apply Bates stamping.');
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
    setPreviewDataUrl(null);
  };

  if (resultBlob && file) {
    return (
      <SuccessView
        fileName={resultFileName}
        fileSize={resultBlob.size}
        pageCount={totalPages}
        downloadLabel="Download Bates-Stamped PDF"
        onDownload={handleDownload}
        onReset={handleReset}
        additionalNote="Legal Bates numbering applied across pages with exact alignment."
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
          title="Drop legal PDF document here"
          subtitle="Supports litigation exhibits, disclosure bundles, court filings, and contracts"
        />
      ) : (
        <div className="space-y-6">
          {/* Header Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/40 bg-card/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-burgundy/10 text-burgundy border border-burgundy/20">
                <Hash className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  {file.name}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-mono">
                    {totalPages} {totalPages === 1 ? 'page' : 'pages'}
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)} • Client-side processing</p>
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
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Stamping Error</p>
                <p className="text-xs opacity-90 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Main 2-Column Grid: Preview on Left, Settings on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Live Interactive Preview */}
            <div className="lg:col-span-6 rounded-2xl border border-border/50 bg-card/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-burgundy" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Live Stamp Preview
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

              {/* Preview Stage with Bates Stamp Overlay */}
              <div className="relative aspect-[1/1.414] w-full max-w-sm mx-auto bg-white rounded-lg shadow-md border border-border/60 overflow-hidden flex items-center justify-center">
                {previewDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewDataUrl}
                    alt="Page preview"
                    className="w-full h-full object-contain pointer-events-none select-none"
                  />
                ) : (
                  <div className="text-xs text-muted-foreground animate-pulse">Rendering page preview...</div>
                )}

                {/* Live Bates Overlay Box */}
                <div
                  className={`absolute pointer-events-none select-none transition-all duration-150 ${
                    position === 'top-left'
                      ? 'top-4 left-4'
                      : position === 'top-center'
                      ? 'top-4 left-1/2 -translate-x-1/2 text-center'
                      : position === 'top-right'
                      ? 'top-4 right-4 text-right'
                      : position === 'bottom-left'
                      ? 'bottom-4 left-4'
                      : position === 'bottom-center'
                      ? 'bottom-4 left-1/2 -translate-x-1/2 text-center'
                      : 'bottom-4 right-4 text-right'
                  }`}
                  style={{
                    opacity,
                    transform: `${
                      position.includes('center') ? '-translate-x-1/2 ' : ''
                    }rotate(${rotation}deg)`,
                  }}
                >
                  <span
                    className="inline-block px-1.5 py-0.5 rounded bg-amber-100/90 border border-amber-400 text-black shadow-sm font-mono tracking-wider font-bold"
                    style={{
                      fontSize: `${Math.max(9, fontSize * 0.9)}px`,
                      color,
                    }}
                  >
                    {sampleFormattedText}
                  </span>
                </div>
              </div>

              {/* Sample Output Display */}
              <div className="p-3 rounded-xl bg-secondary/50 border border-border/40 text-center">
                <span className="text-[11px] text-muted-foreground block">Page {previewPage} Sample Stamp:</span>
                <span className="font-mono text-sm font-bold tracking-widest text-foreground">
                  {sampleFormattedText}
                </span>
              </div>
            </div>

            {/* Settings & Options Column */}
            <div className="lg:col-span-6 space-y-6">
              {/* Numbering Format Section */}
              <div className="p-5 rounded-2xl border border-border/50 bg-card/60 space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-burgundy" />
                  Bates Number Format
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Prefix</label>
                    <input
                      type="text"
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                      placeholder="e.g. CASE-2026-"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-burgundy"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Suffix (Optional)</label>
                    <input
                      type="text"
                      value={suffix}
                      onChange={(e) => setSuffix(e.target.value)}
                      placeholder="e.g. -CONFIDENTIAL"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-burgundy"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Starting #</label>
                    <input
                      type="number"
                      min={1}
                      value={startNumber}
                      onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-burgundy"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Digits (Padding)</label>
                    <select
                      value={digits}
                      onChange={(e) => setDigits(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-burgundy"
                    >
                      <option value={3}>3 (001)</option>
                      <option value={4}>4 (0001)</option>
                      <option value={5}>5 (00001)</option>
                      <option value={6}>6 (000001)</option>
                      <option value={8}>8 (00000001)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Separator</label>
                    <select
                      value={separator}
                      onChange={(e) => setSeparator(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-burgundy"
                    >
                      <option value="-">Hyphen (-)</option>
                      <option value="/">Slash (/)</option>
                      <option value="_">Underscore (_)</option>
                      <option value=" ">Space</option>
                      <option value="">None</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Position & Placement Section */}
              <div className="p-5 rounded-2xl border border-border/50 bg-card/60 space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Stamp Position on Page
                </h4>

                {/* 6-Grid Placement Selector */}
                <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-secondary/40 border border-border/40 max-w-xs mx-auto">
                  {(
                    [
                      ['top-left', 'Top Left'],
                      ['top-center', 'Top Center'],
                      ['top-right', 'Top Right'],
                      ['bottom-left', 'Bottom Left'],
                      ['bottom-center', 'Bottom Center'],
                      ['bottom-right', 'Bottom Right'],
                    ] as const
                  ).map(([posKey, posLabel]) => (
                    <button
                      key={posKey}
                      type="button"
                      onClick={() => setPosition(posKey)}
                      className={`py-2.5 px-2 rounded-lg text-xs font-medium transition-all ${
                        position === posKey
                          ? 'bg-burgundy text-white shadow-sm font-semibold'
                          : 'bg-card hover:bg-card/80 text-foreground border border-border/40'
                      }`}
                    >
                      {posLabel}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Horizontal Margin</span>
                      <span className="font-mono">{marginX} pt</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      value={marginX}
                      onChange={(e) => setMarginX(parseInt(e.target.value, 10))}
                      className="w-full accent-burgundy"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Vertical Margin</span>
                      <span className="font-mono">{marginY} pt</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      value={marginY}
                      onChange={(e) => setMarginY(parseInt(e.target.value, 10))}
                      className="w-full accent-burgundy"
                    />
                  </div>
                </div>
              </div>

              {/* Typography & Appearance */}
              <div className="p-5 rounded-2xl border border-border/50 bg-card/60 space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Typography & Style
                </h4>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Font</label>
                    <select
                      value={font}
                      onChange={(e) => setFont(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-burgundy"
                    >
                      <option value="HelveticaBold">Helvetica Bold</option>
                      <option value="Helvetica">Helvetica</option>
                      <option value="Courier">Courier Mono</option>
                      <option value="TimesRoman">Times Roman</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Font Size</label>
                    <select
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-burgundy"
                    >
                      <option value={8}>8 pt (Compact)</option>
                      <option value={9}>9 pt</option>
                      <option value={10}>10 pt (Standard)</option>
                      <option value={11}>11 pt</option>
                      <option value={12}>12 pt (Prominent)</option>
                      <option value={14}>14 pt (Large)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Rotation</label>
                    <select
                      value={rotation}
                      onChange={(e) => setRotation(parseInt(e.target.value, 10) as any)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-burgundy"
                    >
                      <option value={0}>0° (Horizontal)</option>
                      <option value={90}>90° (Vertical Up)</option>
                      <option value={180}>180° (Inverted)</option>
                      <option value={270}>270° (Vertical Down)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <span className="text-xs font-medium text-muted-foreground">Color Preset:</span>
                  <div className="flex items-center gap-2">
                    {[
                      { hex: '#000000', label: 'Black' },
                      { hex: '#7A1C30', label: 'Burgundy' },
                      { hex: '#1D4ED8', label: 'Navy' },
                      { hex: '#374151', label: 'Charcoal' },
                      { hex: '#DC2626', label: 'Red' },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setColor(c.hex)}
                        title={c.label}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          color === c.hex ? 'border-foreground scale-110' : 'border-transparent opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Page Range Selection */}
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
                    placeholder="e.g. 2-10, 15, 20-25 (exclude cover)"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-burgundy"
                  />
                )}
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleApplyBates}
                className="w-full py-4 px-6 rounded-xl bg-burgundy hover:bg-burgundy-light text-white font-semibold shadow-lg shadow-burgundy/20 hover:shadow-burgundy/30 transition-all flex items-center justify-center gap-2 text-base"
              >
                <Hash className="w-5 h-5" />
                Apply Bates Stamping to PDF
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
