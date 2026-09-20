'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { addWatermarkToPdf, triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { getPdfDocumentFromFile } from '@/lib/pdfjs-init';
import { addRecentJob } from '@/lib/recent-jobs';
import { Stamp, Type, Image as ImageIcon, AlertCircle } from 'lucide-react';

export const WatermarkWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState(1);

  const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(0.35);
  const [rotation, setRotation] = useState(45);
  const [color, setColor] = useState('#C94A4A');
  const [position, setPosition] = useState<
    'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  >('center');

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageScale, setImageScale] = useState(0.4);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Applying watermark...');
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

  const handleWatermark = async () => {
    if (!file) return;
    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPct(10);

    try {
      let imageBuffer: ArrayBuffer | undefined;
      let imageType: 'png' | 'jpg' | undefined;

      if (watermarkType === 'image' && imageFile) {
        imageBuffer = await imageFile.arrayBuffer();
        imageType = imageFile.type.includes('png') ? 'png' : 'jpg';
      }

      const outBlob = await addWatermarkToPdf(
        file,
        {
          type: watermarkType,
          text,
          fontSize,
          opacity,
          rotation,
          color,
          position,
          imageBuffer,
          imageType,
          imageScale,
        },
        (step, pct) => {
          setProcessStep(step);
          setProgressPct(pct);
        }
      );

      const outName = `watermarked_${file.name}`;
      setResultBlob(outBlob);
      setResultFileName(outName);

      addRecentJob({
        toolId: 'watermark-pdf',
        toolName: 'Watermark PDF',
        fileName: outName,
        fileSize: outBlob.size,
        status: 'completed',
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Failed to apply watermark.');
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
        downloadLabel="Download Watermarked PDF"
        onDownload={handleDownload}
        onReset={handleReset}
        additionalNote="Watermark applied across pages locally."
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
          label="Choose PDF to Watermark"
          sublabel="Stamp text or image watermarks directly onto every page of your PDF."
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
            {/* Watermark Type */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setWatermarkType('text')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-medium border flex items-center justify-center gap-2 transition-all ${
                  watermarkType === 'text'
                    ? 'border-[#6D1F35] bg-[#6D1F35]/5 dark:border-[#C6A15B] dark:bg-[#C6A15B]/10 ring-1 ring-[#6D1F35]'
                    : 'border-[#E5DFD4] dark:border-[#2E2729]'
                }`}
              >
                <Type className="w-4 h-4 text-[#6D1F35] dark:text-[#C6A15B]" />
                <span>Text Watermark</span>
              </button>

              <button
                onClick={() => setWatermarkType('image')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-medium border flex items-center justify-center gap-2 transition-all ${
                  watermarkType === 'image'
                    ? 'border-[#6D1F35] bg-[#6D1F35]/5 dark:border-[#C6A15B] dark:bg-[#C6A15B]/10 ring-1 ring-[#6D1F35]'
                    : 'border-[#E5DFD4] dark:border-[#2E2729]'
                }`}
              >
                <ImageIcon className="w-4 h-4 text-[#6D1F35] dark:text-[#C6A15B]" />
                <span>Image / Logo Watermark</span>
              </button>
            </div>

            {watermarkType === 'text' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB] block mb-1">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="CONFIDENTIAL, DRAFT, COPY..."
                    className="w-full px-3 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D1F35]"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-[#5C554F] dark:text-[#A39991] block mb-1">
                      Font Size ({fontSize} pt)
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                      className="w-full accent-[#6D1F35]"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#5C554F] dark:text-[#A39991] block mb-1">
                      Opacity ({Math.round(opacity * 100)}%)
                    </label>
                    <input
                      type="range"
                      min="0.05"
                      max="0.9"
                      step="0.05"
                      value={opacity}
                      onChange={(e) => setOpacity(parseFloat(e.target.value))}
                      className="w-full accent-[#6D1F35]"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#5C554F] dark:text-[#A39991] block mb-1">
                      Angle ({rotation}°)
                    </label>
                    <input
                      type="range"
                      min="-90"
                      max="90"
                      step="15"
                      value={rotation}
                      onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                      className="w-full accent-[#6D1F35]"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#5C554F] dark:text-[#A39991] block mb-1">
                      Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-[#E5DFD4]"
                      />
                      <span className="text-xs font-mono">{color}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB] block mb-1">
                    Upload Logo / Image (PNG recommended)
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#5C554F] dark:text-[#A39991] block mb-1">
                      Opacity ({Math.round(opacity * 100)}%)
                    </label>
                    <input
                      type="range"
                      min="0.05"
                      max="0.9"
                      step="0.05"
                      value={opacity}
                      onChange={(e) => setOpacity(parseFloat(e.target.value))}
                      className="w-full accent-[#6D1F35]"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#5C554F] dark:text-[#A39991] block mb-1">
                      Scale ({Math.round(imageScale * 100)}%)
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={imageScale}
                      onChange={(e) => setImageScale(parseFloat(e.target.value))}
                      className="w-full accent-[#6D1F35]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Position Picker */}
            <div className="pt-3 border-t border-[#E5DFD4] dark:border-[#2E2729]">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB] block mb-2">
                Placement Position
              </label>
              <div className="grid grid-cols-5 gap-2 max-w-md">
                {[
                  { id: 'top-left', label: 'Top Left' },
                  { id: 'center', label: 'Center' },
                  { id: 'top-right', label: 'Top Right' },
                  { id: 'bottom-left', label: 'Bottom Left' },
                  { id: 'bottom-right', label: 'Bottom Right' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    onClick={() => setPosition(pos.id as any)}
                    className={`py-2 px-1 text-[11px] font-medium rounded-lg border text-center transition-all ${
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
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F3EC]/90 dark:bg-[#141213]/90 border border-[#E5DFD4] dark:border-[#2E2729] flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-[#5C554F] dark:text-[#A39991]">
              Applies to all {totalPages} pages without uploading to external servers.
            </span>

            <button
              id="action-apply-watermark-btn"
              onClick={handleWatermark}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#6D1F35] hover:bg-[#58182a] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <Stamp className="w-4 h-4" />
              <span>Apply Watermark</span>
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
