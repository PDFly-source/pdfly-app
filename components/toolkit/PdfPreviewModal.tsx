'use client';

import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, ShieldCheck, FileText } from 'lucide-react';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  /** For final-PDF preview: a blob/object URL rendered in an iframe. */
  blobUrl?: string;
  /** For pre-generation preview: page image sources rendered as page cards. */
  pages?: string[];
  /** Aspect ratio (w/h) of the page cards, e.g. 595.28/841.89 for A4 portrait. */
  pageAspect?: number;
  footer?: React.ReactNode;
}

/**
 * Reusable modal that previews the final output:
 * - Generated PDF: rendered in a sandboxed iframe from a blob URL.
 * - Pre-generation: ordered page images shown as page cards with prev/next.
 */
export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  title = 'Preview',
  blobUrl,
  pages,
  pageAspect = 595.28 / 841.89,
  footer,
}) => {
  const [pageIdx, setPageIdx] = useState(0);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    setPageIdx(0);
  }

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (pages && pages.length > 1) {
        if (e.key === 'ArrowLeft') setPageIdx((i) => Math.max(0, i - 1));
        if (e.key === 'ArrowRight') setPageIdx((i) => Math.min(pages.length - 1, i + 1));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, pages]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-3xl h-[90vh] flex flex-col rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[#E8DFD3] dark:border-[#2E2629] shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] truncate">
              {title}
            </h3>
            {pages && pages.length > 0 && (
              <p className="text-[11px] text-[#5C554F] dark:text-[#AFA6A8]">
                {pages.length} {pages.length === 1 ? 'page' : 'pages'} · Page {pageIdx + 1} of{' '}
                {pages.length}
              </p>
            )}
            {blobUrl && (
              <p className="text-[11px] text-[#5C554F] dark:text-[#AFA6A8] inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#35C98A]" />
                Rendered locally in your browser
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[#5C554F] dark:text-[#A39991] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 relative bg-[#F1EAE0] dark:bg-[#141213] overflow-hidden">
          {blobUrl ? (
            <iframe
              src={`${blobUrl}#toolbar=0`}
              title="PDF preview"
              className="w-full h-full border-0"
            />
          ) : pages && pages.length > 0 ? (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              <div
                className="relative bg-white dark:bg-[#1E1A1B] rounded-lg shadow-lg overflow-hidden max-h-full"
                style={{ aspectRatio: String(pageAspect) }}
              >
                <img
                  src={pages[pageIdx]}
                  alt={`Page ${pageIdx + 1}`}
                  className="w-full h-full object-contain"
                  draggable={false}
                />
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/50 text-white text-[11px] font-bold">
                  {pageIdx + 1}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#5C554F] dark:text-[#A39991] gap-2">
              <FileText className="w-8 h-8 opacity-40" />
              <p className="text-xs">Nothing to preview yet.</p>
            </div>
          )}

          {/* Page navigation */}
          {pages && pages.length > 1 && (
            <>
              <button
                onClick={() => setPageIdx((i) => Math.max(0, i - 1))}
                disabled={pageIdx === 0}
                aria-label="Previous page"
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 dark:bg-[#1E1A1B]/90 shadow-md hover:scale-105 disabled:opacity-20 disabled:hover:scale-100 transition-all text-[#1A1416] dark:text-[#F7F1E8]"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPageIdx((i) => Math.min(pages.length - 1, i + 1))}
                disabled={pageIdx === pages.length - 1}
                aria-label="Next page"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 dark:bg-[#1E1A1B]/90 shadow-md hover:scale-105 disabled:opacity-20 disabled:hover:scale-100 transition-all text-[#1A1416] dark:text-[#F7F1E8]"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        {(footer || (pages && pages.length > 0)) && (
          <div className="px-5 py-4 border-t border-[#E8DFD3] dark:border-[#2E2629] shrink-0 bg-[#FFFDF9] dark:bg-[#1B1719]">
            {footer ? (
              footer
            ) : (
              <p className="text-[11px] text-[#5C554F] dark:text-[#A39991] text-center">
                Use arrow keys or the side buttons to browse pages.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
