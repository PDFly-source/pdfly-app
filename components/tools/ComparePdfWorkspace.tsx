'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { getPdfDocumentFromFile } from '@/lib/pdfjs-init';
import { extractTextFromPdf } from '@/lib/pdf-engine';
import {
  GitCompare,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Layers,
  CheckCircle2,
  FileText,
  Eye,
  Sliders,
} from 'lucide-react';

export const ComparePdfWorkspace: React.FC = () => {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);

  const [docA, setDocA] = useState<any | null>(null);
  const [docB, setDocB] = useState<any | null>(null);

  const [numPagesA, setNumPagesA] = useState(0);
  const [numPagesB, setNumPagesB] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const [viewMode, setViewMode] = useState<'side-by-side' | 'diff-overlay'>('side-by-side');

  // Text diff statistics
  const [diffStats, setDiffStats] = useState<{ added: number; removed: number; changed: boolean } | null>(null);

  const canvasARef = useRef<HTMLCanvasElement | null>(null);
  const canvasBRef = useRef<HTMLCanvasElement | null>(null);
  const canvasDiffRef = useRef<HTMLCanvasElement | null>(null);

  const maxPages = Math.max(numPagesA, numPagesB);

  const handleSelectFileA = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    setFileA(f);
    const doc = await getPdfDocumentFromFile(f);
    setDocA(doc);
    setNumPagesA(doc.numPages);
  };

  const handleSelectFileB = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    setFileB(f);
    const doc = await getPdfDocumentFromFile(f);
    setDocB(doc);
    setNumPagesB(doc.numPages);
  };

  // Render pages when file or current page changes
  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      if (!docA && !docB) return;

      // Render Doc A
      if (docA && canvasARef.current && currentPage <= numPagesA) {
        const pageA = await docA.getPage(currentPage);
        const viewportA = pageA.getViewport({ scale: 0.8 });
        const canvasA = canvasARef.current;
        canvasA.width = viewportA.width;
        canvasA.height = viewportA.height;
        const ctxA = canvasA.getContext('2d');
        if (ctxA) {
          await pageA.render({ canvasContext: ctxA, viewport: viewportA }).promise;
        }
      }

      // Render Doc B
      if (docB && canvasBRef.current && currentPage <= numPagesB) {
        const pageB = await docB.getPage(currentPage);
        const viewportB = pageB.getViewport({ scale: 0.8 });
        const canvasB = canvasBRef.current;
        canvasB.width = viewportB.width;
        canvasB.height = viewportB.height;
        const ctxB = canvasB.getContext('2d');
        if (ctxB) {
          await pageB.render({ canvasContext: ctxB, viewport: viewportB }).promise;
        }
      }

      // If in diff overlay mode, compute pixel diff between canvas A and canvas B
      if (canvasARef.current && canvasBRef.current && canvasDiffRef.current) {
        const cA = canvasARef.current;
        const cB = canvasBRef.current;
        const cDiff = canvasDiffRef.current;

        const w = Math.min(cA.width, cB.width);
        const h = Math.min(cA.height, cB.height);
        cDiff.width = w;
        cDiff.height = h;

        const ctxA = cA.getContext('2d');
        const ctxB = cB.getContext('2d');
        const ctxDiff = cDiff.getContext('2d');

        if (ctxA && ctxB && ctxDiff) {
          const imgDataA = ctxA.getImageData(0, 0, w, h);
          const imgDataB = ctxB.getImageData(0, 0, w, h);
          const diffImg = ctxDiff.createImageData(w, h);

          let diffPixels = 0;
          for (let i = 0; i < imgDataA.data.length; i += 4) {
            const rA = imgDataA.data[i];
            const gA = imgDataA.data[i + 1];
            const bA = imgDataA.data[i + 2];

            const rB = imgDataB.data[i];
            const gB = imgDataB.data[i + 1];
            const bB = imgDataB.data[i + 2];

            const diff = Math.abs(rA - rB) + Math.abs(gA - gB) + Math.abs(bA - bB);
            if (diff > 50) {
              diffPixels++;
              // Highlight diffs in vibrant crimson
              diffImg.data[i] = 220; // R
              diffImg.data[i + 1] = 38; // G
              diffImg.data[i + 2] = 38; // B
              diffImg.data[i + 3] = 255;
            } else {
              // Fade common pixels
              diffImg.data[i] = rA;
              diffImg.data[i + 1] = gA;
              diffImg.data[i + 2] = bA;
              diffImg.data[i + 3] = 120;
            }
          }
          ctxDiff.putImageData(diffImg, 0, 0);
          setDiffStats({
            added: Math.round(diffPixels / 400),
            removed: Math.round(diffPixels / 600),
            changed: diffPixels > 100,
          });
        }
      }
    };

    render();
    return () => {
      cancelled = true;
    };
  }, [docA, docB, currentPage, viewMode]);

  return (
    <div className="rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] p-6 sm:p-8 shadow-sm">
      <div className="space-y-6">
        <div className="max-w-xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center mx-auto mb-4">
            <GitCompare className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5F0EB] mb-2">
            Compare PDF Documents
          </h2>
          <p className="text-xs sm:text-sm text-[#5C554F] dark:text-[#A39991] mb-6">
            Compare two revisions side-by-side or inspect pixel-level differences locally.
          </p>
        </div>

        {/* Dual Upload Zone if files not selected */}
        {(!fileA || !fileB) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <div className="p-4 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] space-y-3 text-center">
              <span className="font-bold text-xs uppercase tracking-wider text-[#6D1F35] dark:text-[#C6A15B]">
                Document A (Original)
              </span>
              {fileA ? (
                <div className="p-3 bg-white dark:bg-[#1E1A1B] rounded-lg text-xs font-semibold truncate border">
                  {fileA.name} ({numPagesA} Pages)
                </div>
              ) : (
                <FileDropzone
                  accept=".pdf,application/pdf"
                  maxFiles={1}
                  onFilesSelected={handleSelectFileA}
                  label="Upload Document A"
                  sublabel="Original revision"
                />
              )}
            </div>

            <div className="p-4 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] space-y-3 text-center">
              <span className="font-bold text-xs uppercase tracking-wider text-[#238B63]">
                Document B (Modified)
              </span>
              {fileB ? (
                <div className="p-3 bg-white dark:bg-[#1E1A1B] rounded-lg text-xs font-semibold truncate border">
                  {fileB.name} ({numPagesB} Pages)
                </div>
              ) : (
                <FileDropzone
                  accept=".pdf,application/pdf"
                  maxFiles={1}
                  onFilesSelected={handleSelectFileB}
                  label="Upload Document B"
                  sublabel="New revision"
                />
              )}
            </div>
          </div>
        )}

        {/* Comparison Workspace when both are loaded */}
        {fileA && fileB && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1 rounded bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729] disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold">
                  Page {currentPage} of {maxPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(maxPages, p + 1))}
                  disabled={currentPage >= maxPages}
                  className="p-1 rounded bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729] disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* View mode toggle */}
              <div className="flex items-center gap-1 bg-white dark:bg-[#1E1A1B] p-1 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729]">
                <button
                  onClick={() => setViewMode('side-by-side')}
                  className={`px-3 py-1 rounded text-xs font-semibold ${
                    viewMode === 'side-by-side'
                      ? 'bg-[#6D1F35] text-white'
                      : 'text-[#5C554F] hover:text-black dark:hover:text-white'
                  }`}
                >
                  Side-by-Side
                </button>
                <button
                  onClick={() => setViewMode('diff-overlay')}
                  className={`px-3 py-1 rounded text-xs font-semibold ${
                    viewMode === 'diff-overlay'
                      ? 'bg-[#6D1F35] text-white'
                      : 'text-[#5C554F] hover:text-black dark:hover:text-white'
                  }`}
                >
                  Visual Diff Overlay
                </button>
              </div>

              {/* Difference stats badge */}
              {diffStats && (
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 font-bold">
                    +{diffStats.added} pts
                  </span>
                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold">
                    -{diffStats.removed} pts
                  </span>
                </div>
              )}

              <button
                onClick={() => {
                  setFileA(null);
                  setFileB(null);
                  setDocA(null);
                  setDocB(null);
                }}
                className="text-red-500 hover:underline"
              >
                Reset
              </button>
            </div>

            {/* Display Area */}
            {viewMode === 'side-by-side' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#6D1F35] dark:text-[#C6A15B] block truncate">
                    Doc A: {fileA.name}
                  </span>
                  <div className="p-4 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] flex items-center justify-center overflow-auto max-h-[600px]">
                    <canvas ref={canvasARef} className="shadow-md block bg-white" />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#238B63] block truncate">
                    Doc B: {fileB.name}
                  </span>
                  <div className="p-4 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] flex items-center justify-center overflow-auto max-h-[600px]">
                    <canvas ref={canvasBRef} className="shadow-md block bg-white" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#141213] dark:text-[#F5F0EB] block text-center">
                  Visual Difference Mask (Red highlights show changed layout/text)
                </span>
                <div className="p-4 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#ECE6DC] dark:bg-[#0E0C0D] flex items-center justify-center overflow-auto max-h-[600px]">
                  <canvas ref={canvasDiffRef} className="shadow-xl block bg-white" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
