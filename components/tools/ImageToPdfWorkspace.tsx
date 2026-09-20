'use client';

import React, { useMemo, useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { ImagePreviewLightbox } from '@/components/toolkit/ImagePreviewLightbox';
import { OrderedFileList, OrderedListItem } from '@/components/toolkit/OrderedFileList';
import { FileNameInput } from '@/components/toolkit/FileNameInput';
import { PdfPreviewModal } from '@/components/toolkit/PdfPreviewModal';
import { imagesToPdf, triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { addRecentJob } from '@/lib/recent-jobs';
import {
  suggestImagesToPdfName,
  ensurePdfExtension,
  estimateImagesToPdfSize,
} from '@/lib/suggest-filename';
import {
  FileImage,
  ArrowRight,
  AlertCircle,
  Pencil,
  Play,
  ShieldCheck,
} from 'lucide-react';

type PageSize = 'a4' | 'a3' | 'a5' | 'letter' | 'legal' | 'fit' | 'custom';
type Orientation = 'portrait' | 'landscape' | 'auto';
type Margin = 'none' | 'small' | 'normal' | 'large';
type ImageFit = 'fit' | 'fill' | 'actual' | 'crop';
type Quality = 'standard' | 'high' | 'maximum';

// Page sizes in PDF points (portrait)
const PAGE_PT: Record<string, [number, number]> = {
  a4: [595.28, 841.89],
  a3: [841.89, 1190.55],
  a5: [419.53, 595.28],
  letter: [612.0, 792.0],
  legal: [612.0, 1008.0],
};

const DEFAULT_FILE_NAME = 'PDFly_Images_to_PDF';

export const ImageToPdfWorkspace: React.FC = () => {
  const [items, setItems] = useState< OrderedListItem[] >([]);
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [orientation, setOrientation] = useState<Orientation>('auto');
  const [margin, setMargin] = useState<Margin>('normal');
  const [imageFit, setImageFit] = useState<ImageFit>('fit');
  const [quality, setQuality] = useState<Quality>('high');
  const [customWmm, setCustomWmm] = useState('210');
  const [customHmm, setCustomHmm] = useState('297');

  const [fileName, setFileName] = useState(DEFAULT_FILE_NAME);

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isFinalPreviewOpen, setIsFinalPreviewOpen] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Converting images to PDF...');
  const [progressPct, setProgressPct] = useState(0);

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Preview aspect for the final-preview modal page cards
  const previewAspect = useMemo(() => {
    let w: number, h: number;
    if (pageSize === 'fit') return 3 / 4;
    if (pageSize === 'custom') {
      w = (parseFloat(customWmm) || 210) * (72 / 25.4);
      h = (parseFloat(customHmm) || 297) * (72 / 25.4);
    } else {
      [w, h] = PAGE_PT[pageSize];
    }
    if (orientation === 'landscape') [w, h] = [h, w];
    return w / h;
  }, [pageSize, orientation, customWmm, customHmm]);

  const estimatedSize = useMemo(() => {
    const totalBytes = items.reduce((s, it) => s + it.file.size, 0);
    return estimateImagesToPdfSize(totalBytes, quality, items.length);
  }, [items, quality]);

  const totalBytes = useMemo(
    () => items.reduce((s, it) => s + it.file.size, 0),
    [items]
  );

  const handleFilesAdded = (newFiles: File[]) => {
    setErrorMessage(null);
    const mapped: OrderedListItem[] = newFiles.map((f) => ({
      id: Math.random().toString(36).substring(2, 9),
      file: f,
      previewUrl: URL.createObjectURL(f),
    }));
    setItems((prev) => [...prev, ...mapped]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target?.previewUrl) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {
          /* ignore */
        }
      }
      return prev.filter((it) => it.id !== id);
    });
  };

  const handleDeleteFromLightbox = (index: number) => {
    const target = items[index];
    if (!target) return;
    const remaining = items.length - 1;
    removeItem(target.id);
    if (remaining === 0) {
      setPreviewIndex(null);
    } else {
      setPreviewIndex((i) => (i === null ? null : Math.min(i, remaining - 1)));
    }
  };

  const handleGenerate = async () => {
    if (items.length === 0) {
      setErrorMessage('Please select at least one image file.');
      return;
    }

    setErrorMessage(null);
    setIsFinalPreviewOpen(false);
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
          fit: imageFit,
          quality,
          ...(pageSize === 'custom'
            ? {
                customWidth: (parseFloat(customWmm) || 210) * (72 / 25.4),
                customHeight: (parseFloat(customHmm) || 297) * (72 / 25.4),
              }
            : {}),
        },
        (step, pct) => {
          setProcessStep(step);
          setProgressPct(pct);
        }
      );

      const outName = ensurePdfExtension(fileName);
      setResultBlob(outBlob);
      setResultFileName(outName);
      setResultBlobUrl(URL.createObjectURL(outBlob));

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

  const handleShare = async () => {
    if (!resultBlob || !resultFileName) return;
    try {
      const file = new File([resultBlob], resultFileName, { type: 'application/pdf' });
      if (navigator.share && (navigator as any).canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: resultFileName });
      } else {
        await navigator.share({ title: resultFileName, text: `${resultFileName} — created with PDFly` });
      }
    } catch {
      /* user cancelled share */
    }
  };

  const handleRename = (newName: string) => {
    const finalName = ensurePdfExtension(newName);
    setResultFileName(finalName);
  };

  const handleReset = () => {
    items.forEach((it) => it.previewUrl && URL.revokeObjectURL(it.previewUrl));
    setItems([]);
    setResultBlob(null);
    setResultBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setResultFileName('');
    setFileName(DEFAULT_FILE_NAME);
    setPreviewIndex(null);
    setIsFinalPreviewOpen(false);
    setErrorMessage(null);
  };

  // ============ SUCCESS STATE ============
  if (resultBlob) {
    return (
      <>
        <SuccessView
          title="PDF Created"
          fileName={resultFileName}
          fileSize={resultBlob.size}
          pageCount={items.length}
          downloadLabel="Download PDF"
          onDownload={handleDownload}
          onReset={handleReset}
          onPreview={() => setIsFinalPreviewOpen(true)}
          onShare={handleShare}
          onRename={handleRename}
          resetLabel="Create Another"
          additionalNote={`Successfully converted ${items.length} ${items.length === 1 ? 'image' : 'images'} into a clean PDF. Zero cloud uploads.`}
        />
        <PdfPreviewModal
          isOpen={isFinalPreviewOpen}
          onClose={() => setIsFinalPreviewOpen(false)}
          title={resultFileName}
          blobUrl={resultBlobUrl || undefined}
        />
      </>
    );
  }

  // ============ MAIN WORKSPACE ============
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
          {/* Summary header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729]">
            <div>
              <h3 className="text-sm font-semibold text-[#141213] dark:text-[#F5F0EB]">
                {items.length} {items.length === 1 ? 'Image' : 'Images'} Selected
              </h3>
              <p className="text-xs text-[#5C554F] dark:text-[#A39991]">
                Each image becomes a page in the output PDF · {formatBytes(totalBytes)} total
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

          {/* Ordered page list */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB]">
                Pages ({items.length})
              </p>
              <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
                Drag the handle to reorder pages
              </p>
            </div>
            <OrderedFileList
              items={items}
              onReorder={setItems}
              onRemove={removeItem}
              onPreview={(idx) => setPreviewIndex(idx)}
              positionLabel="Page"
            />
          </div>

          {/* File Name */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729]">
            <FileNameInput
              label="File Name"
              value={fileName}
              onChange={setFileName}
              onSuggest={() => suggestImagesToPdfName(items.map((it) => it.file))}
              extension=".pdf"
            />
          </div>

          {/* Page settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729]">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB] block mb-2">
                Page Size
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as PageSize)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs font-medium text-[#141213] dark:text-[#F5F0EB]"
              >
                <option value="a4">A4 (Standard Document)</option>
                <option value="a3">A3 (Large)</option>
                <option value="a5">A5 (Small)</option>
                <option value="letter">US Letter</option>
                <option value="legal">US Legal</option>
                <option value="fit">Original (Match Image)</option>
                <option value="custom">Custom Size</option>
              </select>

              {pageSize === 'custom' && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    min={50}
                    max={2000}
                    value={customWmm}
                    onChange={(e) => setCustomWmm(e.target.value)}
                    aria-label="Custom page width in mm"
                    className="w-full px-3 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs text-[#141213] dark:text-[#F5F0EB]"
                    placeholder="Width (mm)"
                  />
                  <span className="text-[11px] text-[#5C554F] dark:text-[#A39991]">×</span>
                  <input
                    type="number"
                    min={50}
                    max={2000}
                    value={customHmm}
                    onChange={(e) => setCustomHmm(e.target.value)}
                    aria-label="Custom page height in mm"
                    className="w-full px-3 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs text-[#141213] dark:text-[#F5F0EB]"
                    placeholder="Height (mm)"
                  />
                  <span className="text-[11px] text-[#5C554F] dark:text-[#A39991] shrink-0">mm</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB] block mb-2">
                Orientation
              </label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as Orientation)}
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
                onChange={(e) => setMargin(e.target.value as Margin)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs font-medium text-[#141213] dark:text-[#F5F0EB]"
              >
                <option value="none">None (Border to Border)</option>
                <option value="small">Small</option>
                <option value="normal">Medium</option>
                <option value="large">Large (Frame)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB] block mb-2">
                Image Fit
              </label>
              <select
                value={imageFit}
                onChange={(e) => setImageFit(e.target.value as ImageFit)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs font-medium text-[#141213] dark:text-[#F5F0EB]"
              >
                <option value="fit">Fit to Page (preserve aspect)</option>
                <option value="fill">Fill Page (stretch to edges)</option>
                <option value="actual">Original Size (center)</option>
                <option value="crop">Crop (cover page, center crop)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB] block mb-2">
                Quality
              </label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as Quality)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs font-medium text-[#141213] dark:text-[#F5F0EB]"
              >
                <option value="standard">Standard (smallest file)</option>
                <option value="high">High (recommended)</option>
                <option value="maximum">Maximum (best detail)</option>
              </select>
            </div>

            <div className="flex flex-col justify-center px-3 py-2 rounded-xl bg-[#F7F3EC] dark:bg-[#141213] border border-[#E5DFD4] dark:border-[#2E2729]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5C554F] dark:text-[#A39991]">
                Estimated PDF size
              </span>
              <span className="text-sm font-bold text-[#141213] dark:text-[#F5F0EB] tabular-nums">
                ~{formatBytes(estimatedSize)}
              </span>
              <span className="text-[10px] text-[#5C554F] dark:text-[#A39991]">
                Local estimate · actual size may vary
              </span>
            </div>
          </div>

          {/* Action Bar */}
          <div className="sticky bottom-4 z-30 p-4 rounded-2xl bg-[#F7F3EC]/90 dark:bg-[#141213]/90 border border-[#E5DFD4] dark:border-[#2E2729] shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-[#5C554F] dark:text-[#A39991] inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#35C98A]" />
              Compiles to PDF directly inside browser memory. Zero cloud uploads.
            </span>

            <button
              id="action-convert-images-btn"
              onClick={() => setIsFinalPreviewOpen(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#6D1F35] hover:bg-[#58182a] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <FileImage className="w-4 h-4" />
              <span>Preview & Generate PDF ({items.length} Pages)</span>
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

      {/* Full-screen image preview */}
      <ImagePreviewLightbox
        items={items.map((it) => ({
          id: it.id,
          src: it.previewUrl || '',
          label: it.file.name,
        }))}
        index={previewIndex}
        onClose={() => setPreviewIndex(null)}
        onNavigate={setPreviewIndex}
        onDelete={handleDeleteFromLightbox}
      />

      {/* Final preview before generation */}
      <PdfPreviewModal
        isOpen={isFinalPreviewOpen && resultBlob === null}
        onClose={() => setIsFinalPreviewOpen(false)}
        title={`${ensurePdfExtension(fileName)} — ${items.length} ${items.length === 1 ? 'Page' : 'Pages'}`}
        pages={items.map((it) => it.previewUrl || '')}
        pageAspect={previewAspect}
        footer={
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setIsFinalPreviewOpen(false)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#E8DFD3] dark:border-[#2E2629] bg-[#FFFDF9] dark:bg-[#1B1719] text-xs font-bold text-[#1A1416] dark:text-[#F7F1E8] inline-flex items-center justify-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            >
              <Pencil className="w-4 h-4" />
              <span>Edit Pages</span>
            </button>
            <button
              onClick={handleGenerate}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] text-xs font-bold inline-flex items-center justify-center gap-2 shadow-sm hover:brightness-110 active:scale-[0.98] transition-all border border-[#C9A15A]/40"
            >
              <Play className="w-4 h-4 text-[#C9A15A]" />
              <span>Generate PDF</span>
            </button>
          </div>
        }
      />

      <ProcessingModal
        isOpen={isProcessing}
        stepName={processStep}
        percentage={progressPct}
      />
    </div>
  );
};
