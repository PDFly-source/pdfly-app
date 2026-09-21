/**
 * Shared, bounded "recently used tools" store.
 *
 * Backs the command palette's recents section and records tool-page visits.
 * Pure localStorage — nothing leaves the device.
 */

const STORAGE_KEY = 'pdfly_recent_tools';
const LEGACY_STORAGE_KEY = 'pdfora_recent_tools';
const MAX_RECENT = 5;

export function getRecentToolSlugs(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s) => typeof s === 'string').slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function recordRecentTool(slug: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const updated = [slug, ...getRecentToolSlugs().filter((s) => s !== slug)].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearRecentTools(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // storage unavailable (private mode) — nothing to clear
  }
}
