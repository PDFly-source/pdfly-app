'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { protectPdf, triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { addRecentJob } from '@/lib/recent-jobs';
import { ShieldCheck, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export const ProtectPdfWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [disallowPrinting, setDisallowPrinting] = useState(false);
  const [disallowCopying, setDisallowCopying] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Securing document...');
  const [progressPct, setProgressPct] = useState(0);

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = (files: File[]) => {
    if (!files || files.length === 0) return;
    setFile(files[0]);
    setErrorMessage(null);
  };

  const handleProtect = async () => {
    if (!file) return;
    if (!password) {
      setErrorMessage('Please enter a password to protect your PDF.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPct(15);

    try {
      const outBlob = await protectPdf(
        file,
        {
          password,
          disallowPrinting,
          disallowCopying,
        },
        (step, pct) => {
          setProcessStep(step);
          setProgressPct(pct);
        }
      );

      const outName = `protected_${file.name}`;
      setResultBlob(outBlob);
      setResultFileName(outName);

      addRecentJob({
        toolId: 'protect-pdf',
        toolName: 'Protect PDF',
        fileName: outName,
        fileSize: outBlob.size,
        status: 'completed',
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Failed to encrypt document.');
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
    setPassword('');
    setConfirmPassword('');
    setResultBlob(null);
    setResultFileName('');
    setErrorMessage(null);
  };

  if (resultBlob && file) {
    return (
      <SuccessView
        fileName={resultFileName}
        fileSize={resultBlob.size}
        downloadLabel="Download Protected PDF"
        onDownload={handleDownload}
        onReset={handleReset}
        additionalNote="PDF secured with password metadata locally. Password is never logged or transmitted."
      />
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {!file ? (
        <FileDropzone
          onFilesSelected={handleFileSelected}
          multiple={false}
          accept=".pdf,application/pdf"
          label="Choose PDF to Protect"
          sublabel="Encrypt and restrict access to your PDF with strong client-side security."
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729]">
            <div>
              <h3 className="text-sm font-semibold text-[#141213] dark:text-[#F5F0EB]">
                {file.name}
              </h3>
              <p className="text-xs text-[#5C554F] dark:text-[#A39991]">
                Size: {formatBytes(file.size)}
              </p>
            </div>

            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] text-xs font-medium text-[#5C554F] dark:text-[#A39991] hover:text-[#141213]"
            >
              Change File
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729] space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB]">
              Set Access Password
            </h4>

            <div>
              <label className="text-xs text-[#5C554F] dark:text-[#A39991] block mb-1">
                Password:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secure password..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D1F35]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#5C554F] hover:text-[#141213]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-[#5C554F] dark:text-[#A39991] block mb-1">
                Confirm Password:
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type password..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D1F35]"
              />
            </div>

            <div className="pt-3 border-t border-[#E5DFD4] dark:border-[#2E2729] space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-[#141213] dark:text-[#F5F0EB] cursor-pointer">
                <input
                  type="checkbox"
                  checked={disallowPrinting}
                  onChange={(e) => setDisallowPrinting(e.target.checked)}
                  className="w-4 h-4 rounded text-[#6D1F35]"
                />
                <span>Restrict Printing</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-[#141213] dark:text-[#F5F0EB] cursor-pointer">
                <input
                  type="checkbox"
                  checked={disallowCopying}
                  onChange={(e) => setDisallowCopying(e.target.checked)}
                  className="w-4 h-4 rounded text-[#6D1F35]"
                />
                <span>Restrict Copying Text and Content</span>
              </label>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F3EC]/90 dark:bg-[#141213]/90 border border-[#E5DFD4] dark:border-[#2E2729] flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-[#5C554F] dark:text-[#A39991]">
              Passwords never leave your browser memory.
            </span>

            <button
              id="action-protect-pdf-btn"
              onClick={handleProtect}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#6D1F35] hover:bg-[#58182a] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <Lock className="w-4 h-4" />
              <span>Protect PDF</span>
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
