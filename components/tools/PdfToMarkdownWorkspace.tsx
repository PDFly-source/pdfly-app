'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { pdfToMarkdown, triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { addRecentJob } from '@/lib/recent-jobs';
import {
  FileCode2,
  Copy,
  Download,
  RotateCcw,
  Check,
  Sparkles,
} from 'lucide-react';

export const PdfToMarkdownWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setLoading(true);

    try {
      const md = await pdfToMarkdown(selected);
      setMarkdown(md);
      addRecentJob({
        toolId: 'pdf-to-markdown',
        toolName: 'PDF to Markdown',
        fileName: `${selected.name.replace(/\.pdf$/i, '')}.md`,
        fileSize: selected.size,
        status: 'completed',
      });
    } catch (err: any) {
      console.error('PDF to Markdown error:', err);
      alert('Could not convert this PDF to Markdown.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!markdown) return;
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!markdown || !file) return;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    triggerDownload(blob, `${file.name.replace(/\.pdf$/i, '')}.md`);
  };

  return (
    <div className="rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] overflow-hidden shadow-xs">
      {!file ? (
        <div className="p-8 sm:p-12 text-center">
          <div className="max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center mx-auto mb-4">
              <FileCode2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5F0EB] mb-2">
              PDF to Markdown Converter
            </h2>
            <p className="text-xs sm:text-sm text-[#5C554F] dark:text-[#A39991] mb-6 leading-relaxed">
              Extract formatted text, headings, and bullet points into clean, editable Markdown (.md) syntax locally.
            </p>
            <FileDropzone
              accept=".pdf,application/pdf"
              maxFiles={1}
              onFilesSelected={handleFilesSelected}
              label={loading ? 'Extracting Markdown...' : 'Drop PDF here or click to convert'}
              sublabel="Private Local Processing • Instant Export"
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
                {formatBytes(file.size)} • {markdown.split('\n').length} lines of Markdown generated
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-xs font-semibold hover:border-[#6D1F35] transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Markdown'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6D1F35] hover:bg-[#58182a] text-white text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .md</span>
              </button>

              <button
                onClick={() => {
                  setFile(null);
                  setMarkdown('');
                }}
                className="p-2 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-xs font-semibold hover:bg-gray-100 dark:hover:bg-[#252021]"
                title="Convert another file"
              >
                <RotateCcw className="w-4 h-4 text-[#5C554F]" />
              </button>
            </div>
          </div>

          {/* Markdown Preview Area */}
          <div className="rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] overflow-hidden">
            <div className="px-4 py-2 bg-black/5 dark:bg-white/5 border-b border-[#E5DFD4] dark:border-[#2E2729] text-xs font-mono text-[#5C554F] dark:text-[#A39991] flex items-center justify-between">
              <span>Markdown Source Preview</span>
              <span>{markdown.length} characters</span>
            </div>
            <textarea
              readOnly
              value={markdown}
              rows={16}
              className="w-full p-4 bg-transparent font-mono text-xs text-[#141213] dark:text-[#F5F0EB] focus:outline-none resize-y leading-relaxed"
            />
          </div>
        </div>
      )}
    </div>
  );
};
