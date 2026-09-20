'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { pdfToImages, triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { getPdfDocumentFromFile } from '@/lib/pdfjs-init';
import { addRecentJob } from '@/lib/recent-jobs';
import { Image as ImageIcon, AlertCircle, Sparkles, FolderArchive, Layers } from 'lucide-react';

export const PdfToImageWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<'jpg' | 'png'>('jpg');
  const [quality, setQuality] = useState<'normal' | 'high' | 'ultra'>('high');
  const [pageScope, setPageScope] = useState<'all' | 'single'>('all');
  const [singlePageNumber, setSinglePageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Rendering pages to images...');
  const [progressPct, setProgressPct] = useState(0);

  const [resultData, setResultData] = useState<{
    blob: Blob;
    filename: string;
    isZip: boolean;
    imageCount: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setErrorMessage(null);

    try {
      const pdfJsDoc = await getPdfDocumentFromFile(selected);
      setTotalPages(pdfJsDoc.numPages);
      setSinglePageNumber(1);
    } catch (err) {
      console.error(err);
      setErrorMessage('Could not load PDF details.');
    }
  };

  const handleConvert = async () => {
    if (!file) return;
    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPct(5);

    try {
      const result = await pdfToImages(
        file,
        {
          format,
          quality,
          singlePageNumber: pageScope === 'single' ? singlePageNumber : undefined,
        },
        (step, pct) => {
          setProcessStep(step);
          setProgressPct(pct);
        }
      );

      const isZip = result.images.length > 1;
      const downloadBlob = isZip ? result.zipBlob : (result.images[0]?.blob || result.zipBlob);
      const outFilename = isZip
        ? `${file.name.replace(/\.[^/.]+$/, '')}_images.zip`
        : (result.images[0]?.name || `${file.name.replace(/\.[^/.]+$/, '')}.${format}`);

      const formattedResult = {
        blob: downloadBlob,
        filename: outFilename,
        isZip,
        imageCount: result.images.length,
      };

      setResultData(formattedResult);
      addRecentJob({
        toolId: 'pdf-to-image',
        toolName: 'PDF to Image',
        fileName: outFilename,
        fileSize: downloadBlob.size,
        status: 'completed',
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Failed to convert PDF pages to images.');
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
    setResultData(null);
    setErrorMessage(null);
  };

  if (resultData) {
    return (
      <SuccessView
        fileName={resultData.filename}
        fileSize={resultData.blob.size}
        downloadLabel={resultData.isZip ? 'Download Images Archive (.zip)' : `Download Image (.${format})`}
        onDownload={handleDownload}
        onReset={handleReset}
        additionalNote={`Converted ${resultData.imageCount} ${resultData.imageCount === 1 ? 'page' : 'pages'} to crisp ${format.toUpperCase()} images locally.`}
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
          label="Choose PDF to Convert"
          sublabel="Extract PDF pages as high-resolution JPG or PNG pictures."
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729]">
            <div>
              <h3 className="text-sm font-semibold text-[#141213] dark:text-[#F5F0EB]">
                {file.name}
              </h3>
              <p className="text-xs text-[#5C554F] dark:text-[#A39991]">
                {formatBytes(file.size)} • {totalPages} {totalPages === 1 ? 'page' : 'pages'}
              </p>
            </div>

            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] text-xs font-medium text-[#5C554F] dark:text-[#A39991] hover:text-[#141213]"
            >
              Change File
            </button>
          </div>

          {/* Conversion Options */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729] space-y-5">
            {/* Format selection */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB] block mb-2">
                Image Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFormat('jpg')}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    format === 'jpg'
                      ? 'border-[#6D1F35] bg-[#6D1F35]/5 dark:border-[#C6A15B] dark:bg-[#C6A15B]/10 ring-1 ring-[#6D1F35] dark:ring-[#C6A15B]'
                      : 'border-[#E5DFD4] dark:border-[#2E2729]'
                  }`}
                >
                  <p className="text-xs font-semibold text-[#141213] dark:text-[#F5F0EB]">JPG / JPEG</p>
                  <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
                    Smaller file size, ideal for photos and web sharing.
                  </p>
                </button>

                <button
                  onClick={() => setFormat('png')}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    format === 'png'
                      ? 'border-[#6D1F35] bg-[#6D1F35]/5 dark:border-[#C6A15B] dark:bg-[#C6A15B]/10 ring-1 ring-[#6D1F35] dark:ring-[#C6A15B]'
                      : 'border-[#E5DFD4] dark:border-[#2E2729]'
                  }`}
                >
                  <p className="text-xs font-semibold text-[#141213] dark:text-[#F5F0EB]">PNG</p>
                  <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
                    Lossless clarity, perfect for fine text and diagrams.
                  </p>
                </button>
              </div>
            </div>

            {/* Resolution Quality */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB] block mb-2">
                Resolution & DPI
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'normal', label: 'Standard (150 DPI)', sub: 'Fastest' },
                  { id: 'high', label: 'High (300 DPI)', sub: 'Recommended' },
                  { id: 'ultra', label: 'Ultra (450 DPI)', sub: 'Sharpest detail' },
                ].map((q) => (
                  <button
                    key={q.id}
                    onClick={() => setQuality(q.id as any)}
                    className={`p-3 rounded-xl text-center border transition-all ${
                      quality === q.id
                        ? 'border-[#6D1F35] bg-[#6D1F35]/5 dark:border-[#C6A15B] dark:bg-[#C6A15B]/10 ring-1 ring-[#6D1F35] dark:ring-[#C6A15B]'
                        : 'border-[#E5DFD4] dark:border-[#2E2729]'
                    }`}
                  >
                    <p className="text-xs font-semibold text-[#141213] dark:text-[#F5F0EB]">{q.label}</p>
                    <p className="text-[10px] text-[#5C554F] dark:text-[#A39991] mt-0.5">{q.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Page scope */}
            <div className="pt-2 border-t border-[#E5DFD4] dark:border-[#2E2729]">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB] block mb-2">
                Pages to Convert
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={pageScope === 'all'}
                    onChange={() => setPageScope('all')}
                    className="text-[#6D1F35] focus:ring-[#6D1F35]"
                  />
                  <span>All Pages ({totalPages} total)</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={pageScope === 'single'}
                    onChange={() => setPageScope('single')}
                    className="text-[#6D1F35] focus:ring-[#6D1F35]"
                  />
                  <span>Single Page:</span>
                </label>

                {pageScope === 'single' && (
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={singlePageNumber}
                    onChange={(e) => setSinglePageNumber(parseInt(e.target.value, 10) || 1)}
                    className="w-20 px-2 py-1 rounded-lg border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#1E1A1B] text-xs"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-4 rounded-2xl bg-[#F7F3EC]/90 dark:bg-[#141213]/90 border border-[#E5DFD4] dark:border-[#2E2729] flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-[#5C554F] dark:text-[#A39991]">
              Exported as {format.toUpperCase()} directly in browser canvas.
            </span>

            <button
              id="action-convert-pdf-to-image-btn"
              onClick={handleConvert}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#6D1F35] hover:bg-[#58182a] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Convert to {format.toUpperCase()}</span>
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
