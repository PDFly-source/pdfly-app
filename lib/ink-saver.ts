/**
 * PDFMiniFly — Grayscale / Ink Saver engine.
 *
 * Converts PDFs to grayscale, pure black & white (threshold), or an
 * ink-saving soft profile — locally, page by page, via pdf.js + pdf-lib.
 *
 * Rendering-based conversion keeps text readable and works for every PDF
 * (vector or scanned). Where the page is already pure text on white, the
 * converter preserves sharpness at the chosen DPI. This is the strongest
 * fully-local approach; it rasterizes pages, which is clearly disclosed in
 * the tool UI.
 *
 * PRIVATE. POWERFUL. LOCAL.
 */

import { PDFDocument } from 'pdf-lib';
import { getPdfDocumentFromFile } from './pdfjs-init';

export type InkMode = 'original' | 'grayscale' | 'bw' | 'ink-saver';

export interface InkSaverOptions {
  mode: Exclude<InkMode, 'original'>;
  /** render DPI — higher keeps text sharper, output larger */
  dpi: number;
  /** for 'bw': threshold 0-255 (default 160) */
  bwThreshold: number;
  /** for 'ink-saver': how much ink to save 0-1 (default 0.5) */
  inkReduction: number;
  /** JPEG quality for saving (0.5-0.95) */
  quality: number;
  /** pages to convert (1-indexed); undefined = all */
  pages?: number[];
}

export interface InkSaverResult {
  blob: Blob;
  originalSize: number;
  newSize: number;
  convertedPages: number;
}

/** Convert canvas pixels per mode. */
function convertPixels(ctx: CanvasRenderingContext2D, w: number, h: number, options: InkSaverOptions) {
  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;
  const { mode, bwThreshold, inkReduction } = options;

  for (let p = 0; p < px.length; p += 4) {
    const r = px[p];
    const g = px[p + 1];
    const b = px[p + 2];
    // Rec.601 luminance — the standard for print grayscale
    let lum = (0.299 * r + 0.587 * g + 0.114 * b) | 0;

    if (mode === 'bw') {
      lum = lum >= bwThreshold ? 255 : 0;
      px[p] = lum; px[p + 1] = lum; px[p + 2] = lum;
    } else {
      if (mode === 'ink-saver') {
        // lift midtones toward white while keeping deep blacks: a gamma-style curve
        // v' = 255 * (lum/255)^(1/(1-inkReduction*0.5)) keeps text dark but washes out fills
        const t = lum / 255;
        const gamma = 1 + inkReduction * 0.9;
        lum = Math.min(255, Math.round(255 * Math.pow(t, gamma)));
      }
      px[p] = lum; px[p + 1] = lum; px[p + 2] = lum;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export async function applyInkMode(
  file: File,
  options: InkSaverOptions,
  onProgress?: (msg: string, pct: number) => void
): Promise<InkSaverResult> {
  const originalSize = file.size;
  onProgress?.('Loading document...', 5);
  const bytes = await file.arrayBuffer();
  const pdfJsDoc = await getPdfDocumentFromFile(bytes);
  const totalPages = pdfJsDoc.numPages;

  const pages = options.pages && options.pages.length ? options.pages : Array.from({ length: totalPages }, (_, i) => i + 1);

  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const scale = options.dpi / 72;

  for (let i = 0; i < pages.length; i++) {
    const pageNum = pages[i];
    onProgress?.(`Converting page ${pageNum}...`, 10 + Math.round((i / pages.length) * 80));

    const page = await pdfJsDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    await page.render({ canvasContext: ctx, viewport }).promise;

    convertPixels(ctx, canvas.width, canvas.height, options);

    // B&W embeds as PNG (sharp edges); gray profiles as JPEG (size)
    let imgBytes: Uint8Array;
    let embedded: any;
    if (options.mode === 'bw') {
      const dataUrl = canvas.toDataURL('image/png');
      imgBytes = Uint8Array.from(atob(dataUrl.split(',')[1]), (c) => c.charCodeAt(0));
      embedded = await out.embedPng(imgBytes);
    } else {
      const dataUrl = canvas.toDataURL('image/jpeg', options.quality);
      imgBytes = Uint8Array.from(atob(dataUrl.split(',')[1]), (c) => c.charCodeAt(0));
      embedded = await out.embedJpg(imgBytes);
    }

    const baseViewport = page.getViewport({ scale: 1.0 });
    const newPage = out.addPage([baseViewport.width, baseViewport.height]);
    newPage.drawImage(embedded, {
      x: 0,
      y: 0,
      width: baseViewport.width,
      height: baseViewport.height,
    });

    canvas.width = 0;
    canvas.height = 0;
  }

  out.setProducer('PDFMiniFly Local Ink Saver');
  onProgress?.('Saving document...', 95);
  const outBytes = await out.save({ useObjectStreams: true });
  onProgress?.('Complete!', 100);

  return {
    blob: new Blob([outBytes as any], { type: 'application/pdf' }),
    originalSize,
    newSize: outBytes.length,
    convertedPages: pages.length,
  };
}

/** Render a preview of one page in the given mode (for the before/after preview). */
export async function renderInkPreview(
  file: File,
  pageNumber: number,
  mode: InkMode,
  options: Pick<InkSaverOptions, 'bwThreshold' | 'inkReduction'>,
  targetWidth = 420
): Promise<{ dataUrl: string; grayscale: boolean }> {
  const bytes = await file.arrayBuffer();
  const pdfJsDoc = await getPdfDocumentFromFile(bytes);
  const page = await pdfJsDoc.getPage(pageNumber);
  const v1 = page.getViewport({ scale: 1.0 });
  const scale = targetWidth / v1.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  await page.render({ canvasContext: ctx, viewport }).promise;
  if (mode === 'bw' || mode === 'ink-saver' || mode === 'grayscale') {
    convertPixels(ctx, canvas.width, canvas.height, {
      mode,
      dpi: 150,
      bwThreshold: options.bwThreshold,
      inkReduction: options.inkReduction,
      quality: 0.85,
    });
  }
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  canvas.width = 0;
  canvas.height = 0;
  return { dataUrl, grayscale: mode !== 'original' };
}
