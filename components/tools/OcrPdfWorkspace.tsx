'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { performOcrOnPdf, triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { getPdfDocumentFromFile } from '@/lib/pdfjs-init';
import { addRecentJob } from '@/lib/recent-jobs';
import { ScanText, Copy, Download, Check, AlertCircle, Sparkles } from 'lucide-react';

export const OcrPdfWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [language, setLanguage] = useState('eng');
  const [maxPagesToScan, setMaxPagesToScan] = useState(5);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Initializing Tesseract OCR worker...');
  const [progressPct, setProgressPct] = useState(0);

  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setErrorMessage(null);
    setExtractedText(null);

    try {
      const pdfJsDoc = await getPdfDocumentFromFile(selected);
      setTotalPages(pdfJsDoc.numPages);
      setMaxPagesToScan(Math.min(pdfJsDoc.numPages, 5));
    } catch {
      // Continue gracefully
    }
  };

  const handleRunOcr = async () => {
    if (!file) return;
    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPct(5);

    try {
      const text = await performOcrOnPdf(
        file,
        {
          language,
          maxPages: maxPagesToScan,
        },
        (step, pct) => {
          setProcessStep(step);
          setProgressPct(pct);
        }
      );

      setExtractedText(text);

      addRecentJob({
        toolId: 'ocr-pdf',
        toolName: 'OCR PDF',
        fileName: file.name,
        fileSize: file.size,
        status: 'completed',
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err?.message || 'OCR processing encountered an issue. Scanned files must be clear and legible.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyText = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!extractedText || !file) return;
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, `${file.name.replace(/\.[^/.]+$/, '')}_ocr.txt`);
  };

  const handleReset = () => {
    setFile(null);
    setExtractedText(null);
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {!file ? (
        <FileDropzone
          onFilesSelected={handleFileSelected}
          multiple={false}
          accept=".pdf,application/pdf"
          label="Choose Scanned PDF for OCR"
          sublabel="Extract text from scanned documents using in-browser WebAssembly OCR."
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729]">
            <div>
              <h3 className="text-sm font-semibold text-[#141213] dark:text-[#F5F0EB]">
                {file.name}
              </h3>
              <p className="text-xs text-[#5C554F] dark:text-[#A39991]">
                {formatBytes(file.size)} • {totalPages} Pages
              </p>
            </div>

            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] text-xs font-medium text-[#5C554F] dark:text-[#A39991] hover:text-[#141213]"
            >
              Change File
            </button>
          </div>

          {!extractedText ? (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729] space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB]">
                Recognition Settings
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#141213] dark:text-[#F5F0EB] block mb-1">
                    Document Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs font-medium"
                  >
                    <option value="eng">English</option>
                    <option value="spa">Spanish (Español)</option>
                    <option value="fra">French (Français)</option>
                    <option value="deu">German (Deutsch)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#141213] dark:text-[#F5F0EB] block mb-1">
                    Scan First N Pages
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={maxPagesToScan}
                    onChange={(e) => setMaxPagesToScan(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs font-medium"
                  />
                  <span className="text-[10px] text-[#5C554F] dark:text-[#A39991] mt-1 block">
                    OCR runs via local WebAssembly and consumes device CPU.
                  </span>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  id="action-run-ocr-btn"
                  onClick={handleRunOcr}
                  className="px-6 py-3 rounded-xl bg-[#6D1F35] hover:bg-[#58182a] text-white text-sm font-semibold inline-flex items-center gap-2 shadow-sm transition-all"
                >
                  <ScanText className="w-4 h-4" />
                  <span>Start Local OCR</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729] space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#C6A15B]" />
                  <span>Extracted Text</span>
                </h4>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyText}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] text-xs font-medium hover:border-[#6D1F35] transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#238B63]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy All'}</span>
                  </button>

                  <button
                    onClick={handleDownloadTxt}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6D1F35] text-white text-xs font-medium hover:bg-[#58182a] transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .txt</span>
                  </button>
                </div>
              </div>

              <textarea
                value={extractedText}
                readOnly
                rows={12}
                className="w-full p-4 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-[#FAF7F2] dark:bg-[#141213] text-xs font-mono leading-relaxed resize-y focus:outline-none"
              />
            </div>
          )}
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
