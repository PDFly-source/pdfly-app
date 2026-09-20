'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { sanitizePdf, checkPdfHealth, triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { addRecentJob } from '@/lib/recent-jobs';
import { DocumentHealthReport } from '@/types/pdf';
import {
  ShieldAlert,
  ShieldCheck,
  Download,
  Trash2,
  CheckCircle2,
  Lock,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export const PdfSanitizerWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<DocumentHealthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [removeMetadata, setRemoveMetadata] = useState(true);
  const [removeAnnotations, setRemoveAnnotations] = useState(true);

  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setLoading(true);

    try {
      const health = await checkPdfHealth(selected);
      setReport(health);
    } catch (e) {
      console.warn('Sanitizer preliminary scan note:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSanitize = async () => {
    if (!file) return;
    setProcessing(true);

    try {
      const cleanBlob = await sanitizePdf(file, {
        removeMetadata,
        removeAnnotations,
      });

      const cleanFileName = file.name.replace(/\.pdf$/i, '_sanitized.pdf');
      triggerDownload(cleanBlob, cleanFileName);

      addRecentJob({
        toolId: 'pdf-sanitizer',
        toolName: 'Document Sanitizer',
        fileName: cleanFileName,
        fileSize: cleanBlob.size,
        status: 'completed',
      });
    } catch (err: any) {
      console.error('Sanitization failed:', err);
      alert('Could not sanitize this document: ' + (err?.message || 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] overflow-hidden shadow-xs">
      {!file ? (
        <div className="p-8 sm:p-12 text-center">
          <div className="max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5F0EB] mb-2">
              Document Sanitizer
            </h2>
            <p className="text-xs sm:text-sm text-[#5C554F] dark:text-[#A39991] mb-6 leading-relaxed">
              Safely purge sensitive author names, revision history, timestamps, software signatures, and annotations before sharing documents with third parties.
            </p>
            <FileDropzone
              accept=".pdf,application/pdf"
              maxFiles={1}
              onFilesSelected={handleFilesSelected}
              label={loading ? 'Scanning document...' : 'Drop PDF here or click to sanitize'}
              sublabel="100% In-Memory Processing • Zero Uploads"
            />
          </div>
        </div>
      ) : (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5DFD4] dark:border-[#2E2729]">
            <div>
              <h2 className="text-xl font-bold text-[#141213] dark:text-[#F5F0EB] truncate max-w-md">
                {file.name}
              </h2>
              <p className="text-xs text-[#5C554F] dark:text-[#A39991]">
                {formatBytes(file.size)} • Ready for sanitization
              </p>
            </div>

            <button
              onClick={() => {
                setFile(null);
                setReport(null);
              }}
              className="p-2 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-xs font-semibold hover:bg-gray-100 dark:hover:bg-[#252021] self-start sm:self-auto"
              title="Select another file"
            >
              <RotateCcw className="w-4 h-4 text-[#5C554F]" />
            </button>
          </div>

          {/* Options Card */}
          <div className="p-5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5C554F] dark:text-[#A39991]">
              Sanitization Options
            </h3>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={removeMetadata}
                onChange={(e) => setRemoveMetadata(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-[#6D1F35] focus:ring-[#6D1F35]"
              />
              <div>
                <span className="text-sm font-semibold text-[#141213] dark:text-[#F5F0EB]">
                  Strip Identifying Metadata
                </span>
                <p className="text-xs text-[#5C554F] dark:text-[#A39991]">
                  Erases document title, author name, creator application, producer, and modification timestamps.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={removeAnnotations}
                onChange={(e) => setRemoveAnnotations(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-[#6D1F35] focus:ring-[#6D1F35]"
              />
              <div>
                <span className="text-sm font-semibold text-[#141213] dark:text-[#F5F0EB]">
                  Remove Annotations & Comments
                </span>
                <p className="text-xs text-[#5C554F] dark:text-[#A39991]">
                  Removes user notes, highlights, strike-through marks, and sticky comments.
                </p>
              </div>
            </label>
          </div>

          {/* Action button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleSanitize}
              disabled={processing || (!removeMetadata && !removeAnnotations)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#6D1F35] hover:bg-[#58182a] text-white text-sm font-semibold transition-all shadow-sm disabled:opacity-50"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sanitizing Document...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sanitize & Download Clean PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
