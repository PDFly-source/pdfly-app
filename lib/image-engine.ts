/**
 * PDFMiniFly — Local image processing engine (browser).
 *
 * PRIVATE. POWERFUL. LOCAL.
 *
 * All operations below run entirely in the browser: decode via
 * createImageBitmap (HTMLImageElement fallback), transform via
 * Canvas/OffscreenCanvas, encode via canvas.toBlob. No network calls, no
 * uploads. Heavy color segmentation runs inside a Blob Worker built from
 * lib/image-segmentation.ts (main-thread fallback included).
 *
 * Geometry math lives in lib/image-geometry.ts (pure, unit-tested).
 */

import {
  computeResizedDimensions,
  searchQualityForTarget,
  type Dimensions,
  type QualitySearchResult,
  type Rect,
  type WatermarkPositionId,
  anchorForPosition,
  computeTileGrid,
} from './image-geometry';
import {
  segmentBackgroundSmartColor,
  smartColorWorkerBody,
  type SmartColorOptions,
} from './image-segmentation';
import { withBasePath } from './base-path';

// ---------------------------------------------------------------------------
// Decode
// ---------------------------------------------------------------------------

export interface LoadedImage {
  source: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  dispose: () => void;
}

/**
 * Decode a File/Blob into a drawable source. Falls back to an object-URL
 * <img> when createImageBitmap is unavailable (older Safari). The returned
 * dispose() releases the bitmap / object URL.
 */
export async function loadImage(file: File | Blob): Promise<LoadedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      };
    } catch {
      // fall through to <img> (e.g. exotic formats)
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('This file could not be decoded as an image. Is it a valid JPG, PNG, or WebP?'));
      el.src = url;
    });
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      dispose: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

/** Memory guard: refuse images whose decoded size would blow up mobile RAM. */
export function assertDecodedSize(w: number, h: number, maxMegapixels = 100): void {
  const mp = (w * h) / 1_000_000;
  if (mp > maxMegapixels) {
    throw new Error(
      `Image is ${w}×${h} (${mp.toFixed(0)} MP). For safety, PDFMiniFly limits local processing to ${maxMegapixels} MP — your browser would otherwise run out of memory. Resize the image first.`
    );
  }
}

// ---------------------------------------------------------------------------
// Canvas helpers
// ---------------------------------------------------------------------------

export function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(width));
  canvas.height = Math.max(1, Math.floor(height));
  return canvas;
}

export function canvasFromImage(img: LoadedImage, maxEdge?: number): HTMLCanvasElement {
  let w = img.width;
  let h = img.height;
  if (maxEdge && Math.max(w, h) > maxEdge) {
    const scale = maxEdge / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not create a 2D canvas.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img.source as CanvasImageSource, 0, 0, w, h);
  return canvas;
}

export function encodeCanvas(canvas: HTMLCanvasElement, mime: string, quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`Your browser could not encode ${mime}.`));
      },
      mime,
      quality
    );
  });
}

export type ImageOutputFormat = 'image/jpeg' | 'image/png' | 'image/webp';

export function supportsFormat(mime: string): boolean {
  const c = makeCanvas(1, 1);
  return c.toDataURL(mime).startsWith(`data:${mime}`);
}

export function extensionForFormat(format: ImageOutputFormat): string {
  switch (format) {
    case 'image/jpeg': return '.jpg';
    case 'image/webp': return '.webp';
    default: return '.png';
  }
}

