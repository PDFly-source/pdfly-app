/**
 * PDFMiniFly — Compress to a target file size.
 *
 * Iteratively searches compression parameters (image quality × resolution)
 * entirely in the browser until the output meets the user's target size,
 * or reports the best honestly achievable size.
 *
 * PRIVATE. POWERFUL. LOCAL.
 */

import { PDFDocument } from 'pdf-lib';
import { getPdfDocumentFromFile } from './pdfjs-init';

export type TargetSizeMode = 'best-quality' | 'balanced' | 'smallest';

export interface CompressTargetOptions {
  /** target size in bytes */
  targetBytes: number;
  mode: TargetSizeMode;
  removeMetadata: boolean;
  /** optional grayscale conversion during compression */
  grayscale: boolean;
}

export interface CompressTargetResult {
  blob: Blob;
  originalSize: number;
  newSize: number;
  targetBytes: number;
  targetMet: boolean;
  /** final parameters used */
  quality: number;
  dpi: number;
  attempts: { quality: number; dpi: number; size: number }[];
}

/** Mode presets constrain the search space. */
function modeRanges(mode: TargetSizeMode) {
  if (mode === 'best-quality') {
    return { quality: [0.8, 0.42], dpi: [160, 100] };
  }
  if (mode === 'smallest') {
    return { quality: [0.5, 0.28], dpi: [110, 70] };
  }
  return { quality: [0.72, 0.35], dpi: [140, 85] };
}

