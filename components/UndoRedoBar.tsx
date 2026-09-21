'use client';

import React from 'react';
import { Undo2, Redo2 } from 'lucide-react';

interface UndoRedoBarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** Optional context label, e.g. "Pages" — used for aria labels. */
  label?: string;
}

/**
 * Floating undo/redo controls — sized and positioned for the mobile thumb
 * zone, unobtrusive on desktop. Buttons are disabled honestly: no undo
 * history means no undo action.
 */
export const UndoRedoBar: React.FC<UndoRedoBarProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  label = 'changes',
}) => {
  return (
    <div
      className="fixed bottom-20 sm:bottom-6 right-4 z-40 flex items-center gap-2"
      role="toolbar"
      aria-label={`Undo and redo ${label}`}
    >
      <button
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo last change"
        title="Undo (Ctrl/Cmd+Z)"
        className="w-12 h-12 rounded-2xl bg-[#FFFDF9] dark:bg-[#241D20] border border-[#E8DFD3] dark:border-[#3D3035] shadow-lg text-[#7A1635] dark:text-[#C9A15A] flex items-center justify-center transition-all hover:shadow-xl hover:border-[#7A1635]/40 dark:hover:border-[#C9A15A]/40 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-lg"
      >
        <Undo2 className="w-5 h-5" />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="Redo change"
        title="Redo (Ctrl/Cmd+Shift+Z)"
        className="w-12 h-12 rounded-2xl bg-[#FFFDF9] dark:bg-[#241D20] border border-[#E8DFD3] dark:border-[#3D3035] shadow-lg text-[#7A1635] dark:text-[#C9A15A] flex items-center justify-center transition-all hover:shadow-xl hover:border-[#7A1635]/40 dark:hover:border-[#C9A15A]/40 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-lg"
      >
        <Redo2 className="w-5 h-5" />
      </button>
    </div>
  );
};
