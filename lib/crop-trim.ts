/**
 * PDFMiniFly — Crop, Auto-Trim & N-Up geometry engines.
 *
 * CropBox mathematics, content-boundary detection (white/black trim),
 * and multi-page-per-sheet imposition — all local via pdf-lib + pdf.js.
 *
 * PRIVATE. POWERFUL. LOCAL.
 */

import { PDFDocument } from 'pdf-lib';

// ============================================================
// CROP — user-defined margins in PDF points
// ============================================================

export interface CropMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface CropTargetPages {
  mode: 'current' | 'range' | 'all';
  /** 1-indexed; used when mode === 'range' */
  rangeStr?: string;
  currentPage: number;
}

export function parseRange(rangeStr: string | undefined, total: number): number[] {
  if (!rangeStr || !rangeStr.trim()) return [];
  const out = new Set<number>();
  for (const part of rangeStr.split(',')) {
    const m = part.trim().match(/^(\d+)\s*[-–]\s*(\d+)$/) || part.trim().match(/^(\d+)$/);
    if (m) {
      if (m[2]) {
        const a = Math.max(1, Number(m[1]));
        const b = Math.min(total, Number(m[2]));
        for (let p = a; p <= b; p++) out.add(p);
      } else {
        const p = Number(m[1]);
        if (p >= 1 && p <= total) out.add(p);
      }
    }
  }
  return [...out].sort((a, b) => a - b);
}

/**
 * Apply a crop to specific pages by setting CropBox (non-destructive to the
 * page content stream — always reversible by removing the crop).
 */
export async function cropPdf(
  file: File,
  margins: CropMargins,
  target: CropTargetPages,
  onProgress?: (msg: string, pct: number) => void
): Promise<{ blob: Blob; croppedPages: number[]; totalPages: number }> {
  onProgress?.('Loading document...', 5);
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  const pages =
    target.mode === 'all'
      ? Array.from({ length: totalPages }, (_, i) => i + 1)
      : target.mode === 'current'
        ? [target.currentPage]
        : parseRange(target.rangeStr, totalPages);

  if (!pages.length) throw new Error('No pages selected for cropping.');

  pages.forEach((pageNum, i) => {
    onProgress?.(`Cropping page ${pageNum}...`, 10 + Math.round((i / pages.length) * 85));
    const page = doc.getPage(pageNum - 1);
    const { width, height } = page.getSize();
    const left = Math.min(margins.left, width * 0.45);
    const right = Math.min(margins.right, width * 0.45);
    const top = Math.min(margins.top, height * 0.45);
    const bottom = Math.min(margins.bottom, height * 0.45);

    // crop relative to the VISIBLE area (current CropBox), so repeated crops stack predictably
    const currentCrop = page.getCropBox();
    const cx = currentCrop.x;
    const cy = currentCrop.y;
    const cw = currentCrop.width;
    const ch = currentCrop.height;

    const newBox = {
      x: cx + left,
      y: cy + bottom,
      width: Math.max(20, cw - left - right),
      height: Math.max(20, ch - top - bottom),
    };
    page.setCropBox(newBox.x, newBox.y, newBox.width, newBox.height);
  });

  onProgress?.('Saving cropped document...', 95);
  const out = await doc.save({ useObjectStreams: true });
  return {
    blob: new Blob([out as any], { type: 'application/pdf' }),
    croppedPages: pages,
    totalPages,
  };
}

// ============================================================
// AUTO-TRIM — detect content boundaries via rendered pixels
// ============================================================

export interface AutoTrimBox {
  x: number;
  y: number; // bottom, PDF coords
  width: number;
  height: number;
}

export type AutoTrimMode = 'white' | 'black' | 'content';

interface RenderedPage {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  scale: number;
}

/** Render a page via pdf.js to a canvas for pixel inspection. Caller must clean up. */
async function renderForInspection(
  pdfJsDoc: any,
  pageNumber: number,
  targetWidth = 600
): Promise<RenderedPage> {
  const page = await pdfJsDoc.getPage(pageNumber);
  const v1 = page.getViewport({ scale: 1.0 });
  const scale = targetWidth / v1.width;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  await page.render({ canvasContext: ctx, viewport }).promise;
  return { canvas, ctx, scale };
}

/**
 * Detect the content bounding box by scanning pixels.
 * mode 'white' removes white margins; 'black' removes black scanner borders;
 * 'content' finds the tightest non-background box (auto-detect background).
 * Returns the detected box in PDF points (page space, bottom-left origin).
 */
