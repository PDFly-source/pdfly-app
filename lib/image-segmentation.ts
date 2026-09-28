/**
 * PDFMiniFly — Local background segmentation (Smart Color mode).
 *
 * PRIVATE. POWERFUL. LOCAL.
 *
 * Region-growing flood fill from the image borders: pixels connected to the
 * border whose color stays close to the border's dominant color are treated
 * as background. Fully deterministic, runs on plain typed arrays and is
 * therefore unit-testable (bun test) and safe to serialize into a Blob
 * worker (see lib/image-engine.ts — this file's functions must stay free of
 * module-scope imports/closures so they survive fn.toString()).
 */

export interface SmartColorOptions {
  /** 0..255 color distance tolerance for background acceptance */
  tolerance?: number;
  /** feather radius in pixels applied to the final mask */
  feather?: number;
  /** maximum pixels processed before the fill gives up (memory guard) */
  maxPixels?: number;
}

export interface SegmentResult {
  /** length width*height; 255 = background (removed), 0 = keep, between = soft edge */
  mask: Uint8ClampedArray;
  width: number;
  height: number;
  /** share of pixels detected as background (0..1) */
  backgroundRatio: number;
}

/**
 * Self-contained worker body. IMPORTANT: keep dependency-free — this function
 * is serialized with .toString() and executed inside a Blob Worker.
 * Re-implements segmentBackground using only worker globals.
 */
export function smartColorWorkerBody(selfOnMessage: unknown): void {
  const api = selfOnMessage as any;
  api.onmessage = (ev: MessageEvent) => {
    const { rgba, width, height, tolerance, feather } = ev.data as {
      rgba: Uint8ClampedArray;
      width: number;
      height: number;
      tolerance: number;
      feather: number;
    };
    try {
      const out = workerSegment(rgba, width, height, tolerance, feather);
      (api as unknown as Worker).postMessage(out, [out.mask.buffer]);
    } catch (err) {
      (api as unknown as Worker).postMessage({ error: (err as Error).message });
    }
  };

  function workerSegment(
    rgba: Uint8ClampedArray,
    width: number,
    height: number,
    tolerance: number,
    feather: number
  ): { mask: Uint8ClampedArray; backgroundRatio: number } {
    const n = width * height;
    const mask = new Uint8ClampedArray(n); // 255 = background
    const visited = new Uint8Array(n);
    const queue = new Int32Array(n);
    let head = 0;
    let tail = 0;

    // Average border color
    let br = 0;
    let bg = 0;
    let bb = 0;
    let borderCount = 0;
    for (let x = 0; x < width; x++) {
      const top = (x * 4);
      const bottom = ((height - 1) * width + x) * 4;
      br += rgba[top] + rgba[bottom];
      bg += rgba[top + 1] + rgba[bottom + 1];
      bb += rgba[top + 2] + rgba[bottom + 2];
      borderCount += 2;
    }
    for (let y = 1; y < height - 1; y++) {
      const left = (y * width) * 4;
      const right = (y * width + width - 1) * 4;
      br += rgba[left] + rgba[right];
      bg += rgba[left + 1] + rgba[right + 1];
      bb += rgba[left + 2] + rgba[right + 2];
      borderCount += 2;
    }
    br /= borderCount;
    bg /= borderCount;
    bb /= borderCount;

    const tol = tolerance * tolerance * 3; // squared distance threshold over 3 channels

    const isBackground = (idx: number): boolean => {
      const p = idx * 4;
      const dr = rgba[p] - br;
      const dg = rgba[p + 1] - bg;
      const db = rgba[p + 2] - bb;
      return dr * dr + dg * dg + db * db <= tol;
    };

    // Seed the queue with every border pixel that matches the border color.
    const push = (idx: number) => {
      if (visited[idx]) return;
      visited[idx] = 1;
      if (isBackground(idx)) {
        mask[idx] = 255;
        queue[tail++] = idx;
      }
    };
    for (let x = 0; x < width; x++) {
      push(x);
      push((height - 1) * width + x);
    }
    for (let y = 1; y < height - 1; y++) {
      push(y * width);
      push(y * width + width - 1);
    }

    let count = 0;
    while (head < tail) {
      const idx = queue[head++];
      count++;
      const x = idx % width;
      const y = (idx / width) | 0;
      if (x > 0) push(idx - 1);
      if (x < width - 1) push(idx + 1);
      if (y > 0) push(idx - width);
      if (y < height - 1) push(idx + width);
    }

    // Feather the mask edges for smooth alpha transitions.
    let finalMask = mask;
    if (feather > 0) {
      const r = Math.max(1, Math.round(feather));
      const k = r * 2 + 1;
      let src = mask;
      let dst = new Uint8ClampedArray(n);
      for (let yy = 0; yy < height; yy++) {
        const row = yy * width;
        let sum = 0;
        for (let i = -r; i <= r; i++) {
          const xx = i < 0 ? 0 : i >= width ? width - 1 : i;
          sum += src[row + xx];
        }
        for (let xx = 0; xx < width; xx++) {
          dst[row + xx] = sum / k;
          const outX = xx - r < 0 ? 0 : xx - r >= width ? width - 1 : xx - r;
          const inX = xx + r + 1 >= width ? width - 1 : xx + r + 1;
          sum += src[row + inX] - src[row + outX];
        }
      }
      const tmp = src;
      src = dst;
      dst = new Uint8ClampedArray(n);
      for (let xx = 0; xx < width; xx++) {
        let sum = 0;
        for (let i = -r; i <= r; i++) {
          const yy = i < 0 ? 0 : i >= height ? height - 1 : i;
          sum += src[yy * width + xx];
        }
        for (let yy = 0; yy < height; yy++) {
          dst[yy * width + xx] = sum / k;
          const outY = yy - r < 0 ? 0 : yy - r >= height ? height - 1 : yy - r;
          const inY = yy + r + 1 >= height ? height - 1 : yy + r + 1;
          sum += src[inY * width + xx] - src[outY * width + xx];
        }
      }
      finalMask = dst;
      void tmp;
    }

    let bgPixels = 0;
    for (let i = 0; i < n; i++) if (mask[i] >= 255) bgPixels++;
    return { mask: finalMask, backgroundRatio: bgPixels / n };
  }
}

