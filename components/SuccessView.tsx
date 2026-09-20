'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Download, RefreshCw, ArrowLeft, ShieldCheck, FileCheck, Share2 } from 'lucide-react';
import { formatBytes } from '@/lib/pdf-engine';

interface SuccessViewProps {
  fileName: string;
  fileSize: number;
  pageCount?: number;
  downloadLabel?: string;
  onDownload: () => void;
  onReset: () => void;
  additionalNote?: string;
}

export const SuccessView: React.FC<SuccessViewProps> = ({
  fileName,
  fileSize,
  pageCount,
  downloadLabel = 'Download PDF',
  onDownload,
  onReset,
  additionalNote,
}) => {
  return (
    <div
      id="processing-success-view"
      className="w-full max-w-xl mx-auto rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] p-8 sm:p-10 shadow-xl text-center animate-in zoom-in-95 duration-200"
    >
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#35C98A]/10 text-[#35C98A] flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#35C98A]/10 text-[#258B5C] dark:text-[#35C98A] text-xs font-bold uppercase tracking-wider mb-2 border border-[#35C98A]/20">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Processed Locally in Browser</span>
      </div>

      <h2 className="text-2xl font-black text-[#1A1416] dark:text-[#F7F1E8] mb-2">
        Your PDF is ready.
      </h2>

      <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] mb-6">
        Zero server uploads. Your file was transformed on your device.
      </p>

      {/* File card */}
      <div className="bg-[#F6EFE3] dark:bg-[#241D20] border border-[#E8DFD3] dark:border-[#3D3035] rounded-2xl p-4 mb-6 text-left flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-[#FFFDF9] dark:bg-[#1B1719] text-[#7A1635] dark:text-[#C9A15A] flex items-center justify-center shrink-0 border border-[#E8DFD3] dark:border-[#2E2629]">
            <FileCheck className="w-5 h-5" />
          </div>
          <div className="truncate">
            <p className="text-xs font-bold text-[#1A1416] dark:text-[#F7F1E8] truncate">
              {fileName}
            </p>
            <div className="flex items-center gap-3 text-[11px] text-[#5C5256] dark:text-[#AFA6A8]">
              <span>{formatBytes(fileSize)}</span>
              {pageCount !== undefined && (
                <>
                  <span>•</span>
                  <span>{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {additionalNote && (
        <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] mb-6 italic">
          {additionalNote}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          id="success-download-btn"
          onClick={onDownload}
          className="w-full sm:w-auto flex-1 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 shadow-sm hover:brightness-110 active:scale-[0.98] transition-all border border-[#C9A15A]/40"
        >
          <Download className="w-4 h-4 text-[#C9A15A]" />
          <span>{downloadLabel}</span>
        </button>

        <button
          id="success-reset-btn"
          onClick={onReset}
          className="w-full sm:w-auto px-5 py-3.5 rounded-xl border border-[#E8DFD3] dark:border-[#2E2629] bg-[#FFFDF9] dark:bg-[#1B1719] text-xs font-bold text-[#1A1416] dark:text-[#F7F1E8] inline-flex items-center justify-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Process Another</span>
        </button>
      </div>
    </div>
  );
};
