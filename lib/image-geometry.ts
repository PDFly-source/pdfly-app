/**
 * PDFMiniFly — Pure image geometry & processing math.
 *
 * PRIVATE. POWERFUL. LOCAL.
 *
 * This module is deliberately DOM-free: every function here operates on plain
 * numbers/arrays so the core logic can be unit-tested (bun test) and reused
 * inside Web Workers. Canvas/DOM glue lives in lib/image-engine.ts.
 */

// ---------------------------------------------------------------------------
// Dimensions
// ---------------------------------------------------------------------------

export interface Dimensions {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

// ---------------------------------------------------------------------------
// Resize computation
// ---------------------------------------------------------------------------

export type ResizeMode = 'exact' | 'contain' | 'percent';

export interface ResizeOptions {
  mode: ResizeMode;
  /** Target width in pixels (mode: exact/contain) */
  width?: number;
  /** Target height in pixels (mode: exact/contain) */
  height?: number;
  /** Scale factor 0..10 (mode: percent) */
  percent?: number;
  /**
   * When true in exact mode with only one dimension provided, the other
   * dimension follows the source aspect ratio. In contain mode the image
   * is scaled to fit inside (width × height) without distortion.
   */
  lockAspect: boolean;
}

/**
 * Compute the output pixel dimensions for a resize operation.
 *
 * - 'exact':    output is exactly width × height (both required, or one
 *               resolved through lockAspect against the source ratio).
 * - 'contain':  output fits inside width × height preserving aspect ratio.
 * - 'percent':  output is the source scaled by percent/100.
 *
 * Always returns positive integers (canvas dimensions).
 */
export function computeResizedDimensions(source: Dimensions, opts: ResizeOptions): Dimensions {
  const srcW = Math.max(1, Math.floor(source.width));
  const srcH = Math.max(1, Math.floor(source.height));
  const srcRatio = srcW / srcH;

  const round = (n: number) => Math.max(1, Math.round(n));

  if (opts.mode === 'percent') {
    const factor = clamp(opts.percent ?? 100, 1, 1000) / 100;
    return { width: round(srcW * factor), height: round(srcH * factor) };
  }

  if (opts.mode === 'contain') {
    const boxW = Math.max(1, Math.floor(opts.width ?? srcW));
    const boxH = Math.max(1, Math.floor(opts.height ?? srcH));
    if (boxW / boxH > srcRatio) {
      // box wider than image -> height is the constraint
      return { width: round(boxH * srcRatio), height: boxH };
    }
    return { width: boxW, height: round(boxW / srcRatio) };
  }

  // exact
  let w = opts.width;
  let h = opts.height;
  if (w != null && h != null) {
    return { width: Math.max(1, Math.floor(w)), height: Math.max(1, Math.floor(h)) };
  }
  if (w != null && h == null) {
    return { width: Math.max(1, Math.floor(w)), height: round(w / srcRatio) };
  }
  if (w == null && h != null) {
    return { width: round(h * srcRatio), height: Math.max(1, Math.floor(h)) };
  }
  return { width: srcW, height: srcH };
}

// ---------------------------------------------------------------------------
// Aspect-ratio presets
// ---------------------------------------------------------------------------

export interface AspectPreset {
  id: string;
  label: string;
  /** width / height; null = free crop */
  ratio: number | null;
}

export const ASPECT_PRESETS: AspectPreset[] = [
  { id: 'free', label: 'Free', ratio: null },
  { id: '1:1', label: '1:1 Square', ratio: 1 },
  { id: '4:5', label: '4:5 Portrait', ratio: 4 / 5 },
  { id: '3:4', label: '3:4 Classic', ratio: 3 / 4 },
  { id: '16:9', label: '16:9 Wide', ratio: 16 / 9 },
  { id: 'a4', label: 'A4 (√2)', ratio: Math.SQRT2 },
];

/**
 * Largest centered rect with the given aspect ratio that fits inside
 * `container`. Returns the full container when ratio is null (free).
 */
export function rectFromAspect(container: Dimensions, ratio: number | null): Rect {
  const cw = Math.max(0, Math.floor(container.width));
  const ch = Math.max(0, Math.floor(container.height));
  if (ratio == null || ratio <= 0 || cw === 0 || ch === 0) {
    return { x: 0, y: 0, width: cw, height: ch };
  }
  let w = cw;
  let h = Math.round(cw / ratio);
  if (h > ch) {
    h = ch;
    w = Math.round(ch * ratio);
  }
  return {
    x: Math.floor((cw - w) / 2),
    y: Math.floor((ch - h) / 2),
    width: w,
    height: h,
  };
}

/**
 * Clamp a crop rect so it is inside `bounds`, has integer pixel edges and
 * respects a minimum edge size (never produces a 0-size crop).
 */
export function clampCropRect(rect: Rect, bounds: Dimensions, minEdge = 8): Rect {
  const bw = Math.max(0, Math.floor(bounds.width));
  const bh = Math.max(0, Math.floor(bounds.height));
  const min = Math.min(minEdge, bw, bh);
  let w = clamp(Math.floor(rect.width), min, bw);
  let h = clamp(Math.floor(rect.height), min, bh);
  let x = clamp(Math.floor(rect.x), 0, bw - w);
  let y = clamp(Math.floor(rect.y), 0, bh - h);
  return { x, y, width: w, height: h };
}

/**
 * Output pixel size of a crop, accounting for 90° rotation (image pixels,
 * not CSS): rotating a w×h crop by 90/270 swaps its edges.
 */
export function cropOutputSize(rect: Rect, rotationQuarterTurns: number): Dimensions {
  const q = ((rotationQuarterTurns % 4) + 4) % 4;
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  return q % 2 === 1 ? { width: h, height: w } : { width: w, height: h };
}

// ---------------------------------------------------------------------------
// Target-size quality search
// ---------------------------------------------------------------------------

export interface EncodedCandidate {
  blob: Blob;
  bytes: number;
}

/** Injected encoder: maps a quality (0..1) to an encoded candidate. */
export type QualityEncoder = (quality: number) => Promise<EncodedCandidate>;

export interface QualitySearchResult {
  blob: Blob;
  bytes: number;
  quality: number;
  targetBytes: number;
  /** true only when the returned blob is within tolerance of the target */
  targetMet: boolean;
  iterations: number;
}

export interface QualitySearchOptions {
  /** lowest quality to try (default 0.3) */
  minQuality?: number;
  /** highest quality to try (default 0.95) */
  maxQuality?: number;
  /** allowed overshoot fraction (default 0.02 = result may be up to 2% over target) */
  tolerance?: number;
  /** hard cap on encode attempts (default 8) */
  maxIterations?: number;
  /** optional abort check between encodes */
  shouldAbort?: () => boolean;
}

/**
 * Binary-search the encoder quality whose output is closest to — but not
 * above (within tolerance) — targetBytes. Honest by construction:
 * the returned `targetMet` flag is computed from the ACTUAL encoded size.
 *
 * If even minQuality overshoots the target, the smallest result is returned
 * with targetMet = false so the UI can report the real, best-achievable size.
 */
export async function searchQualityForTarget(
  encode: QualityEncoder,
  targetBytes: number,
  options: QualitySearchOptions = {}
): Promise<QualitySearchResult> {
  const minQ = clamp(options.minQuality ?? 0.3, 0.01, 1);
  const maxQ = clamp(options.maxQuality ?? 0.95, minQ, 1);
  const tolerance = clamp(options.tolerance ?? 0.02, 0, 0.2);
  const maxIterations = Math.max(1, Math.floor(options.maxIterations ?? 8));

  let best: (EncodedCandidate & { quality: number }) | null = null;
  let smallest: (EncodedCandidate & { quality: number }) | null = null;
  let iterations = 0;

  // Start from the highest quality: if that already fits, no search needed.
  let lo = minQ;
  let hi = maxQ;
  let nextQuality = maxQ;

  while (iterations < maxIterations) {
    const candidate = await encode(nextQuality);
    iterations += 1;

    if (!smallest || candidate.bytes < smallest.bytes) {
      smallest = { ...candidate, quality: nextQuality };
    }
    if (candidate.bytes <= targetBytes * (1 + tolerance) && (!best || candidate.bytes > best.bytes)) {
      best = { ...candidate, quality: nextQuality };
    }

    if (options.shouldAbort?.()) break;

    if (best && iterations >= maxIterations) break;

    if (candidate.bytes > targetBytes) {
      // too big -> lower quality
      hi = nextQuality;
    } else if (candidate.bytes < targetBytes * (1 - tolerance)) {
      // comfortably under target -> can afford higher quality
      lo = nextQuality;
    } else {
      // inside tolerance window
      break;
    }

    const mid = (lo + hi) / 2;
    if (Math.abs(mid - nextQuality) < 0.01) {
      // converged; nothing new to try. best stays null when the target was
      // never met — targetMet must reflect the truth.
      break;
    }
    nextQuality = mid;
  }

  const winner = best ?? smallest;
  if (!winner) {
    throw new Error('Encoding failed: no candidate produced.');
  }
  return {
    blob: winner.blob,
    bytes: winner.bytes,
    quality: winner.quality,
    targetBytes,
    targetMet: !!best,
    iterations,
  };
}

// ---------------------------------------------------------------------------
// Watermark tiling layout
// ---------------------------------------------------------------------------

export interface TileGridOptions {
  /** rotation in degrees (applied around each tile center) */
  rotation?: number;
  /** extra spacing factor: 1 = tiles touch, 2 = one tile gap, etc. */
  spacing?: number;
}

/**
 * Compute tile center positions covering `canvas` for a watermark of size
 * `tile`. Used by the tiled watermark mode; positions are in canvas pixels.
 * The expansion factor guarantees rotated tiles cover the corners too.
 */
export function computeTileGrid(canvas: Dimensions, tile: Dimensions, opts: TileGridOptions = {}): { x: number; y: number }[] {
  const tw = Math.max(1, Math.floor(tile.width));
  const th = Math.max(1, Math.floor(tile.height));
  const spacing = clamp(opts.spacing ?? 1.6, 1.1, 4);
  const rot = ((opts.rotation ?? 0) * Math.PI) / 180;

  // Effective footprint of the rotated tile
  const cos = Math.abs(Math.cos(rot));
  const sin = Math.abs(Math.sin(rot));
  const fx = Math.max(1, tw * cos + th * sin);
  const fy = Math.max(1, tw * sin + th * cos);

  const stepX = Math.max(1, fx * spacing);
  const stepY = Math.max(1, fy * spacing);

  const positions: { x: number; y: number }[] = [];
  const cols = Math.ceil(canvas.width / stepX) + 2;
  const rows = Math.ceil(canvas.height / stepY) + 2;
  const startX = (canvas.width - (cols - 1) * stepX) / 2;
  const startY = (canvas.height - (rows - 1) * stepY) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      positions.push({ x: startX + c * stepX, y: startY + r * stepY });
    }
  }
  return positions;
}

