'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { OrderedFileList } from '@/components/toolkit/OrderedFileList';
import { FileNameInput } from '@/components/toolkit/FileNameInput';
import { PdfPreviewModal } from '@/components/toolkit/PdfPreviewModal';
import { mergePdfFiles, triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { useRevokeOnUnmount } from '@/lib/use-revoke-on-unmount';
import { ensurePdfExtension } from '@/lib/suggest-filename';
import { addRecentJob } from '@/lib/recent-jobs';
import { getPdfDocumentFromFile } from '@/lib/pdfjs-init';
import {
  Layers,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface FileItem {
  id: string;
  file: File;
  pageCount?: number;
  subtitle?: string;
}

const DEFAULT_MERGE_NAME = 'PDFMiniFly_Merged';

export const MergePdfWorkspace: React.FC = () => {
  const [items, setItems] = useState<FileItem[]>([]);
  const [fileName, setFileName] = useState(DEFAULT_MERGE_NAME);
  const [previewFileIndex, setPreviewFileIndex] = useState<number | null>(null);
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  useRevokeOnUnmount(previewFileUrl);
  const [isResultPreviewOpen, setIsResultPreviewOpen] = useState(false);
  const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);
  useRevokeOnUnmount(resultBlobUrl);

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
          current.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  pageCount: pdfJsDoc.numPages,
                  subtitle: `${formatBytes(it.file.size)} • ${pdfJsDoc.numPages} pages`,
                }
              : it
          )
        );
      } catch {
        // Continue gracefully
      }
    }
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

      const outName = ensurePdfExtension(fileName);
      setResultBlob(outputBlob);
      setResultFileName(outName);
      setResultBlobUrl(URL.createObjectURL(outputBlob));

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

  const handleShare = async () => {
    if (!resultBlob || !resultFileName) return;
    try {
      const file = new File([resultBlob], resultFileName, { type: 'application/pdf' });
      if (navigator.share && (navigator as any).canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: resultFileName });
      } else {
        await navigator.share({ title: resultFileName, text: `${resultFileName} — merged with PDFMiniFly` });
      }
    } catch {
      /* user cancelled share */
    }
  };

  const handleRename = (newName: string) => {
    setResultFileName(ensurePdfExtension(newName));
  };

  const handleReset = () => {
    setItems([]);
    setResultBlob(null);
    setResultBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setResultFileName('');
    setFileName(DEFAULT_MERGE_NAME);
    setPreviewFileIndex(null);
    setIsResultPreviewOpen(false);
    setErrorMessage(null);
  };

  if (resultBlob) {
    const totalPages = items.reduce((acc, it) => acc + (it.pageCount || 1), 0);
    return (
      <>
        <SuccessView
          title="PDFs Merged"
          fileName={resultFileName}
          fileSize={resultBlob.size}
          pageCount={totalPages}
          downloadLabel="Download Merged PDF"
          onDownload={handleDownload}
          onReset={handleReset}
          onPreview={() => setIsResultPreviewOpen(true)}
          onShare={handleShare}
          onRename={handleRename}
          resetLabel="Merge Another"
          additionalNote="Combined successfully on your local device."
        />
        <PdfPreviewModal
          isOpen={isResultPreviewOpen}
          onClose={() => setIsResultPreviewOpen(false)}
          title={resultFileName}
          blobUrl={resultBlobUrl || undefined}
        />
      </>
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

          {/* Ordered file list */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB]">
                Merge Order ({items.length})
              </p>
              <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
                Drag the handle to reorder documents
              </p>
            </div>
            <OrderedFileList
              items={items}
              onReorder={setItems}
              onRemove={removeItem}
              onPreview={(idx) => {
                const file = items[idx]?.file;
                if (!file) return;
                setPreviewFileUrl((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return URL.createObjectURL(file);
                });
                setPreviewFileIndex(idx);
              }}
              positionLabel="Document"
            />
          </div>

          {/* File Name */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729]">
            <FileNameInput
              label="Merged File Name"
              value={fileName}
              onChange={setFileName}
              onSuggest={() =>
                `Merged_${items[0]?.file.name.replace(/\.pdf$/i, '') || 'PDFs'}`
              }
              extension=".pdf"
            />
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

      {/* Per-file preview */}
      <PdfPreviewModal
        isOpen={previewFileIndex !== null}
        onClose={() => {
          setPreviewFileIndex(null);
          setPreviewFileUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
        }}
        title={previewFileIndex !== null ? items[previewFileIndex]?.file.name || 'Preview' : 'Preview'}
        blobUrl={previewFileUrl || undefined}
      />

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