/** Rasterize-compress the whole document at the given parameters. */
async function compressAtParams(
  pdfJsDoc: any,
  quality: number,
  dpi: number,
  grayscale: boolean,
  onProgress?: (msg: string, pct: number) => void
): Promise<Uint8Array> {
  const scale = dpi / 72;
  const newDoc = await PDFDocument.create();
  const totalPages = pdfJsDoc.numPages;

  for (let i = 1; i <= totalPages; i++) {
    onProgress?.(`Rendering page ${i} of ${totalPages}...`, Math.round((i / totalPages) * 90));
    const page = await pdfJsDoc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    await page.render({ canvasContext: ctx, viewport }).promise;

    if (grayscale) {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const px = data.data;
      for (let p = 0; p < px.length; p += 4) {
        const g = (px[p] * 0.299 + px[p + 1] * 0.587 + px[p + 2] * 0.114) | 0;
        px[p] = g; px[p + 1] = g; px[p + 2] = g;
      }
      ctx.putImageData(data, 0, 0);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const imgBytes = Uint8Array.from(atob(dataUrl.split(',')[1]), (c) => c.charCodeAt(0));
    const img = await newDoc.embedJpg(imgBytes);

    const baseViewport = page.getViewport({ scale: 1.0 });
    const newPage = newDoc.addPage([baseViewport.width, baseViewport.height]);
    newPage.drawImage(img, {
      x: 0,
      y: 0,
      width: baseViewport.width,
      height: baseViewport.height,
    });

    canvas.width = 0;
    canvas.height = 0;
  }

  onProgress?.('Saving compressed document...', 95);
  return newDoc.save({ useObjectStreams: true });
}

/** Try a structural (lossless) pass first — sometimes enough by itself. */
async function structuralPass(arrayBuffer: ArrayBuffer): Promise<Uint8Array | null> {
  try {
    const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    doc.setTitle('');
    doc.setAuthor('');
    doc.setSubject('');
    doc.setProducer('PDFMiniFly Local Optimizer');
    doc.setCreator('PDFMiniFly');
    return await doc.save({ useObjectStreams: true });
  } catch {
    return null;
  }
}

/**
 * Search for compression parameters that fit inside targetBytes.
 * Strategy: bisection over (quality, dpi) ladder; if the smallest rung
 * still exceeds the target, return the best result honestly.
 */
export async function compressToTargetSize(
  file: File,
  options: CompressTargetOptions,
  onProgress?: (msg: string, pct: number) => void
): Promise<CompressTargetResult> {
  const { targetBytes, mode, removeMetadata, grayscale } = options;
  const originalSize = file.size;
  const attempts: { quality: number; dpi: number; size: number }[] = [];

  onProgress?.('Analyzing document structure...', 5);
  const arrayBuffer = await file.arrayBuffer();

  // 1) structural pass
  if (removeMetadata) {
    const bytes = await structuralPass(arrayBuffer);
    if (bytes) {
      attempts.push({ quality: -1, dpi: -1, size: bytes.length });
      if (bytes.length <= targetBytes) {
        onProgress?.('Target achieved with lossless optimization!', 100);
        return {
          blob: new Blob([bytes as any], { type: 'application/pdf' }),
          originalSize,
          newSize: bytes.length,
          targetBytes,
          targetMet: true,
          quality: -1,
          dpi: -1,
          attempts,
        };
      }
    }
  }

  // 2) parameter ladder search
  onProgress?.('Searching for optimal compression parameters...', 10);
  const pdfJsDoc = await getPdfDocumentFromFile(arrayBuffer);
  const [qHi, qLo] = modeRanges(mode).quality;
  const [dpiHi, dpiLo] = modeRanges(mode).dpi;

  // ladder: start near top of range, then walk down through quality steps,
  // dropping DPI only when quality alone cannot get there.
  const rungs: { quality: number; dpi: number }[] = [];
  const qualitySteps = [1, 0.85, 0.7, 0.55, 0.42, 0.3].map((f) => qLo + (qHi - qLo) * f);
  const dpiSteps = [1, 0.85, 0.7, 0.55, 0.42, 0.3].map((f) => Math.round(dpiLo + (dpiHi - dpiLo) * f));
  for (const f of [1, 0.82, 0.66, 0.5, 0.34, 0]) {
    rungs.push({
      quality: qLo + (qHi - qLo) * Math.max(0, f),
      dpi: Math.round(dpiLo + (dpiHi - dpiLo) * Math.max(0, f)),
    });
  }
  // ensure uniqueness
  const seen = new Set<string>();
  const ladder = rungs.filter((r) => {
    const k = `${r.quality.toFixed(2)}:${r.dpi}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  let best: { bytes: Uint8Array; quality: number; dpi: number } | null = null;
  for (let i = 0; i < ladder.length; i++) {
    const { quality, dpi } = ladder[i];
    onProgress?.(`Testing quality ${(quality * 100).toFixed(0)}% at ${dpi} DPI...`, 10 + Math.round((i / ladder.length) * 80));
    const bytes = await compressAtParams(pdfJsDoc, quality, dpi, grayscale, onProgress);
    attempts.push({ quality, dpi, size: bytes.length });
    if (bytes.length <= targetBytes) {
      onProgress?.('Target achieved!', 100);
      return {
        blob: new Blob([bytes as any], { type: 'application/pdf' }),
        originalSize,
        newSize: bytes.length,
        targetBytes,
        targetMet: true,
        quality,
        dpi,
        attempts,
      };
    }
    if (!best || bytes.length < best.bytes.length) {
      best = { bytes, quality, dpi };
    }
  }

  // Target not met: return best achieved, honestly.
  onProgress?.('Best achievable compression reached.', 100);
  return {
    blob: new Blob([best!.bytes as any], { type: 'application/pdf' }),
    originalSize,
    newSize: best!.bytes.length,
    targetBytes,
    targetMet: false,
    quality: best!.quality,
    dpi: best!.dpi,
    attempts,
  };
}

export const TARGET_PRESETS = [
  { label: '100 KB', bytes: 100 * 1024 },
  { label: '200 KB', bytes: 200 * 1024 },
  { label: '500 KB', bytes: 500 * 1024 },
  { label: '1 MB', bytes: 1024 * 1024 },
  { label: '2 MB', bytes: 2 * 1024 * 1024 },
  { label: '5 MB', bytes: 5 * 1024 * 1024 },
  { label: '10 MB', bytes: 10 * 1024 * 1024 },
];
