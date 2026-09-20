'use client';

import React, { useState, useEffect } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { splitPdf, triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { getPdfDocumentFromFile, renderPageThumbnail } from '@/lib/pdfjs-init';
import { addRecentJob } from '@/lib/recent-jobs';
import {
  Scissors,
  Check,
  AlertCircle,
  FolderArchive,
  Layers,
  FileCheck,
  RotateCcw,
} from 'lucide-react';

interface ThumbnailItem {
  pageNumber: number;
  dataUrl?: string;
  selected: boolean;
}

export const SplitPdfWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<ThumbnailItem[]>([]);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);

  // Split mode: 'all' | 'ranges' | 'chunks' | 'selected'
  const [mode, setMode] = useState<'all' | 'ranges' | 'chunks' | 'selected'>('selected');
  const [rangeString, setRangeString] = useState('');
  const [chunkSize, setChunkSize] = useState(2);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Splitting document...');
  const [progressPct, setProgressPct] = useState(0);

  const [resultData, setResultData] = useState<{
    blob: Blob;
    filename: string;
    isZip: boolean;
    count: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setErrorMessage(null);
    setLoadingThumbnails(true);

    try {
      const pdfJsDoc = await getPdfDocumentFromFile(selected);
      const numPages = pdfJsDoc.numPages;

      const initialThumbs: ThumbnailItem[] = Array.from({ length: numPages }, (_, i) => ({
        pageNumber: i + 1,
        selected: true,
      }));
      setThumbnails(initialThumbs);

      // Default range example
      if (numPages > 1) {
        const mid = Math.ceil(numPages / 2);
        setRangeString(`1-${mid}, ${mid + 1}-${numPages}`);
      } else {
        setRangeString('1');
      }

      // Render thumbnail previews
      for (let p = 1; p <= Math.min(numPages, 30); p++) {
        const dataUrl = await renderPageThumbnail(pdfJsDoc, p, 160);
        setThumbnails((prev) =>
          prev.map((t) => (t.pageNumber === p ? { ...t, dataUrl } : t))
        );
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Could not render PDF preview. You can still proceed with splitting.');
    } finally {
      setLoadingThumbnails(false);
    }
  };

  const toggleSelectPage = (pageNum: number) => {
    setThumbnails((prev) =>
      prev.map((t) => (t.pageNumber === pageNum ? { ...t, selected: !t.selected } : t))
    );
  };

  const selectAll = () => {
    setThumbnails((prev) => prev.map((t) => ({ ...t, selected: true })));
  };

  const deselectAll = () => {
    setThumbnails((prev) => prev.map((t) => ({ ...t, selected: false })));
  };

  const handleSplit = async () => {
    if (!file) return;
    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPct(10);

    try {
      const selectedNums = thumbnails.filter((t) => t.selected).map((t) => t.pageNumber);

      const result = await splitPdf(
        file,
        {
          mode,
          rangeString,
          chunkSize,
          selectedPages: selectedNums,
        },
        (step, pct) => {
          setProcessStep(step);
          setProgressPct(pct);
        }
      );

      setResultData(result);
      addRecentJob({
        toolId: 'split-pdf',
        toolName: 'Split PDF',
        fileName: result.filename,
        fileSize: result.blob.size,
        status: 'completed',
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Failed to split PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (resultData) {
      triggerDownload(resultData.blob, resultData.filename);
    }
  };

  const handleReset = () => {
    setFile(null);
    setThumbnails([]);
    setResultData(null);
    setErrorMessage(null);
  };

  if (resultData) {
    return (
      <SuccessView
        fileName={resultData.filename}
        fileSize={resultData.blob.size}
        downloadLabel={resultData.isZip ? 'Download ZIP Archive' : 'Download Extracted PDF'}
        onDownload={handleDownload}
        onReset={handleReset}
        additionalNote={`Split completed into ${resultData.count} ${resultData.count === 1 ? 'file' : 'files'} directly on your device.`}
      />
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {!file ? (
        <FileDropzone
          onFilesSelected={handleFileSelected}
          multiple={false}
          accept=".pdf,application/pdf"
          label="Choose PDF to Split"
          sublabel="Extract pages or split into multiple individual documents."
        />
      ) : (
        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729]">
            <div>
              <h3 className="text-sm font-semibold text-[#141213] dark:text-[#F5F0EB]">
                {file.name}
              </h3>
              <p className="text-xs text-[#5C554F] dark:text-[#A39991]">
                {formatBytes(file.size)} • {thumbnails.length} Total Pages
              </p>
            </div>

            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] text-xs font-medium text-[#5C554F] dark:text-[#A39991] hover:text-[#141213] dark:hover:text-[#F5F0EB]"
            >
              Choose Different File
            </button>
          </div>

          {/* Mode Selector */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729] space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB]">
              Choose Splitting Method
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'selected', label: 'Extract Selected', desc: 'Click thumbnails below' },
                { id: 'ranges', label: 'By Page Range', desc: 'e.g. 1-3, 4-6' },
                { id: 'all', label: 'Split Every Page', desc: '1 PDF per page' },
                { id: 'chunks', label: 'Equal Chunks', desc: 'Every N pages' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setMode(opt.id as any)}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    mode === opt.id
                      ? 'border-[#6D1F35] bg-[#6D1F35]/5 dark:border-[#C6A15B] dark:bg-[#C6A15B]/10 ring-1 ring-[#6D1F35] dark:ring-[#C6A15B]'
                      : 'border-[#E5DFD4] dark:border-[#2E2729] hover:border-[#6D1F35]/50'
                  }`}
                >
                  <p className="text-xs font-semibold text-[#141213] dark:text-[#F5F0EB]">{opt.label}</p>
                  <p className="text-[10px] text-[#5C554F] dark:text-[#A39991] mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>

            {/* Mode-specific Controls */}
            {mode === 'ranges' && (
              <div className="p-3.5 rounded-xl bg-[#F7F3EC] dark:bg-[#141213] border border-[#E5DFD4] dark:border-[#2E2729] space-y-2">
                <label className="text-xs font-medium text-[#141213] dark:text-[#F5F0EB] block">
                  Page Ranges (comma-separated):
                </label>
                <input
                  type="text"
                  value={rangeString}
                  onChange={(e) => setRangeString(e.target.value)}
                  placeholder="e.g. 1-5, 6-10"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#383033] text-xs focus:outline-none focus:ring-2 focus:ring-[#6D1F35]"
                />
                <span className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
                  Example: <code>1-3, 4-6, 7-10</code> produces 3 separate PDF files bundled in a ZIP.
                </span>
              </div>
            )}

            {mode === 'chunks' && (
              <div className="p-3.5 rounded-xl bg-[#F7F3EC] dark:bg-[#141213] border border-[#E5DFD4] dark:border-[#2E2729] flex items-center gap-3">
                <label className="text-xs font-medium text-[#141213] dark:text-[#F5F0EB]">
                  Pages per PDF:
                </label>
                <input
                  type="number"
                  min="1"
                  max={thumbnails.length}
                  value={chunkSize}
                  onChange={(e) => setChunkSize(parseInt(e.target.value, 10) || 1)}
                  className="w-20 px-3 py-1.5 rounded-lg bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#383033] text-xs"
                />
                <span className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
                  Will create {Math.ceil(thumbnails.length / Math.max(1, chunkSize))} separate files.
                </span>
              </div>
            )}

            {mode === 'selected' && (
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[#5C554F] dark:text-[#A39991]">
                  {thumbnails.filter((t) => t.selected).length} of {thumbnails.length} pages selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAll}
                    className="text-[11px] text-[#6D1F35] dark:text-[#C6A15B] hover:underline"
                  >
                    Select All
                  </button>
                  <span>•</span>
                  <button
                    onClick={deselectAll}
                    className="text-[11px] text-[#5C554F] dark:text-[#A39991] hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Thumbnails Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB]">
              Page Thumbnails
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-96 overflow-y-auto p-2 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729]">
              {thumbnails.map((t) => (
                <div
                  key={t.pageNumber}
                  onClick={() => mode === 'selected' && toggleSelectPage(t.pageNumber)}
                  className={`relative rounded-xl border p-2 flex flex-col items-center justify-between transition-all ${
                    mode === 'selected' ? 'cursor-pointer' : ''
                  } ${
                    t.selected
                      ? 'border-[#6D1F35] bg-[#6D1F35]/5 dark:border-[#C6A15B] dark:bg-[#C6A15B]/10'
                      : 'border-[#E5DFD4] dark:border-[#2E2729] opacity-60'
                  }`}
                >
                  <div className="w-full aspect-3/4 rounded-lg bg-[#F7F3EC] dark:bg-[#141213] border border-[#E5DFD4]/50 dark:border-[#2E2729] flex items-center justify-center overflow-hidden mb-1.5">
                    {t.dataUrl ? (
                      <img
                        src={t.dataUrl}
                        alt={`Page ${t.pageNumber}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-[#5C554F]">Page {t.pageNumber}</span>
                    )}
                  </div>

                  <div className="w-full flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#141213] dark:text-[#F5F0EB]">
                      P. {t.pageNumber}
                    </span>
                    {mode === 'selected' && (
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center text-white ${
                          t.selected ? 'bg-[#6D1F35] dark:bg-[#C6A15B]' : 'bg-black/20'
                        }`}
                      >
                        {t.selected && <Check className="w-3 h-3" />}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="sticky bottom-4 z-30 p-4 rounded-2xl bg-[#F7F3EC]/90 dark:bg-[#141213]/90 backdrop-blur-md border border-[#E5DFD4] dark:border-[#2E2729] shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-[#5C554F] dark:text-[#A39991]">
              Files generated locally on your browser.
            </span>

            <button
              id="action-split-pdf-btn"
              onClick={handleSplit}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#6D1F35] hover:bg-[#58182a] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <Scissors className="w-4 h-4" />
              <span>Split PDF</span>
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 flex items-center gap-2.5 p-3.5 rounded-xl bg-[#C94A4A]/10 border border-[#C94A4A]/25 text-[#C94A4A] text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <ProcessingModal
        isOpen={isProcessing}
        stepName={processStep}
        percentage={progressPct}
      />
    </div>
  );
};
