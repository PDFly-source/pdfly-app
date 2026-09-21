// ==========================================
// Batch presets — reusable processing recipes, stored locally only.
// A preset is a small ordered list of steps applied to every file in the
// queue. Only settings are persisted (localStorage); files are never stored
// or uploaded. No network calls.
// ==========================================

import type { BatchOperation } from '@/components/tools/BatchProcessWorkspace';

export interface BatchStep {
  op: BatchOperation;
  label: string;
  settings: Record<string, unknown>;
}

export interface BatchPreset {
  id: string;
  name: string;
  description: string;
  steps: BatchStep[];
  builtIn: boolean;
}

export const BUILT_IN_PRESETS: BatchPreset[] = [
  {
    id: 'web-upload',
    name: 'Web Upload',
    description: 'Target 5 MB per file with metadata cleanup — ideal for portals with size limits.',
    builtIn: true,
    steps: [
      { op: 'target-size', label: 'Compress to 5 MB', settings: { targetMB: 5 } },
      { op: 'sanitize', label: 'Remove metadata', settings: {} },
    ],
  },
  {
    id: 'print',
    name: 'Print',
    description: 'True grayscale conversion — saves toner while keeping full page quality.',
    builtIn: true,
    steps: [{ op: 'grayscale', label: 'Grayscale', settings: {} }],
  },
  {
    id: 'archive',
    name: 'Archive',
    description: 'Metadata cleanup followed by conservative compression for long-term storage.',
    builtIn: true,
    steps: [
      { op: 'sanitize', label: 'Remove metadata', settings: {} },
      { op: 'compress', label: 'Compress (conservative)', settings: { level: 'light' } },
    ],
  },
  {
    id: 'study-pack',
    name: 'Study Pack',
    description: 'Grayscale pages with clean page numbers — print-friendly handouts in one pass.',
    builtIn: true,
    steps: [
      { op: 'grayscale', label: 'Grayscale', settings: {} },
      {
        op: 'page-numbers',
        label: 'Add page numbers',
        settings: { format: 'Page 1 of N', position: 'bottom-center' },
      },
    ],
  },
];

const CUSTOM_KEY = 'pdffly.batch.customPresets.v1';

export function loadCustomPresets(): BatchPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p) => p && typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.steps)
    ) as BatchPreset[];
  } catch {
    return [];
  }
}

export function saveCustomPreset(preset: BatchPreset): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadCustomPresets();
    const next = [...existing.filter((p) => p.id !== preset.id), preset];
    window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private mode/quota) — presets simply won't persist
  }
}

export function deleteCustomPreset(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const next = loadCustomPresets().filter((p) => p.id !== id);
    window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
