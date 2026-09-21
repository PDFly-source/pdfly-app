/**
 * In-memory pending-file handoff for the global Smart Dropzone.
 *
 * When a user drops a file anywhere in the app and picks an action, the
 * files are parked here (never on disk, never over the network) and the
 * target tool's FileDropzone claims them on mount, so the user is not
 * forced to re-select the file. Files live only in memory for the current
 * tab session and are cleared once claimed.
 */

let pendingFiles: File[] = [];
let targetSlug: string | null = null;

/** Park dropped files for the chosen tool and notify dropzones. */
export function setPendingFiles(files: File[], slug: string): void {
  pendingFiles = files;
  targetSlug = slug;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pdfly:files-ready'));
  }
}

/**
 * Atomically claim pending files for a tool page.
 * Returns and clears them so only one dropzone consumes the handoff.
 */
export function claimPendingFiles(slug: string): File[] {
  if (targetSlug === slug && pendingFiles.length > 0) {
    const files = pendingFiles;
    pendingFiles = [];
    targetSlug = null;
    return files;
  }
  return [];
}

/**
 * Non-destructive look at pending files for a tool page, so a dropzone
 * can check its accept list before claiming (and never lose the files).
 */
export function peekPendingFiles(slug: string): File[] {
  if (targetSlug === slug) return pendingFiles;
  return [];
}

/** Drop the handoff without using it (e.g. the user cancelled). */
export function clearPendingFiles(): void {
  pendingFiles = [];
  targetSlug = null;
}

/** True if a tool dropzone should ignore this drag (global zone will take it). */
export function isFileDrag(event: React.DragEvent | DragEvent): boolean {
  const types = event.dataTransfer?.types;
  if (!types) return false;
  return Array.from(types).includes('Files');
}
