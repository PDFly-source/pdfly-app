'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { UploadCloud, FileText, AlertCircle, AlertTriangle, Plus, Scissors } from 'lucide-react';
import { formatBytes } from '@/lib/pdf-engine';

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  label?: string;
  sublabel?: string;
  compact?: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFilesSelected,
  accept = '.pdf,application/pdf',
  multiple = false,
  maxFiles = 20,
  label = 'Choose PDF Files',
  sublabel = 'or drop documents directly here',
  compact = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<{ text: string; strong: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndPass = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    setErrorMsg(null);
    setWarningMsg(null);

    const list = Array.from(incoming);

    // Limit check
    if (!multiple && list.length > 1) {
      onFilesSelected([list[0]]);
      return;
    }

    if (list.length > maxFiles) {
      setErrorMsg(`You can select at most ${maxFiles} files at once.`);
      onFilesSelected(list.slice(0, maxFiles));
      return;
    }

    // Check sizes for warnings
    for (const f of list) {
      if (f.size > 100 * 1024 * 1024) {
        setWarningMsg({
          text: `"${f.name}" is over 100MB (${formatBytes(f.size)}). Processing may exhaust device browser memory. If performance suffers, consider splitting it first into smaller parts.`,
          strong: true,
        });
      } else if (f.size > 50 * 1024 * 1024) {
        setWarningMsg({
          text: `"${f.name}" is ${formatBytes(f.size)}. Large files may process slowly depending on your device RAM.`,
          strong: false,
        });
      }
    }

    onFilesSelected(list);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    validateAndPass(e.dataTransfer.files);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  if (compact) {
    return (
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`cursor-pointer border-2 border-dashed rounded-xl p-4 text-center transition-all ${
          isDragOver
            ? 'border-[#7A1635] bg-[#7A1635]/5 dark:border-[#C9A15A] dark:bg-[#C9A15A]/10'
            : 'border-[#E8DFD3] dark:border-[#2E2629] hover:border-[#7A1635]/60 bg-[#FFFDF9]/60 dark:bg-[#1B1719]/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => validateAndPass(e.target.files)}
          className="hidden"
        />
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#7A1635] dark:text-[#C9A15A]">
          <Plus className="w-4 h-4" />
          <span>Add more files</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        id="file-upload-dropzone"
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative cursor-pointer w-full rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-[#7A1635] bg-[#7A1635]/5 dark:border-[#C9A15A] dark:bg-[#C9A15A]/10 scale-[1.005]'
            : 'border-[#E8DFD3] dark:border-[#3D3035] bg-[#FFFDF9] dark:bg-[#1B1719] hover:border-[#7A1635]/70 dark:hover:border-[#C9A15A]/70 shadow-xs'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => validateAndPass(e.target.files)}
          className="hidden"
          id="hidden-file-input"
        />

        <div className="flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-[#F6EFE3] dark:bg-[#241D20] text-[#7A1635] dark:text-[#C9A15A] border border-[#E8DFD3] dark:border-[#3D3035] flex items-center justify-center mb-4 shadow-2xs">
            <UploadCloud className="w-7 h-7" />
          </div>

          <h3 className="text-base font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1">
            <span className="inline-block px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] text-xs sm:text-sm font-bold shadow-xs hover:brightness-110 active:scale-[0.98] transition-all border border-[#C9A15A]/40">
              {label}
            </span>
          </h3>

          <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] mt-2.5 mb-3 font-normal">
            {sublabel}
          </p>

          <div className="inline-flex items-center gap-2 text-[11px] font-bold px-3.5 py-1 rounded-full bg-[#F6EFE3] dark:bg-[#241D20] text-[#5C5256] dark:text-[#AFA6A8] border border-[#E8DFD3] dark:border-[#3D3035]">
            <FileText className="w-3 h-3 text-[#7A1635] dark:text-[#C9A15A]" />
            <span>Local processing • Accepted: {accept.replace(/application\/pdf/g, 'PDF')}</span>
          </div>
        </div>
      </div>

      {/* Warnings & Errors */}
      {warningMsg && (
        <div
          className={`mt-3 flex items-start gap-2.5 p-3.5 rounded-xl text-xs font-medium ${
            warningMsg.strong
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200'
              : 'bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p>{warningMsg.text}</p>
            {warningMsg.strong && (
              <div className="mt-1.5 flex items-center gap-2">
                <Link
                  href="/tools/split-pdf"
                  className="inline-flex items-center gap-1 font-bold text-[#7A1635] dark:text-[#C9A15A] hover:underline"
                >
                  <Scissors className="w-3 h-3" />
                  <span>Split large PDF first</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-[#E36B6B]/10 border border-[#E36B6B]/30 text-[#E36B6B] text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
