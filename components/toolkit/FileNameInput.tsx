'use client';

import React, { useState } from 'react';
import { Pencil, Sparkles, ShieldCheck, Check } from 'lucide-react';

interface FileNameInputProps {
  label?: string;
  value: string;
  onChange: (name: string) => void;
  /** Returns a locally-computed suggested name (no network). */
  onSuggest?: () => string;
  /** Hint shown under the input. */
  hint?: string;
  /** File extension appended at download time (not stored in the input). */
  extension?: string;
}

/**
 * Reusable output file name input with an optional local
 * "Suggest a Name" action and privacy hint. The extension is
 * displayed as a suffix and added at download time, never stored.
 */
export const FileNameInput: React.FC<FileNameInputProps> = ({
  label = 'File Name',
  value,
  onChange,
  onSuggest,
  hint,
  extension = '.pdf',
}) => {
  const [suggested, setSuggested] = useState(false);

  const handleSuggest = () => {
    if (!onSuggest) return;
    const suggestion = onSuggest();
    onChange(suggestion);
    setSuggested(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB]">
          {label}
        </label>
        {onSuggest && (
          <button
            type="button"
            onClick={handleSuggest}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#8A6D2F] dark:text-[#C9A15A] bg-[#C9A15A]/10 border border-[#C9A15A]/30 hover:bg-[#C9A15A]/20 transition-colors"
            title="Generate a smart file name locally from your file names"
          >
            <Sparkles className="w-3 h-3" />
            <span>{suggested ? 'Name Suggested' : 'Suggest a Name'}</span>
            {suggested && <Check className="w-3 h-3" />}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] px-3 py-2 focus-within:border-[#6D1F35]/50 focus-within:ring-2 focus-within:ring-[#6D1F35]/10 transition-all">
        <Pencil className="w-3.5 h-3.5 text-[#A79B90] shrink-0" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="PDFMiniFly_Document"
          aria-label="Output file name"
          className="flex-1 min-w-0 bg-transparent text-xs font-medium text-[#141213] dark:text-[#F5F0EB] outline-none placeholder:text-[#A79B90]/60"
        />
        <span className="text-[11px] font-semibold text-[#5C554F] dark:text-[#A39991] shrink-0">
          {extension}
        </span>
      </div>

      <p className="mt-1.5 text-[11px] text-[#5C554F] dark:text-[#A39991] flex items-center gap-1.5">
        <ShieldCheck className="w-3 h-3 text-[#35C98A] shrink-0" />
        <span>
          {hint ||
            (onSuggest
              ? 'Suggestion is generated locally on your device from your file names. Nothing is uploaded.'
              : 'File is created locally in your browser.')}
        </span>
      </p>
    </div>
  );
};
