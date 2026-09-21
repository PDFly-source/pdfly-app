'use client';

import React, { useMemo, useRef, useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { PdfPreviewModal } from '@/components/toolkit/PdfPreviewModal';
import { FileNameInput } from '@/components/toolkit/FileNameInput';
import {
  DocumentAnalysisCard,
} from '@/components/workflow/DocumentAnalysisCard';
import {
  WorkflowStepCard,
  STEP_TYPE_LABELS,
} from '@/components/workflow/WorkflowStepCard';
import { StepSettingsSheet } from '@/components/workflow/StepSettingsSheet';
import {
  DryRunModal,
  ExecutionView,
  WorkflowResultView,
  type ExecutionStepState,
  type WorkflowResultData,
} from '@/components/workflow/WorkflowRunViews';
import {
  RecipesPanel,
  ConditionSheet,
} from '@/components/workflow/RecipesPanel';
import {
  analyzeDocument,
  buildRecommendation,
  buildOutputFileName,
  defaultStepOptions,
  dryRunWorkflow,
  executeWorkflow,
  newStepId,
  validateWorkflow,
  WorkflowCancelledError,
  WorkflowStepError,
  type DocumentAnalysis,
  type DryRunReport,
  type NameMode,
  type StepType,
  type WorkflowStep,
} from '@/lib/workflow-engine';
import {
  saveRecipe,
  addHistory,
} from '@/lib/workflow-storage';
import { addRecentJob } from '@/lib/recent-jobs';
import { formatBytes, triggerDownload } from '@/lib/pdf-engine';
import {
  Workflow,
  Plus,
  Play,
  AlertCircle,
  ShieldCheck,
  Eye,
  Loader2,
  FileStack,
  Save,
  X,
} from 'lucide-react';

const STEP_TYPES: StepType[] = [
  'remove-blank',
  'rotate',
  'organize',
  'ocr',
  'compress',
  'watermark',
  'page-numbers',
  'sanitize',
];

export const WorkflowBuilderWorkspace: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStatus, setAnalyzeStatus] = useState('');
  const [analyzePct, setAnalyzePct] = useState(0);

  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [workflowName, setWorkflowName] = useState('My Workflow');
  const [recommendationDismissed, setRecommendationDismissed] = useState(false);

  const [settingsStepId, setSettingsStepId] = useState<string | null>(null);
  const [conditionStepId, setConditionStepId] = useState<string | null>(null);
  const [dryRunReport, setDryRunReport] = useState<DryRunReport | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const [phase, setPhase] = useState<'setup' | 'running' | 'done' | 'error'>('setup');
  const [execStates, setExecStates] = useState<ExecutionStepState[]>([]);
  const [execStatus, setExecStatus] = useState('');
  const [execPct, setExecPct] = useState(0);
  const [execError, setExecError] = useState<{ stepName: string; reason: string; stepId: string } | null>(null);
  const cancelRef = useRef(false);

  const [result, setResult] = useState<WorkflowResultData | null>(null);
  const [batchResults, setBatchResults] = useState<
    { fileName: string; blob: Blob; pages: number; ok: boolean; error?: string }[]
  >([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [nameMode, setNameMode] = useState<NameMode>('original');
  const [customName, setCustomName] = useState('PDFly_Workflow_Output');
  const [includeDate, setIncludeDate] = useState(false);

  const [saveSheetOpen, setSaveSheetOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [storageKey, setStorageKey] = useState(0);

  const primaryFile = files[0] || null;
  const recommendation = useMemo(
    () => (analysis ? buildRecommendation(analysis) : null),
    [analysis]
  );
  const validation = useMemo(
    () => (analysis ? validateWorkflow(steps, analysis) : []),
    [steps, analysis]
  );
  const hasBlockingErrors = validation.some((v) => v.level === 'error');
  const validationByStep = useMemo(() => {
    const map: Record<string, (typeof validation)[number]> = {};
    validation.forEach((v) => (map[v.stepId] = v));
    return map;
  }, [validation]);

  // ---------- input & analysis ----------
  const handleFilesSelected = async (selected: File[]) => {
    if (!selected || selected.length === 0) return;
    setFiles(selected);
    setAnalysis(null);
    setRecommendationDismissed(false);
    setPhase('setup');
    setResult(null);
    setBatchResults([]);
    setAnalyzing(true);
    setAnalyzePct(5);
    setAnalyzeStatus('Opening document locally…');
    try {
      const a = await analyzeDocument(selected[0], (s, p) => {
        setAnalyzeStatus(s);
        setAnalyzePct(p);
      });
      setAnalysis(a);
    } catch (err: any) {
      setAnalyzing(false);
      setFiles([]);
      setExecError({
        stepName: 'Document Analysis',
        reason: err?.message?.includes('password')
          ? 'This PDF is password-protected. Unlock it with the Unlock PDF tool first, then bring it back.'
          : err?.message || 'Could not open this document. It may be corrupted or not a valid PDF.',
        stepId: '',
      });
      return;
    }
    setAnalyzing(false);
  };

  // ---------- step management ----------
  const addStep = (type: StepType) => {
    setSteps((prev) => [
      ...prev,
      { id: newStepId(), type, enabled: true, options: defaultStepOptions(type) },
    ]);
  };

  const updateStepOptions = (id: string, options: Record<string, any>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, options } : s)));
  };

  const toggleEnabled = (id: string) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));

  const duplicateStep = (id: string) =>
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const copy = { ...prev[idx], id: newStepId(), options: JSON.parse(JSON.stringify(prev[idx].options)) };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });

  const deleteStep = (id: string) => setSteps((prev) => prev.filter((s) => s.id !== id));

  const reorderStep = (from: number, to: number) => {
    if (from < 0 || from >= steps.length) return;
    setSteps((prev) => {
      const next = [...prev];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });
  };

  const setCondition = (stepId: string, condition: any) => {
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, condition } : s)));
  };

  const loadSteps = (loaded: WorkflowStep[], name: string) => {
    setSteps(loaded.map((s) => ({ ...s, id: s.id || newStepId() })));
    setWorkflowName(name);
  };

  // ---------- dry run ----------
  const runDryRun = async () => {
    if (!analysis) return;
    const report = await dryRunWorkflow(steps, analysis);
    setDryRunReport(report);
  };

  // ---------- execution ----------
  const runWorkflow = async () => {
    if (!primaryFile || !analysis || steps.length === 0 || hasBlockingErrors) return;

    cancelRef.current = false;
    setExecError(null);
    setPhase('running');
    setExecPct(0);
    setExecStatus('Preparing pipeline…');
    setExecStates(
      steps.map((s) => ({
        name: STEP_TYPE_LABELS[s.type],
        status: s.enabled ? 'pending' : 'skipped',
        detail: s.enabled ? undefined : 'Step disabled',
      }))
    );

    const makeEvents = (offset: number, span: number, label: string) => ({
      onStepStart: (i: number, name: string) => {
        setExecStates((prev) => prev.map((s, si) => (si === i ? { ...s, status: 'running' } : s)));
        setExecStatus(`${label}${name}…`);
      },
      onStepProgress: (i: number, status: string, pct: number) => {
        setExecStatus(`${label}${status}`);
        setExecPct(offset + Math.round((pct / 100) * span));
      },
      onStepDone: (i: number, outcome: any) => {
        setExecStates((prev) =>
          prev.map((s, si) =>
            si === i ? { ...s, status: outcome.status === 'failed' ? 'failed' : outcome.status, detail: outcome.detail } : s
          )
        );
      },
      shouldCancel: () => cancelRef.current,
    });

    try {
      if (files.length === 1) {
        const res = await executeWorkflow(primaryFile, steps, analysis, makeEvents(0, 100, ''));
        const outName = buildOutputFileName(nameMode, workflowName, primaryFile.name, customName, includeDate);

        setExecPct(100);
        setPhase('done');
        setResult({
          fileName: outName,
          blob: res.blob,
          pagesBefore: res.pagesBefore,
          pagesAfter: res.pagesAfter,
          sizeBefore: analysis.fileSize,
          sizeAfter: res.blob.size,
          durationMs: res.durationMs,
          outcomes: res.outcomes,
          warnings: [],
        });
        addRecentJob({
          toolId: 'workflow-builder',
          toolName: 'Workflow Builder',
          fileName: outName,
          fileSize: res.blob.size,
          status: 'completed',
        });
        addHistory({
          workflowName,
          fileName: outName,
          pagesBefore: res.pagesBefore,
          pagesAfter: res.pagesAfter,
          sizeBefore: analysis.fileSize,
          sizeAfter: res.blob.size,
          durationMs: res.durationMs,
          stepCount: res.outcomes.filter((o) => o.status === 'completed').length,
        });
        setStorageKey((k) => k + 1);
      } else {
        // ---------- BATCH ----------
        const outputs: typeof batchResults = [];
        for (let fi = 0; fi < files.length; fi++) {
          if (cancelRef.current) throw new WorkflowCancelledError([]);
          const f = files[fi];
          setExecStatus(`File ${fi + 1} of ${files.length}: analyzing “${f.name}”…`);
          setExecPct(Math.round((fi / files.length) * 100));

          let fileAnalysis: DocumentAnalysis;
          try {
            fileAnalysis = await analyzeDocument(f, undefined, false);
          } catch (err: any) {
            outputs.push({ fileName: f.name, blob: new Blob(), pages: 0, ok: false, error: err?.message || 'Could not open file' });
            continue;
          }

          try {
            const res = await executeWorkflow(
              f,
              steps,
              fileAnalysis,
              {
                ...makeEvents(0, 0, `File ${fi + 1}/${files.length}: `),
                onStepProgress: (i, status) => setExecStatus(`File ${fi + 1}/${files.length}: ${status}`),
              }
            );
            outputs.push({ fileName: buildOutputFileName(nameMode, workflowName, f.name, customName, includeDate), blob: res.blob, pages: res.pagesAfter, ok: true });
            addHistory({
              workflowName,
              fileName: f.name,
              pagesBefore: res.pagesBefore,
              pagesAfter: res.pagesAfter,
              sizeBefore: f.size,
              sizeAfter: res.blob.size,
              durationMs: res.durationMs,
              stepCount: res.outcomes.filter((o) => o.status === 'completed').length,
            });
          } catch (err: any) {
            outputs.push({ fileName: f.name, blob: new Blob(), pages: 0, ok: false, error: err?.message || 'Processing failed' });
          }
          setBatchResults([...outputs]);
        }

        setExecPct(100);
        setPhase('done');
        setResult(null);
        setStorageKey((k) => k + 1);
        const okCount = outputs.filter((o) => o.ok).length;
        if (okCount > 0) {
          addRecentJob({
            toolId: 'workflow-builder',
            toolName: 'Workflow Builder',
            fileName: `${okCount} file(s) processed`,
            fileSize: outputs.filter((o) => o.ok).reduce((s, o) => s + o.blob.size, 0),
            status: 'completed',
          });
        }
      }
    } catch (err: any) {
      if (err instanceof WorkflowCancelledError) {
        setPhase('setup');
        setExecStatus('Cancelled. No output was saved.');
        return;
      }
      if (err instanceof WorkflowStepError) {
        const stepId = steps[err.stepIndex]?.id || '';
        setExecError({ stepName: err.stepName, reason: err.reason, stepId });
        setExecStates((prev) =>
          prev.map((s, si) => (si === err.stepIndex ? { ...s, status: 'failed', detail: err.reason } : s))
        );
      } else {
        setExecError({ stepName: 'Pipeline', reason: err?.message || 'Unexpected error during local processing.', stepId: '' });
      }
      setPhase('error');
    }
  };

  const resetAll = () => {
    setFiles([]);
    setAnalysis(null);
    setSteps([]);
    setPhase('setup');
    setResult(null);
    setBatchResults([]);
    setExecError(null);
    setPreviewUrl((u) => {
      if (u) URL.revokeObjectURL(u);
      return null;
    });
  };

  const openPreview = (blob: Blob, name: string) => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
  };

  const shareResult = async (blob: Blob, name: string) => {
    try {
      const file = new File([blob], name, { type: 'application/pdf' });
      if (navigator.share && (navigator as any).canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: name });
      } else {
        await navigator.share({ title: name, text: `${name} — processed locally with PDFly` });
      }
    } catch {
      /* user cancelled */
    }
  };

  const downloadAllBatch = async () => {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    const used = new Set<string>();
    for (const o of batchResults.filter((b) => b.ok)) {
      let name = o.fileName;
      let n = 2;
      while (used.has(name)) name = o.fileName.replace(/(\.pdf)?$/i, `_${n++}.pdf`);
      used.add(name);
      zip.file(name, o.blob);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    triggerDownload(blob, 'PDFly_Workflow_Batch.zip');
  };

  // ============ RENDER ============

  // Error loading document
  if (files.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#6D1F35]/10 dark:bg-[#C9A15B]/10 text-[#6D1F35] dark:text-[#C9A15B] flex items-center justify-center mx-auto mb-4">
            <Workflow className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5F0EB] mb-2">
            PDF Workflow Engine
          </h2>
          <p className="text-xs sm:text-sm text-[#5C554F] dark:text#[#A39991] text-[#5C554F] dark:text-[#A39991] mb-6">
            Analyze a document, get a smart recommendation, and build a local automation pipeline.
          </p>
        </div>

        {execError && files.length === 0 && (
          <div className="mb-2 flex items-center gap-2.5 p-3.5 rounded-xl bg-[#C94A4A]/10 border border-[#C94A4A]/25 text-[#C94A4A] text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{execError.stepName}: {execError.reason}</span>
          </div>
        )}

        <FileDropzone
          onFilesSelected={handleFilesSelected}
          multiple={true}
          accept=".pdf,application/pdf"
          label="Choose PDF File(s)"
          sublabel="One file or a whole batch — analyzed 100% locally in your browser."
        />

        <RecipesPanel onLoadSteps={(s, name) => {
          loadSteps(s, name);
          setSaveName(name);
        }} refreshKey={storageKey} />

        <p className="text-[11px] text-[#5C554F] dark:text-[#A39991] text-center inline-flex items-center gap-1.5 w-full justify-center">
          <ShieldCheck className="w-3.5 h-3.5 text-[#35C98A]" />
          Zero cloud uploads. Documents never leave your device.
        </p>
      </div>
    );
  }

  // Running
  if (phase === 'running') {
    return (
      <div className="max-w-2xl mx-auto">
        <ExecutionView
          steps={execStates}
          currentStatus={execStatus}
          progressPct={execPct}
          error={null}
          onCancel={() => {
            cancelRef.current = true;
          }}
        />
        <p className="mt-4 text-[11px] text-[#5C554F] dark:text-[#A39991] text-center">
          Processing {files.length > 1 ? `${files.length} documents sequentially (memory-safe)` : 'your document'} entirely on this device.
        </p>
      </div>
    );
  }

  if (phase === "error" && execError) {
    return (
      <div className="max-w-2xl mx-auto">
        <ExecutionView
          steps={execStates}
          currentStatus={execStatus}
          progressPct={execPct}
          error={execError}
          onFixSettings={() => {
            if (execError.stepId) {
              setSettingsStepId(execError.stepId);
            } else {
              setPhase('setup');
              setExecError(null);
            }
          }}
          onRetry={() => {
            setExecError(null);
            setPhase('setup');
          }}
          onCancel={() => {
            setPhase('setup');
            setExecError(null);
          }}
        />
      </div>
    );
  }

  // Done — single result
  if (phase === 'done' && result) {
    return (
      <>
        <WorkflowResultView
          result={result}
          onDownload={() => triggerDownload(result.blob, result.fileName)}
          onPreview={() => openPreview(result.blob, result.fileName)}
          onShare={() => shareResult(result.blob, result.fileName)}
          onRename={(name) => setResult({ ...result, fileName: name.endsWith('.pdf') ? name : `${name}.pdf` })}
          onSaveRecipe={() => {
            setSaveName(workflowName);
            setSaveSheetOpen(true);
          }}
          onRunAgain={() => {
            setPhase('setup');
            setResult(null);
          }}
          onReset={resetAll}
        />
        <PdfPreviewModal
          isOpen={!!previewUrl}
          onClose={() => setPreviewUrl((u) => {
            if (u) URL.revokeObjectURL(u);
            return null;
          })}
          title={result.fileName}
          blobUrl={previewUrl || undefined}
        />
        {saveSheetOpen && (
          <SaveNameSheet
            initial={saveName || workflowName}
            onSave={(name) => {
              saveRecipe(name, steps);
              setWorkflowName(name);
              setSaveSheetOpen(false);
              setStorageKey((k) => k + 1);
            }}
            onClose={() => setSaveSheetOpen(false)}
          />
        )}
      </>
    );
  }

  // Done — batch result
  if (phase === 'done' && batchResults.length > 0) {
    const okCount = batchResults.filter((b) => b.ok).length;
    return (
      <div className="rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] p-6 sm:p-8 shadow-xl animate-in zoom-in-95 duration-200">
        <div className="text-center mb-5">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#35C98A]/10 text-[#35C98A] flex items-center justify-center">
            <FileStack className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-[#1A1416] dark:text-[#F7F1E8] uppercase tracking-wide">
            Batch Complete
          </h2>
          <p className="text-xs text-[#5C554F] dark:text-[#A39991] mt-1">
            {okCount} of {batchResults.length} file(s) processed locally
          </p>
        </div>

        <ul className="space-y-2 mb-5">
          {batchResults.map((b, i) => (
            <li key={i} className={`flex items-center justify-between gap-3 p-3 rounded-xl border text-xs ${b.ok ? 'border-[#35C98A]/25 bg-[#35C98A]/5' : 'border-[#C94A4A]/25 bg-[#C94A4A]/5'}`}>
              <div className="min-w-0">
                <p className="font-bold text-[#141213] dark:text-[#F5F0EB] truncate">{b.fileName}</p>
                <p className={`text-[11px] ${b.ok ? 'text-[#258B5C]' : 'text-[#C94A4A]'}`}>
                  {b.ok ? `${b.pages} pages · ${formatBytes(b.blob.size)}` : b.error}
                </p>
              </div>
              {b.ok && (
                <button
                  onClick={() => triggerDownload(b.blob, b.fileName)}
                  className="px-3 py-2 rounded-xl bg-[#6D1F35] text-white text-[11px] font-bold shrink-0"
                >
                  Download
                </button>
              )}
            </li>
          ))}
        </ul>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            onClick={downloadAllBatch}
            className="w-full sm:w-auto flex-1 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] text-xs font-bold border border-[#C9A15A]/40"
          >
            Download All (ZIP)
          </button>
          <button
            onClick={() => {
              setPhase('setup');
              setBatchResults([]);
            }}
            className="w-full sm:w-auto px-5 py-3.5 rounded-xl border border-[#E8DFD3] dark:border-[#2E2629] text-xs font-bold text-[#1A1416] dark:text-[#F7F1E8]"
          >
            Run Again
          </button>
          <button
            onClick={resetAll}
            className="w-full sm:w-auto px-5 py-3.5 rounded-xl text-xs font-semibold text-[#5C554F] dark:text-[#A39991]"
          >
            New Workflow
          </button>
        </div>
      </div>
    );
  }

  // ============ SETUP ============
  const settingsStep = steps.find((s) => s.id === settingsStepId) || null;

  return (
    <div className="space-y-6">
      {/* File header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729]">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[#141213] dark:text-[#F5F0EB] truncate inline-flex items-center gap-2">
            {files.length > 1 && <FileStack className="w-4 h-4 text-[#6D1F35] dark:text-[#C9A15A]" />}
            {files.length > 1 ? `${files.length} documents (batch)` : primaryFile?.name}
          </h3>
          <p className="text-xs text-[#5C554F] dark:text-[#A39991]">
            {files.length > 1
              ? `The workflow will run on each document sequentially.`
              : primaryFile
                ? `${formatBytes(primaryFile.size)}`
                : ''}
          </p>
        </div>
        <button
          onClick={resetAll}
          className="px-3 py-2 rounded-xl text-xs text-[#C94A4A] hover:bg-[#C94A4A]/10"
        >
          Change File(s)
        </button>
      </div>

      {/* Analyzing */}
      {analyzing && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729]">
          <p className="text-xs font-bold text-[#141213] dark:text-[#F5F0EB] inline-flex items-center gap-2 mb-3">
            <Loader2 className="w-4 h-4 animate-spin text-[#6D1F35] dark:text-[#C9A15A]" />
            Analyzing document locally…
          </p>
          <div className="h-2 rounded-full bg-[#F7F3EC] dark:bg-[#141213] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#7A1635] to-[#C9A15A] transition-all" style={{ width: `${Math.max(4, analyzePct)}%` }} />
          </div>
          <p className="text-[11px] text-[#5C554F] dark:text-[#A39991] mt-2">{analyzeStatus}</p>
        </div>
      )}

      {/* Analysis + recommendation */}
      {analysis && recommendation && !recommendationDismissed && (
        <DocumentAnalysisCard
          analysis={analysis}
          recommendation={recommendation}
          onApplyRecommended={() => {
            setSteps(
              recommendation.steps.map((s) => ({
                id: newStepId(),
                type: s.type,
                enabled: true,
                options: { ...defaultStepOptions(s.type), ...s.options },
              }))
            );
            setWorkflowName('✨ Optimized Workflow');
            setRecommendationDismissed(true);
          }}
          onCustomize={() => setRecommendationDismissed(true)}
          onDismiss={() => setRecommendationDismissed(true)}
        />
      )}

      {/* Pipeline editor */}
      <div className="rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#141213] dark:text-[#F5F0EB]">Pipeline ({steps.length} step{steps.length === 1 ? '' : 's'})</h3>
          <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">Drag to reorder · tap ⚙ to configure</p>
        </div>

        {steps.length === 0 ? (
          <p className="text-[11px] text-[#5C554F] dark:text-[#A39991] p-3 rounded-xl border border-dashed border-[#E5DFD4] dark:border-[#2E2729] mb-3">
            No steps yet. Apply the recommended workflow above, load a template below, or add steps manually.
          </p>
        ) : (
          <ol className="space-y-2.5">
            {steps.map((s, i) => (
              <WorkflowStepCard
                key={s.id}
                step={s}
                index={i}
                total={steps.length}
                validation={validationByStep[s.id]}
                onReorder={reorderStep}
                onDragStartStep={setDraggingIdx}
                onDropStep={(to) => {
                  if (draggingIdx !== null && draggingIdx !== to) reorderStep(draggingIdx, to);
                  setDraggingIdx(null);
                }}
                onToggleEnabled={toggleEnabled}
                onDuplicate={duplicateStep}
                onDelete={deleteStep}
                onConfigure={setSettingsStepId}
                onSetCondition={setConditionStepId}
              />
            ))}
          </ol>
        )}

        {/* Add step */}
        <div className="mt-4 pt-4 border-t border-[#E5DFD4] dark:border-[#2E2729]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5C554F] dark:text-[#A39991] mb-2 inline-flex items-center gap-1.5">
            <Plus className="w-3 h-3" />
            Add step
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STEP_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => addStep(t)}
                className="px-3 py-2.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] text-[11px] font-bold text-[#141213] dark:text-[#F5F0EB] hover:border-[#6D1F35] hover:bg-[#6D1F35]/5 dark:hover:border-[#C9A15A] transition-all"
              >
                {STEP_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Validation summary */}
      {steps.length > 0 && (
        <div className={`p-4 rounded-2xl border ${hasBlockingErrors ? 'bg-[#C94A4A]/10 border-[#C94A4A]/25' : 'bg-[#35C98A]/5 border-[#35C98A]/25'}`}>
          <p className="text-xs font-bold mb-1.5 text-[#141213] dark:text-[#F5F0EB]">Pre-run validation</p>
          {hasBlockingErrors ? (
            validation
              .filter((v) => v.level === 'error')
              .map((v) => (
                <p key={v.stepId} className="text-[11px] text-[#C94A4A] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {STEP_TYPE_LABELS[steps.find((s) => s.id === v.stepId)?.type || 'compress']}: {v.message}
                </p>
              ))
          ) : (
            <p className="text-[11px] text-[#258B5C] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              All configured steps look valid. {validation.length > 0 && 'Dry Run shows the expected effect.'}
            </p>
          )}
        </div>
      )}

      {/* Output settings */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729]">
        <h3 className="text-sm font-bold text-[#141213] dark:text-[#F5F0EB] mb-3">Output Name</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {([
            ['original', 'Keep original'],
            ['smart', 'Smart name'],
            ['workflow', 'Workflow name'],
            ['custom', 'Custom'],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setNameMode(mode)}
              className={`px-3 py-2.5 rounded-xl text-[11px] font-bold border transition-all ${
                nameMode === mode
                  ? 'border-[#6D1F35] bg-[#6D1F35]/10 text-[#6D1F35] dark:text-[#C9A15A] dark:border-[#C9A15A]'
                  : 'border-[#E5DFD4] dark:border-[#2E2729] text-[#5C554F] dark:text-[#A39991]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {nameMode === 'custom' && primaryFile && (
          <div className="mb-3">
            <FileNameInput
              label="File Name"
              value={customName}
              onChange={setCustomName}
              onSuggest={() =>
                buildOutputFileName('smart', workflowName, primaryFile.name, '', false).replace(/\.pdf$/i, '')
              }
              extension=".pdf"
              hint="Smart suggestion is derived locally from the original file name."
            />
          </div>
        )}

        <label className="flex items-center gap-2.5 text-xs font-medium text-[#141213] dark:text-[#F5F0EB]">
          <input
            type="checkbox"
            checked={includeDate}
            onChange={(e) => setIncludeDate(e.target.checked)}
            className="w-4 h-4 rounded accent-[#6D1F35]"
          />
          Append today&apos;s date
        </label>

        {primaryFile && (
          <p className="mt-2 text-[11px] text-[#5C554F] dark:text-[#A39991]">
            Preview: <span className="font-bold text-[#141213] dark:text-[#F5F0EB]">
              {buildOutputFileName(nameMode, workflowName, primaryFile.name, customName, includeDate)}
            </span>
          </p>
        )}
      </div>

      {/* Templates / recipes / history */}
      <RecipesPanel onLoadSteps={(s, name) => { loadSteps(s, name); setSaveName(name); }} refreshKey={storageKey} />

      {/* Sticky action bar */}
      <div className="sticky bottom-4 z-30 p-4 rounded-2xl bg-[#F7F3EC]/90 dark:bg-[#141213]/90 backdrop-blur-md border border-[#E5DFD4] dark:border-[#2E2729] shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-xs text-[#5C554F] dark:text-[#A39991] inline-flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#35C98A]" />
          Runs 100% locally. Zero cloud uploads.
        </span>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={runDryRun}
            disabled={steps.length === 0 || !analysis}
            className="flex-1 sm:flex-none px-4 py-3 rounded-xl border border-[#C9A15A]/40 bg-[#C9A15A]/10 text-[#8A6D2F] dark:text-[#C9A15A] text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <Eye className="w-4 h-4" />
            <span>Preview Workflow</span>
          </button>
          <button
            id="action-run-workflow-btn"
            onClick={() => runWorkflow()}
            disabled={steps.length === 0 || !analysis || hasBlockingErrors || analyzing}
            className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] text-sm font-bold inline-flex items-center justify-center gap-2 border border-[#C9A15A]/40 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all active:scale-[0.98]"
          >
            <Play className="w-4 h-4 text-[#C9A15A]" />
            <span>Run Workflow</span>
          </button>
        </div>
      </div>

      {/* Sheets */}
      {settingsStep && analysis && (
        <StepSettingsSheet
          step={settingsStep}
          analysis={analysis}
          file={primaryFile}
          onChange={(opts) => updateStepOptions(settingsStep.id, opts)}
          onClose={() => setSettingsStepId(null)}
        />
      )}

      {conditionStepId && (
        <ConditionSheet
          stepId={conditionStepId}
          current={steps.find((s) => s.id === conditionStepId)?.condition}
          onSave={setCondition}
          onClose={() => setConditionStepId(null)}
        />
      )}

      {dryRunReport && <DryRunModal report={dryRunReport} onClose={() => setDryRunReport(null)} />}

    </div>
  );
};

// ---------- Save-name mini sheet ----------
const SaveNameSheet: React.FC<{ initial: string; onSave: (name: string) => void; onClose: () => void }> = ({ initial, onSave, onClose }) => {
  const [name, setName] = useState(initial);
  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] p-5 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] inline-flex items-center gap-2">
            <Save className="w-4 h-4 text-[#6D1F35] dark:text-[#C9A15A]" />
            Save Workflow
          </h3>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[#5C554F] dark:text-[#A39991]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSave(name)}
          aria-label="Workflow name"
          className="w-full px-3 py-2.5 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs font-bold text-[#141213] dark:text-[#F5F0EB] outline-none focus:border-[#6D1F35]/50 mb-3"
          placeholder="e.g. Study Notes Cleanup"
        />
        <button
          onClick={() => onSave(name)}
          className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] text-xs font-bold border border-[#C9A15A]/40"
        >
          Save to this device
        </button>
        <p className="mt-2 text-[10px] text-[#5C554F] dark:text-[#A39991]">
          Stored locally in your browser. Never uploaded.
        </p>
      </div>
    </div>
  );
};
