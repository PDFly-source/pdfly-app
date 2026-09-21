'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ALL_TOOLS } from '@/lib/tools-data';
import { ToolDefinition } from '@/types/pdf';
import { setPendingFiles } from '@/lib/pending-file';
import { Logo } from './Logo';
import { formatBytes } from '@/lib/pdf-engine';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileWarning,
  X,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

/** Max size guard mirrors the engine's per-file limit to stay consistent. */
const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB hard safety ceiling

interface DroppedFile {
  file: File;
  status: 'ok' | 'unsupported' | 'oversized';
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];

function hasExtension(name: string, exts: string[]): boolean {
  const lower = name.toLowerCase();
  return exts.some((e) => lower.endsWith(e));
}

/**
 * Global Smart Dropzone.
 * Activates only when a real OS file drag enters the window. If the drop
 * lands on a tool's own dropzone (marked data-tool-dropzone) that zone
 * handles it. Otherwise a branded overlay catches the drop and an intent
 * selector routes the file into the EXISTING tool flow via the pending
 * file handoff — all local, no uploads.
 */
export const SmartDropzone: React.FC = () => {
  const router = useRouter();
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [intentOpen, setIntentOpen] = useState(false);
  const [dropped, setDropped] = useState<DroppedFile[]>([]);
  const [acceptedFiles, setAcceptedFiles] = useState<File[]>([]);
  const [intentTools, setIntentTools] = useState<ToolDefinition[]>([]);
  const dragDepth = useRef(0);
  const overToolZone = useRef(false);

  /** Rule-based local intent detection: extension + MIME only. */
  const handleDroppedFiles = (files: File[]) => {
    const reviewed: DroppedFile[] = files.map((file) => {
      const isPdf =
        file.type === 'application/pdf' || hasExtension(file.name, ['.pdf']);
      const isImage =
        file.type.startsWith('image/') || hasExtension(file.name, IMAGE_EXTENSIONS);
      if (!isPdf && !isImage) return { file, status: 'unsupported' as const };
      if (file.size > MAX_FILE_BYTES) return { file, status: 'oversized' as const };
      return { file, status: 'ok' as const };
    });

    const okFiles = reviewed.filter((d) => d.status === 'ok').map((d) => d.file);

    setDropped(reviewed);
    setAcceptedFiles(okFiles);

    // Which existing tools accept this file type? Data-driven from the
    // tool registry's `accepts` list — no duplicated tool definitions.
    const tools = new Map<string, ToolDefinition>();
    for (const f of okFiles) {
      const isPdf = f.type === 'application/pdf' || hasExtension(f.name, ['.pdf']);
      const ext = isPdf
        ? '.pdf'
        : IMAGE_EXTENSIONS.find((e) => hasExtension(f.name, [e])) || `.${f.name.split('.').pop()}`;
      for (const t of ALL_TOOLS) {
        if (t.accepts?.some((a) => a === ext || a === f.type)) {
          tools.set(t.slug, t);
        }
      }
    }

    // Sensible ordering: popular tools first, keep the rest stable
    const ordered = Array.from(tools.values()).sort((a, b) => {
      if (a.popular !== b.popular) return a.popular ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    setIntentTools(ordered);
    setIntentOpen(true);
  };

  // Window-level drag tracking
  useEffect(() => {
    const isFileDragEvent = (e: DragEvent) => {
      const types = e.dataTransfer?.types;
      return types ? Array.from(types).includes('Files') : false;
    };

    const onDragEnter = (e: DragEvent) => {
      if (!isFileDragEvent(e)) return;
      dragDepth.current += 1;
      setOverlayVisible(true);
    };

    const onDragOver = (e: DragEvent) => {
      if (!isFileDragEvent(e)) return;
      e.preventDefault(); // required so the window can accept the drop

      // If the pointer is directly over a tool's own dropzone, recede the
      // overlay so the tool's native drop handling stays in charge.
      const target = e.target as Element | null;
      const overTool = !!target?.closest?.('[data-tool-dropzone]');
      if (overTool !== overToolZone.current) {
        overToolZone.current = overTool;
        setOverlayVisible(!overTool);
      }
    };

    const onDragLeave = (e: DragEvent) => {
      if (!isFileDragEvent(e)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      // relatedTarget === null means the drag left the window entirely
      // (e.g. cancelled outside) — always reset so the overlay never sticks
      if (dragDepth.current === 0 || !e.relatedTarget) {
        dragDepth.current = 0;
        overToolZone.current = false;
        setOverlayVisible(false);
      }
    };

    const onDrop = (e: DragEvent) => {
      if (!isFileDragEvent(e)) return;
      dragDepth.current = 0;
      overToolZone.current = false;

      const target = e.target as Element | null;
      const droppedOnToolZone = !!target?.closest?.('[data-tool-dropzone]');

      setOverlayVisible(false);

      if (droppedOnToolZone) return; // tool's own dropzone handles it

      e.preventDefault();
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length === 0) return;
      handleDroppedFiles(files);
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runTool = (tool: ToolDefinition) => {
    setIntentOpen(false);
    if (acceptedFiles.length === 0) return;
    setPendingFiles(acceptedFiles, tool.slug);
    router.push(`/tools/${tool.slug}`);
  };

  const closeIntent = () => {
    setIntentOpen(false);
    setDropped([]);
    setAcceptedFiles([]);
    setIntentTools([]);
  };

  return (
    <>
      {/* Full-screen drop overlay */}
      {overlayVisible && !intentOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#141012]/70 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 motion-reduce:animate-none"
          aria-hidden="true"
        >
          <div className="flex flex-col items-center gap-5 px-6 py-10 sm:px-14 sm:py-12 rounded-3xl border-2 border-dashed border-[#C9A15A]/60 bg-[#FFFDF9]/95 dark:bg-[#1B1719]/95 shadow-2xl max-w-lg mx-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7A1635] to-[#4A0D20] flex items-center justify-center border border-[#C9A15A]/40">
              <UploadCloud className="w-8 h-8 text-[#C9A15A] animate-bounce motion-reduce:animate-none" />
            </div>
            <div>
              <p className="text-lg font-black text-[#1A1416] dark:text-[#F7F1E8]">
                Drop your file here
              </p>
              <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] mt-1">
                PDFs and images are processed privately on your device
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-wider text-[#7A1635] dark:text-[#C9A15A]">
              <Logo size="sm" variant="compact" />
            </div>
          </div>
        </div>
      )}

      {/* Intent selector */}
      {intentOpen && (
        <div
          className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 motion-reduce:animate-none"
          role="dialog"
          aria-modal="true"
          aria-label="Choose what to do with your file"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeIntent();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') closeIntent();
          }}
        >
          <div className="w-full sm:max-w-lg bg-[#FFFDF9] dark:bg-[#1E1A1B] rounded-t-3xl sm:rounded-3xl border border-[#E8DFD3] dark:border-[#2E2629] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 motion-reduce:animate-none max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8DFD3] dark:border-[#2E2629]">
              <div>
                <p className="text-sm font-black text-[#1A1416] dark:text-[#F7F1E8] uppercase tracking-wide">
                  What would you like to do?
                </p>
                <p className="text-[11px] text-[#5C5256] dark:text-[#AFA6A8] mt-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#35C98A]" />
                  Files stay on your device
                </p>
              </div>
              <button
                onClick={closeIntent}
                className="p-2 rounded-xl text-[#5C5256] dark:text-[#AFA6A8] hover:text-[#1A1416] dark:hover:text-[#F7F1E8] hover:bg-black/5 dark:hover:bg-white/5 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Cancel and close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* File list */}
            <div className="px-5 py-3 border-b border-[#E8DFD3] dark:border-[#2E2629] space-y-2 max-h-32 overflow-y-auto">
              {dropped.map((d, i) => (
                <div
                  key={`${d.file.name}-${i}`}
                  className="flex items-center gap-2.5 text-xs"
                >
                  {d.status === 'unsupported' ? (
                    <FileWarning className="w-4 h-4 text-[#C94A4A] shrink-0" />
                  ) : d.file.type.startsWith('image/') ? (
                    <ImageIcon className="w-4 h-4 text-[#7A1635] dark:text-[#C9A15A] shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-[#7A1635] dark:text-[#C9A15A] shrink-0" />
                  )}
                  <span className="truncate font-semibold text-[#1A1416] dark:text-[#F7F1E8]">
                    {d.file.name}
                  </span>
                  <span className="ml-auto shrink-0 text-[#5C5256] dark:text-[#AFA6A8]">
                    {d.status === 'unsupported'
                      ? 'Unsupported type'
                      : d.status === 'oversized'
                        ? 'Too large'
                        : formatBytes(d.file.size)}
                  </span>
                </div>
              ))}
            </div>

            {/* Action list */}
            <div className="overflow-y-auto p-3">
              {acceptedFiles.length === 0 ? (
                <p className="p-6 text-center text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                  {dropped.some((d) => d.status === 'oversized')
                    ? 'The dropped file exceeds the maximum supported size.'
                    : 'This file type is not supported. PDFs and images work best.'}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {intentTools.map((tool) => (
                    <button
                      key={tool.slug}
                      onClick={() => runTool(tool)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors bg-white dark:bg-[#141213] border border-[#E8DFD3] dark:border-[#2E2629] hover:border-[#7A1635]/40 dark:hover:border-[#C9A15A]/40 hover:bg-[#F6EFE3] dark:hover:bg-[#241D20] active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100"
                    >
                      <div className="min-w-[44px] h-[44px] rounded-xl bg-[#7A1635]/10 dark:bg-[#C9A15A]/15 text-[#7A1635] dark:text-[#C9A15A] flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8]">
                          {tool.name}
                        </p>
                        <p className="text-[11px] text-[#5C5256] dark:text-[#AFA6A8] truncate">
                          {tool.description}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#5C5256] dark:text-[#AFA6A8] ml-auto shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