/** JPEG has no alpha channel: flatten transparency onto white (or a custom color). */
export function flattenForJpeg(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

// ---------------------------------------------------------------------------
// Resize / convert
// ---------------------------------------------------------------------------

export interface ResizeJob {
  width?: number;
  height?: number;
  mode: 'exact' | 'contain' | 'percent';
  percent?: number;
  lockAspect: boolean;
  format: ImageOutputFormat;
  quality?: number;
}

export async function resizeLoadedImage(
  img: LoadedImage,
  job: ResizeJob
): Promise<{ blob: Blob; output: Dimensions }> {
  const dims = computeResizedDimensions(img, {
    mode: job.mode,
    width: job.width,
    height: job.height,
    percent: job.percent,
    lockAspect: job.lockAspect,
  });
  const canvas = makeCanvas(dims.width, dims.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not create a 2D canvas.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img.source as CanvasImageSource, 0, 0, dims.width, dims.height);
  if (job.format === 'image/jpeg') flattenForJpeg(ctx, dims.width, dims.height);
  const blob = await encodeCanvas(canvas, job.format, job.quality ?? 0.92);
  canvas.width = 0;
  canvas.height = 0;
  return { blob, output: dims };
}

// ---------------------------------------------------------------------------
// Compress (quality mode + honest target-size mode)
// ---------------------------------------------------------------------------

export interface CompressResult {
  blob: Blob;
  bytes: number;
  quality?: number;
  targetMet?: boolean;
}

export async function compressLoadedImage(
  img: LoadedImage,
  format: ImageOutputFormat,
  quality: number
): Promise<CompressResult> {
  const canvas = canvasFromImage(img);
  const ctx = canvas.getContext('2d');
  if (ctx && format === 'image/jpeg') flattenForJpeg(ctx, canvas.width, canvas.height);
  const blob = await encodeCanvas(canvas, format, quality);
  canvas.width = 0;
  canvas.height = 0;
  return { blob, bytes: blob.size };
}

/**
 * Compress to a target file size (± tolerance) by searching the quality
 * parameter. Honest: `targetMet` reflects the ACTUAL produced bytes.
 */
export async function compressImageToTarget(
  img: LoadedImage,
  format: ImageOutputFormat,
  targetBytes: number,
  opts: { shouldAbort?: () => boolean; onProgress?: (pct: number, label: string) => void } = {}
): Promise<QualitySearchResult & { blob: Blob }> {
  const w = img.width;
  const h = img.height;
  const makeEncoderCanvas = () => {
    const canvas = makeCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser could not create a 2D canvas.');
    ctx.drawImage(img.source as CanvasImageSource, 0, 0, w, h);
    if (format === 'image/jpeg') flattenForJpeg(ctx, w, h);
    return canvas;
  };

  // one canvas reused across encodes (toBlob does not modify pixels)
  let sharedCanvas: HTMLCanvasElement | null = makeEncoderCanvas();

  const result = await searchQualityForTarget(
    async (q) => {
      opts.onProgress?.(0, 'Encoding at chosen quality…');
      const blob = await encodeCanvas(sharedCanvas!, format, q);
      return { blob, bytes: blob.size };
    },
    targetBytes,
    { shouldAbort: opts.shouldAbort, maxIterations: 8, tolerance: 0.02 }
  );

  sharedCanvas!.width = 0;
  sharedCanvas!.height = 0;
  sharedCanvas = null;
  return { ...result, blob: result.blob };
}

// ---------------------------------------------------------------------------
// Crop (real pixels; supports rotate/flip applied at export)
// ---------------------------------------------------------------------------

export interface CropTransform {
  rect: Rect;
  /** quarter turns 0..3 (90° clockwise each) */
  rotationQuarterTurns: number;
  flipH: boolean;
  flipV: boolean;
}

export async function cropLoadedImage(
  img: LoadedImage,
  transform: CropTransform,
  format: ImageOutputFormat,
  quality = 0.92
): Promise<{ blob: Blob; output: Dimensions }> {
  const src = canvasFromImage(img);
  const { rect, rotationQuarterTurns, flipH, flipV } = transform;
  const rot = ((rotationQuarterTurns % 4) + 4) % 4;
  const swap = rot % 2 === 1;
  const outW = swap ? rect.height : rect.width;
  const outH = swap ? rect.width : rect.height;

  const canvas = makeCanvas(outW, outH);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not create a 2D canvas.');
  ctx.imageSmoothingQuality = 'high';

  ctx.save();
  // translate to output center, apply rotation & flips, then draw the crop
  ctx.translate(outW / 2, outH / 2);
  ctx.rotate((rot * Math.PI) / 2);
  if (flipH) ctx.scale(-1, 1);
  if (flipV) ctx.scale(1, -1);
  ctx.drawImage(src, rect.x, rect.y, rect.width, rect.height, -rect.width / 2, -rect.height / 2, rect.width, rect.height);
  ctx.restore();

  if (format === 'image/jpeg') flattenForJpeg(ctx, outW, outH);
  const blob = await encodeCanvas(canvas, format, quality);
  src.width = 0;
  src.height = 0;
  canvas.width = 0;
  canvas.height = 0;
  return { blob, output: { width: outW, height: outH } };
}

// ---------------------------------------------------------------------------
// Background removal — Smart Color (Blob worker, main-thread fallback)
// ---------------------------------------------------------------------------

export interface SmartColorRemovalResult {
  blob: Blob;
  backgroundRatio: number;
}

export async function removeBackgroundSmartColor(
  img: LoadedImage,
  options: SmartColorOptions & { onProgress?: (pct: number, label: string) => void } = {}
): Promise<SmartColorRemovalResult> {
  const { onProgress, ...segOptions } = options;
  onProgress?.(8, 'Reading pixels…');
  const canvas = canvasFromImage(img);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Your browser could not create a 2D canvas.');
  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const rgba = imageData.data as unknown as Uint8ClampedArray;
  // getImageData always returns RGBA; make alpha fully opaque so the border
  // color average is not skewed by transparent backgrounds.
  for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255;

  onProgress?.(20, 'Analyzing background (worker)…');

  const result = await runSmartColor(rgba, w, h, segOptions);
  onProgress?.(80, 'Applying transparency mask…');

  const out = new Uint8ClampedArray(rgba);
  applyMaskAlpha(out, result.mask);
  imageData.data.set(out);
  ctx.putImageData(imageData, 0, 0);
  const blob = await encodeCanvas(canvas, 'image/png');
  canvas.width = 0;
  canvas.height = 0;
  onProgress?.(100, 'Done');
  return { blob, backgroundRatio: result.backgroundRatio };
}

function applyMaskAlpha(rgba: Uint8ClampedArray, mask: Uint8ClampedArray): void {
  const px = Math.min(rgba.length >> 2, mask.length);
  for (let i = 0; i < px; i++) {
    const m = mask[i];
    if (m >= 255) rgba[i * 4 + 3] = 0;
    else if (m > 0) rgba[i * 4 + 3] = (rgba[i * 4 + 3] * (255 - m)) / 255;
  }
}

interface MaskOutcome {
  mask: Uint8ClampedArray;
  backgroundRatio: number;
  error?: string;
}

/**
 * Run the flood-fill segmentation. Uses a Blob Worker (from a serialized,
 * dependency-free function) for big images; falls back to the main thread
 * for small ones or when Workers are unavailable.
 */
async function runSmartColor(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  options: SmartColorOptions
): Promise<MaskOutcome> {
  const pixels = width * height;
  const useWorker =
    typeof Worker !== 'undefined' && pixels > 300_000; // >0.3 MP: off the UI thread

  if (useWorker) {
    try {
      return await new Promise<MaskOutcome>((resolve, reject) => {
        const source = `(${smartColorWorkerBody.toString()})(self);`;
        const blobUrl = URL.createObjectURL(new Blob([source], { type: 'application/javascript' }));
        const worker = new Worker(blobUrl);
        let settled = false;
        const cleanup = () => {
          worker.terminate();
          URL.revokeObjectURL(blobUrl);
        };
        worker.onmessage = (ev: MessageEvent<MaskOutcome & { error?: string }>) => {
          settled = true;
          cleanup();
          if (ev.data.error) reject(new Error(ev.data.error));
          else resolve({ mask: ev.data.mask, backgroundRatio: ev.data.backgroundRatio });
        };
        worker.onerror = (ev) => {
          if (!settled) {
            cleanup();
            reject(new Error(ev.message || 'Background worker failed.'));
          }
        };
        // transfer the pixel buffer (copy of the working array)
        const copy = new Uint8ClampedArray(rgba);
        worker.postMessage(
          { rgba: copy, width, height, tolerance: options.tolerance ?? 32, feather: options.feather ?? 2 },
          [copy.buffer]
        );
      });
    } catch {
      // Worker path failed (rare, e.g. CSP): fall back below.
    }
  }

  const r = segmentBackgroundSmartColor(rgba, width, height, options);
  return { mask: r.mask, backgroundRatio: r.backgroundRatio };
}

// ---------------------------------------------------------------------------
// Background removal — AI Person mode (MediaPipe, fully local inference)
// ---------------------------------------------------------------------------

/**
 * MediaPipe Selfie Segmentation keeps its runtime + model files in
 * /mediapipe (vendored, same-origin). locateFile maps to the deployment-
 * aware public path, so this works on both GitHub Pages and Cloudflare.
 */
let segmenterInstance: any = null;
let segmenterReady: Promise<unknown> | null = null;

async function getPersonSegmenter(onStatus?: (label: string) => void): Promise<unknown> {
  if (!segmenterInstance) {
    onStatus?.('Loading the local AI model (first use only)…');
    const mod = await import('@mediapipe/selfie_segmentation');
    const SelfieSegmentation = mod.SelfieSegmentation ?? (mod.default as unknown as { new (o: unknown): unknown });
    segmenterInstance = new (SelfieSegmentation as any)({
      locateFile: (file: string) => withBasePath(`/mediapipe/${file}`),
    });
    segmenterInstance.setOptions({ modelSelection: 1, selfieMode: false });
    segmenterReady = segmenterInstance.initialize?.() ?? Promise.resolve();
  }
  await segmenterReady;
  return segmenterInstance;
}

/** Release the ML runtime (called when the tool unmounts). */
export function disposePersonSegmenter(): void {
  try {
    segmenterInstance?.close?.();
  } catch {
    // ignore double-close
  }
  segmenterInstance = null;
  segmenterReady = null;
}

export interface PersonRemovalResult {
  blob: Blob;
}

/**
 * Remove the background around PEOPLE using MediaPipe's local segmentation
 * model. Inference runs in the user's browser on a GPU-accelerated WASM
 * pipeline; the image never leaves the device. The model weights are small
 * (~250 KB) and served from this site (no third-party CDN).
 *
 * Note: this model segments PEOPLE (portraits, group photos). Product shots
 * work best with the Smart Color mode instead.
 */
export async function removeBackgroundPerson(
  img: LoadedImage,
  opts: { onProgress?: (pct: number, label: string) => void } = {}
): Promise<PersonRemovalResult> {
  const { onProgress } = opts;
  onProgress?.(10, 'Preparing local AI…');
  const segmenter = (await getPersonSegmenter((l) => onProgress?.(20, l))) as any;

  // Inference on a downscaled canvas keeps memory bounded; the mask is
  // scaled back to full resolution with smooth interpolation.
  const inferenceCanvas = canvasFromImage(img, 2048);
  onProgress?.(45, 'Running local segmentation…');

  const maskCanvas = await new Promise<HTMLCanvasElement>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('The segmentation model took too long to respond. Please retry.')), 60_000);
    segmenter.onResults((results: { segmentationMask: HTMLCanvasElement }) => {
      window.clearTimeout(timeout);
      try {
        const mask = makeCanvas(results.segmentationMask.width, results.segmentationMask.height);
        const mctx = mask.getContext('2d');
        if (!mctx) throw new Error('Your browser could not create a 2D canvas.');
        mctx.drawImage(results.segmentationMask, 0, 0);
        resolve(mask);
      } catch (err) {
        reject(err as Error);
      }
    });
    segmenter.send({ image: inferenceCanvas }).catch((err: Error) => {
      window.clearTimeout(timeout);
      reject(new Error(`Local model failed: ${err?.message || err}`));
    });
  });

  onProgress?.(75, 'Applying mask…');

  // MediaPipe's mask is white where a person is detected. Build an alpha
  // mask canvas from its red channel, then composite at full resolution.
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
  if (!maskCtx) throw new Error('Your browser could not create a 2D canvas.');
  const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  const alphaCanvas = makeCanvas(maskCanvas.width, maskCanvas.height);
  const alphaCtx = alphaCanvas.getContext('2d');
  if (!alphaCtx) throw new Error('Your browser could not create a 2D canvas.');
  const outAlpha = alphaCtx.createImageData(alphaCanvas.width, alphaCanvas.height);
  const src = maskData.data;
  const dst = outAlpha.data;
  for (let p = 0; p < dst.length; p += 4) {
    dst[p] = 255;
    dst[p + 1] = 255;
    dst[p + 2] = 255;
    dst[p + 3] = src[p + 3] === 0 ? src[p] : Math.max(src[p], src[p + 3]); // person = opaque
  }
  alphaCtx.putImageData(outAlpha, 0, 0);

  const full = canvasFromImage(img); // full resolution
  const fctx = full.getContext('2d');
  if (!fctx) throw new Error('Your browser could not create a 2D canvas.');
  fctx.imageSmoothingEnabled = true;
  fctx.imageSmoothingQuality = 'high';
  fctx.globalCompositeOperation = 'destination-in';
  fctx.drawImage(alphaCanvas, 0, 0, full.width, full.height);
  fctx.globalCompositeOperation = 'source-over';

  const blob = await encodeCanvas(full, 'image/png');
  inferenceCanvas.width = 0;
  inferenceCanvas.height = 0;
  maskCanvas.width = 0;
  maskCanvas.height = 0;
  alphaCanvas.width = 0;
  alphaCanvas.height = 0;
  full.width = 0;
  full.height = 0;
  onProgress?.(100, 'Done');
  return { blob };
}

