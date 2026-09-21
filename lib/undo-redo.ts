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
  const [state, setState] = useState<T>(initial);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  // Bump to re-render canUndo/canRedo without duplicating arrays in state.
  const [version, setVersion] = useState(0);
  const touch = useCallback(() => setVersion((v) => v + 1), []);

  const commit = useCallback(
    (next: T | ((prev: T) => T)) => {
      setState((prev) => {
        const value =
          typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        past.current = [...past.current.slice(-(limit - 1)), prev];
        future.current = []; // a new change invalidates the redo branch
        return value;
      });
      touch();
    },
    [limit, touch]
  );

  const reset = useCallback(
    (next: T | ((prev: T) => T)) => {
      setState((prev) =>
        typeof next === 'function' ? (next as (p: T) => T)(prev) : next
      );
      past.current = [];
      future.current = [];
      touch();
    },
    []
  );

  const patch = useCallback((next: T | ((prev: T) => T)) => {
    setState((prev) =>
      typeof next === 'function' ? (next as (p: T) => T)(prev) : next
    );
  }, []);

  const undo = useCallback(() => {
    setState((current) => {
      const previous = past.current.pop();
      if (previous === undefined) return current;
      future.current = [current, ...future.current.slice(0, limit - 1)];
      return previous;
    });
    touch();
  }, [limit, touch]);

  const redo = useCallback(() => {
    setState((current) => {
      const next = future.current.shift();
      if (next === undefined) return current;
      past.current = [...past.current.slice(-(limit - 1)), current];
      return next;
    });
    touch();
  }, [limit, touch]);

  const clearHistory = useCallback(() => {
    past.current = [];
    future.current = [];
    touch();
  }, [touch]);

  // Keep referenced values fresh for canUndo/canRedo
  void version;

  return {
    state,
    commit,
    reset,
    patch,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
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
  undoRef.current = onUndo;
  redoRef.current = onRedo;
  enabledRef.current = enabled;

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
