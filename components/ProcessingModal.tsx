'use client';

import React from 'react';
import { Logo } from './Logo';
import { Loader2, X } from 'lucide-react';

interface ProcessingModalProps {
  isOpen: boolean;
  stepName: string;
  percentage: number;
  onCancel?: () => void;
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({
  isOpen,
  stepName,
  percentage,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        id="processing-modal"
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#383033] p-6 sm:p-8 shadow-2xl"
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
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>

          <h3 className="text-base font-semibold text-[#141213] dark:text-[#F5F0EB] mb-1">
            Processing Locally On Your Device
          </h3>
          <p className="text-xs text-[#5C554F] dark:text-[#A39991] mb-6">
            {stepName || 'Preparing your document...'}
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-[#F7F3EC] dark:bg-[#141213] h-2.5 rounded-full overflow-hidden border border-[#E5DFD4] dark:border-[#2E2729] mb-2">
            <div
              className="bg-[#6D1F35] dark:bg-[#C6A15B] h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#5C554F] dark:text-[#A39991] font-mono">
            <span>Client-side sandbox</span>
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