// ---------------------------------------------------------------------------
// Watermark text rendering
// ---------------------------------------------------------------------------

export interface TextWatermarkStyle {
  text: string;
  fontSize: number; // relative % of image width (0.5..20)
  opacity: number; // 0..1
  rotation: number; // degrees
  color: string;
  font: string; // CSS font family
  bold: boolean;
  italic: boolean;
}

export interface SingleTextLayout {
  position: WatermarkPositionId;
  marginPercent: number; // margin as % of image width
}

export function measureTextWatermark(
  ctx: CanvasRenderingContext2D,
  imageWidth: number,
  style: TextWatermarkStyle
): { fontPx: number; width: number; height: number } {
  const fontPx = Math.max(8, (style.fontSize / 100) * imageWidth);
  ctx.font = `${style.italic ? 'italic ' : ''}${style.bold ? '700' : '400'} ${fontPx}px ${style.font}`;
  const metrics = ctx.measureText(style.text || ' ');
  return { fontPx, width: metrics.width, height: fontPx * 1.2 };
}

export function drawTextWatermark(
  ctx: CanvasRenderingContext2D,
  canvas: Dimensions,
  style: TextWatermarkStyle,
  layout: { tiled: boolean; position?: WatermarkPositionId; marginPercent?: number; spacing?: number }
): void {
  if (!style.text.trim()) return;
  ctx.save();
  ctx.globalAlpha = style.opacity;
  ctx.fillStyle = style.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const measured = measureTextWatermark(ctx, canvas.width, style);
  const tile: Dimensions = { width: measured.width, height: measured.height };

  const drawAt = (cx: number, cy: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((style.rotation * Math.PI) / 180);
    ctx.fillText(style.text, 0, 0);
    ctx.restore();
  };

  if (layout.tiled) {
    const positions = computeTileGrid(canvas, tile, { rotation: style.rotation, spacing: layout.spacing ?? 1.6 });
    for (const p of positions) drawAt(p.x, p.y);
  } else {
    const anchor = anchorForPosition(canvas, tile, layout.position ?? 'bottom-right', ((layout.marginPercent ?? 3) / 100) * canvas.width);
    drawAt(anchor.x + tile.width / 2, anchor.y + tile.height / 2);
  }
  ctx.restore();
}

