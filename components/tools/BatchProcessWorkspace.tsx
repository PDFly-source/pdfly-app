'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import {
  compressPdf,
  updateOrClearMetadata,
  watermarkPdf,
  addPageNumbers,
  triggerDownload,
  formatBytes,
} from '@/lib/pdf-engine';
import { compressToTargetSize } from '@/lib/compress-target';
import { applyInkMode } from '@/lib/ink-saver';
import { setPagesRotation } from '@/lib/workflow-engine';
import { formatDuration } from '@/lib/batch-naming';
import { runBatchQueue, type QueueItemState } from '@/lib/batch-queue';
import {
  BUILT_IN_PRESETS,
  loadCustomPresets,
  saveCustomPreset,
  deleteCustomPreset,
  type BatchPreset,
  type BatchStep,
} from '@/lib/batch-presets';
import { addRecentJob } from '@/lib/recent-jobs';
import JSZip from 'jszip';
import {
  Copy,
  Minimize2,
  FileText,
  Stamp,
  Hash,
  Trash2,
  Download,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Droplets,
  Target,
  Loader2,
  XCircle,
  Play,
  Package,
  Printer,
  Globe,
  GraduationCap,
  Save,
  Layers,
  ShieldCheck,
} from 'lucide-react';

// Operations the batch center supports. Each was audited: these are exactly
// the single-file tools that are safe to apply file-by-file with per-file
// failure isolation. Tools that require per-document interaction
// (organize page order, OCR ranges, merge sets) are intentionally NOT batched.
export type BatchOperation =
  | 'compress'
  | 'target-size'
  | 'sanitize'
  | 'watermark'
  | 'page-numbers'
  | 'grayscale'
  | 'rotate';

const OP_SUFFIX: Record<BatchOperation, string> = {
  compress: 'compressed',
  'target-size': 'compressed',
  sanitize: 'sanitized',
  watermark: 'watermarked',
  'page-numbers': 'numbered',
  grayscale: 'grayscale',
  rotate: 'rotated',
};

interface QueueItem extends QueueItemState {
  id: string;
  file: File;
}

const LARGE_FILE_BYTES = 50 * 1024 * 1024; // 50 MB — honest warning threshold
const MAX_QUEUE = 30;

const toPdfFile = (blob: Blob, name: string): File =>
  new File([blob], name, { type: 'application/pdf' });

