'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { addPageNumbersToPdf, triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { getPdfDocumentFromFile } from '@/lib/pdfjs-init';
import { addRecentJob } from '@/lib/recent-jobs';
import { Hash, AlertCircle } from 'lucide-react';

export const PageNumbersWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState(1);

  const [position, setPosition] = useState<
    'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left'
  >('bottom-center');
  const [format, setFormat] = useState<'n' | 'page-n-of-total' | 'n-of-total'>('page-n-of-total');
  const [startNumber, setStartNumber] = useState(1);
  const [skipFirstPage, setSkipFirstPage] = useState(false);
  const [fontSize, setFontSize] = useState(10);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Adding page numbers...');
  const [progressPct, setProgressPct] = useState(0);

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setErrorMessage(null);

    try {
      const pdfJsDoc = await getPdfDocumentFromFile(selected);
      setTotalPages(pdfJsDoc.numPages);
    } catch {
      // Continue gracefully
    }
  };

  const handleApplyNumbers = async () => {
    if (!file) return;
    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPct(10);

    try {
      const outBlob = await addPageNumbersToPdf(
        file,
        {
          position,
          format,
          startNumber,
          skipFirstPage,
          fontSize,
        },
        (step, pct) => {
          setProcessStep(step);
          setProgressPct(pct);
        }
      );

      const outName = `numbered_${file.name}`;
      setResultBlob(outBlob);
      setResultFileName(outName);

      addRecentJob({
        toolId: 'page-numbers',
        toolName: 'Page Numbers',
        fileName: outName,
        fileSize: outBlob.size,
        status: 'completed',
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Failed to add page numbers.');
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
  };

  if (resultBlob && file) {
    return (
      <SuccessView
        fileName={resultFileName}
        fileSize={resultBlob.size}
        pageCount={totalPages}
        downloadLabel="Download Numbered PDF"
        onDownload={handleDownload}
        onReset={handleReset}
        additionalNote="Page numbering stamped into document stream locally."
      />
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {!file ? (
        <FileDropzone
          onFilesSelected={handleFileSelected}
          multiple={false}
          accept=".pdf,application/pdf"
          label="Choose PDF to Number"
          sublabel="Add customizable page numbering, headers, and footers to your PDF pages."
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729]">
            <div>
              <h3 className="text-sm font-semibold text-[#141213] dark:text-[#F5F0EB]">
                {file.name}
              </h3>
              <p className="text-xs text-[#5C554F] dark:text-[#A39991]">
                {formatBytes(file.size)} • {totalPages} Pages
              </p>
            </div>

            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] text-xs font-medium text-[#5C554F] dark:text-[#A39991] hover:text-[#141213]"
            >
              Change File
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729] space-y-5">
            {/* Position */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB] block mb-2">
                Number Position
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'top-left', label: 'Top Left' },
                  { id: 'top-center', label: 'Top Center' },
                  { id: 'top-right', label: 'Top Right' },
                  { id: 'bottom-left', label: 'Bottom Left' },
                  { id: 'bottom-center', label: 'Bottom Center' },
                  { id: 'bottom-right', label: 'Bottom Right' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    onClick={() => setPosition(pos.id as any)}
                    className={`py-2 px-2 text-xs font-medium rounded-xl border text-center transition-all ${
                      position === pos.id
                        ? 'border-[#6D1F35] bg-[#6D1F35]/5 dark:border-[#C6A15B] dark:bg-[#C6A15B]/10 font-bold'
                        : 'border-[#E5DFD4] dark:border-[#2E2729]'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB] block mb-2">
                Number Format
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'page-n-of-total', label: `Page 1 of ${totalPages}`, val: 'page-n-of-total' },
                  { id: 'n-of-total', label: `1 of ${totalPages}`, val: 'n-of-total' },
                  { id: 'n', label: `1, 2, 3...`, val: 'n' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setFormat(fmt.val as any)}
                    className={`p-3 rounded-xl border text-center text-xs font-medium transition-all ${
                      format === fmt.val
                        ? 'border-[#6D1F35] bg-[#6D1F35]/5 dark:border-[#C6A15B] dark:bg-[#C6A15B]/10 font-semibold'
                        : 'border-[#E5DFD4] dark:border-[#2E2729]'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced configurations */}
            <div className="pt-2 border-t border-[#E5DFD4] dark:border-[#2E2729] grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[#141213] dark:text-[#F5F0EB] block mb-1">
                  Start Numbering From:
                </label>
                <input
                  type="number"
                  min="1"
                  value={startNumber}
                  onChange={(e) => setStartNumber(parseInt(e.target.value, 10) || 1)}
                  className="w-24 px-3 py-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs font-medium"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-medium text-[#141213] dark:text-[#F5F0EB] cursor-pointer mt-5">
                  <input
                    type="checkbox"
                    checked={skipFirstPage}
                    onChange={(e) => setSkipFirstPage(e.target.checked)}
                    className="w-4 h-4 rounded text-[#6D1F35] focus:ring-[#6D1F35]"
                  />
                  <span>Skip first page (Cover Page)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F3EC]/90 dark:bg-[#141213]/90 border border-[#E5DFD4] dark:border-[#2E2729] flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-[#5C554F] dark:text-[#A39991]">
              Applies numbering cleanly across pages.
            </span>

            <button
              id="action-apply-page-numbers-btn"
              onClick={handleApplyNumbers}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#6D1F35] hover:bg-[#58182a] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <Hash className="w-4 h-4" />
              <span>Apply Page Numbers</span>
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
