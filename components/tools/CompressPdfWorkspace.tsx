'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { compressPdf, triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { addRecentJob } from '@/lib/recent-jobs';
import { FileNameInput } from '@/components/toolkit/FileNameInput';
import { PdfPreviewModal } from '@/components/toolkit/PdfPreviewModal';
import { ensurePdfExtension } from '@/lib/suggest-filename';
import {
  Minimize2,
  TrendingDown,
  Sparkles,
  Zap,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  FileCheck,
  Eye,
  Share2,
} from 'lucide-react';
import Link from 'next/link';

export const CompressPdfWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('compressed');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);
  const [level, setLevel] = useState<'recommended' | 'extreme' | 'low'>('recommended');
  const [removeMetadata, setRemoveMetadata] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Compressing document...');
  const [progressPct, setProgressPct] = useState(0);

  const [resultData, setResultData] = useState<{
    blob: Blob;
    originalSize: number;
    newSize: number;
    savedPercentage: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = (files: File[]) => {
    if (!files || files.length === 0) return;
    setFile(files[0]);
    setFileName(`compressed_${files[0].name.replace(/\.pdf$/i, '')}`);
    setErrorMessage(null);
  };

  const handleCompress = async () => {
    if (!file) return;
    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPct(10);

    try {
      const result = await compressPdf(
        file,
        {
          level,
          removeMetadata,
        },
        (step, pct) => {
          setProcessStep(step);
          setProgressPct(pct);
        }
      );

      setResultData(result);
      setResultBlobUrl(URL.createObjectURL(result.blob));
      addRecentJob({
        toolId: 'compress-pdf',
        toolName: 'Compress PDF',
        fileName: ensurePdfExtension(fileName),
        fileSize: result.newSize,
        status: 'completed',
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Failed to compress document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (resultData && file) {
      triggerDownload(resultData.blob, ensurePdfExtension(fileName));
    }
  };

  const handleReset = () => {
    setFile(null);
    setResultData(null);
    setResultBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFileName('compressed');
    setIsPreviewOpen(false);
    setErrorMessage(null);
  };

  if (resultData && file) {
    return (
      <div className="w-full max-w-xl mx-auto rounded-3xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#383033] p-8 sm:p-10 shadow-lg text-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#238B63]/10 dark:bg-[#2EB682]/15 text-[#238B63] dark:text-[#2EB682] flex items-center justify-center">
          <TrendingDown className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#238B63]/10 text-[#238B63] dark:text-[#2EB682] text-xs font-semibold uppercase tracking-wider mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Optimization Complete</span>
        </div>

        <h2 className="text-2xl font-bold text-[#141213] dark:text-[#F5F0EB] mb-2">
          Your PDF has been compressed.
        </h2>

        {/* Compression Comparison Card */}
        <div className="my-6 p-6 rounded-2xl bg-[#F7F3EC] dark:bg-[#141213] border border-[#E5DFD4] dark:border-[#2E2729]">
          <div className="grid grid-cols-2 gap-4 divide-x divide-[#E5DFD4] dark:divide-[#2E2729]">
            <div className="text-center pr-2">
              <p className="text-[11px] uppercase tracking-wider text-[#5C554F] dark:text-[#A39991] mb-1">
                Original Size
              </p>
              <p className="text-lg font-bold text-[#5C554F] dark:text-[#A39991] line-through">
                {formatBytes(resultData.originalSize)}
              </p>
            </div>
            <div className="text-center pl-2">
              <p className="text-[11px] uppercase tracking-wider text-[#238B63] dark:text-[#2EB682] font-semibold mb-1">
                Optimized Size
              </p>
              <p className="text-2xl font-bold text-[#238B63] dark:text-[#2EB682]">
                {formatBytes(resultData.newSize)}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#E5DFD4] dark:border-[#2E2729] flex items-center justify-between text-xs">
            <span className="text-[#5C554F] dark:text-[#A39991]">Total reduction:</span>
            <span className="font-bold text-[#238B63] dark:text-[#2EB682]">
              {resultData.savedPercentage > 0
                ? `${resultData.savedPercentage}% smaller`
                : 'Already optimized'}
            </span>
          </div>
        </div>

        <div className="mb-5 text-left">
          <FileNameInput
            label="File Name"
            value={fileName}
            onChange={setFileName}
            onSuggest={() => `Compressed_${file.name.replace(/\.pdf$/i, '')}`}
            extension=".pdf"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleDownload}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#6D1F35] hover:bg-[#58182a] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
          >
            <FileCheck className="w-4 h-4" />
            <span>Download Compressed PDF</span>
          </button>

          <button
            onClick={handleReset}
            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#1E1A1B] text-[#141213] dark:text-[#F5F0EB] text-sm font-medium hover:border-[#6D1F35] dark:hover:border-[#C6A15B] inline-flex items-center justify-center gap-2 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Compress Another</span>
          </button>
        </div>

        <div className="mt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#C9A15A]/40 bg-[#C9A15A]/10 text-[#8A6D2F] dark:text-[#C9A15A] text-xs font-bold inline-flex items-center justify-center gap-2 hover:bg-[#C9A15A]/20 transition-all"
          >
            <Eye className="w-4 h-4" />
            <span>Preview PDF</span>
          </button>
          <button
            onClick={async () => {
              if (!resultData) return;
              try {
                const out = new File([resultData.blob], ensurePdfExtension(fileName), { type: 'application/pdf' });
                if (navigator.share && (navigator as any).canShare?.({ files: [out] })) {
                  await navigator.share({ files: [out], title: ensurePdfExtension(fileName) });
                }
              } catch {
                /* user cancelled share */
              }
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs font-bold text-[#141213] dark:text-[#F5F0EB] inline-flex items-center justify-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>

        <PdfPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          title={ensurePdfExtension(fileName)}
          blobUrl={resultBlobUrl || undefined}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {!file ? (
        <FileDropzone
          onFilesSelected={handleFileSelected}
          multiple={false}
          accept=".pdf,application/pdf"
          label="Choose PDF to Compress"
          sublabel="Reduce PDF file size locally in your browser with no quality loss."
        />
      ) : (
        <div className="space-y-6">
          {/* File Card */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729]">
            <div>
              <h3 className="text-sm font-semibold text-[#141213] dark:text-[#F5F0EB]">
                {file.name}
              </h3>
              <p className="text-xs text-[#5C554F] dark:text-[#A39991]">
                Current Size: {formatBytes(file.size)}
              </p>
            </div>

            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] text-xs font-medium text-[#5C554F] dark:text-[#A39991] hover:text-[#141213]"
            >
              Change File
            </button>
          </div>

          {/* Compression Level Presets */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729] space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB]">
              Select Compression Level
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'extreme',
                  label: 'Extreme Compression',
                  sub: 'Smallest file size',
                  detail: 'Medium image quality, maximum reduction',
                  icon: Zap,
                },
                {
                  id: 'recommended',
                  label: 'Recommended',
                  sub: 'Best balance',
                  detail: 'Good quality with significant size reduction',
                  icon: Sparkles,
                  badge: 'Popular',
                },
                {
                  id: 'low',
                  label: 'Low Compression',
                  sub: 'Highest quality',
                  detail: 'Minor space savings, pristine visual fidelity',
                  icon: Minimize2,
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = level === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setLevel(opt.id as any)}
                    className={`relative p-4 rounded-xl text-left border transition-all ${
                      active
                        ? 'border-[#6D1F35] bg-[#6D1F35]/5 dark:border-[#C6A15B] dark:bg-[#C6A15B]/10 ring-1 ring-[#6D1F35] dark:ring-[#C6A15B]'
                        : 'border-[#E5DFD4] dark:border-[#2E2729] hover:border-[#6D1F35]/50'
                    }`}
                  >
                    {opt.badge && (
                      <span className="absolute top-3 right-3 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#6D1F35] text-white">
                        {opt.badge}
                      </span>
                    )}
                    <Icon
                      className={`w-5 h-5 mb-2 ${
                        active ? 'text-[#6D1F35] dark:text-[#C6A15B]' : 'text-[#5C554F]'
                      }`}
                    />
                    <p className="text-xs font-semibold text-[#141213] dark:text-[#F5F0EB]">
                      {opt.label}
                    </p>
                    <p className="text-[11px] font-medium text-[#6D1F35] dark:text-[#C6A15B]">
                      {opt.sub}
                    </p>
                    <p className="text-[11px] text-[#5C554F] dark:text-[#A39991] mt-1 leading-normal">
                      {opt.detail}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Advanced toggle */}
            <div className="pt-3 border-t border-[#E5DFD4] dark:border-[#2E2729] flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#141213] dark:text-[#F5F0EB]">
                  Remove Metadata & Unused Data Objects
                </p>
                <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
                  Cleans author information, history, and unreferenced structural tags.
                </p>
              </div>

              <input
                type="checkbox"
                checked={removeMetadata}
                onChange={(e) => setRemoveMetadata(e.target.checked)}
                className="w-4 h-4 rounded text-[#6D1F35] focus:ring-[#6D1F35]"
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="p-4 rounded-2xl bg-[#F7F3EC]/90 dark:bg-[#141213]/90 border border-[#E5DFD4] dark:border-[#2E2729] flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-[#5C554F] dark:text-[#A39991]">
              Private browser stream compression.
            </span>

            <button
              id="action-compress-pdf-btn"
              onClick={handleCompress}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#6D1F35] hover:bg-[#58182a] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Compress PDF</span>
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