export interface ImageWatermarkStyle {
  source: CanvasImageSource;
  width: number;
  height: number;
  opacity: number;
  rotation: number;
  scalePercent: number; // logo width as % of image width
  position: WatermarkPositionId;
  marginPercent: number;
}

export function drawImageWatermark(
  ctx: CanvasRenderingContext2D,
  canvas: Dimensions,
  style: ImageWatermarkStyle
): void {
  const w = Math.max(1, (style.scalePercent / 100) * canvas.width);
  const scale = w / Math.max(1, style.width);
  const h = Math.max(1, style.height * scale);
  const anchor = anchorForPosition(canvas, { width: w, height: h }, style.position, (style.marginPercent / 100) * canvas.width);
  ctx.save();
  ctx.globalAlpha = style.opacity;
  ctx.translate(anchor.x + w / 2, anchor.y + h / 2);
  ctx.rotate((style.rotation * Math.PI) / 180);
  ctx.drawImage(style.source, -w / 2, -h / 2, w, h);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Annotation effects: pixelate + blur (real pixel modifications)
// ---------------------------------------------------------------------------

export function pixelateRegion(
  target: CanvasRenderingContext2D,
  region: Rect,
  blockSize: number
): void {
  const bs = Math.max(2, Math.floor(blockSize));
  const w = Math.max(1, Math.floor(region.width));
  const h = Math.max(1, Math.floor(region.height));
  const small = makeCanvas(Math.max(1, Math.floor(w / bs)), Math.max(1, Math.floor(h / bs)));
  const sctx = small.getContext('2d');
  if (!sctx) return;
  sctx.imageSmoothingEnabled = true;
  sctx.drawImage(target.canvas, region.x, region.y, w, h, 0, 0, small.width, small.height);
  // draw back without smoothing = crisp blocks
  const prevSmoothing = target.imageSmoothingEnabled;
  target.imageSmoothingEnabled = false;
  target.drawImage(small, 0, 0, small.width, small.height, region.x, region.y, w, h);
  target.imageSmoothingEnabled = prevSmoothing;
  small.width = 0;
  small.height = 0;
}

/**
 * Blur a rectangular region. Uses native ctx.filter when available,
 * otherwise a multi-pass downscale/upscale approximation (identical visual
 * intent, works in every canvas-capable browser).
 */
export function blurRegion(target: CanvasRenderingContext2D, region: Rect, radius: number): void {
  const w = Math.max(1, Math.floor(region.width));
  const h = Math.max(1, Math.floor(region.height));
  const r = Math.max(1, radius);

  const supportsFilter = (() => {
    try {
      const test = makeCanvas(1, 1).getContext('2d');
      return !!test && 'filter' in test;
    } catch {
      return false;
    }
  })();

  if (supportsFilter) {
    const tmp = makeCanvas(w, h);
    const tctx = tmp.getContext('2d');
    if (!tctx) return;
    tctx.drawImage(target.canvas, region.x, region.y, w, h, 0, 0, w, h);
    tctx.filter = `blur(${r}px)`;
    // drawing a canvas onto itself with a filter is undefined; redraw from tmp
    const tmp2 = makeCanvas(w, h);
    const tctx2 = tmp2.getContext('2d');
    if (!tctx2) return;
    tctx2.filter = `blur(${r}px)`;
    tctx2.drawImage(tmp, 0, 0);
    target.drawImage(tmp2, 0, 0, w, h, region.x, region.y, w, h);
    tmp.width = 0; tmp.height = 0; tmp2.width = 0; tmp2.height = 0;
    return;
  }

  // approximation: repeated downscale/upscale passes
  let pw = w;
  let ph = h;
  const passes = 3;
  let current = makeCanvas(w, h);
  const cctx = current.getContext('2d');
  if (!cctx) return;
  cctx.drawImage(target.canvas, region.x, region.y, w, h, 0, 0, w, h);
  for (let i = 0; i < passes; i++) {
    pw = Math.max(1, Math.floor(pw / Math.max(2, r / 2)));
    ph = Math.max(1, Math.floor(ph / Math.max(2, r / 2)));
    const small = makeCanvas(pw, ph);
    const sctx = small.getContext('2d');
    if (!sctx) return;
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(current, 0, 0, pw, ph);
    current.width = 0; current.height = 0;
    current = small;
  }
  target.imageSmoothingEnabled = true;
  target.imageSmoothingQuality = 'low';
  target.drawImage(current, 0, 0, pw, ph, region.x, region.y, w, h);
  target.imageSmoothingQuality = 'high';
  current.width = 0; current.height = 0;
}

/** Highlight a rectangular region (classic marker effect). */
export function highlightRegion(
  target: CanvasRenderingContext2D,
  region: Rect,
  color: string,
  opacity: number
): void {
  target.save();
  target.globalAlpha = opacity;
  target.fillStyle = color;
  target.fillRect(region.x, region.y, region.width, region.height);
  target.restore();
}
