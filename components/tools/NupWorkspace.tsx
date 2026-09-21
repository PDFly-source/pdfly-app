'use client';

import React, { useState, useEffect } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { FileNameInput } from '@/components/toolkit/FileNameInput';
import { PdfPreviewModal } from '@/components/toolkit/PdfPreviewModal';
import { nupPdf, NupLayout, NUP_LAYOUTS, PAPER_SIZES, SheetOrientation, PageOrder } from '@/lib/nup-pdf';
import { PDFDocument } from 'pdf-lib';
import { triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { ensurePdfExtension } from '@/lib/suggest-filename';
import { addRecentJob } from '@/lib/recent-jobs';
import { LayoutGrid, RefreshCw, AlertTriangle, Eye, Download } from 'lucide-react';

/**
 * N-Up PDF — multiple pages per sheet with a live grid preview.
 * PRIVATE. POWERFUL. LOCAL.
 */
export const NupWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('nup');
  const [totalPages, setTotalPages] = useState(0);
  const [pageSizes, setPageSizes] = useState<{ w: number; h: number }[]>([]);

  const [layout, setLayout] = useState<NupLayout>(2);
  const [paper, setPaper] = useState<keyof typeof PAPER_SIZES>('a4');
  const [sheetOrientation, setSheetOrientation] = useState<SheetOrientation>('portrait');
  const [cellOrientation, setCellOrientation] = useState<SheetOrientation>('portrait');
  const [pageOrder, setPageOrder] = useState<PageOrder>('across');
  const [margin, setMargin] = useState(20);
  const [gutter, setGutter] = useState(8);
  const [showBorder, setShowBorder] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Composing sheets...');
  const [progressPct, setProgressPct] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; size: number; sheets: number } | null>(null);
  const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const reset = () => {
    if (resultBlobUrl) URL.revokeObjectURL(resultBlobUrl);
    setFile(null); setResult(null); setResultBlobUrl(null); setErrorMessage(null);
  };

  const handleFileSelected = (files: File[]) => {
    if (!files?.length) return;
    reset();
    setFile(files[0]);
    setFileName(`nup_${files[0].name.replace(/\.pdf$/i, '')}`);
    (async () => {
      try {
        const doc = await PDFDocument.load(await files[0].arrayBuffer(), { ignoreEncryption: true });
        setTotalPages(doc.getPageCount());
        setPageSizes(Array.from({ length: Math.min(doc.getPageCount(), 4) }, (_, i) => {
          const s = doc.getPage(i).getSize();
          return { w: s.width, h: s.height };
        }));
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to read the PDF.');
      }
    })();
  };

  const cellsPerSheet = layout;
  const sheets = Math.max(1, Math.ceil(totalPages / cellsPerSheet));

  // grid preview geometry (CSS only — mirrors the engine math)
  const previewGrid = (() => {
    const sheetPortrait = sheetOrientation === 'portrait';
    const { width, height } = PAPER_SIZES[paper];
    const sheetW = sheetPortrait ? width : height;
    const sheetH = sheetPortrait ? height : width;
    let rows: number, cols: number;
    if (layout === 1) { rows = 1; cols = 1; }
    else if (layout === 2) { sheetPortrait ? (rows = 2, cols = 1) : (rows = 1, cols = 2); }
    else if (layout === 4) { rows = 2; cols = 2; }
    else if (layout === 6) { sheetPortrait ? (rows = 3, cols = 2) : (rows = 2, cols = 3); }
    else { rows = 3; cols = 3; }
    return { rows, cols, aspect: sheetH / sheetW, cellAspect: sheetPortrait ? undefined : undefined };
  })();

  const handleNup = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const { width, height } = PAPER_SIZES[paper];
      const res = await nupPdf(
        file,
        {
          layout,
          sheetOrientation,
          paperWidth: width,
          paperHeight: height,
          cellOrientation,
          margin,
          gutter,
          showBorder,
          pageOrder,
          fitToCell: true,
        },
        (msg, pct) => { setProcessStep(msg); setProgressPct(pct); }
      );
      setResultBlobUrl(URL.createObjectURL(res.blob));
      setResult({ blob: res.blob, size: res.blob.size, sheets: res.sheets });
      addRecentJob({
        toolId: 'nup-pdf',
        toolName: 'N-Up PDF',
        fileName: ensurePdfExtension(fileName),
        fileSize: res.blob.size,
        status: 'completed',
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'N-Up composition failed.');
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
          sublabel="Notes, handouts, study material — cut printing cost with 2/4/6/9 pages per sheet"
        />
      )}

      {file && (
        <>
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div className="min-w-0">
              <p className="truncate font-bold text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)} • {totalPages} pages → {sheets} sheets</p>
            </div>
            <button onClick={reset} className="shrink-0 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-accent min-h-[44px]">
              <RefreshCw className="h-4 w-4" /> New file
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* live preview */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <p className="text-sm font-bold inline-flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-primary" /> Live preview — sheet 1</p>
              <div className="flex justify-center">
                <div
                  className="relative bg-background border rounded shadow-sm"
                  style={{ width: '100%', maxWidth: 260, aspectRatio: `${sheetOrientation === 'portrait' ? PAPER_SIZES[paper].width / PAPER_SIZES[paper].height : PAPER_SIZES[paper].height / PAPER_SIZES[paper].width}` }}
                >
                  <div
                    className="absolute grid gap-1"
                    style={{
                      inset: `${(margin / ((sheetOrientation === 'portrait' ? PAPER_SIZES[paper].height : PAPER_SIZES[paper].width)) * 260)}px`,
                      gridTemplateColumns: `repeat(${previewGrid.cols}, 1fr)`,
                      gridTemplateRows: `repeat(${previewGrid.rows}, 1fr)`,
                    }}
                  >
                    {Array.from({ length: Math.min(layout, totalPages) }, (_, i) => (
                      <div
                        key={i}
                        className={`rounded-sm flex items-center justify-center text-[10px] font-bold text-muted-foreground ${showBorder ? 'border border-dashed' : ''}`}
                        style={{ background: 'rgba(109, 31, 53, 0.06)' }}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {previewGrid.rows}×{previewGrid.cols} grid • {sheetOrientation} sheet • {pageOrder === 'across' ? 'left→right, then down' : 'top→bottom, then across'}
              </p>
            </div>

            {/* settings */}
            <div className="rounded-xl border bg-card p-4 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Pages per sheet</p>
                <div className="flex flex-wrap gap-2">
                  {NUP_LAYOUTS.map((l) => (
                    <button
                      key={l.value}
                      onClick={() => setLayout(l.value)}
                      className={`rounded-lg border px-3.5 py-2 text-sm font-semibold min-h-[44px] ${layout === l.value ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-muted-foreground space-y-1">
                  Paper size
                  <select value={paper} onChange={(e) => setPaper(e.target.value as keyof typeof PAPER_SIZES)} className="w-full rounded-lg border bg-background px-2 py-2 text-sm min-h-[44px]">
                    {Object.entries(PAPER_SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold text-muted-foreground space-y-1">
                  Page order
                  <select value={pageOrder} onChange={(e) => setPageOrder(e.target.value as PageOrder)} className="w-full rounded-lg border bg-background px-2 py-2 text-sm min-h-[44px]">
                    <option value="across">Across, then down</option>
                    <option value="down">Down, then across</option>
                  </select>
                </label>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Sheet orientation</p>
                <div className="flex gap-2">
                  {(['portrait', 'landscape'] as const).map((o) => (
                    <button key={o} onClick={() => setSheetOrientation(o)} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold min-h-[44px] ${sheetOrientation === o ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
                      {o === 'portrait' ? 'Portrait' : 'Landscape'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Page rotation (portrait pages lie sideways on landscape sheets)</p>
                <div className="flex gap-2">
                  {(['portrait', 'landscape'] as const).map((o) => (
                    <button key={o} onClick={() => setCellOrientation(o)} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold min-h-[44px] ${cellOrientation === o ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
                      Keep {o}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-muted-foreground space-y-1">
                  Margin (pt): {margin}
                  <input type="range" min="0" max="60" value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="w-full accent-[#6D1F35]" />
                </label>
                <label className="text-xs font-semibold text-muted-foreground space-y-1">
                  Gutter (pt): {gutter}
                  <input type="range" min="0" max="40" value={gutter} onChange={(e) => setGutter(Number(e.target.value))} className="w-full accent-[#6D1F35]" />
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium min-h-[44px]">
                <input type="checkbox" checked={showBorder} onChange={(e) => setShowBorder(e.target.checked)} className="h-4 w-4 accent-[#6D1F35]" />
                Draw thin borders around each page
              </label>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-4">
            <FileNameInput label="Output filename" value={fileName} onChange={setFileName} extension=".pdf" hint="Saved to your device only" />
            <button
              onClick={handleNup}
              disabled={isProcessing}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[48px]"
            >
              <Download className="h-4 w-4" /> Create {sheets}-sheet {layout}-up PDF
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
              title={`${result.sheets} sheets composed`}
              downloadLabel="Download"
              onDownload={handleDownload}
              onReset={reset}
              resetLabel="Compose another"
              onPreview={() => setIsPreviewOpen(true)}
              previewLabel="Preview"
              additionalNote={`${totalPages} pages placed ${layout}-up — processed 100% locally.`}
            />
          )}

          <PdfPreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} blobUrl={resultBlobUrl ?? undefined} title="N-Up preview" />
        </>
      )}

      <ProcessingModal isOpen={isProcessing} stepName={processStep} percentage={progressPct} fileName={file?.name} />
    </div>
  );
};