export const BatchProcessWorkspace: React.FC = () => {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [mode, setMode] = useState<'operation' | 'preset'>('operation');
  const [operation, setOperation] = useState<BatchOperation>('compress');

  // Operation settings
  const [compressLevel, setCompressLevel] = useState<'light' | 'balanced' | 'strong'>('balanced');
  const [targetMB, setTargetMB] = useState(5);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [pageNumberFormat, setPageNumberFormat] = useState<'1' | 'Page 1' | '1 / N' | 'Page 1 of N'>('Page 1 of N');
  const [pageNumberPosition, setPageNumberPosition] = useState<'bottom-center' | 'bottom-right' | 'bottom-left'>('bottom-center');
  const [rotateAngle, setRotateAngle] = useState<number>(90);

  // Preset state
  const [activePresetId, setActivePresetId] = useState<string>('web-upload');
  const [customPresets, setCustomPresets] = useState<BatchPreset[]>([]);
  const [presetSaveName, setPresetSaveName] = useState('');

  // Processing state
  const [isRunning, setIsRunning] = useState(false);
  const [zipBuilding, setZipBuilding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Cancel coordination (checked between files AND inside progress callbacks)
  const cancelledRef = useRef<Set<string>>(new Set());
  const stopAllRef = useRef(false);

  const allPresets = useMemo(
    () => [...BUILT_IN_PRESETS, ...customPresets],
    [customPresets]
  );
  const activePreset = useMemo(
    () => allPresets.find((p) => p.id === activePresetId) ?? null,
    [allPresets, activePresetId]
  );

  const updateItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const handleFilesSelected = (newFiles: File[]) => {
    setNotice(null);
    setItems((prev) => {
      const room = Math.max(0, MAX_QUEUE - prev.length);
      const accepted = newFiles.slice(0, room);
      return [
        ...prev,
        ...accepted.map((f) => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          file: f,
          status: 'queued' as const,
          progress: 0,
        })),
      ];
    });
  };

  const removeItem = (id: string) => {
    cancelledRef.current.add(id);
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const cancelItem = (id: string) => {
    cancelledRef.current.add(id);
    updateItem(id, { status: 'cancelled', progress: 0 });
  };

  const retryItem = (id: string) => {
    cancelledRef.current.delete(id);
    updateItem(id, { status: 'queued', progress: 0, error: undefined });
    void runQueue([id]);
  };

  const clearCompleted = () => {
    setItems((prev) =>
      prev
        .filter((it) => it.status !== 'completed')
        .map((it) => it)
    );
    setNotice('Completed outputs were cleared from memory. Queued and failed files remain.');
  };

  const clearAll = () => {
    cancelledRef.current = new Set();
    stopAllRef.current = true;
    setItems([]);
    setIsRunning(false);
    setNotice(null);
  };

  // ----- Step building -----
  const buildSteps = useCallback((): BatchStep[] => {
    if (mode === 'preset' && activePreset) return activePreset.steps;
    switch (operation) {
      case 'compress':
        return [{ op: 'compress', label: 'Compress', settings: { level: compressLevel } }];
      case 'target-size':
        return [{ op: 'target-size', label: `Compress to ${targetMB} MB`, settings: { targetMB } }];
      case 'sanitize':
        return [{ op: 'sanitize', label: 'Remove metadata', settings: {} }];
      case 'watermark':
        return [{ op: 'watermark', label: `Watermark "${watermarkText}"`, settings: { text: watermarkText } }];
      case 'page-numbers':
        return [{ op: 'page-numbers', label: 'Page numbers', settings: { format: pageNumberFormat, position: pageNumberPosition } }];
      case 'grayscale':
        return [{ op: 'grayscale', label: 'Grayscale', settings: {} }];
      case 'rotate':
        return [{ op: 'rotate', label: `Rotate ${rotateAngle}°`, settings: { angle: rotateAngle } }];
    }
  }, [mode, activePreset, operation, compressLevel, targetMB, rotateAngle, watermarkText, pageNumberFormat, pageNumberPosition]);

  const outputSuffix = useMemo(() => {
    if (mode === 'preset' && activePreset) return activePreset.id;
    return OP_SUFFIX[operation];
  }, [mode, activePreset, operation]);

  // ----- Per-step engine execution -----
  const applyStep = async (
    file: File,
    step: BatchStep,
    onProgress: (msg: string, pct: number) => void
  ): Promise<Blob> => {
    switch (step.op) {
      case 'compress':
        return (
          await compressPdf(file, (step.settings.level as 'light' | 'balanced' | 'strong') || 'balanced', onProgress)
        ).blob;
      case 'target-size': {
        const mb = Number(step.settings.targetMB) || 5;
        return (
          await compressToTargetSize(
            file,
            { targetBytes: mb * 1024 * 1024, mode: 'balanced', removeMetadata: true, grayscale: false },
            onProgress
          )
        ).blob;
      }
      case 'sanitize':
        return updateOrClearMetadata(file, {}, true);
      case 'watermark':
        return watermarkPdf(file, {
          type: 'text',
          text: (step.settings.text as string) || watermarkText || 'CONFIDENTIAL',
          position: 'diagonal',
          opacity: 0.35,
          fontSize: 48,
          color: '#6D1F35',
        });
      case 'page-numbers':
        return addPageNumbers(file, {
          position: (step.settings.position as 'bottom-center' | 'bottom-right' | 'bottom-left') || pageNumberPosition,
          format: (step.settings.format as '1' | 'Page 1' | '1 / N' | 'Page 1 of N') || pageNumberFormat,
          startNumber: 1,
          fontSize: 10,
        });
      case 'grayscale':
        return (
          await applyInkMode(
            file,
            { mode: 'grayscale', dpi: 150, bwThreshold: 160, inkReduction: 0.5, quality: 0.82 },
            onProgress
          )
        ).blob;
      case 'rotate':
        return setPagesRotation(file, 'all', Number(step.settings.angle) || rotateAngle, '');
    }
  };

  // ----- Queue runner (sequential — memory-safe for large queues) -----
  const runQueue = async (onlyIds?: string[]) => {
    const steps = buildSteps();
    if (!steps || steps.length === 0) return;

    const runnable = items.filter(
      (it) =>
        (!onlyIds || onlyIds.includes(it.id)) &&
        (it.status === 'queued' || it.status === 'cancelled')
    );
    if (runnable.length === 0) return;

    setIsRunning(true);
    stopAllRef.current = false;

    const applySteps = async (file: File, onProgress: (pct: number) => void): Promise<Blob> => {
      let current = file;
      for (const step of steps) {
        const blob = await applyStep(current, step, (msg, pct) => onProgress(pct));
        current = toPdfFile(blob, file.name);
      }
      return current.slice(0, current.size, 'application/pdf');
    };

    const result = await runBatchQueue({
      entries: runnable.map((it) => ({ id: it.id, file: it.file })),
      outputSuffix,
      reservedOutputNames: items
        .filter((it) => it.status === 'completed' && it.outputName)
        .map((it) => it.outputName as string),
      process: applySteps,
      onUpdate: updateItem,
      isCancelled: (id) => cancelledRef.current.has(id),
      isStopAll: () => stopAllRef.current,
    });

    setIsRunning(false);

    if (result.processed > 0) {
      addRecentJob({
        toolId: 'batch-process',
        toolName: `Batch ${outputSuffix}`,
        fileName: `${result.processed} file${result.processed > 1 ? 's' : ''} processed`,
        fileSize: 0,
        status: 'completed',
      });
    }
    if (result.failed > 0) {
      setNotice(
        `${result.failed} file${result.failed > 1 ? 's were' : ' was'} not processed. Use Retry on the failed row — other files were unaffected.`
      );
    }
  };

  const handleStart = () => {
    setNotice(null);
    void runQueue();
  };

  const handleStopAll = () => {
    stopAllRef.current = true;
    cancelledRef.current = new Set(items.map((i) => i.id));
  };

  // ----- Results actions -----
  const completed = items.filter((it) => it.status === 'completed' && it.outputBlob);

  const downloadItem = (it: QueueItem) => {
    if (it.outputBlob && it.outputName) triggerDownload(it.outputBlob, it.outputName);
  };

  const downloadAllIndividually = () => {
    // Sequential downloads with a small gap so browsers don't block the chain
    completed.forEach((it, i) => {
      setTimeout(() => downloadItem(it), i * 350);
    });
  };

  const downloadZip = async () => {
    if (completed.length === 0) return;
    setZipBuilding(true);
    try {
      const zip = new JSZip();
      for (const it of completed) {
        if (it.outputBlob && it.outputName) zip.file(it.outputName, it.outputBlob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipName = `PDFMiniFly_Batch_${outputSuffix}_${completed.length}_files.zip`;
      triggerDownload(zipBlob, zipName);
    } finally {
      setZipBuilding(false);
    }
  };

  const processAgain = () => {
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        status: 'queued',
        progress: 0,
        error: undefined,
        outputBlob: undefined,
        outputName: undefined,
        finalSize: undefined,
        durationMs: undefined,
      }))
    );
  };

  // ----- Derived summary -----
  const counts = useMemo(() => {
    const c = { queued: 0, processing: 0, completed: 0, failed: 0, cancelled: 0 };
    for (const it of items) c[it.status]++;
    return c;
  }, [items]);

  const anyLarge = items.some((it) => it.file.size > LARGE_FILE_BYTES);
  const currentProcessing = items.find((it) => it.status === 'processing');

  const liveMessage = currentProcessing
    ? `Processing ${currentProcessing.file.name}, ${currentProcessing.progress}% complete`
    : isRunning
      ? 'Batch running'
      : '';

  // ----- Custom preset persistence (settings only, localStorage) -----
  const saveCurrentAsPreset = () => {
    const name = presetSaveName.trim();
    if (!name) return;
    const steps = buildSteps();
    if (!steps) return;
    const preset: BatchPreset = {
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `custom-${Date.now()}`,
      name,
      description: 'Custom preset — saved locally in your browser.',
      steps,
      builtIn: false,
    };
    saveCustomPreset(preset);
    setCustomPresets(loadCustomPresets());
    setActivePresetId(preset.id);
    setMode('preset');
    setPresetSaveName('');
  };

  const OPS: { id: BatchOperation; label: string; icon: any; desc: string }[] = [
    { id: 'compress', label: 'Compress', icon: Minimize2, desc: 'Reduce file sizes' },
    { id: 'target-size', label: 'Target Size', icon: Target, desc: 'Fit under a size limit' },
    { id: 'sanitize', label: 'Sanitize Metadata', icon: FileText, desc: 'Purge author tags' },
    { id: 'watermark', label: 'Watermark', icon: Stamp, desc: 'Stamp diagonal mark' },
    { id: 'page-numbers', label: 'Page Numbers', icon: Hash, desc: 'Add footer numbers' },
    { id: 'grayscale', label: 'Grayscale', icon: Droplets, desc: 'Convert to grayscale' },
    { id: 'rotate', label: 'Rotate All', icon: RotateCw, desc: `Rotate pages ${rotateAngle}°` },
  ];

  return (
    <div className="rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] p-4 sm:p-8 shadow-sm">
      {/* Accessible live progress announcement */}
      <div aria-live="polite" role="status" className="sr-only">
        {liveMessage}
      </div>

      <div className="space-y-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center mx-auto mb-4">
            <Copy className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5F0EB] mb-2">
            Batch Processing Center
          </h2>
          <p className="text-xs sm:text-sm text-[#5C554F] dark:text-[#A39991] mb-3">
            Queue up to {MAX_QUEUE} PDFs, apply one operation or a preset, and download the results —
            processed locally in your browser. Your PDFs are never uploaded.
          </p>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            100% local processing — files never leave this device
          </p>
        </div>

        {/* Mode toggle: single operation vs presets */}
        <div
          className="flex items-center justify-center gap-1.5 p-1 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] max-w-md mx-auto"
          role="tablist"
          aria-label="Batch mode"
        >
          <button
            role="tab"
            aria-selected={mode === 'operation'}
            onClick={() => setMode('operation')}
            className={`flex-1 min-h-11 px-4 py-2 rounded-lg text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D1F35] ${
              mode === 'operation'
                ? 'bg-[#6D1F35] text-white dark:bg-[#C6A15B] dark:text-[#141213]'
                : 'text-[#5C554F] dark:text-[#A39991]'
            }`}
          >
            Single Operation
          </button>
          <button
            role="tab"
            aria-selected={mode === 'preset'}
            onClick={() => {
              setCustomPresets(loadCustomPresets());
              setMode('preset');
            }}
            className={`flex-1 min-h-11 px-4 py-2 rounded-lg text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D1F35] ${
              mode === 'preset'
                ? 'bg-[#6D1F35] text-white dark:bg-[#C6A15B] dark:text-[#141213]'
                : 'text-[#5C554F] dark:text-[#A39991]'
            }`}
          >
            Presets
          </button>
        </div>

        {/* ===== Operation mode ===== */}
        {mode === 'operation' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 max-w-4xl mx-auto">
              {OPS.map((op) => {
                const Icon = op.icon;
                const active = operation === op.id;
                return (
                  <button
                    key={op.id}
                    onClick={() => setOperation(op.id)}
                    aria-pressed={active}
                    className={`p-3 rounded-xl border text-left min-h-11 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D1F35] ${
                      active
                        ? 'border-[#6D1F35] dark:border-[#C6A15B] bg-[#6D1F35]/5 dark:bg-[#C6A15B]/10 ring-1 ring-[#6D1F35]'
                        : 'border-[#E5DFD4] dark:border-[#2E2729] hover:border-[#6D1F35]/50 bg-white dark:bg-[#1E1A1B]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1.5 ${active ? 'text-[#6D1F35] dark:text-[#C6A15B]' : 'text-gray-400'}`} aria-hidden="true" />
                    <p className="text-xs font-bold text-[#141213] dark:text-[#F5F0EB]">{op.label}</p>
                    <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">{op.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Operation config */}
            {operation === 'compress' && (
              <div className="max-w-md mx-auto p-4 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-xs space-y-2">
                <label htmlFor="batch-compress-level" className="font-semibold text-[#141213] dark:text-[#F5F0EB]">Compression Level:</label>
                <select
                  id="batch-compress-level"
                  value={compressLevel}
                  onChange={(e) => setCompressLevel(e.target.value as any)}
                  className="w-full min-h-11 px-3 py-2 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-[#141213] dark:text-[#F5F0EB]"
                >
                  <option value="light">Light — conservative, best quality</option>
                  <option value="balanced">Balanced — recommended</option>
                  <option value="strong">Strong — smallest files</option>
                </select>
              </div>
            )}
            {operation === 'target-size' && (
              <div className="max-w-md mx-auto p-4 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-xs space-y-2">
                <label htmlFor="batch-target-mb" className="font-semibold text-[#141213] dark:text-[#F5F0EB]">Target Size (MB per file):</label>
                <input
                  id="batch-target-mb"
                  type="number"
                  min={0.1}
                  step={0.5}
                  value={targetMB}
                  onChange={(e) => setTargetMB(Math.max(0.1, parseFloat(e.target.value) || 5))}
                  className="w-full min-h-11 px-3 py-2 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] font-mono text-[#141213] dark:text-[#F5F0EB]"
                />
                <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
                  Files already under the limit are passed through losslessly where possible.
                </p>
              </div>
            )}
            {operation === 'watermark' && (
              <div className="max-w-md mx-auto p-4 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-xs space-y-2">
                <label htmlFor="batch-watermark-text" className="font-semibold text-[#141213] dark:text-[#F5F0EB]">Watermark Text:</label>
                <input
                  id="batch-watermark-text"
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  className="w-full min-h-11 px-3 py-2 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-[#141213] dark:text-[#F5F0EB]"
                  placeholder="CONFIDENTIAL"
                />
              </div>
            )}
            {operation === 'page-numbers' && (
              <div className="max-w-md mx-auto p-4 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-xs space-y-2">
                <label htmlFor="batch-number-format" className="font-semibold text-[#141213] dark:text-[#F5F0EB]">Numbering Format:</label>
                <select
                  id="batch-number-format"
                  value={pageNumberFormat}
                  onChange={(e: any) => setPageNumberFormat(e.target.value)}
                  className="w-full min-h-11 px-3 py-2 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-[#141213] dark:text-[#F5F0EB]"
                >
                  <option value="Page 1 of N">Page 1 of N</option>
                  <option value="1 / N">1 / N</option>
                  <option value="Page 1">Page 1</option>
                  <option value="1">1</option>
                </select>
                <label htmlFor="batch-number-position" className="font-semibold text-[#141213] dark:text-[#F5F0EB]">Position:</label>
                <select
                  id="batch-number-position"
                  value={pageNumberPosition}
                  onChange={(e: any) => setPageNumberPosition(e.target.value)}
                  className="w-full min-h-11 px-3 py-2 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-[#141213] dark:text-[#F5F0EB]"
                >
                  <option value="bottom-center">Bottom center</option>
                  <option value="bottom-right">Bottom right</option>
                  <option value="bottom-left">Bottom left</option>
                </select>
              </div>
            )}
            {operation === 'rotate' && (
              <div className="max-w-md mx-auto p-4 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-xs space-y-2">
                <span className="font-semibold text-[#141213] dark:text-[#F5F0EB]">Rotation Angle:</span>
                <div className="grid grid-cols-4 gap-2">
                  {[90, 180, 270].map((a) => (
                    <button
                      key={a}
                      onClick={() => setRotateAngle(a)}
                      aria-pressed={rotateAngle === a}
                      className={`min-h-11 px-3 py-2 rounded-lg border text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D1F35] ${
                        rotateAngle === a
                          ? 'border-[#6D1F35] bg-[#6D1F35]/10 text-[#6D1F35] dark:border-[#C6A15B] dark:text-[#C6A15B]'
                          : 'border-[#E5DFD4] dark:border-[#2E2729] text-[#141213] dark:text-[#F5F0EB]'
                      }`}
                    >
                      {a}°
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== Preset mode ===== */}
        {mode === 'preset' && (
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {allPresets.map((p) => {
                const active = activePresetId === p.id;
                const icon =
                  p.id === 'web-upload' ? Globe : p.id === 'print' ? Printer :
                  p.id === 'archive' ? Layers : p.id === 'study-pack' ? GraduationCap : Save;
                const Icon = icon;
                return (
                  <div
                    key={p.id}
                    className={`relative p-4 rounded-xl border transition-all ${
                      active
                        ? 'border-[#6D1F35] dark:border-[#C6A15B] bg-[#6D1F35]/5 dark:bg-[#C6A15B]/10 ring-1 ring-[#6D1F35]'
                        : 'border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B]'
                    }`}
                  >
                    <button
                      onClick={() => setActivePresetId(p.id)}
                      aria-pressed={active}
                      className="w-full text-left min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D1F35] rounded-lg"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4 text-[#6D1F35] dark:text-[#C6A15B]" aria-hidden="true" />
                        <p className="text-sm font-bold text-[#141213] dark:text-[#F5F0EB]">{p.name}</p>
                        {!p.builtIn && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-[#5C554F] dark:text-[#A39991]">custom</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#5C554F] dark:text-[#A39991] mb-2">{p.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {p.steps.map((s, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FAF7F2] dark:bg-[#141213] border border-[#E5DFD4] dark:border-[#2E2729] text-[10px] font-medium text-[#141213] dark:text-[#F5F0EB]"
                          >
                            {i + 1}. {s.label}
                          </span>
                        ))}
                      </div>
                    </button>
                    {!p.builtIn && (
                      <button
                        onClick={() => {
                          deleteCustomPreset(p.id);
                          setCustomPresets(loadCustomPresets());
                          if (activePresetId === p.id) setActivePresetId('web-upload');
                        }}
                        aria-label={`Delete preset ${p.name}`}
                        className="absolute top-2 right-2 p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 min-h-11 min-w-11 flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Save current single-op config as a custom preset */}
            <div className="p-4 rounded-xl border border-dashed border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2]/50 dark:bg-[#141213]/50 text-xs space-y-2">
              <label htmlFor="batch-preset-name" className="font-semibold text-[#141213] dark:text-[#F5F0EB]">
                Save a custom preset (stored locally, settings only):
              </label>
              <div className="flex gap-2">
                <input
                  id="batch-preset-name"
                  type="text"
                  value={presetSaveName}
                  onChange={(e) => setPresetSaveName(e.target.value)}
                  placeholder="e.g. Client Deliverables"
                  className="flex-1 min-h-11 px-3 py-2 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-[#141213] dark:text-[#F5F0EB]"
                />
                <button
                  onClick={() => {
                    setMode('operation');
                    setTimeout(() => {
                      const el = document.getElementById('batch-preset-name');
                      el?.focus();
                    }, 50);
                  }}
                  className="min-h-11 px-3 py-2 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] text-[#5C554F] dark:text-[#A39991] font-semibold"
                >
                  Configure
                </button>
                <button
                  onClick={saveCurrentAsPreset}
                  disabled={!presetSaveName.trim()}
                  className="min-h-11 px-4 py-2 rounded-lg bg-[#6D1F35] dark:bg-[#C6A15B] text-white dark:text-[#141213] font-bold disabled:opacity-40"
                >
                  Save
                </button>
              </div>
              <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
                Set your operation settings under &quot;Single Operation&quot;, then save them here as a reusable recipe.
              </p>
            </div>
          </div>
        )}

        {/* ===== Upload zone ===== */}
        <div className="max-w-2xl mx-auto">
          <FileDropzone
            accept=".pdf,application/pdf"
            multiple={true}
            maxFiles={MAX_QUEUE}
            onFilesSelected={handleFilesSelected}
            label="Select multiple PDFs for the batch queue"
            sublabel="Drag & drop or browse — processed locally in your browser"
          />
        </div>

        {anyLarge && (
          <p
            role="status"
            className="max-w-2xl mx-auto text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2"
          >
            One or more files exceed 50 MB. Files are processed one at a time to protect memory, but very
            large PDFs may take a while or fail on low-memory devices.
          </p>
        )}

        {notice && (
          <p role="status" className="max-w-2xl mx-auto text-[11px] font-medium text-[#5C554F] dark:text-[#A39991] text-center">
            {notice}
          </p>
        )}

        {/* ===== Queue panel ===== */}
        {items.length > 0 && (
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-[#141213] dark:text-[#F5F0EB]">
                Batch Queue ({items.length} PDF{items.length !== 1 ? 's' : ''})
              </span>
              <span className="flex flex-wrap items-center gap-2 text-[11px] font-medium" aria-label={`Queue summary: ${counts.queued} queued, ${counts.completed} completed, ${counts.failed} failed`}>
                <span className="text-[#5C554F] dark:text-[#A39991]">{counts.queued} queued</span>
                <span className="text-emerald-700 dark:text-emerald-400">{counts.completed} done</span>
                {counts.failed > 0 && <span className="text-red-600 dark:text-red-400">{counts.failed} failed</span>}
                {counts.cancelled > 0 && <span className="text-[#5C554F] dark:text-[#A39991]">{counts.cancelled} cancelled</span>}
              </span>
            </div>

            <ul
              className="max-h-72 overflow-y-auto rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2]/50 dark:bg-[#141213]/50 divide-y divide-[#E5DFD4] dark:divide-[#2E2729]"
              aria-label="Batch file queue"
            >
              {items.map((it) => (
                <li
                  key={it.id}
                  className="p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3"
                  aria-label={`${it.file.name}, ${it.status}${it.error ? `, ${it.error}` : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {it.status === 'completed' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
                      {it.status === 'failed' && <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />}
                      {it.status === 'processing' && <Loader2 className="w-4 h-4 shrink-0 text-[#6D1F35] dark:text-[#C6A15B] animate-spin" aria-hidden="true" />}
                      {it.status === 'cancelled' && <XCircle className="w-4 h-4 shrink-0 text-[#5C554F] dark:text-[#A39991]" aria-hidden="true" />}
                      {it.status === 'queued' && <div className="w-4 h-4 shrink-0 rounded-full border-2 border-[#E5DFD4] dark:border-[#2E2729]" aria-hidden="true" />}
                      <p className="truncate text-xs font-medium text-[#141213] dark:text-[#F5F0EB]">{it.file.name}</p>
                    </div>

                    {/* Compact status line */}
                    <p className="mt-0.5 text-[11px] text-[#5C554F] dark:text-[#A39991] truncate">
                      {it.status === 'queued' && 'Waiting in queue'}
                      {it.status === 'processing' && `Processing… ${it.progress}%`}
                      {it.status === 'cancelled' && 'Cancelled — retry when ready'}
                      {it.status === 'failed' && `Failed: ${it.error}`}
                      {it.status === 'completed' && it.outputName && (
                        <>
                          {formatBytes(it.finalSize ?? 0)} · {formatDuration(it.durationMs ?? 0)}
                          {it.finalSize !== undefined && it.finalSize < it.file.size && (
                            <span className="text-emerald-700 dark:text-emerald-400"> · saved {Math.round((1 - it.finalSize / it.file.size) * 100)}%</span>
                          )}
                          <span className="hidden sm:inline"> · {it.outputName}</span>
                        </>
                      )}
                    </p>

                    {/* Individual progress bar */}
                    {it.status === 'processing' && (
                      <div
                        className="mt-1.5 h-1.5 rounded-full bg-[#E5DFD4] dark:bg-[#2E2729] overflow-hidden"
                        role="progressbar"
                        aria-valuenow={it.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Progress for ${it.file.name}`}
                      >
                        <div
                          className="h-full rounded-full bg-[#6D1F35] dark:bg-[#C6A15B] transition-[width] duration-300 motion-reduce:transition-none"
                          style={{ width: `${it.progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Row actions — all ≥44px touch targets */}
                  <div className="flex items-center gap-1 shrink-0">
                    {it.status === 'completed' && (
                      <button
                        onClick={() => downloadItem(it)}
                        aria-label={`Download ${it.outputName}`}
                        className="min-h-11 min-w-11 p-2 rounded-lg text-[#6D1F35] dark:text-[#C6A15B] hover:bg-[#6D1F35]/10 dark:hover:bg-[#C6A15B]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D1F35] flex items-center justify-center"
                      >
                        <Download className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                    {(it.status === 'failed' || it.status === 'cancelled') && !isRunning && (
                      <button
                        onClick={() => retryItem(it.id)}
                        aria-label={`Retry ${it.file.name}`}
                        className="min-h-11 min-w-11 p-2 rounded-lg text-[#6D1F35] dark:text-[#C6A15B] hover:bg-[#6D1F35]/10 dark:hover:bg-[#C6A15B]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D1F35] flex items-center justify-center"
                      >
                        <RotateCw className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                    {it.status === 'processing' && (
                      <button
                        onClick={() => cancelItem(it.id)}
                        aria-label={`Cancel ${it.file.name}`}
                        className="min-h-11 min-w-11 p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 flex items-center justify-center"
                      >
                        <XCircle className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                    {it.status !== 'processing' && (
                      <button
                        onClick={() => removeItem(it.id)}
                        aria-label={`Remove ${it.file.name} from queue`}
                        className="min-h-11 min-w-11 p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {/* Sticky action area (mobile bottom-friendly) */}
            <div className="sticky bottom-3 sm:bottom-auto flex flex-wrap items-center justify-center gap-2 p-3 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white/95 dark:bg-[#1A1718]/95 backdrop-blur shadow-sm">
              {!isRunning ? (
                <button
                  onClick={handleStart}
                  disabled={counts.queued + counts.cancelled === 0}
                  className="min-h-11 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6D1F35] dark:bg-[#C6A15B] text-white dark:text-[#141213] text-xs font-bold disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D1F35]"
                >
                  <Play className="w-4 h-4" aria-hidden="true" />
                  Process Queue
                </button>
              ) : (
                <button
                  onClick={handleStopAll}
                  className="min-h-11 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  <XCircle className="w-4 h-4" aria-hidden="true" />
                  Stop Batch
                </button>
              )}

              {counts.completed > 0 && (
                <>
                  <button
                    onClick={downloadAllIndividually}
                    className="min-h-11 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] text-[#141213] dark:text-[#F5F0EB] text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D1F35]"
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                    Download All
                  </button>
                  <button
                    onClick={downloadZip}
                    disabled={zipBuilding}
                    className="min-h-11 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] text-[#141213] dark:text-[#F5F0EB] text-xs font-bold disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D1F35]"
                  >
                    {zipBuilding ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Package className="w-4 h-4" aria-hidden="true" />}
                    Download as ZIP
                  </button>
                  <button
                    onClick={processAgain}
                    disabled={isRunning}
                    className="min-h-11 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] text-[#141213] dark:text-[#F5F0EB] text-xs font-bold disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D1F35]"
                  >
                    <RotateCw className="w-4 h-4" aria-hidden="true" />
                    Process Again
                  </button>
                </>
              )}

              <button
                onClick={clearCompleted}
                disabled={counts.completed === 0 || isRunning}
                className="min-h-11 px-4 py-2.5 rounded-xl text-xs font-bold text-[#5C554F] dark:text-[#A39991] hover:text-[#141213] dark:hover:text-[#F5F0EB] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D1F35]"
              >
                Clear Completed
              </button>
              <button
                onClick={clearAll}
                disabled={isRunning}
                className="min-h-11 px-4 py-2.5 rounded-xl text-xs font-bold text-red-600 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Clear All
              </button>
            </div>

            <p className="text-[10px] text-center text-[#5C554F] dark:text-[#A39991]">
              Refreshing this page clears the queue — download your results before leaving.
              Outputs are held in memory only; nothing is uploaded, and files aren&apos;t persisted after refresh.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
