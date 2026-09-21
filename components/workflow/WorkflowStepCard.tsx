'use client';

import React, { useState } from 'react';
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  Settings2,
  AlertTriangle,
  CheckCircle2,
  Power,
  GitBranch,
} from 'lucide-react';
import type { WorkflowStep, StepType, StepValidation } from '@/lib/workflow-engine';

export const STEP_ICONS: Record<StepType, string> = {
  'remove-blank': '🧽',
  rotate: '🔄',
  organize: '🗂',
  ocr: '🔎',
  compress: '🗜',
  watermark: '🏷',
  'page-numbers': '#️⃣',
  sanitize: '🛡',
};

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  'remove-blank': 'Remove Blank Pages',
  rotate: 'Rotate Pages',
  organize: 'Organize Pages',
  ocr: 'OCR (Searchable Text)',
  compress: 'Compress Document',
  watermark: 'Add Watermark',
  'page-numbers': 'Add Page Numbers',
  sanitize: 'Sanitize Metadata',
};

interface WorkflowStepCardProps {
  step: WorkflowStep;
  index: number;
  total: number;
  validation?: StepValidation;
  onReorder: (from: number, to: number) => void;
  onDragStartStep: (index: number) => void;
  onDropStep: (index: number) => void;
  onToggleEnabled: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onConfigure: (id: string) => void;
  onSetCondition: (id: string) => void;
}

export const WorkflowStepCard: React.FC<WorkflowStepCardProps> = ({
  step,
  index,
  total,
  validation,
  onReorder,
  onDragStartStep,
  onDropStep,
  onToggleEnabled,
  onDuplicate,
  onDelete,
  onConfigure,
  onSetCondition,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [dragging, setDragging] = useState(false);
  const hasCondition = Boolean(step.condition && Object.keys(step.condition).length > 0);
  const valid = validation?.level ?? 'ok';

  const move = (dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= total) return;
    onReorder(index, to);
  };

  return (
    <li
      draggable
      onDragStart={(e) => {
        setDragging(true);
        onDragStartStep(index);
        e.dataTransfer.effectAllowed = 'move';
        try {
          e.dataTransfer.setData('text/plain', step.id);
        } catch {
          /* data required on some browsers */
        }
      }}
      onDragEnd={() => {
        setDragging(false);
        setDragOver(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        onDropStep(index);
        setDragOver(false);
      }}
      className={`relative flex items-start sm:items-center gap-2.5 p-3 rounded-2xl border transition-all touch-none ${
        dragOver
          ? 'border-[#C9A15A] scale-[1.01] shadow-md'
          : 'border-[#E5DFD4] dark:border-[#2E2729]'
      } ${dragging ? 'opacity-40' : ''} ${
        step.enabled ? 'bg-white dark:bg-[#1E1A1B]' : 'bg-[#F7F3EC]/60 dark:bg-[#141213]/60 opacity-70'
      }`}
    >
      {/* Drag handle + number */}
      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
        <span
          className="p-1 rounded-lg text-[#A79B90] hover:text-[#141213] dark:hover:text-[#F5F0EB] cursor-grab active:cursor-grabbing"
          title="Drag to reorder step"
          aria-label={`Drag to reorder ${STEP_TYPE_LABELS[step.type]}`}
        >
          <GripVertical className="w-4 h-4" />
        </span>
        <span className="w-6 h-6 rounded-full bg-[#6D1F35]/10 dark:bg-[#C9A15A]/10 text-[#6D1F35] dark:text-[#C9A15A] text-[11px] font-bold flex items-center justify-center">
          {index + 1}
        </span>
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-bold text-[#141213] dark:text-[#F5F0EB] truncate">
            {STEP_TYPE_LABELS[step.type]}
          </p>
          {hasCondition && (
            <button
              onClick={() => onSetCondition(step.id)}
              title="Conditional execution"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#C9A15A]/10 border border-[#C9A15A]/30 text-[#8A6D2F] dark:text-[#C9A15A] text-[11px] font-bold"
            >
              <GitBranch className="w-2.5 h-2.5" />
              <span>If</span>
            </button>
          )}
        </div>

        {validation && (
          <p
            className={`text-[11px] mt-0.5 inline-flex items-start gap-1 ${
              valid === 'error'
                ? 'text-[#C94A4A]'
                : valid === 'warn'
                  ? 'text-[#8A6D2F] dark:text-[#C9A15A]'
                  : 'text-[#5C554F] dark:text-[#A39991]'
            }`}
          >
            {valid === 'error' ? (
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5 opacity-70" />
            )}
            <span>{validation.message}</span>
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={() => onToggleEnabled(step.id)}
          aria-label={step.enabled ? `Disable ${STEP_TYPE_LABELS[step.type]}` : `Enable ${STEP_TYPE_LABELS[step.type]}`}
          title={step.enabled ? 'Disable step' : 'Enable step'}
          className={`p-2 rounded-xl transition-colors ${
            step.enabled
              ? 'text-[#258B5C] hover:bg-[#35C98A]/10'
              : 'text-[#A79B90] hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <Power className="w-4 h-4" />
        </button>
        <button
          onClick={() => onConfigure(step.id)}
          aria-label={`Configure ${STEP_TYPE_LABELS[step.type]}`}
          title="Configure"
          className="p-2 rounded-xl text-[#5C554F] dark:text-[#A39991] hover:text-[#6D1F35] dark:hover:text-[#C9A15A] hover:bg-[#6D1F35]/5 dark:hover:bg-[#C9A15A]/10 transition-colors"
        >
          <Settings2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDuplicate(step.id)}
          aria-label={`Duplicate ${STEP_TYPE_LABELS[step.type]}`}
          title="Duplicate step"
          className="p-2 rounded-xl text-[#5C554F] dark:text-[#A39991] hover:text-[#141213] dark:hover:text-[#F5F0EB] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <Copy className="w-4 h-4" />
        </button>
        <span className="flex flex-col">
          <button
            onClick={() => move(-1)}
            disabled={index === 0}
            aria-label="Move step up"
            className="p-1 rounded-lg text-[#5C554F] dark:text-[#A39991] hover:text-[#141213] dark:hover:text-[#F5F0EB] disabled:opacity-20"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => move(1)}
            disabled={index === total - 1}
            aria-label="Move step down"
            className="p-1 rounded-lg text-[#5C554F] dark:text-[#A39991] hover:text-[#141213] dark:hover:text-[#F5F0EB] disabled:opacity-20"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </span>
        <button
          onClick={() => onDelete(step.id)}
          aria-label={`Delete ${STEP_TYPE_LABELS[step.type]}`}
          title="Delete step"
          className="p-2 rounded-xl text-[#C94A4A] hover:bg-[#C94A4A]/10 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
};
