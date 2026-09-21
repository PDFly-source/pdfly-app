'use client';

import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, MinusCircle, ShieldCheck, Clock, Download, Share2, RefreshCw, Eye } from 'lucide-react';
import { formatBytes } from '@/lib/pdf-engine';
import type { DryRunReport, StepOutcome } from '@/lib/workflow-engine';

// ============ DRY RUN MODAL ============
export const DryRunModal: React.FC<{
  report: DryRunReport;
  onClose: () => void;
}> = ({ report, onClose }) => (
  <div
    className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 p-3"
    role="dialog"
    aria-modal="true"
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
      <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[#FFFDF9] dark:bg-[#1B1719] border-b border-[#E8DFD3] dark:border-[#2E2629]">
        <div>
          <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8]">Dry Run</h3>
          <p className="text-[11px] text-[#258B5C]">No document modification occurs</p>
        </div>
        <button onClick={onClose} aria-label="Close dry run" className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[#5C554F] dark:text-[#A39991]">
          <XCircle className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-[#F7F3EC] dark:bg-[#141213] border border-[#E5DFD4] dark:border-[#2E2729]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5C554F] dark:text-[#A39991]">Input</p>
            <p className="text-sm font-bold text-[#141213] dark:text-[#F5F0EB]">{report.pageCountBefore} pages</p>
            <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">{formatBytes(report.sizeBefore)}</p>
          </div>
          <div className="p-3 rounded-xl bg-[#35C98A]/10 border border-[#35C98A]/25">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#258B5C]">Estimated output</p>
            <p className="text-sm font-bold text-[#258B5C]">{report.estimatedPages} pages</p>
            <p className="text-[11px] text-[#258B5C]/80">{formatBytes(report.estimatedSize)}</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#5C554F] dark:text-[#A39991] mb-2">Expected operations</p>
          <ul className="space-y-2">
            {report.steps.map((s, i) => (
              <li key={`${s.stepId}-${i}`} className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs ${
                !s.enabled
                  ? 'border-[#E5DFD4] dark:border-[#2E2729] bg-[#F7F3EC]/50 dark:bg-[#141213]/50 opacity-60'
                  : !s.conditionMet
                    ? 'border-[#C9A15A]/30 bg-[#C9A15A]/5'
                    : 'border-[#35C98A]/25 bg-[#35C98A]/5'
              }`}>
                {!s.enabled ? (
                  <MinusCircle className="w-4 h-4 text-[#A79B90] shrink-0 mt-0.5" />
                ) : !s.conditionMet ? (
                  <AlertCircle className="w-4 h-4 text-[#C9A15A] shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-[#258B5C] shrink-0 mt-0.5" />
                )}
                <span>
                  <span className="font-bold text-[#141213] dark:text-[#F5F0EB]">{i + 1}. {s.name}</span>
                  {!s.enabled && <span className="text-[#5C554F] dark:text-[#A39991]"> — disabled</span>}
                  {!s.enabled ? null : !s.conditionMet
                    ? <span className="text-[#8A6D2F] dark:text-[#C9A15A]"> — condition not met, will be skipped</span>
                    : <span className="text-[#5C554F] dark:text-[#A39991]"> — {s.description}</span>}
                </span>
              </li>
            ))}
            {report.steps.length === 0 && (
              <li className="text-xs text-[#5C554F] dark:text-[#A39991] p-3 rounded-xl border border-dashed border-[#E5DFD4] dark:border-[#2E2729]">
                No steps in the pipeline yet.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  </div>
);

// ============ EXECUTION VIEW ============
export interface ExecutionStepState {
  name: string;
  status: 'pending' | 'running' | 'done' | 'skipped' | 'failed';
  detail?: string;
  outcome?: StepOutcome;
}

export const ExecutionView: React.FC<{
  steps: ExecutionStepState[];
  currentStatus: string;
  progressPct: number;
  error?: { stepName: string; reason: string } | null;
  onFixSettings?: () => void;
  onRetry?: () => void;
  onCancel?: () => void;
}> = ({ steps, currentStatus, progressPct, error, onFixSettings, onRetry, onCancel }) => (
  <div className="rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] p-5 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-bold text-[#141213] dark:text-[#F5F0EB]">Workflow Running</h3>
      <span className="text-[11px] font-semibold text-[#5C554F] dark:text-[#A39991]">
        {Math.round(progressPct)}%
      </span>
    </div>

    <div className="h-2 rounded-full bg-[#F7F3EC] dark:bg-[#141213] overflow-hidden mb-4">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#7A1635] to-[#C9A15A] transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(3, progressPct))}%` }}
      />
    </div>

    <ul className="space-y-2 mb-4">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-2.5 text-xs">
          {s.status === 'done' ? (
            <CheckCircle2 className="w-4 h-4 text-[#258B5C] shrink-0 mt-0.5" />
          ) : s.status === 'skipped' ? (
            <MinusCircle className="w-4 h-4 text-[#A79B90] shrink-0 mt-0.5" />
          ) : s.status === 'failed' ? (
            <XCircle className="w-4 h-4 text-[#C94A4A] shrink-0 mt-0.5" />
          ) : s.status === 'running' ? (
            <span className="w-4 h-4 shrink-0 mt-0.5 rounded-full border-2 border-[#C9A15A] border-t-transparent animate-spin inline-block" />
          ) : (
            <span className="w-4 h-4 shrink-0 mt-0.5 rounded-full border-2 border-[#E5DFD4] dark:border-[#2E2729] inline-block" />
          )}
          <span className={s.status === 'pending' ? 'text-[#A79B90]' : 'text-[#141213] dark:text-[#F5F0EB]'}>
            <span className="font-semibold">{i + 1}. {s.name}</span>
            {s.detail && <span className="text-[#5C554F] dark:text-[#A39991]"> — {s.detail}</span>}
          </span>
        </li>
      ))}
    </ul>

    {error ? (
      <div className="p-4 rounded-xl bg-[#C94A4A]/10 border border-[#C94A4A]/25">
        <p className="text-xs font-bold text-[#C94A4A] mb-1">Failed step: {error.stepName}</p>
        <p className="text-[11px] text-[#C94A4A]/80 mb-3">Reason: {error.reason}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          {onFixSettings && (
            <button onClick={onFixSettings} className="flex-1 px-4 py-2 rounded-xl bg-[#6D1F35] text-white text-xs font-bold">
              Fix Settings
            </button>
          )}
          {onRetry && (
            <button onClick={onRetry} className="flex-1 px-4 py-2 rounded-xl border border-[#C94A4A]/40 text-[#C94A4A] text-xs font-bold">
              Retry
            </button>
          )}
          {onCancel && (
            <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] text-xs font-bold text-[#5C554F] dark:text-[#A39991]">
              Cancel
            </button>
          )}
        </div>
      </div>
    ) : (
      <p className="text-[11px] text-[#5C554F] dark:text-[#A39991] inline-flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-[#35C98A]" />
        {currentStatus || 'Processing locally in your browser…'}
      </p>
    )}
  </div>
);

