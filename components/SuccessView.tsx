'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, RefreshCw, ArrowLeft, ShieldCheck, FileCheck, Share2, Eye, Pencil, Check, X } from 'lucide-react';
import { formatBytes } from '@/lib/pdf-engine';

interface SuccessViewProps {
  fileName: string;
  fileSize: number;
  pageCount?: number;
  downloadLabel?: string;
  onDownload: () => void;
  onReset: () => void;
  additionalNote?: string;
  /** Optional custom heading, e.g. "PDF Created". Defaults to the existing heading. */
  title?: string;
  /** Optional: open a final PDF preview (blob URL passed separately by the tool). */
  onPreview?: () => void;
  previewLabel?: string;
  /** Optional: native share of the generated file. Hidden automatically if unsupported. */
  onShare?: () => void;
  /** Optional: rename the generated file. Toggles an inline editor. */
  onRename?: (newName: string) => void;
  /** Optional: label for the reset button, e.g. "Create Another". */
  resetLabel?: string;
}

export const SuccessView: React.FC<SuccessViewProps> = ({
  fileName,
  fileSize,
  pageCount,
  downloadLabel = 'Download PDF',
  onDownload,
  onReset,
  additionalNote,
  title,
  onPreview,
  previewLabel = 'Preview PDF',
  onShare,
  onRename,
  resetLabel,
}) => {
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(fileName);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setDraftName(fileName);
  }, [fileName]);

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  const commitRename = () => {
    const cleaned = draftName.trim();
    if (cleaned && cleaned !== fileName) {
      onRename?.(cleaned);
    }
    setRenaming(false);
  };

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
        {title || 'Your PDF is ready.'}
      </h2>

      <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] mb-6">
        Zero server uploads. Your file was transformed on your device.
      </p>

      {/* File card */}
      <div className="bg-[#F6EFE3] dark:bg-[#241D20] border border-[#E8DFD3] dark:border-[#3D3035] rounded-2xl p-4 mb-6 text-left flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#FFFDF9] dark:bg-[#1B1719] text-[#7A1635] dark:text-[#C9A15A] flex items-center justify-center shrink-0 border border-[#E8DFD3] dark:border-[#2E2629]">
            <FileCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0 truncate">
            {renaming && onRename ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setRenaming(false);
                  }}
                  aria-label="Rename file"
                  className="w-full min-w-0 px-2 py-1 rounded-lg border border-[#C9A15A]/50 bg-[#FFFDF9] dark:bg-[#1B1719] text-xs font-bold text-[#1A1416] dark:text-[#F7F1E8] outline-none"
                />
                <button
                  onClick={commitRename}
                  aria-label="Confirm rename"
                  className="p-1.5 rounded-lg bg-[#35C98A]/15 text-[#258B5C] shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setRenaming(false);
                    setDraftName(fileName);
                  }}
                  aria-label="Cancel rename"
                  className="p-1.5 rounded-lg bg-[#C94A4A]/10 text-[#C94A4A] shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-xs font-bold text-[#1A1416] dark:text-[#F7F1E8] truncate">
                {fileName}
              </p>
            )}
            {!renaming && (
              <div className="flex items-center gap-3 text-[11px] text-[#5C5256] dark:text-[#AFA6A8]">
                <span>{formatBytes(fileSize)}</span>
                {pageCount !== undefined && (
                  <>
                    <span>•</span>
                    <span>{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {!renaming && onRename && (
          <button
            onClick={() => setRenaming(true)}
            aria-label="Rename file"
            title="Rename"
            className="p-2 rounded-xl text-[#5C554F] dark:text-[#A39991] hover:text-[#6D1F35] dark:hover:text-[#C9A15A] hover:bg-black/5 dark:hover:bg-white/5 shrink-0 transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

      {additionalNote && (
        <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] mb-6 italic">
          {additionalNote}
        </p>
      )}

      {/* Primary actions */}
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
          <span>{resetLabel || 'Process Another'}</span>
        </button>
      </div>

      {/* Secondary actions */}
      {(onPreview || (onShare && canShare)) && (
        <div className="mt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
          {onPreview && (
            <button
              onClick={onPreview}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#C9A15A]/40 bg-[#C9A15A]/10 text-[#8A6D2F] dark:text-[#C9A15A] text-xs font-bold inline-flex items-center justify-center gap-2 hover:bg-[#C9A15A]/20 transition-all"
            >
              <Eye className="w-4 h-4" />
              <span>{previewLabel}</span>
            </button>
          )}
          {onShare && canShare && (
            <button
              onClick={onShare}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#E8DFD3] dark:border-[#2E2629] bg-[#FFFDF9] dark:bg-[#1B1719] text-xs font-bold text-[#1A1416] dark:text-[#F7F1E8] inline-flex items-center justify-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
