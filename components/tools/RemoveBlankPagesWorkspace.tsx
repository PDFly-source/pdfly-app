'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import {
  detectBlankPages,
  removePagesFromPdf,
  triggerDownload,
  formatBytes,
  DetectedBlankPage,
} from '@/lib/pdf-engine';
import { addRecentJob } from '@/lib/recent-jobs';
import {
  FileX,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Square,
  CheckSquare,
  Sparkles,
} from 'lucide-react';

export const RemoveBlankPagesWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedBlanks, setDetectedBlanks] = useState<DetectedBlankPage[]>([]);
  const [selectedPageNumbers, setSelectedPageNumbers] = useState<Set<number>>(new Set());
  const [totalPageCount, setTotalPageCount] = useState<number>(0);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setIsAnalyzing(true);
    setErrorMessage(null);
    setDetectedBlanks([]);
    setSelectedPageNumbers(new Set());

    try {
      // Analyze pages using local canvas rendering and pixel scanning
      const blanks = await detectBlankPages(selected, 0.003);
      setDetectedBlanks(blanks);
      setSelectedPageNumbers(new Set(blanks.map((b) => b.pageNumber)));
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Could not analyze document pages: ' + (err?.message || ''));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSelectPage = (pageNum: number) => {
    setSelectedPageNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) next.delete(pageNum);
      else next.add(pageNum);
      return next;
    });
  };

  const handleRemoveBlanks = async () => {
    if (!file || selectedPageNumbers.size === 0) return;
    setIsProcessing(true);
    setProgressPct(20);

    try {
      const pagesToRemove = Array.from(selectedPageNumbers);
      const outBlob = await removePagesFromPdf(file, pagesToRemove);
      const outName = `${file.name.replace(/\.[^/.]+$/, '')}_no_blank_pages.pdf`;

      setProgressPct(95);
      setResultBlob(outBlob);
      setResultFileName(outName);

      addRecentJob({
        toolId: 'remove-blank-pages',
        toolName: 'Remove Blank Pages',
        fileName: outName,
        fileSize: outBlob.size,
        status: 'completed',
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Failed to remove pages: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] p-6 sm:p-8 shadow-sm">
      {resultBlob ? (
        <SuccessView
          fileName={resultFileName}
          fileSize={resultBlob.size}
          downloadLabel="Download Cleaned PDF"
          additionalNote={`Successfully removed ${selectedPageNumbers.size} blank pages. Your clean document is ready.`}
          onDownload={() => triggerDownload(resultBlob, resultFileName)}
          onReset={() => {
            setResultBlob(null);
            setFile(null);
            setDetectedBlanks([]);
            setSelectedPageNumbers(new Set());
          }}
        />
      ) : (
        <div className="space-y-6">
          <div className="max-w-xl mx-auto text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center mx-auto mb-4">
              <FileX className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5F0EB] mb-2">
              Remove Blank Pages
            </h2>
            <p className="text-xs sm:text-sm text-[#5C554F] dark:text-[#A39991] mb-6">
              Automatically scan pages locally for whitespace, preview empty sheets, and clean out blank pages with one click.
            </p>
          </div>

          {!file ? (
            <div className="max-w-xl mx-auto">
              <FileDropzone
                accept=".pdf,application/pdf"
                maxFiles={1}
                onFilesSelected={handleFileSelected}
                label="Select scanned PDF to inspect"
                sublabel="Processed locally in your browser for supported tools"
              />
            </div>
          ) : isAnalyzing ? (
            <div className="max-w-md mx-auto p-8 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#6D1F35] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-[#141213] dark:text-[#F5F0EB]">
                Scanning pages locally for blank sheets...
              </p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-5">
              {/* Inspection Summary Banner */}
              <div className="p-4 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#141213] dark:text-[#F5F0EB]">
                    {detectedBlanks.length > 0
                      ? `${detectedBlanks.length} possible blank ${detectedBlanks.length === 1 ? 'page' : 'pages'} detected`
                      : 'No blank pages detected!'}
                  </h4>
                  <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
                    {detectedBlanks.length > 0
                      ? 'Review the detected thumbnails below before confirming deletion.'
                      : 'Every page in this document appears to have active content.'}
                  </p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="text-xs text-[#5C554F] hover:underline"
                >
                  Choose another file
                </button>
              </div>

              {detectedBlanks.length > 0 && (
                <>
                  {/* Thumbnails of Detected Pages */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {detectedBlanks.map((b) => {
                      const isSelected = selectedPageNumbers.has(b.pageNumber);
                      return (
                        <div
                          key={b.pageNumber}
                          onClick={() => toggleSelectPage(b.pageNumber)}
                          className={`relative rounded-xl border p-2 bg-white dark:bg-[#1E1A1B] cursor-pointer transition-all ${
                            isSelected
                              ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/20'
                              : 'border-[#E5DFD4] dark:border-[#2E2729] opacity-70 hover:opacity-100'
                          }`}
                        >
                          <div className="absolute top-3 left-3 z-10">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-red-600 bg-white rounded" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400 bg-white rounded" />
                            )}
                          </div>

                          <div className="aspect-[3/4] bg-[#FAF7F2] dark:bg-[#141213] rounded-lg overflow-hidden border border-black/5 flex items-center justify-center">
                            {b.thumbnailUrl ? (
                              <img
                                src={b.thumbnailUrl}
                                alt={`Page ${b.pageNumber}`}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-xs text-gray-400 font-mono">P.{b.pageNumber}</span>
                            )}
                          </div>

                          <div className="mt-2 flex items-center justify-between text-[11px]">
                            <span className="font-bold text-[#141213] dark:text-[#F5F0EB]">
                              Page {b.pageNumber}
                            </span>
                            <span className="text-[11px] text-red-600 font-medium">
                              {((1 - b.nonWhiteRatio) * 100).toFixed(1)}% Empty
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
                      {errorMessage}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={handleRemoveBlanks}
                      disabled={selectedPageNumbers.size === 0}
                      className="w-full py-3 rounded-xl bg-red-600 text-white text-xs sm:text-sm font-semibold hover:bg-red-700 inline-flex items-center justify-center gap-2 shadow-xs disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remove Selected Blank Pages ({selectedPageNumbers.size})</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <ProcessingModal
        isOpen={isProcessing}
        stepName="Stripping blank pages and rebuilding PDF..."
        percentage={progressPct}
      />
    </div>
  );
};
