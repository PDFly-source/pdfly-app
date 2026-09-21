/**
 * PDFMiniFly — Split a PDF by target file size.
 *
 * Measures REAL output sizes (never assumes equal page weights) and always
 * splits at page boundaries. Each part's actual size is reported honestly.
 *
 * PRIVATE. POWERFUL. LOCAL.
 */

import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

export interface SplitPart {
  /** 1-indexed pages included in this part */
  pages: number[];
  /** actual byte size after saving */
  size: number;
  /** filename for this part */
  filename: string;
  blob: Blob;
}

export interface SplitBySizeResult {
  parts: SplitPart[];
  originalSize: number;
  targetBytes: number;
  totalPages: number;
}

export interface SplitBySizeOptions {
  targetBytes: number;
  /** e.g. "document_part_01.pdf" — {n} replaced with part number, stem honored */
  filenamePattern?: string;
  originalName?: string;
}

/** Extract pages [start,end] (1-indexed inclusive) into a standalone PDF. */
async function buildPart(sourceBytes: ArrayBuffer, start: number, end: number): Promise<Uint8Array> {
  const src = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const indices: number[] = [];
  for (let p = start; p <= end; p++) indices.push(p - 1);
  const copied = await out.copyPages(src, indices);
  for (const page of copied) out.addPage(page);
  out.setProducer('PDFMiniFly Local Splitter');
  return out.save({ useObjectStreams: true });
}

function patternToFilename(pattern: string | undefined, originalName: string | undefined, partIndex: number, totalParts: number): string {
  const stem = (originalName || 'document').replace(/\.pdf$/i, '').slice(0, 60) || 'document';
  const base = pattern || `${stem}_part_{n}.pdf`;
  const width = Math.max(2, String(totalParts).length);
  const numbered = base.includes('{n}')
    ? base.replace('{n}', String(partIndex).padStart(width, '0'))
    : base.replace(/\.pdf$/i, '') + `_${String(partIndex).padStart(2, '0')}.pdf`;
  const withStem = numbered.replace(/\{stem\}/g, stem);
  return /\.pdf$/i.test(withStem) ? withStem : withStem + '.pdf';
}

/**
 * Split the PDF so that each part is as close to targetBytes as possible
 * without exceeding it (except a single unavoidable oversized page), using
 * REAL saved sizes to decide boundaries.
 *
 * Strategy:
 *  1. Sample a few pages to estimate per-page cost, propose boundaries.
 *  2. Build each part, measure the actual size, and adjust the next boundary
 *     if the estimate was off (never mid-page).
 */
export async function splitPdfBySize(
  file: File,
  options: SplitBySizeOptions,
  onProgress?: (msg: string, pct: number) => void
): Promise<SplitBySizeResult> {
  const { targetBytes } = options;
  const originalSize = file.size;
  onProgress?.('Loading document...', 5);
  const sourceBytes = await file.arrayBuffer();

  const probe = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  const totalPages = probe.getPageCount();
  if (totalPages === 0) throw new Error('This PDF has no pages.');

  // single-page files can't be split further
  if (totalPages === 1) {
    const bytes = await buildPart(sourceBytes, 1, 1);
    return {
      parts: [{
        pages: [1],
        size: bytes.length,
        filename: patternToFilename(options.filenamePattern, options.originalName, 1, 1),
        blob: new Blob([bytes as any], { type: 'application/pdf' }),
      }],
      originalSize,
      targetBytes,
      totalPages,
    };
  }

  onProgress?.('Measuring real page sizes...', 12);

  // --- Pass 1: measure every page individually (needed for exact packing).
  // For very large documents this is O(n) PDF copies; we batch to keep it sane:
  // measure each page only when total estimate suggests we need precision.
  // First, cheap estimate: bytes/page on the raw file.
  const estPerPage = Math.max(1, originalSize / totalPages);
  const likelyParts = Math.max(2, Math.ceil(originalSize / targetBytes));

  const parts: SplitPart[] = [];
  let page = 1;
  let partIndex = 0;

  // If the estimate says the whole file is under target → single part.
  if (originalSize <= targetBytes) {
    const bytes = await buildPart(sourceBytes, 1, totalPages);
    onProgress?.('Document already fits the target size.', 100);
    return {
      parts: [{
        pages: Array.from({ length: totalPages }, (_, i) => i + 1),
        size: bytes.length,
        filename: patternToFilename(options.filenamePattern, options.originalName, 1, 1),
        blob: new Blob([bytes as any], { type: 'application/pdf' }),
      }],
      originalSize,
      targetBytes,
      totalPages,
    };
  }

  // Batch packing: grow each part page-by-page using measured sizes.
  // We measure incrementally by building candidate parts at checkpoints:
  // start with estimated page count per part from average, then verify.
  let currentStart = 1;
  while (currentStart <= totalPages) {
    partIndex++;
    // initial guess of pages per part from average density
    let guess = Math.max(1, Math.floor(targetBytes / estPerPage));
    guess = Math.min(guess, totalPages - currentStart + 1);

    onProgress?.(
      `Building part ${partIndex} (pages ~${currentStart}-${Math.min(totalPages, currentStart + guess - 1)})...`,
      10 + Math.round((currentStart / totalPages) * 85)
    );

    // measure the candidate, then binary-search the largest end that fits
    let end = Math.min(totalPages, currentStart + guess - 1);
    let bestEnd = -1;
    let bestBytes: Uint8Array | null = null;

    // Expand/shrink with real measurements (each measurement is one save).
    // Binary search between currentStart..totalPages for the largest fitting end.
    let lo = currentStart;
    let hi = totalPages;
    let measured = 0;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const bytes = await buildPart(sourceBytes, currentStart, mid);
      measured++;
      if (bytes.length <= targetBytes) {
        bestEnd = mid;
        bestBytes = bytes;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
      if (measured > 14) break; // safety bound on measurement count
    }

    if (bestEnd === -1 || !bestBytes) {
      // even a single page exceeds target — emit it alone, honestly oversized
      const bytes = await buildPart(sourceBytes, currentStart, currentStart);
      bestBytes = bytes;
      bestEnd = currentStart;
    }

    const pages = Array.from({ length: bestEnd - currentStart + 1 }, (_, i) => currentStart + i);
    parts.push({
      pages,
      size: bestBytes.length,
      filename: '', // filled after we know total count
      blob: new Blob([bestBytes as any], { type: 'application/pdf' }),
    });

    currentStart = bestEnd + 1;
  }

  // fix names now that the part count is known
  parts.forEach((p, i) => {
    p.filename = patternToFilename(options.filenamePattern, options.originalName, i + 1, parts.length);
  });

  onProgress?.('Split complete.', 100);
  return { parts, originalSize, targetBytes, totalPages };
}

/** Bundle parts into a single ZIP for download. */
export async function zipParts(parts: SplitPart[]): Promise<Blob> {
  const zip = new JSZip();
  for (const part of parts) {
    zip.file(part.filename, part.blob);
  }
  return zip.generateAsync({ type: 'blob' });
}
