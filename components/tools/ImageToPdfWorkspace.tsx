'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { imagesToPdf, triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { addRecentJob } from '@/lib/recent-jobs';
import {
  FileImage,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface ImageFileItem {
  id: string;
  file: File;
  previewUrl: string;
}

export const ImageToPdfWorkspace: React.FC = () => {
  const [items, setItems] = useState<ImageFileItem[]>([]);
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'fit'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | 'auto'>('auto');
  const [margin, setMargin] = useState<'none' | 'small' | 'large'>('small');

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Converting images to PDF...');
  const [progressPct, setProgressPct] = useState(0);

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFilesAdded = (newFiles: File[]) => {
    setErrorMessage(null);
    const mapped: ImageFileItem[] = newFiles.map((f) => ({
      id: Math.random().toString(36).substring(2, 9),
      file: f,
      previewUrl: URL.createObjectURL(f),
    }));
    setItems((prev) => [...prev, ...mapped]);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setItems((prev) => {
      const copy = [...prev];
      const temp = copy[idx - 1];
      copy[idx - 1] = copy[idx];
      copy[idx] = temp;
      return copy;
    });
  };

  const moveDown = (idx: number) => {
    if (idx === items.length - 1) return;
    setItems((prev) => {
      const copy = [...prev];
      const temp = copy[idx + 1];
      copy[idx + 1] = copy[idx];
      copy[idx] = temp;
      return copy;
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleConvert = async () => {
    if (items.length === 0) {
      setErrorMessage('Please select at least one image file.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPct(10);

    try {
      const files = items.map((it) => it.file);
      const outBlob = await imagesToPdf(
        files,
        {
          pageSize,
          orientation,
          margin,
        },
        (step, pct) => {
          setProcessStep(step);
          setProgressPct(pct);
        }
      );

      const outName = `${items[0].file.name.replace(/\.[^/.]+$/, '')}_converted.pdf`;
      setResultBlob(outBlob);
      setResultFileName(outName);

      addRecentJob({
        toolId: 'image-to-pdf',
        toolName: 'JPG to PDF',
        fileName: outName,
        fileSize: outBlob.size,
        status: 'completed',
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Failed to convert images to PDF.');
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
    return (
      <SuccessView
        fileName={resultFileName}
        fileSize={resultBlob.size}
        pageCount={items.length}
        downloadLabel="Download Created PDF"
        onDownload={handleDownload}
        onReset={handleReset}
        additionalNote={`Successfully converted ${items.length} ${items.length === 1 ? 'image' : 'images'} into a clean PDF.`}
      />
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {items.length === 0 ? (
        <FileDropzone
          onFilesSelected={handleFilesAdded}
          multiple={true}
          accept="image/jpeg,image/png,image/webp,image/*"
          label="Choose Images to Convert"
          sublabel="Select JPG, PNG, or WebP images to assemble into a single PDF."
        />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729]">
            <div>
              <h3 className="text-sm font-semibold text-[#141213] dark:text-[#F5F0EB]">
                {items.length} {items.length === 1 ? 'Image' : 'Images'} Selected
              </h3>
              <p className="text-xs text-[#5C554F] dark:text-[#A39991]">
                Each image becomes a page in the output PDF.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <FileDropzone
                onFilesSelected={handleFilesAdded}
                multiple={true}
                accept="image/*"
                compact={true}
              />
              <button
                onClick={handleReset}
                className="px-3 py-2 rounded-xl text-xs text-[#C94A4A] hover:bg-[#C94A4A]/10"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729]">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB] block mb-2">
                Page Format
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs font-medium text-[#141213] dark:text-[#F5F0EB]"
              >
                <option value="a4">A4 (Standard Document)</option>
                <option value="letter">US Letter</option>
                <option value="fit">Fit to Image Aspect Ratio</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB] block mb-2">
                Orientation
              </label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs font-medium text-[#141213] dark:text-[#F5F0EB]"
              >
                <option value="auto">Auto (Match each image)</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB] block mb-2">
                Margins
              </label>
              <select
                value={margin}
                onChange={(e) => setMargin(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs font-medium text-[#141213] dark:text-[#F5F0EB]"
              >
                <option value="none">No Margin (Border to Border)</option>
                <option value="small">Small Margin (Clean)</option>
                <option value="large">Large Margin (Frame)</option>
              </select>
            </div>
          </div>

          {/* Reorder List */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {items.map((it, idx) => (
              <div
                key={it.id}
                className="group relative flex flex-col justify-between rounded-xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729] p-2"
              >
                <div className="w-full aspect-square rounded-lg bg-[#F7F3EC] dark:bg-[#141213] overflow-hidden mb-2">
                  <img src={it.previewUrl} alt={it.file.name} className="w-full h-full object-cover" />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#141213] dark:text-[#F5F0EB]">P. {idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      aria-label={`Move ${it.file.name} up`}
                      className="p-1 rounded text-[#5C554F] hover:text-[#141213] disabled:opacity-20"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === items.length - 1}
                      aria-label={`Move ${it.file.name} down`}
                      className="p-1 rounded text-[#5C554F] hover:text-[#141213] disabled:opacity-20"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeItem(it.id)}
                      aria-label={`Remove ${it.file.name}`}
                      className="p-1 rounded text-[#C94A4A] hover:bg-[#C94A4A]/10"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Bar */}
          <div className="sticky bottom-4 z-30 p-4 rounded-2xl bg-[#F7F3EC]/90 dark:bg-[#141213]/90 border border-[#E5DFD4] dark:border-[#2E2729] shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-[#5C554F] dark:text-[#A39991]">
              Compiles to PDF directly inside browser memory.
            </span>

            <button
              id="action-convert-images-btn"
              onClick={handleConvert}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#6D1F35] hover:bg-[#58182a] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <FileImage className="w-4 h-4" />
              <span>Generate PDF ({items.length} Pages)</span>
              <ArrowRight className="w-4 h-4" />
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