export async function autoDetectContentBox(
  pdfJsDoc: any,
  pageNumber: number,
  mode: AutoTrimMode,
  sensitivity = 12
): Promise<{ box: AutoTrimBox; pageWidth: number; pageHeight: number }> {
  const page = await pdfJsDoc.getPage(pageNumber);
  const v1 = page.getViewport({ scale: 1.0 });
  const pageWidth = v1.width;
  const pageHeight = v1.height;
  const { canvas, ctx, scale } = await renderForInspection(pdfJsDoc, pageNumber, 600);
  const w = canvas.width;
  const h = canvas.height;

  const data = ctx.getImageData(0, 0, w, h).data;

  // background sampling: corners average
  const sample = (x: number, y: number) => {
    const p = (y * w + x) * 4;
    return [data[p], data[p + 1], data[p + 2]];
  };
  const corners = [sample(2, 2), sample(w - 3, 2), sample(2, h - 3), sample(w - 3, h - 3)];
  const bgR = corners.reduce((s, c) => s + c[0], 0) / 4;
  const bgG = corners.reduce((s, c) => s + c[1], 0) / 4;
  const bgB = corners.reduce((s, c) => s + c[2], 0) / 4;

  // background luminance decides 'content' mode background
  const bgLum = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;
  const darkBg = bgLum < 90;

  const isBackground = (r: number, g: number, b: number): boolean => {
    if (mode === 'black') {
      // black scanner borders: background is dark
      return 0.299 * r + 0.587 * g + 0.114 * b < 70;
    }
    if (mode === 'white') {
      // white margins: background is bright (allow sensitivity slack)
      return 0.299 * r + 0.587 * g + 0.114 * b > 255 - sensitivity - 30 || (r > 235 && g > 235 && b > 235);
    }
    // content: match detected background within tolerance
    return Math.abs(r - bgR) < 28 && Math.abs(g - bgG) < 28 && Math.abs(b - bgB) < 28;
  };

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      if (!isBackground(data[p], data[p + 1], data[p + 2])) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  canvas.width = 0;
  canvas.height = 0;

  // nothing found → keep full page
  if (maxX < 0 || minX > maxX) {
    return { box: { x: 0, y: 0, width: pageWidth, height: pageHeight }, pageWidth, pageHeight };
  }

  // add a small padding (2% of dimension) so we don't shave content edges
  const padX = Math.round(w * 0.015);
  const padY = Math.round(h * 0.015);
  minX = Math.max(0, minX - padX);
  minY = Math.max(0, minY - padY);
  maxX = Math.min(w - 1, maxX + padX);
  maxY = Math.min(h - 1, maxY + padY);

  // convert canvas px → PDF points (canvas top-left origin → PDF bottom-left)
  const box: AutoTrimBox = {
    x: minX / scale,
    y: (h - 1 - maxY) / scale,
    width: (maxX - minX + 1) / scale,
    height: (maxY - minY + 1) / scale,
  };
  return { box, pageWidth, pageHeight };
}

/**
 * Apply auto-trim boxes per page (each page measured individually).
 */
export async function autoTrimPdf(
  file: File,
  mode: AutoTrimMode,
  target: CropTargetPages,
  onProgress?: (msg: string, pct: number) => void
): Promise<{ blob: Blob; trimmedPages: number[]; totalPages: number }> {
  onProgress?.('Loading document...', 5);
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();
  const pages =
    target.mode === 'all'
      ? Array.from({ length: totalPages }, (_, i) => i + 1)
      : target.mode === 'current'
        ? [target.currentPage]
        : parseRange(target.rangeStr, totalPages);

  if (!pages.length) throw new Error('No pages selected for trimming.');

  const pdfJsDoc = await (await import('./pdfjs-init')).getPdfDocumentFromFile(bytes);

  for (let i = 0; i < pages.length; i++) {
    const pageNum = pages[i];
    onProgress?.(`Detecting content boundaries on page ${pageNum}...`, 10 + Math.round((i / pages.length) * 80));
    const { box } = await autoDetectContentBox(pdfJsDoc, pageNum, mode);
    const page = doc.getPage(pageNum - 1);
    page.setCropBox(box.x, box.y, box.width, box.height);
  }

  onProgress?.('Saving trimmed document...', 95);
  const out = await doc.save({ useObjectStreams: true });
  return { blob: new Blob([out as any], { type: 'application/pdf' }), trimmedPages: pages, totalPages };
}
