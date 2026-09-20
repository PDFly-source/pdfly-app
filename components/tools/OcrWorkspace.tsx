'use client';

import React, { useState, useRef } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { getPdfDocumentFromFile, renderPageToCanvas } from '@/lib/pdfjs-init';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { safeDrawText, sanitizeForWinAnsi } from '@/lib/font-safe';
import { addRecentJob } from '@/lib/recent-jobs';
import {
  ScanText,
  FileText,
  Download,
  Copy,
  Check,
  Globe,
  Sliders,
  AlertCircle,
  Eye,
} from 'lucide-react';

export const OcrWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<string>('eng');
  const [outputFormat, setOutputFormat] = useState<'text' | 'searchable-pdf'>('text');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStep, setProcessStep] = useState<string>('Initializing OCR...');
  const [progressPct, setProgressPct] = useState<number>(0);

  const [extractedText, setExtractedText] = useState<string>('');
  const [pageResults, setPageResults] = useState<{ pageNum: number; text: string }[]>([]);
  const [searchablePdfBlob, setSearchablePdfBlob] = useState<Blob | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleStartOcr = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setProcessStep('Loading PDF pages for optical recognition...');
    setProgressPct(10);
    setExtractedText('');
    setPageResults([]);
    setSearchablePdfBlob(null);

    try {
      const pdfJsDoc = await getPdfDocumentFromFile(file);
      const totalPages = pdfJsDoc.numPages;

      let combinedText = '';
      const pagesData: { pageNum: number; text: string }[] = [];

      // Lazy import Tesseract
      setProcessStep('Initializing local optical character neural engine...');
      setProgressPct(20);
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker(language);

      for (let p = 1; p <= totalPages; p++) {
        setProcessStep(`Recognizing characters on page ${p} of ${totalPages}...`);
        setProgressPct(20 + Math.round((p / totalPages) * 65));

        const page = await pdfJsDoc.getPage(p);
        const canvas = document.createElement('canvas');
        await renderPageToCanvas(page, canvas, 1.5);

        const ret = await worker.recognize(canvas);
        const pageText = ret.data.text || '';

        pagesData.push({ pageNum: p, text: pageText });
        combinedText += `--- Page ${p} ---\n${pageText}\n\n`;
      }

      await worker.terminate();

      setExtractedText(combinedText);
      setPageResults(pagesData);

      // If user selected searchable PDF output, create PDF with text overlay
      if (outputFormat === 'searchable-pdf') {
        setProcessStep('Generating searchable PDF with embedded text layer...');
        setProgressPct(90);

        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        for (const pd of pagesData) {
          const page = pdfDoc.addPage([595.28, 841.89]); // A4
          const lines = pd.text.split('\n').filter((l) => l.trim().length > 0);

          // 1. Render visually via Canvas so all Unicode/Indic scripts (Assamese, Bengali, Hindi, etc.) render perfectly
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 1190; // A4 at 144 DPI
            canvas.height = 1684;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.fillStyle = '#141213';
              ctx.font = '20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
              ctx.textBaseline = 'top';

              let cy = 60;
              for (const line of lines) {
                if (cy > canvas.height - 80) break;
                ctx.fillText(line.substring(0, 95), 60, cy);
                cy += 28;
              }

              const pngDataUrl = canvas.toDataURL('image/png');
              const pngBase64 = pngDataUrl.split(',')[1];
              if (pngBase64) {
                const pngBinary = atob(pngBase64);
                const pngBytes = new Uint8Array(pngBinary.length);
                for (let i = 0; i < pngBinary.length; i++) {
                  pngBytes[i] = pngBinary.charCodeAt(i);
                }
                const embeddedPng = await pdfDoc.embedPng(pngBytes);
                page.drawImage(embeddedPng, {
                  x: 0,
                  y: 0,
                  width: 595.28,
                  height: 841.89,
                });
              }
            }
          } catch (canvasErr) {
            console.warn('Canvas render fallback:', canvasErr);
          }

          // 2. Safe text layer (never throws WinAnsi error, handles Assamese ১ -> 1, Devanagari, etc.)
          let y = 800;
          for (const line of lines) {
            if (y < 50) break;
            safeDrawText(page, line.substring(0, 95), {
              x: 40,
              y,
              size: 10,
              font,
              color: rgb(0.1, 0.1, 0.1),
              opacity: 0.05, // Invisible text layer behind/over image for selectability
            });
            y -= 14;
          }
        }

        const pdfBytes = await pdfDoc.save();
        const sBlob = new Blob([pdfBytes as any], { type: 'application/pdf' });
        setSearchablePdfBlob(sBlob);
      }

      addRecentJob({
        toolId: 'ocr-pdf',
        toolName: 'OCR Center',
        fileName: `${file.name.replace(/\.[^/.]+$/, '')}_ocr.txt`,
        fileSize: file.size,
        status: 'completed',
      });

      setProgressPct(100);
    } catch (err: any) {
      console.error('OCR Error:', err);
      setErrorMessage('OCR processing encountered an error: ' + (err?.message || 'Check document format'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!file || !extractedText) return;
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, `${file.name.replace(/\.[^/.]+$/, '')}_ocr_extracted.txt`);
  };

  const handleDownloadSearchablePdf = () => {
    if (!file || !searchablePdfBlob) return;
    triggerDownload(searchablePdfBlob, `${file.name.replace(/\.[^/.]+$/, '')}_searchable.pdf`);
  };

  return (
    <div className="rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] p-6 sm:p-8 shadow-sm">
      <div className="space-y-6">
        <div className="max-w-xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center mx-auto mb-4">
            <ScanText className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5F0EB] mb-2">
            OCR Center (Extract Scanned Text)
          </h2>
          <p className="text-xs sm:text-sm text-[#5C554F] dark:text-[#A39991] mb-6">
            Convert non-selectable scanned PDFs into searchable text directly in your browser.
          </p>
        </div>

        {!file ? (
          <div className="max-w-xl mx-auto">
            <FileDropzone
              accept=".pdf,application/pdf"
              maxFiles={1}
              onFilesSelected={(files) => setFile(files[0])}
              label="Drop scanned PDF here"
              sublabel="Processed locally in your browser for supported tools"
            />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">
            {/* File info bar */}
            <div className="p-3.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] flex items-center justify-between text-xs">
              <span className="font-semibold text-[#141213] dark:text-[#F5F0EB] truncate">
                {file.name} ({formatBytes(file.size)})
              </span>
              <button
                onClick={() => {
                  setFile(null);
                  setExtractedText('');
                  setSearchablePdfBlob(null);
                }}
                className="text-red-500 hover:underline"
              >
                Change File
              </button>
            </div>

            {/* OCR Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs">
              <div>
                <label className="font-bold text-[#141213] dark:text-[#F5F0EB] mb-1.5 block">
                  Recognition Language:
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#141213] text-xs font-semibold"
                >
                  <option value="eng">English (eng)</option>
                  <option value="hin">Hindi (हिन्दी - hin)</option>
                  <option value="ben">Bengali (বাংলা - ben)</option>
                  <option value="asm">Assamese (অসমীয়া - asm)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#141213] dark:text-[#F5F0EB] mb-1.5 block">
                  Target Output Format:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOutputFormat('text')}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      outputFormat === 'text'
                        ? 'border-[#6D1F35] dark:border-[#C6A15B] bg-[#6D1F35]/5 dark:bg-[#C6A15B]/10 font-bold'
                        : 'border-[#E5DFD4] dark:border-[#2E2729]'
                    }`}
                  >
                    Plain Text (.txt)
                  </button>
                  <button
                    onClick={() => setOutputFormat('searchable-pdf')}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      outputFormat === 'searchable-pdf'
                        ? 'border-[#6D1F35] dark:border-[#C6A15B] bg-[#6D1F35]/5 dark:bg-[#C6A15B]/10 font-bold'
                        : 'border-[#E5DFD4] dark:border-[#2E2729]'
                    }`}
                  >
                    Searchable PDF
                  </button>
                </div>
              </div>
            </div>

            {!extractedText && (
              <button
                onClick={handleStartOcr}
                disabled={isProcessing}
                className="w-full py-3.5 rounded-xl bg-[#6D1F35] text-white text-xs sm:text-sm font-semibold hover:bg-[#58182a] inline-flex items-center justify-center gap-2 shadow-xs"
              >
                <ScanText className="w-4 h-4" />
                <span>Start In-Browser OCR Recognition</span>
              </button>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
                {errorMessage}
              </div>
            )}

            {/* Results Display */}
            {extractedText && (
              <div className="p-5 rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5DFD4] dark:border-[#2E2729] pb-3">
                  <span className="font-bold text-xs text-[#141213] dark:text-[#F5F0EB]">
                    Extracted Text Preview ({pageResults.length} Pages)
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyText}
                      className="px-3 py-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy Text'}</span>
                    </button>

                    <button
                      onClick={handleDownloadTxt}
                      className="px-3 py-1.5 rounded-lg bg-[#6D1F35] text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#58182a]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .TXT</span>
                    </button>

                    {searchablePdfBlob && (
                      <button
                        onClick={handleDownloadSearchablePdf}
                        className="px-3 py-1.5 rounded-lg bg-[#C6A15B] text-black text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#b5904a]"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Searchable PDF</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto p-4 rounded-xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729] font-mono text-xs leading-relaxed whitespace-pre-wrap select-text">
                  {extractedText}
                </div>
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
