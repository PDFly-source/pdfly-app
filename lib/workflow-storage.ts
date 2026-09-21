// ==========================================
// Workflow storage — recipes, templates, history.
// Stored in localStorage only. Never uploaded.
// ==========================================

import type { WorkflowStep } from './workflow-engine';

export interface SavedWorkflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  createdAt: number;
  isTemplate?: boolean;
}

export interface WorkflowHistoryEntry {
  id: string;
  workflowName: string;
  fileName: string;
  pagesBefore: number;
  pagesAfter: number;
  sizeBefore: number;
  sizeAfter: number;
  durationMs: number;
  stepCount: number;
  timestamp: number;
}

const RECIPES_KEY = 'pdfly_workflow_recipes_v1';
const HISTORY_KEY = 'pdfly_workflow_history_v1';
const MAX_HISTORY = 30;

function read<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, items: T[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* storage full or unavailable — non-fatal */
  }
}

export function listRecipes(): SavedWorkflow[] {
  return read<SavedWorkflow>(RECIPES_KEY);
}

export function saveRecipe(name: string, steps: WorkflowStep[]): SavedWorkflow {
  const recipe: SavedWorkflow = {
    id: Math.random().toString(36).substring(2, 11),
    name: name.trim() || 'Untitled Workflow',
    steps: JSON.parse(JSON.stringify(steps)),
    createdAt: Date.now(),
  };
  const all = read<SavedWorkflow>(RECIPES_KEY);
  all.unshift(recipe);
  write(RECIPES_KEY, all.slice(0, 40));
  return recipe;
}

export function deleteRecipe(id: string) {
  write(RECIPES_KEY, read<SavedWorkflow>(RECIPES_KEY).filter((r) => r.id !== id));
}

export function renameRecipe(id: string, name: string) {
  const all = read<SavedWorkflow>(RECIPES_KEY);
  const r = all.find((x) => x.id === id);
  if (r) {
    r.name = name.trim() || r.name;
    write(RECIPES_KEY, all);
  }
}

export function duplicateRecipe(id: string): SavedWorkflow | null {
  const all = read<SavedWorkflow>(RECIPES_KEY);
  const r = all.find((x) => x.id === id);
  if (!r) return null;
  const copy: SavedWorkflow = {
    ...JSON.parse(JSON.stringify(r)),
    id: Math.random().toString(36).substring(2, 11),
    name: `${r.name} (copy)`,
    createdAt: Date.now(),
  };
  all.unshift(copy);
  write(RECIPES_KEY, all.slice(0, 40));
  return copy;
}

export function listHistory(): WorkflowHistoryEntry[] {
  return read<WorkflowHistoryEntry>(HISTORY_KEY);
}

export function addHistory(entry: Omit<WorkflowHistoryEntry, 'id' | 'timestamp'>): WorkflowHistoryEntry {
  const full: WorkflowHistoryEntry = {
    ...entry,
    id: Math.random().toString(36).substring(2, 11),
    timestamp: Date.now(),
  };
  const all = read<WorkflowHistoryEntry>(HISTORY_KEY);
  all.unshift(full);
  write(HISTORY_KEY, all.slice(0, MAX_HISTORY));
  return full;
}

export function clearHistory() {
  write(HISTORY_KEY, []);
}

// -----------------------------------------------
// Built-in templates (local definitions)
// -----------------------------------------------

export const WORKFLOW_TEMPLATES: { id: string; name: string; emoji: string; description: string; steps: () => WorkflowStep[] }[] = [
  {
    id: 'study-notes',
    name: 'Study Notes Cleanup',
    emoji: '📚',
    description: 'Remove blanks, fix rotation, OCR, compress, clean metadata',
    steps: () => [
      { id: 't1', type: 'remove-blank', enabled: true, options: { threshold: 0.003, includeNearBlank: false } },
      { id: 't2', type: 'rotate', enabled: true, options: { mode: 'auto-fix', angle: 90, pages: '' } },
      { id: 't3', type: 'ocr', enabled: true, options: { language: 'eng', mode: 'all', range: '' } },
      { id: 't4', type: 'compress', enabled: true, options: { level: 'balanced', removeMetadata: false } },
      { id: 't5', type: 'sanitize', enabled: true, options: { title: false, author: true, subject: true, keywords: true, creator: true, producer: true, creationDate: true, modificationDate: true } },
    ],
  },
  {
    id: 'secure-document',
    name: 'Secure Document',
    emoji: '🔐',
    description: 'Clean metadata and stamp a confidentiality watermark',
    steps: () => [
      { id: 's1', type: 'sanitize', enabled: true, options: { title: true, author: true, subject: true, keywords: true, creator: true, producer: true, creationDate: true, modificationDate: true } },
      { id: 's2', type: 'watermark', enabled: true, options: { type: 'text', text: 'CONFIDENTIAL', fontSize: 48, color: '#6D1F35', opacity: 0.35, rotation: 45, position: 'diagonal', pageMode: 'all', pageRange: '', customX: 0.5, customY: 0.5 } },
    ],
  },
  {
    id: 'print-ready',
    name: 'Print Ready',
    emoji: '🖨',
    description: 'Fix rotation, add page numbers, compress',
    steps: () => [
      { id: 'p1', type: 'rotate', enabled: true, options: { mode: 'auto-fix', angle: 90, pages: '' } },
      { id: 'p2', type: 'page-numbers', enabled: true, options: { position: 'bottom-center', format: 'Page 1 of N', startNumber: 1, fontSize: 10, color: '#333333', margin: 25 } },
      { id: 'p3', type: 'compress', enabled: true, options: { level: 'low', removeMetadata: false } },
    ],
  },
  {
    id: 'clean-scan',
    name: 'Clean Scan',
    emoji: '🧹',
    description: 'Remove blanks, fix rotation, OCR, compress',
    steps: () => [
      { id: 'c1', type: 'remove-blank', enabled: true, options: { threshold: 0.004, includeNearBlank: true } },
      { id: 'c2', type: 'rotate', enabled: true, options: { mode: 'auto-fix', angle: 90, pages: '' } },
      { id: 'c3', type: 'ocr', enabled: true, options: { language: 'eng', mode: 'all', range: '' } },
      { id: 'c4', type: 'compress', enabled: true, options: { level: 'balanced', removeMetadata: false } },
    ],
  },
];
