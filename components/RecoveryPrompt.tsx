'use client';

import React from 'react';
import { BottomSheet } from './ui/BottomSheet';
import { History, RotateCcw, Trash2, ShieldCheck } from 'lucide-react';

interface RecoveryPromptProps {
  isOpen: boolean;
  /** e.g. "2 hours ago" or a formatted timestamp, computed by the caller. */
  savedWhen: string;
  onRestore: () => void;
  onDiscard: () => void;
}

/**
 * "Previous work found" — explicit, local-only recovery prompt.
 * The user must choose Restore or Discard; nothing is ever restored
 * silently, and the stored copy lives only in the device's IndexedDB.
 */
export const RecoveryPrompt: React.FC<RecoveryPromptProps> = ({
  isOpen,
  savedWhen,
  onRestore,
  onDiscard,
}) => {
  return (
    <BottomSheet isOpen={isOpen} onClose={onDiscard} label="Previous work found" title="Previous work found">
      <div className="text-center py-2">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#7A1635]/10 dark:bg-[#C9A15A]/15 text-[#7A1635] dark:text-[#C9A15A] flex items-center justify-center">
          <History className="w-7 h-7" />
        </div>
        <p className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8]">
          Would you like to restore your previous session?
        </p>
        <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] mt-1.5">
          Unsaved work from {savedWhen} was kept on this device.
        </p>
        <p className="text-[11px] flex items-center justify-center gap-1.5 mt-3 text-[#1F8A5F] dark:text-[#35C98A] font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          Stored locally only — never uploaded
        </p>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            onClick={onDiscard}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#E8DFD3] dark:border-[#2E2629] text-sm font-semibold text-[#5C5256] dark:text-[#AFA6A8] hover:bg-black/5 dark:hover:bg-white/5 transition-colors active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            Discard
          </button>
          <button
            onClick={onRestore}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-sm font-bold text-[#F7F1E8] border border-[#C9A15A]/30 hover:brightness-110 transition-all active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            Restore
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};
