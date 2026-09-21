'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { getPdfDocumentFromFile } from '@/lib/pdfjs-init';
import { triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { addRecentJob } from '@/lib/recent-jobs';
import { useUndoRedo, useUndoRedoShortcuts } from '@/lib/undo-redo';
import {
  getRecoverySession,
  saveRecoverySession,
  deleteRecoverySession,
  type RecoverySession,
} from '@/lib/recovery-db';
import { UndoRedoBar } from '@/components/UndoRedoBar';
import { RecoveryPrompt } from '@/components/RecoveryPrompt';
import { PDFDocument, rgb } from 'pdf-lib';
import { safeDrawText } from '@/lib/font-safe';
import {
  Type,
  Square,
  Highlighter,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  AlertCircle,
  Redo2,
  Undo2,
  Trash2,
} from 'lucide-react';

interface AnnotationItem {
  id: string;
  type: 'text' | 'rect' | 'redact' | 'highlight';
  pageNumber: number;
  x: number; // in canvas pixels
  y: number;
  width: number;
  height: number;
  text?: string;
  color?: string;
}

export const PdfEditorWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1.0);

  // Active Tool: 'select' | 'text' | 'rect' | 'redact' | 'highlight'
  const [activeTool, setActiveTool] = useState<'text' | 'rect' | 'redact' | 'highlight'>('text');
  const {
    state: annotations,
    commit: commitAnnotations,
    reset: resetAnnotations,
    undo: undoAnnotations,
    redo: redoAnnotations,
    canUndo,
    canRedo,
    clearHistory: clearAnnotationHistory,
  } = useUndoRedo<AnnotationItem[]>([]);

  // ---- Local auto-recovery (IndexedDB, device-only) ----
  const [recoverySession, setRecoverySession] = useState<RecoverySession<{
    annotations: AnnotationItem[];
    currentPage: number;
  }> | null>(null);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const TOOL_SLUG = 'edit-pdf';
  const saveTimerRef = useRef<number | null>(null);
  const [textInput, setTextInput] = useState('Added Note');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Saving edits...');
  const [progressPct, setProgressPct] = useState(0);

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load and render PDF page
  useEffect(() => {
    if (!file || !canvasRef.current) return;

    let cancelled = false;

    const render = async () => {
      try {
        const pdfDoc = await getPdfDocumentFromFile(file);
        if (cancelled) return;
        setTotalPages(pdfDoc.numPages);

        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: zoom * 1.5 });
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };
        await page.render(renderContext).promise;
      } catch (err) {
        console.error(err);
      }
    };

    render();
    return () => {
      cancelled = true;
    };
  }, [file, currentPage, zoom]);

  const handleFileSelected = (files: File[]) => {
    if (!files || files.length === 0) return;
    setFile(files[0]);
    setCurrentPage(1);
    resetAnnotations([]);
    setErrorMessage(null);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const newAnnot: AnnotationItem = {
      id: Math.random().toString(36).substring(2, 9),
      type: activeTool,
      pageNumber: currentPage,
      x: clickX,
      y: clickY,
      width: activeTool === 'redact' || activeTool === 'rect' ? 120 : activeTool === 'highlight' ? 140 : 100,
      height: activeTool === 'highlight' ? 24 : activeTool === 'text' ? 28 : 50,
      text: activeTool === 'text' ? textInput : undefined,
    };

    commitAnnotations((prev) => [...prev, newAnnot]);
  };

  const handleUndo = () => {
    undoAnnotations();
  };

  const handleSave = async () => {
    if (!file) return;
    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPct(20);

    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();

      // Render annotations into PDF
      annotations.forEach((annot) => {
        const pageIdx = annot.pageNumber - 1;
        if (pageIdx < 0 || pageIdx >= pages.length) return;
        const page = pages[pageIdx];
        const { width: pWidth, height: pHeight } = page.getSize();

        // Convert canvas coordinates to PDF coordinates (inverted Y)
        const canvas = canvasRef.current;
        const scaleFactorX = canvas ? pWidth / canvas.width : 1;
        const scaleFactorY = canvas ? pHeight / canvas.height : 1;

        const pdfX = annot.x * scaleFactorX;
        const pdfY = pHeight - (annot.y + annot.height) * scaleFactorY;
        const pdfW = annot.width * scaleFactorX;
        const pdfH = annot.height * scaleFactorY;

        if (annot.type === 'redact') {
          page.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: pdfW,
            height: pdfH,
            color: rgb(0, 0, 0),
          });
        } else if (annot.type === 'highlight') {
          page.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: pdfW,
            height: pdfH,
            color: rgb(1, 0.9, 0.2),
            opacity: 0.4,
          });
        } else if (annot.type === 'rect') {
          page.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: pdfW,
            height: pdfH,
            borderColor: rgb(0.43, 0.12, 0.21),
            borderWidth: 2,
          });
        } else if (annot.type === 'text' && annot.text) {
          safeDrawText(page, annot.text, {
            x: pdfX,
            y: pdfY,
            size: 14,
            color: rgb(0.08, 0.07, 0.08),
          });
        }
      });

      const pdfBytes = await pdfDoc.save();
      const outBlob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const outName = `edited_${file.name}`;

      setResultBlob(outBlob);
      setResultFileName(outName);

      addRecentJob({
        toolId: 'edit-pdf',
        toolName: 'Edit PDF',
        fileName: outName,
        fileSize: outBlob.size,
        status: 'completed',
      });

      // Session completed: drop the recovery record and undo history
      void deleteRecoverySession(TOOL_SLUG);
      clearAnnotationHistory();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Failed to save edited PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (resultBlob && resultFileName) {
      triggerDownload(resultBlob, resultFileName);
    }
  };

  // Undo/redo keyboard shortcuts while a document is open
  useUndoRedoShortcuts({
    onUndo: undoAnnotations,
    onRedo: redoAnnotations,
    enabled: !!file && !isProcessing && !resultBlob,
  });

  // ---- Auto-recovery: offer an explicit restore of previous annotations ----
  useEffect(() => {
    let active = true;
    (async () => {
      const rec = await getRecoverySession<{
        annotations: AnnotationItem[];
        currentPage: number;
      }>(TOOL_SLUG);
      if (!active || !rec || !rec.file) return;
      const recAnnots = rec.payload?.annotations;
      if (!Array.isArray(recAnnots)) return;
      setRecoverySession(rec as RecoverySession<{
        annotations: AnnotationItem[];
        currentPage: number;
      }>);
      setRecoveryOpen(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const restoreSession = () => {
    const rec = recoverySession;
    setRecoveryOpen(false);
    if (!rec?.file) return;
    try {
      const restoredFile =
        rec.file instanceof File ? rec.file : new File([rec.file], 'recovered.pdf', { type: 'application/pdf' });
      setFile(restoredFile);
      setErrorMessage(null);
      setResultBlob(null);
      setCurrentPage(rec.payload.currentPage || 1);
      resetAnnotations(rec.payload.annotations);
    } catch {
      setErrorMessage('Could not restore the previous session.');
    } finally {
      setRecoverySession(null);
    }
  };

  const discardSession = () => {
    setRecoveryOpen(false);
    setRecoverySession(null);
    void deleteRecoverySession(TOOL_SLUG);
  };

  // ---- Auto-recovery: debounced save of the working state ----
  const saveRecovery = useCallback(() => {
    if (!file || resultBlob) return;
    if (annotations.length === 0) return; // nothing meaningful to recover
    void saveRecoverySession(TOOL_SLUG, file, {
      annotations,
      currentPage,
    });
  }, [file, annotations, currentPage, resultBlob]);

  useEffect(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(saveRecovery, 1500);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [saveRecovery]);

  useEffect(() => {
    const handler = () => saveRecovery();
    window.addEventListener('pagehide', handler);
    return () => window.removeEventListener('pagehide', handler);
  }, [saveRecovery]);

  const handleReset = () => {
    setFile(null);
    resetAnnotations([]);
    clearAnnotationHistory();
    setResultBlob(null);
    setResultFileName('');
    setErrorMessage(null);
    void deleteRecoverySession(TOOL_SLUG);
  };

  if (resultBlob && file) {
    return (
      <SuccessView
        fileName={resultFileName}
        fileSize={resultBlob.size}
        downloadLabel="Download Edited PDF"
        onDownload={handleDownload}
        onReset={handleReset}
        additionalNote="Annotations and redacting rectangles baked into PDF coordinates locally."
      />
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      <RecoveryPrompt
        isOpen={recoveryOpen}
        savedWhen={recoverySession ? new Date(recoverySession.savedAt).toLocaleString() : ''}
        onRestore={restoreSession}
        onDiscard={discardSession}
      />
      {file && !resultBlob && (
        <UndoRedoBar
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undoAnnotations}
          onRedo={redoAnnotations}
          label="annotation changes"
        />
      )}
      {!file ? (
        <FileDropzone
          onFilesSelected={handleFileSelected}
          multiple={false}
          accept=".pdf,application/pdf"
          label="Choose PDF to Edit"
          sublabel="Add text, rectangles, highlights, or redact sensitive areas locally."
        />
      ) : (
        <div className="space-y-4">
          {/* Top Bar Tools */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729] flex flex-wrap items-center justify-between gap-3 shadow-xs">
            {/* Tool picker */}
            <div className="flex items-center gap-1 bg-[#F7F3EC] dark:bg-[#141213] p-1 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729]">
              <button
                onClick={() => setActiveTool('text')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTool === 'text'
                    ? 'bg-white dark:bg-[#1E1A1B] text-[#6D1F35] dark:text-[#C6A15B] shadow-xs'
                    : 'text-[#5C554F] dark:text-[#A39991]'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Text</span>
              </button>

              <button
                onClick={() => setActiveTool('highlight')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTool === 'highlight'
                    ? 'bg-white dark:bg-[#1E1A1B] text-[#6D1F35] dark:text-[#C6A15B] shadow-xs'
                    : 'text-[#5C554F] dark:text-[#A39991]'
                }`}
              >
                <Highlighter className="w-3.5 h-3.5" />
                <span>Highlight</span>
              </button>

              <button
                onClick={() => setActiveTool('redact')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTool === 'redact'
                    ? 'bg-white dark:bg-[#1E1A1B] text-[#6D1F35] dark:text-[#C6A15B] shadow-xs'
                    : 'text-[#5C554F] dark:text-[#A39991]'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Redact</span>
              </button>

              <button
                onClick={() => setActiveTool('rect')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTool === 'rect'
                    ? 'bg-white dark:bg-[#1E1A1B] text-[#6D1F35] dark:text-[#C6A15B] shadow-xs'
                    : 'text-[#5C554F] dark:text-[#A39991]'
                }`}
              >
                <Square className="w-3.5 h-3.5" />
                <span>Frame</span>
              </button>
            </div>

            {activeTool === 'text' && (
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type text to place..."
                className="px-3 py-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs w-44"
              />
            )}

            {/* Page navigation & zoom */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded-lg hover:bg-black/5 disabled:opacity-20"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded-lg hover:bg-black/5 disabled:opacity-20"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
                  className="p-1 rounded-lg hover:bg-black/5"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(1.8, z + 0.1))}
                  className="p-1 rounded-lg hover:bg-black/5"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={undoAnnotations}
                disabled={!canUndo}
                aria-label="Undo last annotation"
                className="p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[#5C554F] hover:text-[#141213] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                title="Undo (Ctrl/Cmd+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={redoAnnotations}
                disabled={!canRedo}
                aria-label="Redo annotation"
                className="p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[#5C554F] hover:text-[#141213] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                title="Redo (Ctrl/Cmd+Shift+Z)"
              >
                <Redo2 className="w-4 h-4" />
              </button>

              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-xl bg-[#6D1F35] text-white text-xs font-medium hover:bg-[#58182a]"
              >
                Save & Export
              </button>
            </div>
          </div>

          <p className="text-[11px] text-[#5C554F] dark:text-[#A39991] text-center">
            Click anywhere on the document canvas to place your selected <strong>{activeTool}</strong> annotation.
          </p>

          {/* Canvas Wrapper */}
          <div className="relative border border-[#E5DFD4] dark:border-[#2E2729] rounded-2xl bg-[#5C554F]/10 dark:bg-black/40 p-4 overflow-auto flex justify-center min-h-[500px]">
            <div
              onClick={handleCanvasClick}
              className="relative shadow-xl cursor-crosshair bg-white inline-block select-none"
            >
              <canvas ref={canvasRef} className="block" />

              {/* Render annotation overlays on current page */}
              {annotations
                .filter((a) => a.pageNumber === currentPage)
                .map((a) => (
                  <div
                    key={a.id}
                    style={{
                      left: a.x,
                      top: a.y,
                      width: a.width,
                      height: a.height,
                    }}
                    className={`absolute pointer-events-none ${
                      a.type === 'redact'
                        ? 'bg-black'
                        : a.type === 'highlight'
                        ? 'bg-yellow-300/40 border border-yellow-400'
                        : a.type === 'rect'
                        ? 'border-2 border-[#6D1F35]'
                        : 'text-sm font-semibold text-black leading-tight'
                    }`}
                  >
                    {a.type === 'text' && a.text}
                  </div>
                ))}
            </div>
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