// ============ RESULT VIEW ============
export interface WorkflowResultData {
  fileName: string;
  blob: Blob;
  pagesBefore: number;
  pagesAfter: number;
  sizeBefore: number;
  sizeAfter: number;
  durationMs: number;
  outcomes: StepOutcome[];
  warnings: string[];
}

export const WorkflowResultView: React.FC<{
  result: WorkflowResultData;
  onDownload: () => void;
  onPreview: () => void;
  onShare: () => void;
  onRename: (name: string) => void;
  onSaveRecipe: () => void;
  onRunAgain: () => void;
  onReset: () => void;
}> = ({ result, onDownload, onPreview, onShare, onRename, onSaveRecipe, onRunAgain, onReset }) => {
  const compressionPct =
    result.sizeBefore > 0 ? Math.max(0, Math.round(((result.sizeBefore - result.sizeAfter) / result.sizeBefore) * 100)) : 0;

  return (
    <div className="rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] p-6 sm:p-8 shadow-xl animate-in zoom-in-95 duration-200">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-[#35C98A]/10 text-[#35C98A] flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-[#1A1416] dark:text-[#F7F1E8] uppercase tracking-wide">Workflow Complete</h2>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5">
        <Stat label="Pages" value={`${result.pagesBefore} → ${result.pagesAfter}`} />
        <Stat label="File size" value={`${formatBytes(result.sizeBefore)} → ${formatBytes(result.sizeAfter)}`} small />
        <Stat label="Processing time" value={`${(result.durationMs / 1000).toFixed(1)}s`} icon={<Clock className="w-3 h-3" />} />
        {compressionPct > 0 && <Stat label="Reduction" value={`${compressionPct}%`} accent />}
        <Stat label="Steps completed" value={String(result.outcomes.filter((o) => o.status === 'completed').length)} />
        <Stat label="Steps skipped" value={String(result.outcomes.filter((o) => o.status === 'skipped').length)} />
      </div>

      {/* Operations log */}
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#5C554F] dark:text-[#A39991] mb-2">Operations</p>
        <ul className="space-y-1.5">
          {result.outcomes.map((o, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              {o.status === 'completed' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#258B5C] shrink-0 mt-0.5" />
              ) : o.status === 'skipped' ? (
                <MinusCircle className="w-3.5 h-3.5 text-[#A79B90] shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-[#C94A4A] shrink-0 mt-0.5" />
              )}
              <span className="text-[#141213] dark:text-[#F5F0EB]">
                <span className="font-semibold">{o.name}</span>
                <span className="text-[#5C554F] dark:text-[#A39991]"> — {o.detail}</span>
              </span>
            </li>
          ))}
        </ul>
        {result.warnings.length > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-[#C9A15A]/10 border border-[#C9A15A]/30">
            {result.warnings.map((w) => (
              <p key={w} className="text-[11px] text-[#8A6D2F] dark:text-[#C9A15A] flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {w}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Privacy audit */}
      <div className="mb-6 p-4 rounded-2xl bg-[#35C98A]/5 border border-[#35C98A]/25">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#258B5C] mb-1.5">Privacy check</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {[
            'No cloud upload',
            'No external document processing',
            'All processing local to your browser',
            'No document transmission',
            'Temporary buffers released',
          ].map((c) => (
            <li key={c} className="text-[11px] text-[#258B5C] flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              {c}
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
        <button
          onClick={onDownload}
          className="w-full sm:w-auto flex-1 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 border border-[#C9A15A]/40 hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <Download className="w-4 h-4 text-[#C9A15A]" />
          <span>Download</span>
        </button>
        <button
          onClick={onPreview}
          className="w-full sm:w-auto px-5 py-3.5 rounded-xl border border-[#C9A15A]/40 bg-[#C9A15A]/10 text-[#8A6D2F] dark:text-[#C9A15A] text-xs font-bold inline-flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" />
          <span>Preview PDF</span>
        </button>
        <button
          onClick={onShare}
          className="w-full sm:w-auto px-5 py-3.5 rounded-xl border border-[#E8DFD3] dark:border-[#2E2629] bg-[#FFFDF9] dark:bg-[#1B1719] text-xs font-bold text-[#1A1416] dark:text-[#F7F1E8] inline-flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </button>
      </div>

      <div className="mt-2.5 flex flex-col sm:flex-row items-center justify-center gap-2.5">
        <button
          onClick={onSaveRecipe}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#E8DFD3] dark:border-[#2E2629] text-xs font-bold text-[#1A1416] dark:text-[#F7F1E8] inline-flex items-center justify-center gap-2 hover:bg-black/5 dark:hover:bg-white/5"
        >
          💾 <span>Save Workflow</span>
        </button>
        <button
          onClick={onRunAgain}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#E8DFD3] dark:border-[#2E2629] text-xs font-bold text-[#1A1416] dark:text-[#F7F1E8] inline-flex items-center justify-center gap-2 hover:bg-black/5 dark:hover:bg-white/5"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Run Again</span>
        </button>
        <button
          onClick={onReset}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-[#5C554F] dark:text-[#A39991] hover:bg-black/5 dark:hover:bg-white/5"
        >
          New Workflow
        </button>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; small?: boolean; accent?: boolean; icon?: React.ReactNode }> = ({ label, value, small, accent, icon }) => (
  <div className={`p-3 rounded-xl border ${accent ? 'bg-[#35C98A]/10 border-[#35C98A]/25' : 'bg-[#F7F3EC] dark:bg-[#141213] border-[#E5DFD4] dark:border-[#2E2729]'}`}>
    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5C554F] dark:text-[#A39991] flex items-center gap-1">
      {icon}
      {label}
    </p>
    <p className={`${small ? 'text-[11px]' : 'text-sm'} font-bold ${accent ? 'text-[#258B5C]' : 'text-[#141213] dark:text-[#F5F0EB]'}`}>{value}</p>
  </div>
);
