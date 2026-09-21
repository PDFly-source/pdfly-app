'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { PDFDocument, rgb } from 'pdf-lib';
import { triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { getPdfDocumentFromFile, renderPageThumbnail } from '@/lib/pdfjs-init';
import { addRecentJob } from '@/lib/recent-jobs';
import { useUndoRedo, useUndoRedoShortcuts } from '@/lib/undo-redo';
import {
  getRecoverySession,
  saveRecoverySession,
  deleteRecoverySession,
  purgeExpiredRecoverySessions,
  type RecoverySession,
} from '@/lib/recovery-db';
import { UndoRedoBar } from '@/components/UndoRedoBar';
import { RecoveryPrompt } from '@/components/RecoveryPrompt';
import {
  RotateCw,
  RotateCcw,
  Trash2,
  Copy,
  Plus,
  ArrowUpDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Grid,
  CheckSquare,
  Square,
  FilePlus,
  Download,
  UploadCloud,
  FileText,
  Layers,
  ArrowRightLeft,
} from 'lucide-react';

interface VisualPageItem {
  id: string;
  sourceDocIndex: number; // 0 for primary, 1+ for imported files
  originalPageIndex: number; // 0-indexed in source doc
  originalPageNumber: number; // 1-indexed for display
  rotation: number; // 0, 90, 180, 270
  dataUrl?: string;
  isBlank?: boolean;
  sourceName?: string;
}

export const OrganizePdfWorkspace: React.FC = () => {
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [loadedFiles, setLoadedFiles] = useState<File[]>([]);
  const {
    state: pages,
    commit: commitPages,
    reset: resetPages,
    patch: patchPages,
    undo: undoPages,
    redo: redoPages,
    canUndo,
    canRedo,
    clearHistory: clearPagesHistory,
  } = useUndoRedo<VisualPageItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Drag-and-drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Organizing pages...');
  const [progressPct, setProgressPct] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  // ---- Local auto-recovery (IndexedDB, device-only) ----
  const [recoverySession, setRecoverySession] = useState<RecoverySession<{
    pages: VisualPageItem[];
  }> | null>(null);
  const [recoveryOpen, setRecoveryOpen] = useState(false);

  const TOOL_SLUG = 'organize-pdf';
  const saveTimerRef = useRef<number | null>(null);

  // Undo/redo keyboard shortcuts (only while a document is being edited)
  useUndoRedoShortcuts({
    onUndo: undoPages,
    onRedo: redoPages,
    enabled: !!primaryFile && !isProcessing && !resultBlob,
  });

  // ---- Auto-recovery: offer an explicit restore of previous work ----
  useEffect(() => {
    let active = true;
    (async () => {
      const rec = await getRecoverySession<{ pages: VisualPageItem[] }>(TOOL_SLUG);
      if (!active || !rec || !rec.file) return;
      const recPages = rec.payload?.pages;
      if (!Array.isArray(recPages) || recPages.length === 0) return;
      setRecoverySession(rec as RecoverySession<{ pages: VisualPageItem[] }>);
      setRecoveryOpen(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const restoreSession = async () => {
    const rec = recoverySession;
    setRecoveryOpen(false);
    if (!rec?.file) return;
    try {
      const restoredFile =
        rec.file instanceof File ? rec.file : new File([rec.file], 'recovered.pdf', { type: 'application/pdf' });
      setPrimaryFile(restoredFile);
      setLoadedFiles([restoredFile]);
      setSelectedIds(new Set());
      setErrorMessage(null);
      setResultBlob(null);
      resetPages(rec.payload.pages);

      // Thumbnails are not persisted — re-render them locally
      const pdfJsDoc = await getPdfDocumentFromFile(restoredFile);
      const pageNumbers = rec.payload.pages
        .filter((p) => p.sourceDocIndex === 0)
        .map((p) => p.originalPageNumber)
        .slice(0, 50);
      for (const pno of pageNumbers) {
        const dataUrl = await renderPageThumbnail(pdfJsDoc, pno, 200);
        patchPages((prev) =>
          prev.map((it) =>
            it.sourceDocIndex === 0 && it.originalPageNumber === pno ? { ...it, dataUrl } : it
          )
        );
      }
    } catch (err) {
      console.error(err);
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
    if (!primaryFile || pages.length === 0 || resultBlob) return;
    // Thumbnails are re-renderable; don't persist heavy data URLs
    const lightPages = pages.map((p) => ({ ...p, dataUrl: undefined }));
    void saveRecoverySession(TOOL_SLUG, primaryFile, { pages: lightPages });
  }, [primaryFile, pages, resultBlob]);

  useEffect(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(saveRecovery, 1500);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [saveRecovery]);

  // Best-effort immediate save when leaving the page
  useEffect(() => {
    const handler = () => saveRecovery();
    window.addEventListener('pagehide', handler);
    return () => window.removeEventListener('pagehide', handler);
  }, [saveRecovery]);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setPrimaryFile(selected);
    setLoadedFiles([selected]);
    setErrorMessage(null);
    setSelectedIds(new Set());

    try {
      const pdfJsDoc = await getPdfDocumentFromFile(selected);
      const numPages = pdfJsDoc.numPages;

      const initialPages: VisualPageItem[] = Array.from({ length: numPages }, (_, i) => ({
        id: Math.random().toString(36).substring(2, 9),
        sourceDocIndex: 0,
        originalPageIndex: i,
        originalPageNumber: i + 1,
        rotation: 0,
        sourceName: selected.name,
      }));
      resetPages(initialPages);

      // Render previews
      for (let p = 1; p <= Math.min(numPages, 50); p++) {
        const dataUrl = await renderPageThumbnail(pdfJsDoc, p, 200);
        patchPages((prev) =>
          prev.map((it) =>
            it.sourceDocIndex === 0 && it.originalPageNumber === p ? { ...it, dataUrl } : it
          )
        );
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Could not render page previews. File may be encrypted or corrupted.');
    }
  };

  // Import pages from another PDF
  const handleImportAnotherPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const importFiles = e.target.files;
    if (!importFiles || importFiles.length === 0) return;
    const newFile = importFiles[0];

    try {
      const docIndex = loadedFiles.length;
      setLoadedFiles((prev) => [...prev, newFile]);

      const pdfJsDoc = await getPdfDocumentFromFile(newFile);
      const numPages = pdfJsDoc.numPages;

      const newPages: VisualPageItem[] = Array.from({ length: numPages }, (_, i) => ({
        id: Math.random().toString(36).substring(2, 9),
        sourceDocIndex: docIndex,
        originalPageIndex: i,
        originalPageNumber: i + 1,
        rotation: 0,
        sourceName: newFile.name,
      }));

      commitPages((prev) => [...prev, ...newPages]);

      // Render thumbnails for imported pages
      for (let p = 1; p <= Math.min(numPages, 30); p++) {
        const dataUrl = await renderPageThumbnail(pdfJsDoc, p, 200);
        patchPages((prev) =>
          prev.map((it) =>
            it.sourceDocIndex === docIndex && it.originalPageNumber === p ? { ...it, dataUrl } : it
          )
        );
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Could not import pages from the selected PDF.');
    } finally {
      if (importFileInputRef.current) importFileInputRef.current.value = '';
    }
  };

  // Selection helpers
  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === pages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pages.map((p) => p.id)));
    }
  };

  // Reorder & Mutations
  const rotateSelected = (deg: number) => {
    const targets = selectedIds.size > 0 ? selectedIds : new Set(pages.map((p) => p.id));
    commitPages((prev) =>
      prev.map((p) => (targets.has(p.id) ? { ...p, rotation: (p.rotation + deg + 360) % 360 } : p))
    );
  };

  const deleteSelected = () => {
    const targets = selectedIds.size > 0 ? selectedIds : null;
    if (!targets) return;
    if (pages.length - targets.size <= 0) {
      setErrorMessage('Document must contain at least 1 page.');
      return;
    }
    commitPages((prev) => prev.filter((p) => !targets.has(p.id)));
    setSelectedIds(new Set());
  };

  const duplicateSelected = () => {
    const targets = selectedIds.size > 0 ? selectedIds : null;
    if (!targets) return;

    const newPages: VisualPageItem[] = [];
    pages.forEach((p) => {
      newPages.push(p);
      if (targets.has(p.id)) {
        newPages.push({
          ...p,
          id: Math.random().toString(36).substring(2, 9),
        });
      }
    });
    commitPages(newPages);
  };

  const reversePages = () => {
    commitPages((prev) => [...prev].reverse());
  };

  const insertBlankPage = (afterIndex?: number) => {
    const idx = afterIndex !== undefined ? afterIndex : pages.length;
    const blankItem: VisualPageItem = {
      id: Math.random().toString(36).substring(2, 9),
      sourceDocIndex: -1,
      originalPageIndex: -1,
      originalPageNumber: 0,
      rotation: 0,
      isBlank: true,
    };
    const next = [...pages];
    next.splice(idx, 0, blankItem);
    commitPages(next);
  };

  const moveSelectedToFirst = () => {
    if (selectedIds.size === 0) return;
    const selected = pages.filter((p) => selectedIds.has(p.id));
    const remaining = pages.filter((p) => !selectedIds.has(p.id));
    commitPages([...selected, ...remaining]);
  };

  const moveSelectedToLast = () => {
    if (selectedIds.size === 0) return;
    const selected = pages.filter((p) => selectedIds.has(p.id));
    const remaining = pages.filter((p) => !selectedIds.has(p.id));
    commitPages([...remaining, ...selected]);
  };

  // Drag and drop handler
  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (dragOverId !== id) {
      setDragOverId(id);
    }
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const fromIndex = pages.findIndex((p) => p.id === draggedId);
    const toIndex = pages.findIndex((p) => p.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const next = [...pages];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    commitPages(next);
    setDraggedId(null);
    setDragOverId(null);
  };

  // Save new PDF
  const handleSave = async (onlySelected = false) => {
    const targetPages = onlySelected
      ? pages.filter((p) => selectedIds.has(p.id))
      : pages;

    if (targetPages.length === 0) {
      setErrorMessage('Please select pages to export.');
      return;
    }

    setIsProcessing(true);
    setProgressPct(10);
    setProcessStep('Assembling document...');

    try {
      const outDoc = await PDFDocument.create();

      // Cache loaded PDFDocuments
      const sourceDocs: PDFDocument[] = [];
      for (let i = 0; i < loadedFiles.length; i++) {
        setProcessStep(`Loading source file ${i + 1}...`);
        const ab = await loadedFiles[i].arrayBuffer();
        const doc = await PDFDocument.load(ab, { ignoreEncryption: true });
        sourceDocs.push(doc);
      }

      setProgressPct(40);
      setProcessStep('Rendering page order and rotations...');

      for (let i = 0; i < targetPages.length; i++) {
        const item = targetPages[i];
        setProgressPct(40 + Math.round((i / targetPages.length) * 50));

        if (item.isBlank || item.sourceDocIndex === -1) {
          // Insert standard blank page (A4)
          outDoc.addPage([595.28, 841.89]);
        } else {
          const srcDoc = sourceDocs[item.sourceDocIndex];
          const [copiedPage] = await outDoc.copyPages(srcDoc, [item.originalPageIndex]);
          if (item.rotation !== 0) {
            const currentRot = copiedPage.getRotation().angle;
            copiedPage.setRotation({ type: 'degrees', angle: (currentRot + item.rotation) % 360 } as any);
          }
          outDoc.addPage(copiedPage);
        }
      }

      setProcessStep('Compressing output...');
      setProgressPct(95);
      const pdfBytes = await outDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const baseName = (primaryFile?.name || 'document').replace(/\.[^/.]+$/, '');
      const outName = onlySelected
        ? `${baseName}_extracted_${targetPages.length}pages.pdf`
        : `${baseName}_organized.pdf`;

      setResultBlob(blob);
      setResultFileName(outName);

      addRecentJob({
        id: Math.random().toString(36).substring(2, 9),
        toolId: 'organize-pdf',
        toolName: 'Organize PDF',
        fileName: outName,
        fileSize: blob.size,
        timestamp: Date.now(),
        status: 'completed',
      });

      // Session completed: drop the recovery record and the undo history
      void deleteRecoverySession(TOOL_SLUG);
      clearPagesHistory();
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Failed to assemble new PDF: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] p-6 sm:p-8 shadow-sm">
      <RecoveryPrompt
        isOpen={recoveryOpen}
        savedWhen={recoverySession ? new Date(recoverySession.savedAt).toLocaleString() : ''}
        onRestore={restoreSession}
        onDiscard={discardSession}
      />
      {!primaryFile ? (
        <div className="max-w-xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center mx-auto mb-4">
            <Grid className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5F0EB] mb-2">
            Organize & Rotate Pages
          </h2>
          <p className="text-xs sm:text-sm text-[#5C554F] dark:text-[#A39991] mb-6">
            Drag to reorder, multi-select, rotate, delete, insert blanks, duplicate, and merge pages across PDFs with complete local privacy.
          </p>
          <FileDropzone
            accept=".pdf,application/pdf"
            maxFiles={1}
            onFilesSelected={handleFileSelected}
            label="Drop PDF here or click to select"
            sublabel="Processed locally in your browser for supported tools"
          />
        </div>
      ) : resultBlob ? (
        <SuccessView
          fileName={resultFileName}
          fileSize={resultBlob.size}
          pageCount={pages.length}
          downloadLabel="Download Organized PDF"
          onDownload={() => triggerDownload(resultBlob, resultFileName)}
          onReset={() => {
            setResultBlob(null);
            setPrimaryFile(null);
            resetPages([]);
            clearPagesHistory();
            setSelectedIds(new Set());
            void deleteRecoverySession(TOOL_SLUG);
          }}
          additionalNote={`Exported ${pages.length} pages (${formatBytes(resultBlob.size)}). Ready for download.`}
        />
      ) : (
        <div className="space-y-6">
          <UndoRedoBar
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undoPages}
            onRedo={redoPages}
            label="page changes"
          />

          {/* Header Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E5DFD4] dark:border-[#2E2729]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#141213] dark:text-[#F5F0EB]">
                {pages.length} Pages
              </span>
              {selectedIds.size > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#6D1F35]/10 text-[#6D1F35] dark:text-[#C6A15B] text-xs font-semibold">
                  {selectedIds.size} Selected
                </span>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={selectAll}
                className="px-2.5 py-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs font-medium hover:bg-[#F7F3EC] dark:hover:bg-[#252021] inline-flex items-center gap-1.5"
              >
                {selectedIds.size === pages.length ? (
                  <CheckSquare className="w-3.5 h-3.5 text-[#6D1F35] dark:text-[#C6A15B]" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-gray-400" />
                )}
                <span>{selectedIds.size === pages.length ? 'Deselect All' : 'Select All'}</span>
              </button>

              <button
                onClick={() => rotateSelected(90)}
                className="p-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs font-medium hover:bg-[#F7F3EC] dark:hover:bg-[#252021]"
                title="Rotate Clockwise 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <button
                onClick={() => rotateSelected(-90)}
                className="p-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs font-medium hover:bg-[#F7F3EC] dark:hover:bg-[#252021]"
                title="Rotate Counter-Clockwise 90°"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={reversePages}
                className="px-2 py-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs font-medium hover:bg-[#F7F3EC] dark:hover:bg-[#252021] inline-flex items-center gap-1"
                title="Reverse Page Order"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reverse</span>
              </button>

              <button
                onClick={() => insertBlankPage()}
                className="px-2 py-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs font-medium hover:bg-[#F7F3EC] dark:hover:bg-[#252021] inline-flex items-center gap-1"
                title="Insert Blank Page"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Blank</span>
              </button>

              <button
                onClick={() => importFileInputRef.current?.click()}
                className="px-2 py-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs font-medium hover:bg-[#F7F3EC] dark:hover:bg-[#252021] inline-flex items-center gap-1 text-[#238B63] dark:text-[#2EB682]"
                title="Import Pages from Another PDF"
              >
                <FilePlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Import PDF</span>
              </button>
              <input
                ref={importFileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleImportAnotherPdf}
                className="hidden"
              />

              {selectedIds.size > 0 && (
                <>
                  <button
                    onClick={moveSelectedToFirst}
                    className="p-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs hover:bg-[#F7F3EC]"
                    title="Move selected to beginning"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={moveSelectedToLast}
                    className="p-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs hover:bg-[#F7F3EC]"
                    title="Move selected to end"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={duplicateSelected}
                    className="p-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs hover:bg-[#F7F3EC]"
                    title="Duplicate selected"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={deleteSelected}
                    className="p-1.5 rounded-lg border border-red-200 text-red-600 bg-white dark:bg-[#1E1A1B] text-xs hover:bg-red-50"
                    title="Delete selected"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleSave(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#238B63] text-white text-xs font-semibold hover:bg-[#1c7251] inline-flex items-center gap-1 shadow-xs"
                    title="Extract selected pages to a new PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Extract ({selectedIds.size})</span>
                  </button>
                </>
              )}

              <button
                onClick={() => handleSave(false)}
                className="px-4 py-1.5 rounded-lg bg-[#6D1F35] text-white text-xs font-semibold hover:bg-[#58182a] inline-flex items-center gap-1.5 shadow-xs"
              >
                <span>Save PDF</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Thumbnail Grid with Drag & Drop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {pages.map((p, index) => {
              const isSelected = selectedIds.has(p.id);
              const isDragging = draggedId === p.id;
              const isOver = dragOverId === p.id;

              return (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => handleDragStart(p.id)}
                  onDragOver={(e) => handleDragOver(e, p.id)}
                  onDrop={() => handleDrop(p.id)}
                  onClick={(e) => toggleSelect(p.id, e)}
                  className={`group relative rounded-xl border p-2 bg-white dark:bg-[#1E1A1B] cursor-pointer transition-all select-none ${
                    isDragging ? 'opacity-30 scale-95' : ''
                  } ${isOver ? 'border-[#6D1F35] dark:border-[#C6A15B] ring-2 ring-[#6D1F35]' : ''} ${
                    isSelected
                      ? 'border-[#6D1F35] dark:border-[#C6A15B] ring-2 ring-[#6D1F35]/30 bg-[#6D1F35]/5 dark:bg-[#C6A15B]/10'
                      : 'border-[#E5DFD4] dark:border-[#2E2729] hover:border-[#6D1F35]/60 hover:shadow-xs'
                  }`}
                >
                  {/* Selection Checkbox */}
                  <div className="absolute top-3 left-3 z-10">
                    <button
                      onClick={(e) => toggleSelect(p.id, e)}
                      className="p-1 rounded bg-black/40 text-white backdrop-blur-xs hover:bg-black/60 transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-[#C6A15B]" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-white/80" />
                      )}
                    </button>
                  </div>

                  {/* Rotation Indicator */}
                  {p.rotation !== 0 && (
                    <div className="absolute top-3 right-3 z-10 px-1.5 py-0.5 rounded bg-black/60 text-white text-[11px] font-mono">
                      {p.rotation}°
                    </div>
                  )}

                  {/* Thumbnail Image */}
                  <div className="aspect-[3/4] bg-[#F7F3EC] dark:bg-[#141213] rounded-lg overflow-hidden flex items-center justify-center border border-black/5">
                    {p.isBlank ? (
                      <div className="text-center p-2">
                        <FileText className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                        <span className="text-[11px] text-gray-400 font-medium">Blank Page</span>
                      </div>
                    ) : p.dataUrl ? (
                      <img
                        src={p.dataUrl}
                        alt={`Page ${index + 1}`}
                        style={{ transform: `rotate(${p.rotation}deg)` }}
                        className="w-full h-full object-contain transition-transform"
                      />
                    ) : (
                      <span className="text-xs text-gray-400 font-mono">P.{index + 1}</span>
                    )}
                  </div>

                  {/* Bottom Meta & Quick Tools */}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#5C554F] dark:text-[#A39991]">
                    <span className="font-semibold text-[#141213] dark:text-[#F5F0EB]">
                      Page {index + 1}
                    </span>

                    <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          commitPages((prev) =>
                            prev.map((item) =>
                              item.id === p.id
                                ? { ...item, rotation: (item.rotation + 90) % 360 }
                                : item
                            )
                          );
                        }}
                        className="p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:text-[#6D1F35] rounded-lg"
                        aria-label="Rotate page 90 degrees"
                        title="Rotate 90°"
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (pages.length <= 1) return;
                          commitPages((prev) => prev.filter((item) => item.id !== p.id));
                        }}
                        className="p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:text-red-600 rounded-lg"
                        aria-label="Delete page"
                        title="Delete page"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ProcessingModal isOpen={isProcessing} stepName={processStep} percentage={progressPct} />
    </div>
  );
};
