'use client';

import React, { useState } from 'react';
import {
  Play,
  Copy,
  Trash2,
  Pencil,
  BookOpen,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  WORKFLOW_TEMPLATES,
  listRecipes,
  listHistory,
  saveRecipe,
  deleteRecipe,
  renameRecipe,
  duplicateRecipe,
  clearHistory,
  type SavedWorkflow,
  type WorkflowHistoryEntry,
} from '@/lib/workflow-storage';
import type { WorkflowStep, StepCondition } from '@/lib/workflow-engine';
import { formatBytes } from '@/lib/pdf-engine';

interface RecipesPanelProps {
  onLoadSteps: (steps: WorkflowStep[], name: string) => void;
  refreshKey: number;
}

export const RecipesPanel: React.FC<RecipesPanelProps> = ({ onLoadSteps, refreshKey }) => {
  const [tab, setTab] = useState<'templates' | 'saved' | 'history'>('templates');
  const [recipes, setRecipes] = useState<SavedWorkflow[]>([]);
  const [history, setHistory] = useState<WorkflowHistoryEntry[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [open, setOpen] = useState(true);

  React.useEffect(() => {
    setRecipes(listRecipes());
    setHistory(listHistory());
  }, [refreshKey]);

  const refresh = () => {
    setRecipes(listRecipes());
    setHistory(listHistory());
  };

  return (
    <div className="rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5"
        aria-expanded={open}
      >
        <h3 className="text-sm font-bold text-[#141213] dark:text-[#F5F0EB] inline-flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#6D1F35] dark:text-[#C9A15A]" />
          Workflows, Templates & History
        </h3>
        {open ? <ChevronUp className="w-4 h-4 text-[#A79B90]" /> : <ChevronDown className="w-4 h-4 text-[#A79B90]" />}
      </button>

      {open && (
        <div className="px-5 pb-5">
          {/* Tabs */}
          <div className="flex gap-1.5 mb-4">
            {([
              ['templates', 'Templates'],
              ['saved', `Saved${recipes.length ? ` (${recipes.length})` : ''}`],
              ['history', `History${history.length ? ` (${history.length})` : ''}`],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all ${
                  tab === id
                    ? 'bg-[#6D1F35] text-white'
                    : 'bg-[#F7F3EC] dark:bg-[#141213] text-[#5C554F] dark:text-[#A39991] hover:bg-[#6D1F35]/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Templates */}
          {tab === 'templates' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {WORKFLOW_TEMPLATES.map((t) => (
                <div key={t.id} className="p-3.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#F7F3EC]/50 dark:bg-[#141213]/50">
                  <p className="text-xs font-bold text-[#141213] dark:text-[#F5F0EB] mb-0.5">
                    {t.emoji} {t.name}
                  </p>
                  <p className="text-[11px] text-[#5C554F] dark:text-[#A39991] mb-2.5 leading-relaxed">{t.description}</p>
                  <button
                    onClick={() => onLoadSteps(t.steps(), `${t.emoji} ${t.name}`)}
                    className="w-full px-3 py-2 rounded-lg bg-[#6D1F35] hover:bg-[#58182a] text-white text-[11px] font-bold inline-flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Play className="w-3 h-3" />
                    <span>Use Template</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Saved */}
          {tab === 'saved' && (
            recipes.length === 0 ? (
              <p className="text-[11px] text-[#5C554F] dark:text-[#A39991] p-3 rounded-xl border border-dashed border-[#E5DFD4] dark:border-[#2E2729]">
                No saved workflows yet. Build a pipeline and tap “Save Workflow” after a run — it stays on this device only.
              </p>
            ) : (
              <ul className="space-y-2">
                {recipes.map((r) => (
                  <li key={r.id} className="flex items-center gap-2.5 p-3 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729]">
                    {renamingId === r.id ? (
                      <>
                        <input
                          autoFocus
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              renameRecipe(r.id, draftName);
                              setRenamingId(null);
                              refresh();
                            }
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-[#C9A15A]/50 bg-white dark:bg-[#141213] text-xs font-bold text-[#141213] dark:text-[#F5F0EB] outline-none"
                          aria-label="Rename workflow"
                        />
                        <button
                          onClick={() => {
                            renameRecipe(r.id, draftName);
                            setRenamingId(null);
                            refresh();
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-[#35C98A]/15 text-[#258B5C] text-[11px] font-bold"
                        >
                          Save
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#141213] dark:text-[#F5F0EB] truncate">{r.name}</p>
                          <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
                            {r.steps.length} step(s) · {new Date(r.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button onClick={() => onLoadSteps(r.steps, r.name)} aria-label={`Run ${r.name}`} title="Load & run" className="p-2 rounded-lg bg-[#6D1F35] text-white hover:bg-[#58182a]">
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setRenamingId(r.id);
                              setDraftName(r.name);
                            }}
                            aria-label={`Rename ${r.name}`}
                            title="Rename"
                            className="p-2 rounded-lg text-[#5C554F] dark:text-[#A39991] hover:bg-black/5 dark:hover:bg-white/5"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              duplicateRecipe(r.id);
                              refresh();
                            }}
                            aria-label={`Duplicate ${r.name}`}
                            title="Duplicate"
                            className="p-2 rounded-lg text-[#5C554F] dark:text-[#A39991] hover:bg-black/5 dark:hover:bg-white/5"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              deleteRecipe(r.id);
                              refresh();
                            }}
                            aria-label={`Delete ${r.name}`}
                            title="Delete"
                            className="p-2 rounded-lg text-[#C94A4A] hover:bg-[#C94A4A]/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )
          )}

          {/* History */}
          {tab === 'history' && (
            history.length === 0 ? (
              <p className="text-[11px] text-[#5C554F] dark:text-[#A39991] p-3 rounded-xl border border-dashed border-[#E5DFD4] dark:border-[#2E2729]">
                No runs yet. Completed workflows are listed here (stored locally, file contents are never stored).
              </p>
            ) : (
              <>
                <ul className="space-y-2 mb-3">
                  {history.map((h) => (
                    <li key={h.id} className="flex items-center gap-2.5 p-3 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729]">
                      <Clock className="w-3.5 h-3.5 text-[#A79B90] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#141213] dark:text-[#F5F0EB] truncate">
                          {h.workflowName} <span className="text-[#5C554F] dark:text-[#A39991] font-medium">· {h.fileName}</span>
                        </p>
                        <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
                          {h.pagesBefore} → {h.pagesAfter} pages · {formatBytes(h.sizeBefore)} → {formatBytes(h.sizeAfter)} · {(h.durationMs / 1000).toFixed(1)}s · {new Date(h.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    clearHistory();
                    refresh();
                  }}
                  className="text-[11px] font-semibold text-[#C94A4A] hover:underline"
                >
                  Clear history
                </button>
              </>
            )
          )}

          <p className="mt-4 text-[11px] text-[#5C554F] dark:text-[#A39991] italic">
            Workflows and history are stored only in this browser (localStorage). Nothing is uploaded.
          </p>
        </div>
      )}
    </div>
  );
};

// ============ CONDITION BUILDER ============
export const ConditionSheet: React.FC<{
  stepId: string;
  current: StepCondition | undefined;
  onSave: (stepId: string, condition: StepCondition | undefined) => void;
  onClose: () => void;
}> = ({ stepId, current, onSave, onClose }) => {
  const [cond, setCond] = useState<StepCondition>(current || {});
  const [enabled, setEnabled] = useState(Boolean(current && Object.keys(current).length > 0));

  const save = () => {
    onSave(stepId, enabled ? cond : undefined);
    onClose();
  };

  const toggle = (key: keyof StepCondition) => {
    setCond((c) => ({ ...c, [key]: c[key] === undefined || c[key] === false ? true : false }));
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8DFD3] dark:border-[#2E2629]">
          <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8]">Run this step only if…</h3>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[#5C554F] dark:text-[#A39991]">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <label className="flex items-center gap-2.5 text-xs font-medium text-[#141213] dark:text-[#F5F0EB]">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 rounded accent-[#6D1F35]"
            />
            Enable conditional execution
          </label>

          <div className={`space-y-2.5 ${enabled ? '' : 'opacity-40 pointer-events-none'}`}>
            <label className="flex items-center gap-2.5 text-xs text-[#141213] dark:text-[#F5F0EB]">
              <input type="checkbox" checked={cond.hasBlankPages === true} onChange={() => toggle('hasBlankPages')} className="w-4 h-4 rounded accent-[#6D1F35]" />
              Blank pages were detected
            </label>
            <label className="flex items-center gap-2.5 text-xs text-[#141213] dark:text-[#F5F0EB]">
              <input type="checkbox" checked={cond.hasRotatedPages === true} onChange={() => toggle('hasRotatedPages')} className="w-4 h-4 rounded accent-[#6D1F35]" />
              Rotated pages were detected
            </label>
            <label className="flex items-center gap-2.5 text-xs text-[#141213] dark:text-[#F5F0EB]">
              <input type="checkbox" checked={cond.hasScannedPages === true} onChange={() => toggle('hasScannedPages')} className="w-4 h-4 rounded accent-[#6D1F35]" />
              Scanned (image) pages were detected
            </label>
            <label className="flex items-center gap-2.5 text-xs text-[#141213] dark:text-[#F5F0EB]">
              <input type="checkbox" checked={cond.hasMetadata === true} onChange={() => toggle('hasMetadata')} className="w-4 h-4 rounded accent-[#6D1F35]" />
              Document has metadata
            </label>
            <div>
              <label className="text-[11px] font-semibold text-[#141213] dark:text-[#F5F0EB] block mb-1.5">
                Pages greater than {cond.pagesGreaterThan ?? '—'}
              </label>
              <input
                type="number"
                min={1}
                value={cond.pagesGreaterThan ?? ''}
                onChange={(e) =>
                  setCond((c) => ({
                    ...c,
                    pagesGreaterThan: e.target.value ? parseInt(e.target.value) : undefined,
                  }))
                }
                placeholder="e.g. 100"
                className="w-full px-3 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs text-[#141213] dark:text-[#F5F0EB]"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#141213] dark:text-[#F5F0EB] block mb-1.5">
                File size greater than {cond.fileSizeGreaterThanMB ?? '—'} MB
              </label>
              <input
                type="number"
                min={1}
                value={cond.fileSizeGreaterThanMB ?? ''}
                onChange={(e) =>
                  setCond((c) => ({
                    ...c,
                    fileSizeGreaterThanMB: e.target.value ? parseInt(e.target.value) : undefined,
                  }))
                }
                placeholder="e.g. 10"
                className="w-full px-3 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs text-[#141213] dark:text-[#F5F0EB]"
              />
            </div>
          </div>

          <button
            onClick={save}
            className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] text-xs font-bold border border-[#C9A15A]/40"
          >
            Save Condition
          </button>
          <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
            Conditions are evaluated live before the step runs. Unmet conditions skip the step and it appears as “skipped” in the results.
          </p>
        </div>
      </div>
    </div>
  );
};
