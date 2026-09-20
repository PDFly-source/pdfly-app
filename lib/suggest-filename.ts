// ==========================================
// Local (browser-side) smart filename suggestion.
// No network calls, no uploads. Heuristic analysis of file names only.
// ==========================================

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STOP_WORDS = new Set([
  'img', 'image', 'images', 'photo', 'photos', 'pic', 'pics', 'screenshot',
  'screenshots', 'screen', 'shot', 'scan', 'scanned', 'copy', 'final',
  'new', 'untitled', 'download', 'file', 'files', 'document', 'documents',
  'page', 'jpg', 'jpeg', 'png', 'webp', 'pdf', 'temp', 'tmp', 'edit',
]);

function titleCase(token: string): string {
  if (!token) return token;
  return token.charAt(0).toUpperCase() + token.slice(1);
}

/**
 * Analyzes the provided image file names (plus an optional hint of file content types)
 * and produces a human-friendly suggested file name, entirely locally in the browser.
 *
 * Examples:
 *   physics_chapter_1.jpg, physics_notes.jpg  -> Physics_Notes_September_2026
 *   IMG_20260914_101234.jpg                    -> Scanned_Images_September_2026
 *   random mix                                 -> Scanned_Documents_September_2026
 */
export function suggestImagesToPdfName(files: File[]): string {
  if (!files || files.length === 0) return 'PDFly_Images_to_PDF';

  const now = new Date();
  const month = MONTHS[now.getMonth()];
  const year = now.getFullYear();

  // Tokenize all file names (without extensions)
  const tokenCounts = new Map<string, number>();
  let looksLikeCamera = 0;
  let looksLikeScreenshot = 0;
  let looksLikeScan = 0;

  for (const f of files) {
    const base = f.name.replace(/\.[^/.]+$/, '');
    if (/^(img|dsc|dji|pxl)_?\d*$/i.test(base) || /^(img|dsc)[-_]?\d{4,}/i.test(base)) {
      looksLikeCamera++;
    }
    if (/screenshot/i.test(base)) looksLikeScreenshot++;
    if (/scan/i.test(base)) looksLikeScan++;

    const tokens = base
      .split(/[^a-zA-Z0-9\u0080-\uFFFF]+/)
      .map((t) => t.toLowerCase().trim())
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t) && !/^\d+$/.test(t));

    for (const t of tokens) {
      tokenCounts.set(t, (tokenCounts.get(t) || 0) + 1);
    }
  }

  // Pick the most frequent meaningful tokens (up to 3)
  const ranked = [...tokenCounts.entries()]
    .filter(([, c]) => c >= 2 || tokenCounts.size <= 3)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([t]) => t)
    .slice(0, 3);

  let core: string;
  if (ranked.length > 0) {
    core = ranked.map(titleCase).join('_');
  } else if (looksLikeScan > 0) {
    core = 'Scanned_Documents';
  } else if (looksLikeScreenshot > 0) {
    core = 'Screenshots';
  } else if (looksLikeCamera > 0) {
    core = 'Scanned_Images';
  } else {
    core = 'Scanned_Documents';
  }

  const name = `${core}_${month}_${year}`;
  return name.length > 60 ? name.slice(0, 60) : name;
}

/** Ensures a file name ends with the .pdf extension (used at download time). */
export function ensurePdfExtension(name: string): string {
  const trimmed = (name || '').trim() || 'PDFly_Document';
  return /\.pdf$/i.test(trimmed) ? trimmed : `${trimmed}.pdf`;
}

/** Rough local-only estimate of the output PDF size for images. */
export function estimateImagesToPdfSize(
  totalBytes: number,
  quality: 'standard' | 'high' | 'maximum',
  pageCount: number
): number {
  // JPEG re-encoding factor per quality tier (rough, labeled as an estimate in UI)
  const factor = quality === 'standard' ? 0.55 : quality === 'maximum' ? 1.1 : 0.85;
  const perPageOverhead = 2 * 1024; // PDF structure overhead per page
  return Math.max(8 * 1024, Math.round(totalBytes * factor + pageCount * perPageOverhead));
}