/**
 * Anchor point (top-left offset) for a single positioned element inside a
 * canvas, from a 3×3 position grid + margin.
 */
export const WATERMARK_POSITIONS = [
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-center', label: 'Top Center' },
  { id: 'top-right', label: 'Top Right' },
  { id: 'middle-left', label: 'Middle Left' },
  { id: 'center', label: 'Center' },
  { id: 'middle-right', label: 'Middle Right' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'bottom-center', label: 'Bottom Center' },
  { id: 'bottom-right', label: 'Bottom Right' },
] as const;

export type WatermarkPositionId = (typeof WATERMARK_POSITIONS)[number]['id'];

export function anchorForPosition(
  canvas: Dimensions,
  item: Dimensions,
  position: WatermarkPositionId,
  margin: number
): { x: number; y: number } {
  const m = Math.max(0, margin);
  const left = m;
  const centerX = (canvas.width - item.width) / 2;
  const right = canvas.width - item.width - m;
  const top = m;
  const centerY = (canvas.height - item.height) / 2;
  const bottom = canvas.height - item.height - m;
  switch (position) {
    case 'top-left': return { x: left, y: top };
    case 'top-center': return { x: centerX, y: top };
    case 'top-right': return { x: right, y: top };
    case 'middle-left': return { x: left, y: centerY };
    case 'center': return { x: centerX, y: centerY };
    case 'middle-right': return { x: right, y: centerY };
    case 'bottom-left': return { x: left, y: bottom };
    case 'bottom-center': return { x: centerX, y: bottom };
    case 'bottom-right': return { x: right, y: bottom };
  }
}

