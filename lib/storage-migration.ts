'use client';

/**
 * PDFly Local Storage Migration Engine
 * Automatically migrates existing local PDFora keys to PDFly keys
 * without data loss or breaking user histories.
 */

const MIGRATIONS: Array<{ oldKey: string; newKey: string }> = [
  { oldKey: 'pdfora_recent_jobs', newKey: 'pdfly_recent_jobs' },
  { oldKey: 'pdfora_local_library', newKey: 'pdfly_local_library' },
  { oldKey: 'pdfora_theme', newKey: 'pdfly_theme' },
  { oldKey: 'pdfora_saved_signature', newKey: 'pdfly_saved_signature' },
  { oldKey: 'pdfora_local_bookmarks', newKey: 'pdfly_local_bookmarks' },
  { oldKey: 'pdfora_local_notes', newKey: 'pdfly_local_notes' },
  { oldKey: 'pdfora_recent_tools', newKey: 'pdfly_recent_tools' },
  { oldKey: 'pdfora_preferred_lang', newKey: 'pdfly_preferred_lang' },
  { oldKey: 'pdfora_settings', newKey: 'pdfly_settings' },
];

let migrated = false;

export function runStorageMigration(): void {
  if (typeof window === 'undefined' || migrated) return;

  try {
    for (const { oldKey, newKey } of MIGRATIONS) {
      const oldValue = localStorage.getItem(oldKey);
      const newValue = localStorage.getItem(newKey);

      if (oldValue && !newValue) {
        localStorage.setItem(newKey, oldValue);
      }
      if (oldValue) {
        localStorage.removeItem(oldKey);
      }
    }
    migrated = true;
  } catch {
    // Graceful fallback if localStorage is restricted
  }
}

/**
 * Safe local storage reader that checks new key first, then old key fallback
 */
export function getStorageItem(newKey: string, oldKey?: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(newKey);
    if (val !== null) return val;
    if (oldKey) {
      const fallback = localStorage.getItem(oldKey);
      if (fallback !== null) {
        localStorage.setItem(newKey, fallback);
        localStorage.removeItem(oldKey);
        return fallback;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Safe local storage writer that writes to new key
 */
export function setStorageItem(newKey: string, value: string, oldKey?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(newKey, value);
    if (oldKey) {
      localStorage.removeItem(oldKey);
    }
  } catch {
    // Ignore storage write errors
  }
}
