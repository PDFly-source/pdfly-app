'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { mergePdfFiles, triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { addRecentJob } from '@/lib/recent-jobs';
import { getPdfDocumentFromFile } from '@/lib/pdfjs-init';
import {
  Layers,
  ArrowUp,
  ArrowDown,
  Trash2,
  FileText,
  AlertCircle,
  Plus,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface FileItem {
  id: string;
  file: File;
  pageCount?: number;
}

export const MergePdfWorkspace: React.FC = () => {
  const [items, setItems] = useState<FileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Preparing documents...');
  const [progressPct, setProgressPct] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFilesAdded = async (newFiles: File[]) => {
    setErrorMessage(null);
    const newItems: FileItem[] = newFiles.map((f) => ({
      id: Math.random().toString(36).substring(2, 9),
      file: f,
    }));

    setItems((prev) => [...prev, ...newItems]);

    // Inspect page counts asynchronously in background
    for (const item of newItems) {
      try {
        const pdfJsDoc = await getPdfDocumentFromFile(item.file);
        setItems((current) =>
          current.map((it) => (it.id === item.id ? { ...it, pageCount: pdfJsDoc.numPages } : it))
        );
      } catch {
        // Continue gracefully
      }
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setItems((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const moveDown = (index: number) => {
    if (index === items.length - 1) return;
    setItems((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleMerge = async () => {
    if (items.length < 2) {
      setErrorMessage('Please add at least 2 PDF files to merge.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPct(5);

    try {
      const files = items.map((it) => it.file);
      const outputBlob = await mergePdfFiles(files, (step, pct) => {
        setProcessStep(step);
        setProgressPct(pct);
      });

      const outName = `merged_${items[0].file.name.replace(/\.pdf$/i, '')}_pdfly.pdf`;
      setResultBlob(outputBlob);
      setResultFileName(outName);

      addRecentJob({
        toolId: 'merge-pdf',
        toolName: 'Merge PDF',
        fileName: outName,
        fileSize: outputBlob.size,
        status: 'completed',
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err?.message || 'Something went wrong while processing this PDF. Please try again.'
      );
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
    setItems([]);
    setResultBlob(null);
    setResultFileName('');
    setErrorMessage(null);
  };

  if (resultBlob) {
    const totalPages = items.reduce((acc, it) => acc + (it.pageCount || 1), 0);
    return (
      <SuccessView
        fileName={resultFileName}
        fileSize={resultBlob.size}
        pageCount={totalPages}
        downloadLabel="Download Merged PDF"
        onDownload={handleDownload}
        onReset={handleReset}
        additionalNote="Combined successfully on your local device."
      />
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Upload Zone */}
      {items.length === 0 ? (
        <div className="space-y-4">
          <FileDropzone
            onFilesSelected={handleFilesAdded}
            multiple={true}
            accept=".pdf,application/pdf"
            label="Choose PDF Files to Merge"
            sublabel="Select 2 or more PDFs from your device. All merging is done locally."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729]">
            <div>
              <h3 className="text-sm font-semibold text-[#141213] dark:text-[#F5F0EB]">
                {items.length} {items.length === 1 ? 'Document' : 'Documents'} Selected
              </h3>
              <p className="text-xs text-[#5C554F] dark:text-[#A39991]">
                Drag or use arrows to organize merge order. Files will be joined top-to-bottom.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <FileDropzone
                onFilesSelected={handleFilesAdded}
                multiple={true}
                accept=".pdf,application/pdf"
                compact={true}
              />
              <button
                onClick={handleReset}
                className="px-3 py-2 rounded-xl text-xs text-[#C94A4A] hover:bg-[#C94A4A]/10 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Files List */}
          <div className="space-y-2.5">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729] shadow-xs group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="w-6 h-6 rounded-full bg-[#F7F3EC] dark:bg-[#141213] text-[#6D1F35] dark:text-[#C6A15B] text-xs font-bold flex items-center justify-center shrink-0 border border-[#E5DFD4] dark:border-[#2E2729]">
                    {idx + 1}
                  </span>

                  <div className="w-8 h-8 rounded-lg bg-[#6D1F35]/10 dark:bg-[#C6A15B]/15 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>

                  <div className="truncate">
                    <p className="text-xs font-medium text-[#141213] dark:text-[#F5F0EB] truncate">
                      {item.file.name}
                    </p>
                    <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
                      {formatBytes(item.file.size)}
                      {item.pageCount !== undefined && ` • ${item.pageCount} pages`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    aria-label={`Move ${item.file.name} up`}
                    className="p-1.5 rounded-lg text-[#5C554F] hover:text-[#141213] dark:text-[#A39991] dark:hover:text-[#F5F0EB] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === items.length - 1}
                    aria-label={`Move ${item.file.name} down`}
                    className="p-1.5 rounded-lg text-[#5C554F] hover:text-[#141213] dark:text-[#A39991] dark:hover:text-[#F5F0EB] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.file.name}`}
                    className="p-1.5 rounded-lg text-[#5C554F] hover:text-[#C94A4A] dark:text-[#A39991] dark:hover:text-[#C94A4A] hover:bg-[#C94A4A]/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="sticky bottom-4 z-30 p-4 rounded-2xl bg-[#F7F3EC]/90 dark:bg-[#141213]/90 backdrop-blur-md border border-[#E5DFD4] dark:border-[#2E2729] shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[#5C554F] dark:text-[#A39991]">
              <ShieldCheck className="w-4 h-4 text-[#238B63]" />
              <span>Merging happens locally. Zero bytes sent to servers.</span>
            </div>

            <button
              id="action-merge-pdfs-btn"
              onClick={handleMerge}
              disabled={items.length < 2}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#6D1F35] hover:bg-[#58182a] text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <Layers className="w-4 h-4" />
              <span>Merge {items.length} PDFs</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Error display */}
      {errorMessage && (
        <div className="mt-4 flex items-center gap-2.5 p-3.5 rounded-xl bg-[#C94A4A]/10 border border-[#C94A4A]/25 text-[#C94A4A] text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Processing Modal */}
      <ProcessingModal
        isOpen={isProcessing}
        stepName={processStep}
        percentage={progressPct}
      />
    </div>
  );
};
