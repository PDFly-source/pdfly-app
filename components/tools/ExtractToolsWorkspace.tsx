'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import {
  extractTextFromPdf,
  extractImagesFromPdf,
  removePagesFromPdf,
  triggerDownload,
  formatBytes,
} from '@/lib/pdf-engine';
import { PDFDocument } from 'pdf-lib';
import { addRecentJob } from '@/lib/recent-jobs';
import {
  FileText,
  Images,
  FilePlus2,
  Copy,
  Download,
  Check,
  CheckCircle2,
  Archive,
} from 'lucide-react';

interface ExtractToolsWorkspaceProps {
  initialMode?: 'text' | 'images' | 'pages';
}

export const ExtractToolsWorkspace: React.FC<ExtractToolsWorkspaceProps> = ({
  initialMode = 'text',
}) => {
  const [mode, setMode] = useState<'text' | 'images' | 'pages'>(initialMode);
  const [file, setFile] = useState<File | null>(null);

  // Text state
  const [extractedPagesText, setExtractedPagesText] = useState<{ pageNumber: number; text: string }[]>([]);
  const [copiedPage, setCopiedPage] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  // Images state
  const [extractedImages, setExtractedImages] = useState<{ name: string; dataUrl: string; blob: Blob }[]>([]);
  const [imagesZipBlob, setImagesZipBlob] = useState<Blob | null>(null);

  // Pages state
  const [pageRangeStr, setPageRangeStr] = useState<string>('1-3');
  const [extractedPagesBlob, setExtractedPagesBlob] = useState<Blob | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Extracting content...');
  const [progressPct, setProgressPct] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setErrorMessage(null);
    setExtractedPagesText([]);
    setExtractedImages([]);
    setImagesZipBlob(null);
    setExtractedPagesBlob(null);

    setIsProcessing(true);
    setProgressPct(15);

    try {
      if (mode === 'text') {
        setProcessStep('Extracting text content from pages...');
        const pagesText = await extractTextFromPdf(selected);
        setExtractedPagesText(pagesText.pages);
      } else if (mode === 'images') {
        setProcessStep('Rendering and extracting image assets...');
        const res = await extractImagesFromPdf(selected);
        setExtractedImages(res.images);
        setImagesZipBlob(res.zipBlob);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Extraction error: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyText = (text: string, pageNum?: number) => {
    navigator.clipboard.writeText(text);
    if (pageNum !== undefined) {
      setCopiedPage(pageNum);
      setTimeout(() => setCopiedPage(null), 2000);
    } else {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  const handleDownloadFullTxt = () => {
    if (!file || extractedPagesText.length === 0) return;
    const fullText = extractedPagesText
      .map((p) => `--- PAGE ${p.pageNumber} ---\n\n${p.text}`)
      .join('\n\n\n');
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, `${file.name.replace(/\.[^/.]+$/, '')}_extracted.txt`);
  };

  const handleExtractPages = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProcessStep('Extracting requested page range...');
    setProgressPct(30);

    try {
      const srcBytes = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
      const totalPages = srcDoc.getPageCount();

      // Parse range string (e.g. "1, 3, 5-8")
      const pagesToExtract = new Set<number>();
      const parts = pageRangeStr.split(',').map((p) => p.trim());

      for (const part of parts) {
        if (part.includes('-')) {
          const [startStr, endStr] = part.split('-');
          const start = parseInt(startStr, 10);
          const end = parseInt(endStr, 10);
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
              pagesToExtract.add(i - 1);
            }
          }
        } else {
          const p = parseInt(part, 10);
          if (!isNaN(p) && p >= 1 && p <= totalPages) {
            pagesToExtract.add(p - 1);
          }
        }
      }

      if (pagesToExtract.size === 0) {
        setErrorMessage('No valid pages found in specified range.');
        setIsProcessing(false);
        return;
      }

      const outDoc = await PDFDocument.create();
      const copied = await outDoc.copyPages(srcDoc, Array.from(pagesToExtract).sort((a, b) => a - b));
      copied.forEach((p) => outDoc.addPage(p));

      const outBytes = await outDoc.save();
      const outBlob = new Blob([outBytes as any], { type: 'application/pdf' });
      setExtractedPagesBlob(outBlob);

      addRecentJob({
        toolId: 'extract-pages',
        toolName: 'Extract Pages',
        fileName: `${file.name.replace(/\.[^/.]+$/, '')}_extracted.pdf`,
        fileSize: outBlob.size,
        status: 'completed',
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Page extraction failed: ' + (err?.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] p-6 sm:p-8 shadow-sm">
      <div className="space-y-6">
        {/* Mode Selector */}
        <div className="flex justify-center">
          <div className="inline-flex p-1 rounded-xl bg-[#FAF7F2] dark:bg-[#141213] border border-[#E5DFD4] dark:border-[#2E2729]">
            {[
              { id: 'text', label: 'Extract Text', icon: FileText },
              { id: 'images', label: 'Extract Images', icon: Images },
              { id: 'pages', label: 'Extract Pages', icon: FilePlus2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = mode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setMode(tab.id as any);
                    setFile(null);
                    setExtractedPagesText([]);
                    setExtractedImages([]);
                    setExtractedPagesBlob(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
                    active
                      ? 'bg-white dark:bg-[#1E1A1B] text-[#6D1F35] dark:text-[#C6A15B] shadow-xs'
                      : 'text-[#5C554F] dark:text-[#A39991] hover:text-[#141213]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {!file ? (
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5F0EB] mb-2">
              {mode === 'text' && 'Extract Text from PDF'}
              {mode === 'images' && 'Extract Images from PDF'}
              {mode === 'pages' && 'Extract Pages from PDF'}
            </h2>
            <p className="text-xs sm:text-sm text-[#5C554F] dark:text-[#A39991] mb-6">
              {mode === 'text' && 'Extract text page-by-page, copy cleanly to clipboard, or download full TXT.'}
              {mode === 'images' && 'Extract high-resolution image assets and page views, with one-click ZIP download.'}
              {mode === 'pages' && 'Extract custom page ranges or individual leaves into separate PDF files.'}
            </p>
            <FileDropzone
              accept=".pdf,application/pdf"
              maxFiles={1}
              onFilesSelected={handleFileSelected}
              label="Drop PDF here or click to open"
              sublabel="Processed locally in your browser for supported tools"
            />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Header file bar */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-xs">
              <span className="font-semibold text-[#141213] dark:text-[#F5F0EB] truncate">
                {file.name} ({formatBytes(file.size)})
              </span>
              <button
                onClick={() => setFile(null)}
                className="text-red-500 hover:underline"
              >
                Change File
              </button>
            </div>

            {/* Mode 1: Text Results */}
            {mode === 'text' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#141213] dark:text-[#F5F0EB]">
                    {extractedPagesText.length} Pages Extracted
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleCopyText(
                          extractedPagesText.map((p) => p.text).join('\n\n')
                        )
                      }
                      className="px-3 py-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#F7F3EC]"
                    >
                      {copiedAll ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAll ? 'Copied All!' : 'Copy All Text'}</span>
                    </button>
                    <button
                      onClick={handleDownloadFullTxt}
                      className="px-3 py-1.5 rounded-lg bg-[#6D1F35] text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#58182a]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .TXT</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {extractedPagesText.map((p) => (
                    <div
                      key={p.pageNumber}
                      className="p-4 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between border-b border-[#E5DFD4] dark:border-[#2E2729] pb-2">
                        <span className="font-bold text-[#6D1F35] dark:text-[#C6A15B]">
                          Page {p.pageNumber}
                        </span>
                        <button
                          onClick={() => handleCopyText(p.text, p.pageNumber)}
                          className="text-[11px] text-[#5C554F] hover:text-black dark:hover:text-white inline-flex items-center gap-1"
                        >
                          {copiedPage === p.pageNumber ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedPage === p.pageNumber ? 'Copied' : 'Copy Page'}</span>
                        </button>
                      </div>
                      <pre className="font-sans text-xs text-[#141213] dark:text-[#F5F0EB] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                        {p.text || '(No selectable text found on this page)'}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mode 2: Images Results */}
            {mode === 'images' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#141213] dark:text-[#F5F0EB]">
                    {extractedImages.length} Images Extracted
                  </span>
                  {imagesZipBlob && (
                    <button
                      onClick={() =>
                        triggerDownload(
                          imagesZipBlob,
                          `${file.name.replace(/\.[^/.]+$/, '')}_images.zip`
                        )
                      }
                      className="px-3.5 py-1.5 rounded-lg bg-[#6D1F35] text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#58182a]"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Download All as ZIP</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {extractedImages.map((img, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] space-y-2 text-xs"
                    >
                      <div className="aspect-square rounded-lg overflow-hidden bg-[#FAF7F2] dark:bg-[#141213] flex items-center justify-center border border-black/5">
                        <img src={img.dataUrl} alt={img.name} className="w-full h-full object-contain" />
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="truncate max-w-[90px] font-medium">{img.name}</span>
                        <button
                          onClick={() => triggerDownload(img.blob, img.name)}
                          className="text-[#6D1F35] dark:text-[#C6A15B] hover:underline"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mode 3: Pages Extractor */}
            {mode === 'pages' && (
              <div className="space-y-4">
                {extractedPagesBlob ? (
                  <SuccessView
                    fileName={`${file.name.replace(/\.[^/.]+$/, '')}_extracted.pdf`}
                    fileSize={extractedPagesBlob.size}
                    downloadLabel="Download Extracted PDF"
                    onDownload={() =>
                      triggerDownload(
                        extractedPagesBlob,
                        `${file.name.replace(/\.[^/.]+$/, '')}_extracted.pdf`
                      )
                    }
                    onReset={() => setExtractedPagesBlob(null)}
                    additionalNote={`Extracted document ready (${formatBytes(extractedPagesBlob.size)}).`}
                  />
                ) : (
                  <div className="p-6 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] space-y-4 text-xs">
                    <label className="font-bold text-sm text-[#141213] dark:text-[#F5F0EB] block">
                      Enter Page Ranges to Extract:
                    </label>
                    <input
                      type="text"
                      value={pageRangeStr}
                      onChange={(e) => setPageRangeStr(e.target.value)}
                      placeholder="e.g. 1, 3-5, 8"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-sm focus:outline-none focus:ring-1 focus:ring-[#6D1F35]"
                    />
                    <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
                      Separate individual pages by comma (e.g. 1, 4) and ranges with dashes (e.g. 5-10).
                    </p>

                    <button
                      onClick={handleExtractPages}
                      className="w-full py-3 rounded-xl bg-[#6D1F35] text-white text-xs sm:text-sm font-semibold hover:bg-[#58182a] inline-flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Extract Specified Pages</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <ProcessingModal
        isOpen={isProcessing}
        stepName={processStep}
        percentage={progressPct}
      />
    </div>
  );
};