/**
 * Main-thread version of the same algorithm (used for small images and as
 * the reference implementation in tests). Keep behavior in sync with
 * smartColorWorkerBody.workerSegment above.
 */
export function segmentBackgroundSmartColor(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  options: SmartColorOptions = {}
): SegmentResult {
  const tolerance = Math.max(0, Math.min(255, options.tolerance ?? 32));
  const feather = Math.max(0, Math.min(64, options.feather ?? 2));
  const maxPixels = options.maxPixels ?? 40_000_000; // ~160 MP guard
  if (width * height > maxPixels) {
    throw new Error(
      `Image too large for local color segmentation (${width}×${height}). Try resizing below 16000×10000 first.`
    );
  }

  const n = width * height;
  const mask = new Uint8ClampedArray(n);
  const visited = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;

  // Average border color
  let br = 0;
  let bgc = 0;
  let bb = 0;
  let borderCount = 0;
  for (let x = 0; x < width; x++) {
    const top = x * 4;
    const bottom = ((height - 1) * width + x) * 4;
    br += rgba[top] + rgba[bottom];
    bgc += rgba[top + 1] + rgba[bottom + 1];
    bb += rgba[top + 2] + rgba[bottom + 2];
    borderCount += 2;
  }
  for (let y = 1; y < height - 1; y++) {
    const left = y * width * 4;
    const right = (y * width + width - 1) * 4;
    br += rgba[left] + rgba[right];
    bgc += rgba[left + 1] + rgba[right + 1];
    bb += rgba[left + 2] + rgba[right + 2];
    borderCount += 2;
  }
  br /= borderCount;
  bgc /= borderCount;
  bb /= borderCount;

  const tol = tolerance * tolerance * 3;

  const isBackground = (idx: number): boolean => {
    const p = idx * 4;
    const dr = rgba[p] - br;
    const dg = rgba[p + 1] - bgc;
    const db = rgba[p + 2] - bb;
    return dr * dr + dg * dg + db * db <= tol;
  };

  const push = (idx: number) => {
    if (visited[idx]) return;
    visited[idx] = 1;
    if (isBackground(idx)) {
      mask[idx] = 255;
      queue[tail++] = idx;
    }
  };
  for (let x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    push(y * width);
    push(y * width + width - 1);
  }

  while (head < tail) {
    const idx = queue[head++];
    const x = idx % width;
    const y = (idx / width) | 0;
    if (x > 0) push(idx - 1);
    if (x < width - 1) push(idx + 1);
    if (y > 0) push(idx - width);
    if (y < height - 1) push(idx + width);
  }

  let bgPixels = 0;
  for (let i = 0; i < n; i++) if (mask[i] >= 255) bgPixels++;

  const finalMask = feather > 0 ? featherMask(mask, width, height, feather) : mask;
  return { mask: finalMask, width, height, backgroundRatio: bgPixels / n };
}

/** Simple separable box blur over a single-channel mask. */
function featherMask(mask: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
  const r = Math.max(1, Math.round(radius));
  const k = r * 2 + 1;
  const n = width * height;
  let src = mask;
  let dst = new Uint8ClampedArray(n);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let sum = 0;
    for (let i = -r; i <= r; i++) {
      const xx = i < 0 ? 0 : i >= width ? width - 1 : i;
      sum += src[row + xx];
    }
    for (let x = 0; x < width; x++) {
      dst[row + x] = sum / k;
      const outX = x - r < 0 ? 0 : x - r >= width ? width - 1 : x - r;
      const inX = x + r + 1 >= width ? width - 1 : x + r + 1;
      sum += src[row + inX] - src[row + outX];
    }
  }
  const src2 = dst;
  dst = new Uint8ClampedArray(n);
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let i = -r; i <= r; i++) {
      const yy = i < 0 ? 0 : i >= height ? height - 1 : i;
      sum += src2[yy * width + x];
    }
    for (let y = 0; y < height; y++) {
      dst[y * width + x] = sum / k;
      const outY = y - r < 0 ? 0 : y - r >= height ? height - 1 : y - r;
      const inY = y + r + 1 >= height ? height - 1 : y + r + 1;
      sum += src2[inY * width + x] - src2[outY * width + x];
    }
  }
  void src;
  return dst;
}