// ---------------------------------------------------------------------------
// Separable box blur (pure; used for mask feathering + annotation blur)
// ---------------------------------------------------------------------------

/**
 * Box-blur a single-channel mask (Uint8ClampedArray of length w*h) with the
 * given radius. Radius 0 returns the input unchanged. Two passes (h, v).
 */
export function boxBlurMask(mask: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
  const r = Math.max(0, Math.floor(radius));
  if (r === 0 || width < 2 || height < 2) {
    return mask;
  }
  const k = r * 2 + 1;
  const n = width * height;
  const horizontal = new Uint8ClampedArray(n);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let sum = 0;
    for (let i = -r; i <= r; i++) {
      sum += mask[row + clamp(i, 0, width - 1)];
    }
    for (let x = 0; x < width; x++) {
      horizontal[row + x] = sum / k;
      sum += mask[row + clamp(x + r + 1, 0, width - 1)] - mask[row + clamp(x - r, 0, width - 1)];
    }
  }
  const out = new Uint8ClampedArray(n);
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let i = -r; i <= r; i++) {
      sum += horizontal[clamp(i, 0, height - 1) * width + x];
    }
    for (let y = 0; y < height; y++) {
      out[y * width + x] = sum / k;
      sum += horizontal[clamp(y + r + 1, 0, height - 1) * width + x] - horizontal[clamp(y - r, 0, height - 1) * width + x];
    }
  }
  return out;
}

/**
 * Convert a per-pixel alpha mask (length w*h, 0..255) into premultiplied RGBA
 * composite data for an existing RGBA buffer: pixels whose mask value is 255
 * are treated as fully removed (alpha 0), 0 fully kept.
 * `rgba` is modified in place; returns the same buffer.
 */
export function applyBackgroundMaskToRGBA(rgba: Uint8ClampedArray, mask: Uint8ClampedArray): Uint8ClampedArray {
  const px = Math.min(rgba.length >> 2, mask.length);
  for (let i = 0; i < px; i++) {
    // mask 255 => remove => alpha 0 ; mask 0 => keep => alpha unchanged
    const m = mask[i];
    if (m >= 255) {
      rgba[i * 4 + 3] = 0;
    } else if (m > 0) {
      rgba[i * 4 + 3] = (rgba[i * 4 + 3] * (255 - m)) / 255;
    }
  }
  return rgba;
}
