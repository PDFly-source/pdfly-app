'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { redactPdf, extractTextFromPdf, triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { getPdfDocumentFromFile } from '@/lib/pdfjs-init';
import { addRecentJob } from '@/lib/recent-jobs';

interface WorkspaceRedaction {
  id: string;
  pageNumber: number; // 1-indexed
  x: number;
  y: number;
  width: number;
  height: number;
  reason: string;
}
import {
  EyeOff,
  ShieldAlert,
  Search,
  Check,
  Plus,
  Trash2,
  Download,
  AlertTriangle,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const RedactPdfWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Redaction items
  const [redactions, setRedactions] = useState<WorkspaceRedaction[]>([]);
  const [detectedPatterns, setDetectedPatterns] = useState<{ type: string; value: string; page: number }[]>([]);
  const [selectedDetected, setSelectedDetected] = useState<Set<number>>(new Set());

  // Manual box drawing state on active canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Processing state
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setIsScanning(true);
    setErrorMessage(null);
    setRedactions([]);
    setDetectedPatterns([]);
    setSelectedDetected(new Set());
    setCurrentPage(1);

    try {
      const doc = await getPdfDocumentFromFile(selected);
      setPdfDoc(doc);
      setNumPages(doc.numPages);

      // Extract text to scan for regex patterns
      const pagesText = await extractTextFromPdf(selected);
      const detected: { type: string; value: string; page: number }[] = [];

      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
      const ssnOrIdRegex = /\b\d{3}-\d{2}-\d{4}\b|\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;
      const dateRegex = /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/g;

      pagesText.pages.forEach((p) => {
        let match;
        while ((match = emailRegex.exec(p.text)) !== null) {
          detected.push({ type: 'Email', value: match[0], page: p.pageNumber });
        }
        while ((match = phoneRegex.exec(p.text)) !== null) {
          detected.push({ type: 'Phone', value: match[0], page: p.pageNumber });
        }
        while ((match = ssnOrIdRegex.exec(p.text)) !== null) {
          detected.push({ type: 'ID / SSN', value: match[0], page: p.pageNumber });
        }
        while ((match = dateRegex.exec(p.text)) !== null) {
          detected.push({ type: 'Date', value: match[0], page: p.pageNumber });
        }
      });

      setDetectedPatterns(detected);
      setSelectedDetected(new Set(detected.map((_, idx) => idx)));
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Could not scan document for patterns: ' + (err?.message || ''));
    } finally {
      setIsScanning(false);
    }
  };

  // Render current page in interactive canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || currentPage < 1) return;

    let cancelled = false;
    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1.0 });
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Render existing redaction boxes for this page
        const pageRedactions = redactions.filter((r) => r.pageNumber === currentPage);
        ctx.fillStyle = '#000000';
        pageRedactions.forEach((r) => {
          // pdf-lib origin is bottom-left, canvas is top-left
          const canvasY = canvas.height - (r.y + r.height);
          ctx.fillRect(r.x, canvasY, r.width, r.height);
        });
      } catch (err) {
        console.error(err);
      }
    };

    renderPage();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, currentPage, redactions]);

  // Canvas drawing handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentBox({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const x = Math.min(startPos.x, currentX);
    const y = Math.min(startPos.y, currentY);
    const width = Math.abs(currentX - startPos.x);
    const height = Math.abs(currentY - startPos.y);

    setCurrentBox({ x, y, width, height });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox || !canvasRef.current) {
      setIsDrawing(false);
      return;
    }

    if (currentBox.width > 5 && currentBox.height > 5) {
      // Convert to PDF coordinates (bottom-left origin)
      const pdfY = canvasRef.current.height - (currentBox.y + currentBox.height);
      const newRedaction: WorkspaceRedaction = {
        id: Math.random().toString(36).substring(2, 9),
        pageNumber: currentPage,
        x: currentBox.x,
        y: pdfY,
        width: currentBox.width,
        height: currentBox.height,
        reason: 'Manual Redaction',
      };
      setRedactions((prev) => [...prev, newRedaction]);
    }

    setIsDrawing(false);
    setStartPos(null);
    setCurrentBox(null);
  };

  const toggleDetectedPattern = (idx: number) => {
    setSelectedDetected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
      });
  };

  const handleExecuteRedaction = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgressPct(30);

    try {
      const allRedactionsToApply = [...redactions];

      // Redact PDF permanently using drawRectangle and sanitized streams
      const outBlob = await redactPdf(
        file,
        allRedactionsToApply.map((r) => ({
          pageNumber: r.pageNumber,
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
        }))
      );
      const outName = `${file.name.replace(/\.[^/.]+$/, '')}_redacted.pdf`;

      setProgressPct(95);
      setResultBlob(outBlob);
      setResultFileName(outName);

      addRecentJob({
        toolId: 'redact-pdf',
        toolName: 'Smart Redact',
        fileName: outName,
        fileSize: outBlob.size,
        status: 'completed',
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Redaction failed: ' + (err?.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] p-6 sm:p-8 shadow-sm">
      {resultBlob ? (
        <SuccessView
          fileName={resultFileName}
          fileSize={resultBlob.size}
          downloadLabel="Download Redacted PDF"
          onDownload={() => triggerDownload(resultBlob, resultFileName)}
          onReset={() => {
            setResultBlob(null);
            setFile(null);
            setRedactions([]);
          }}
          additionalNote={`Successfully redacted sensitive regions and sanitized PDF streams (${formatBytes(resultBlob.size)}).`}
        />
      ) : (
        <div className="space-y-6">
          <div className="max-w-xl mx-auto text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center mx-auto mb-4">
              <EyeOff className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5F0EB] mb-2">
              Smart PDF Redaction
            </h2>
            <p className="text-xs sm:text-sm text-[#5C554F] dark:text-[#A39991] mb-6">
              Detect sensitive patterns (emails, phones, national IDs) and permanently draw blackout rectangles. Underlying text streams are purged.
            </p>
          </div>

          {!file ? (
            <div className="max-w-xl mx-auto">
              <FileDropzone
                accept=".pdf,application/pdf"
                maxFiles={1}
                onFilesSelected={handleFileSelected}
                label="Drop PDF here for sensitive data redaction"
                sublabel="Processed locally in your browser for supported tools"
              />
            </div>
          ) : isScanning ? (
            <div className="max-w-md mx-auto p-8 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#6D1F35] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-[#141213] dark:text-[#F5F0EB]">
                Scanning document locally for sensitive PII...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Detected patterns & redaction list */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#141213] dark:text-[#F5F0EB] flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-[#6D1F35] dark:text-[#C6A15B]" />
                      <span>Pattern Detection ({detectedPatterns.length})</span>
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">Local Scan</span>
                  </div>

                  {detectedPatterns.length === 0 ? (
                    <p className="text-gray-500 text-[11px]">
                      No standard pattern matches found. You can draw blackout boxes manually on the page preview to the right.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {detectedPatterns.map((p, idx) => {
                        const checked = selectedDetected.has(idx);
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              toggleDetectedPattern(idx);
                              setCurrentPage(p.page);
                            }}
                            className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                              checked
                                ? 'border-[#6D1F35] bg-white dark:bg-[#1E1A1B]'
                                : 'border-gray-200 opacity-60'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <span className="font-bold text-[10px] text-[#6D1F35] dark:text-[#C6A15B] mr-1.5 uppercase">
                                {p.type}:
                              </span>
                              <span className="font-mono text-[11px] truncate">{p.value}</span>
                            </div>
                            <span className="text-[10px] text-gray-500 shrink-0">P.{p.page}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Manual Redactions Box List */}
                <div className="p-4 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#141213] dark:text-[#F5F0EB]">
                      Blackout Boxes ({redactions.length})
                    </span>
                    {redactions.length > 0 && (
                      <button
                        onClick={() => setRedactions([])}
                        className="text-red-500 hover:underline text-[11px]"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
                    Click and drag anywhere on the page to draw a blackout rectangle.
                  </p>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {redactions.map((r, i) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-2 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-[11px]"
                      >
                        <span>
                          Page {r.pageNumber} ({Math.round(r.width)}x{Math.round(r.height)}pt)
                        </span>
                        <button
                          onClick={() => setRedactions((prev) => prev.filter((it) => it.id !== r.id))}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleExecuteRedaction}
                    disabled={redactions.length === 0 && selectedDetected.size === 0}
                    className="w-full py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold hover:bg-gray-800 disabled:opacity-40 transition-colors shadow-xs"
                  >
                    Permanently Redact PDF
                  </button>
                </div>
              </div>

              {/* Right Columns: Interactive Page Canvas */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between p-2 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="p-1 rounded bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729] disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-semibold">
                      Page {currentPage} of {numPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                      disabled={currentPage >= numPages}
                      className="p-1 rounded bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729] disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
                    Drag box over sensitive text to blackout
                  </span>
                </div>

                <div className="relative overflow-auto p-4 border border-[#E5DFD4] dark:border-[#2E2729] rounded-2xl bg-[#ECE6DC] dark:bg-[#0E0C0D] flex items-center justify-center min-h-[500px]">
                  <div className="relative shadow-xl">
                    <canvas
                      ref={canvasRef}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      className="cursor-crosshair block bg-white"
                    />

                    {/* Active Drag Box preview */}
                    {isDrawing && currentBox && (
                      <div
                        style={{
                          left: currentBox.x,
                          top: currentBox.y,
                          width: currentBox.width,
                          height: currentBox.height,
                        }}
                        className="absolute border-2 border-red-600 bg-black/60 pointer-events-none"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <ProcessingModal
        isOpen={isProcessing}
        stepName="Sanitizing streams and applying permanent redaction..."
        percentage={progressPct}
      />
    </div>
  );
};
