// ==========================================
// Batch queue runner — sequential, memory-safe, failure-isolated.
// Pure logic module (no React) so queue semantics are testable headlessly:
//  - processes one file at a time (conservative memory for large queues)
//  - a failed file NEVER aborts the rest of the batch
//  - per-file cancel is responsive (checked between files and inside
//    engine progress callbacks)
//  - output names are collision-free and never overwrite originals
//  - results live only in memory — nothing is persisted or uploaded
// ==========================================

import { buildBatchOutputName } from './batch-naming';

export type QueueStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface QueueItemState {
  status: QueueStatus;
  progress: number;
  error?: string;
  outputBlob?: Blob;
  outputName?: string;
  durationMs?: number;
  finalSize?: number;
}

/** Thrown when the user cancels an item mid-processing. */
export class QueueCancelledError extends Error {
  constructor() {
    super('Cancelled');
    this.name = 'QueueCancelledError';
  }
}

export interface RunnableEntry {
  id: string;
  file: File;
}

export interface RunBatchOptions {
  /** Entries to process, in queue order (component pre-filters to queued/cancelled). */
  entries: RunnableEntry[];
  /** Operation suffix used in output names (e.g. "compressed" or a preset id). */
  outputSuffix: string;
  /** Output names already used by completed items (retry collision safety). */
  reservedOutputNames: string[];
  /** Applies the configured operation(s) to one file. */
  process: (file: File, onProgress: (pct: number) => void) => Promise<Blob>;
  /** Reports state patches for a specific item. */
  onUpdate: (id: string, patch: Partial<QueueItemState>) => void;
  /** True when this specific item has been cancelled. */
  isCancelled: (id: string) => boolean;
  /** True when the whole batch was stopped. */
  isStopAll: () => boolean;
}

export interface RunBatchOutcome {
  processed: number;
  failed: number;
  cancelled: number;
}

export async function runBatchQueue(options: RunBatchOptions): Promise<RunBatchOutcome> {
  const { entries, outputSuffix, reservedOutputNames, process, onUpdate, isCancelled, isStopAll } = options;
  const taken = new Set(reservedOutputNames.map((n) => n.toLowerCase()));
  const outcome: RunBatchOutcome = { processed: 0, failed: 0, cancelled: 0 };

  for (const entry of entries) {
    if (isStopAll() || isCancelled(entry.id)) {
      onUpdate(entry.id, { status: 'cancelled', progress: 0 });
      outcome.cancelled++;
      continue;
    }

    onUpdate(entry.id, { status: 'processing', progress: 0, error: undefined });
    const startedAt = performance.now();

    try {
      const blob = await process(entry.file, (pct) => {
        // Responsive cancel: checked inside engine progress callbacks
        if (isCancelled(entry.id) || isStopAll()) {
          throw new QueueCancelledError();
        }
        onUpdate(entry.id, { progress: Math.max(0, Math.min(100, Math.round(pct))) });
      });

      const finalSize = blob.size;
      const outputName = buildBatchOutputName(entry.file.name, outputSuffix, taken);
      onUpdate(entry.id, {
        status: 'completed',
        progress: 100,
        outputBlob: blob,
        outputName,
        finalSize,
        durationMs: performance.now() - startedAt,
      });
      outcome.processed++;
    } catch (err) {
      if (err instanceof QueueCancelledError) {
        onUpdate(entry.id, { status: 'cancelled', progress: 0 });
        outcome.cancelled++;
      } else {
        onUpdate(entry.id, {
          status: 'failed',
          progress: 0,
          error: err instanceof Error ? err.message : 'Processing failed',
        });
        outcome.failed++;
      }
    }
  }

  return outcome;
}
