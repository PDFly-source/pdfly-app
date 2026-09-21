'use client';

/**
 * Reusable local document-operation history (undo/redo).
 *
 * Snapshot-based: each reversible operation commits the resulting state.
 * Snapshots are small plain objects (page order / annotation arrays), so
 * memory stays bounded; the stack is capped and the app never keeps PDF
 * bytes here — files stay wherever the tool already holds them.
 *
 * There is no fake undo: a tool only wires operations it can genuinely
 * reverse (page reorder, delete, rotate, move, duplicate, annotation
 * add/remove/move). Non-reversible steps simply never commit.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface UndoRedoState<T> {
  /** Current value (also updated by undo/redo). */
  state: T;
  /** Record a reversible change. Non-history loads should use reset(). */
  commit: (next: T | ((prev: T) => T)) => void;
  /** Replace state without any history (new document loaded). */
  reset: (next: T | ((prev: T) => T)) => void;
  /** Update state without recording history (e.g. thumbnail enrichment,
   *  progressive loads). The current history stays intact. */
  patch: (next: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Drop all history (document closed / operation completed). */
  clearHistory: () => void;
}

const DEFAULT_LIMIT = 30;

/**
 * React hook over a snapshot history. Works like useState plus undo/redo.
 * Present-state tracking lets undo/redo restore exactly what the user saw.
 */
export function useUndoRedo<T>(initial: T, limit: number = DEFAULT_LIMIT): UndoRedoState<T> {
  const [history, setHistory] = useState<{
    past: T[];
    present: T;
    future: T[];
  }>(() => ({
    past: [],
    present: initial,
    future: [],
  }));

  const commit = useCallback(
    (next: T | ((prev: T) => T)) => {
      setHistory((curr) => {
        const value =
          typeof next === 'function' ? (next as (p: T) => T)(curr.present) : next;
        return {
          past: [...curr.past.slice(-(limit - 1)), curr.present],
          present: value,
          future: [],
        };
      });
    },
    [limit]
  );

  const reset = useCallback((next: T | ((prev: T) => T)) => {
    setHistory((curr) => {
      const value =
        typeof next === 'function' ? (next as (p: T) => T)(curr.present) : next;
      return {
        past: [],
        present: value,
        future: [],
      };
    });
  }, []);

  const patch = useCallback((next: T | ((prev: T) => T)) => {
    setHistory((curr) => {
      const value =
        typeof next === 'function' ? (next as (p: T) => T)(curr.present) : next;
      return {
        ...curr,
        present: value,
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((curr) => {
      if (curr.past.length === 0) return curr;
      const previous = curr.past[curr.past.length - 1];
      const newPast = curr.past.slice(0, -1);
      return {
        past: newPast,
        present: previous,
        future: [curr.present, ...curr.future.slice(0, limit - 1)],
      };
    });
  }, [limit]);

  const redo = useCallback(() => {
    setHistory((curr) => {
      if (curr.future.length === 0) return curr;
      const next = curr.future[0];
      const newFuture = curr.future.slice(1);
      return {
        past: [...curr.past.slice(-(limit - 1)), curr.present],
        present: next,
        future: newFuture,
      };
    });
  }, [limit]);

  const clearHistory = useCallback(() => {
    setHistory((curr) => ({
      past: [],
      present: curr.present,
      future: [],
    }));
  }, []);

  return {
    state: history.present,
    commit,
    reset,
    patch,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    clearHistory,
  };
}

/**
 * Attaches Ctrl/Cmd+Z (undo) and Ctrl/Cmd+Shift+Z / Ctrl+Y (redo) to the
 * window while the owning component is mounted. Returns nothing; the
 * callbacks are invoked only when enabled.
 */
export function useUndoRedoShortcuts(opts: {
  onUndo: () => void;
  onRedo: () => void;
  enabled?: boolean;
}): void {
  const { onUndo, onRedo, enabled = true } = opts;
  const undoRef = useRef(onUndo);
  const redoRef = useRef(onRedo);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    undoRef.current = onUndo;
    redoRef.current = onRedo;
    enabledRef.current = enabled;
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!enabledRef.current) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoRef.current();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        redoRef.current();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
