'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Logo } from './Logo';
import { formatBytes } from '@/lib/pdf-engine';
import { Loader2, X, Clock } from 'lucide-react';

interface ProcessingModalProps {
  isOpen: boolean;
  stepName: string;
  percentage: number;
  onCancel?: () => void;
  /** Optional: name of the file being processed, shown for context. */
  fileName?: string;
  /** Optional: size of the file being processed, shown for context. */
  fileSize?: number;
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({
  isOpen,
  stepName,
  percentage,
  onCancel,
  fileName,
  fileSize,
}) => {
  // Honest elapsed-time counter (measured, not estimated)
  const [elapsed, setElapsed] = useState(0);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setElapsed(0);
    }
  }

  const startedAt = useRef<number>(0);

  useEffect(() => {
    if (isOpen) {
      startedAt.current = Date.now();
      const timer = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
      }, 1000);
      return () => window.clearInterval(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatElapsed = (totalSeconds: number): string => {
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200 motion-reduce:animate-none"
      role="dialog"
      aria-modal="true"
      aria-label="Processing your document locally"
    >
      <div
        id="processing-modal"
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#383033] p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200 motion-reduce:animate-none"
      >
        <div className="flex items-center justify-between mb-6">
          <Logo size="sm" />
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-1 rounded-lg text-[#5C554F] hover:text-[#141213] dark:text-[#A39991] dark:hover:text-[#F5F0EB]"
              title="Cancel processing"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="text-center py-2">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#6D1F35]/10 dark:bg-[#C6A15B]/15 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          </div>

          <h3 className="text-base font-semibold text-[#141213] dark:text-[#F5F0EB] mb-1">
            Processing Locally On Your Device
          </h3>
          <p className="text-xs text-[#5C554F] dark:text-[#A39991] mb-2" aria-live="polite">
            {stepName || 'Preparing your document...'}
          </p>
          {(fileName || fileSize) && (
            <p className="text-[11px] text-[#5C554F]/80 dark:text-[#A39991]/80 mb-6 truncate">
              {fileName}
              {fileName && fileSize ? ' — ' : ''}
              {fileSize !== undefined ? formatBytes(fileSize) : ''}
            </p>
          )}
          {(!fileName && fileSize === undefined) && <div className="mb-6" />}

          {/* Progress Bar */}
          <div className="w-full bg-[#F7F3EC] dark:bg-[#141213] h-2.5 rounded-full overflow-hidden border border-[#E5DFD4] dark:border-[#2E2729] mb-2">
            <div
              className="bg-[#6D1F35] dark:bg-[#C6A15B] h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#5C554F] dark:text-[#A39991] font-mono">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" aria-hidden="true" />
              {formatElapsed(elapsed)} elapsed
            </span>
            <span className="font-semibold text-[#6D1F35] dark:text-[#C6A15B]">
              {Math.round(percentage)}%
            </span>
          </div>
        </div>

        {onCancel && (
          <div className="mt-6 pt-4 border-t border-[#E5DFD4] dark:border-[#2E2729] text-center">
            <button
              onClick={onCancel}
              className="text-xs text-[#5C554F] dark:text-[#A39991] hover:text-[#C94A4A] transition-colors"
            >
              Cancel Operation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
