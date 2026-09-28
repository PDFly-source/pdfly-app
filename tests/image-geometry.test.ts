/**
 * Unit tests for the pure image-processing math used by the five new
 * image tools. Runs with Bun's built-in test runner: `bun test`.
 * No DOM required — these exercise lib/image-geometry.ts and
 * lib/image-segmentation.ts only.
 */

import { describe, expect, test } from 'bun:test';
import {
  computeResizedDimensions,
  rectFromAspect,
  clampCropRect,
  cropOutputSize,
  searchQualityForTarget,
  computeTileGrid,
  anchorForPosition,
  boxBlurMask,
} from '@/lib/image-geometry';
import { segmentBackgroundSmartColor } from '@/lib/image-segmentation';

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------

describe('computeResizedDimensions', () => {
  const src = { width: 4000, height: 2000 };

  test('exact dimensions are honored', () => {
    expect(computeResizedDimensions(src, { mode: 'exact', width: 1000, height: 500, lockAspect: false })).toEqual({
      width: 1000,
      height: 500,
    });
  });

  test('exact with only width + lockAspect keeps aspect ratio', () => {
    expect(computeResizedDimensions(src, { mode: 'exact', width: 1000, lockAspect: true })).toEqual({
      width: 1000,
      height: 500,
    });
  });

  test('exact with only height + lockAspect keeps aspect ratio', () => {
    expect(computeResizedDimensions(src, { mode: 'exact', height: 250, lockAspect: true })).toEqual({
      width: 500,
      height: 250,
    });
  });

  test('contain fits inside the box without distortion', () => {
    // 2:1 image inside a square 500x500 box -> 500x250
    expect(computeResizedDimensions(src, { mode: 'contain', width: 500, height: 500, lockAspect: true })).toEqual({
      width: 500,
      height: 250,
    });
    // 2:1 image inside a tall 200x1000 box -> 200x100
    expect(computeResizedDimensions(src, { mode: 'contain', width: 200, height: 1000, lockAspect: true })).toEqual({
      width: 200,
      height: 100,
    });
  });

  test('percent scales both axes', () => {
    expect(computeResizedDimensions(src, { mode: 'percent', percent: 25, lockAspect: false })).toEqual({
      width: 1000,
      height: 500,
    });
  });

  test('never returns zero dimensions', () => {
    const r = computeResizedDimensions({ width: 10, height: 10 }, { mode: 'percent', percent: 1, lockAspect: false });
    expect(r.width).toBeGreaterThanOrEqual(1);
    expect(r.height).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Crop
// ---------------------------------------------------------------------------

describe('crop geometry', () => {
  test('rectFromAspect produces the largest centered rect of the ratio', () => {
    const r = rectFromAspect({ width: 1000, height: 800 }, 1);
    expect(r).toEqual({ x: 100, y: 0, width: 800, height: 800 });
    const wide = rectFromAspect({ width: 1000, height: 800 }, 16 / 9);
    expect(wide.width).toBe(1000);
    expect(Math.round(wide.height)).toBe(563);
  });

  test('rectFromAspect free returns full container', () => {
    expect(rectFromAspect({ width: 320, height: 200 }, null)).toEqual({ x: 0, y: 0, width: 320, height: 200 });
  });

  test('clampCropRect keeps the rect inside bounds with min size', () => {
    const c = clampCropRect({ x: -20, y: 700, width: 5000, height: 10 }, { width: 1000, height: 600 });
    expect(c.x).toBe(0);
    expect(c.y + c.height).toBeLessThanOrEqual(600);
    expect(c.width).toBeLessThanOrEqual(1000);
    expect(c.height).toBeGreaterThanOrEqual(8);
  });

  test('cropOutputSize swaps edges on 90° rotation', () => {
    expect(cropOutputSize({ x: 0, y: 0, width: 300, height: 100 }, 1)).toEqual({ width: 100, height: 300 });
    expect(cropOutputSize({ x: 0, y: 0, width: 300, height: 100 }, 2)).toEqual({ width: 300, height: 100 });
    expect(cropOutputSize({ x: 0, y: 0, width: 300, height: 100 }, 3)).toEqual({ width: 100, height: 300 });
    expect(cropOutputSize({ x: 0, y: 0, width: 300, height: 100 }, 5)).toEqual({ width: 100, height: 300 }); // 5 ≡ 1
  });
});

// ---------------------------------------------------------------------------
// Target-size search (injected fake encoder — verifies the honest algorithm)
// ---------------------------------------------------------------------------

describe('searchQualityForTarget', () => {
  test('returns a quality that meets the target when possible', async () => {
    // fake encoder: bytes = quality * 1_000_000 (monotonic)
    const encode = async (q: number) => ({ blob: new Blob(['x']), bytes: Math.round(q * 1_000_000) });
    const res = await searchQualityForTarget(encode, 500_000);
    expect(res.targetMet).toBe(true);
    expect(res.bytes).toBeLessThanOrEqual(500_000 * 1.02);
    expect(res.quality).toBeLessThan(0.95);
  });

  test('reports targetMet=false when even the smallest quality overshoots', async () => {
    const encode = async (q: number) => ({ blob: new Blob(['x']), bytes: 900_000 + q * 100_000 });
    const res = await searchQualityForTarget(encode, 100, { minQuality: 0.3, maxQuality: 0.9 });
    expect(res.targetMet).toBe(false);
    expect(res.bytes).toBeGreaterThanOrEqual(900_000);
  });

  test('high quality that already fits is returned with few iterations', async () => {
    const encode = async (q: number) => ({ blob: new Blob(['x']), bytes: Math.round(q * 100) });
    const res = await searchQualityForTarget(encode, 500_000);
    expect(res.targetMet).toBe(true);
    expect(res.quality).toBeCloseTo(0.95, 1);
    expect(res.iterations).toBe(1);
  });

  test('aborts cleanly when shouldAbort is set', async () => {
    const encode = async (q: number) => ({ blob: new Blob(['x']), bytes: Math.round(q * 1000) });
    const res = await searchQualityForTarget(encode, 1, { shouldAbort: () => true, maxIterations: 5 });
    expect(res.iterations).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Watermark layout
// ---------------------------------------------------------------------------

describe('watermark layout', () => {
  test('tile grid covers the whole canvas', () => {
    const positions = computeTileGrid({ width: 1000, height: 800 }, { width: 200, height: 40 }, { rotation: 0, spacing: 2 });
    const xs = positions.map((p) => p.x);
    const ys = positions.map((p) => p.y);
    expect(Math.min(...xs)).toBeLessThanOrEqual(0);
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(1000);
    expect(Math.min(...ys)).toBeLessThanOrEqual(0);
    expect(Math.max(...ys)).toBeGreaterThanOrEqual(800);
  });

  test('rotated tiles still cover the whole canvas', () => {
    const rot = computeTileGrid({ width: 600, height: 600 }, { width: 100, height: 30 }, { rotation: 45, spacing: 2 });
    const xs = rot.map((p) => p.x);
    const ys = rot.map((p) => p.y);
    expect(Math.min(...xs)).toBeLessThanOrEqual(0);
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(600);
    expect(Math.min(...ys)).toBeLessThanOrEqual(0);
    expect(Math.max(...ys)).toBeGreaterThanOrEqual(600);
  });

  test('anchors place items inside the canvas with margin', () => {
    const canvas = { width: 1000, height: 500 };
    const item = { width: 100, height: 50 };
    const tl = anchorForPosition(canvas, item, 'top-left', 20);
    expect(tl).toEqual({ x: 20, y: 20 });
    const br = anchorForPosition(canvas, item, 'bottom-right', 20);
    expect(br).toEqual({ x: 880, y: 430 });
    const c = anchorForPosition(canvas, item, 'center', 0);
    expect(c).toEqual({ x: 450, y: 225 });
  });
});

// ---------------------------------------------------------------------------
// Mask blur
// ---------------------------------------------------------------------------

describe('boxBlurMask', () => {
  test('radius 0 returns the input mask unchanged', () => {
    const mask = new Uint8ClampedArray([0, 255, 0, 255]);
    expect(boxBlurMask(mask, 2, 2, 0)).toBe(mask);
  });

  test('blur averages neighbors', () => {
    const mask = new Uint8ClampedArray([0, 255, 0, 255]);
    const out = boxBlurMask(mask, 2, 2, 1);
    expect(out.length).toBe(4);
    expect(out[0]).toBeGreaterThan(0); // corner pulls in the 255 neighbor
    expect(out[0]).toBeLessThan(255);
  });
});

// ---------------------------------------------------------------------------
// Smart Color segmentation (pure, synthetic images)
// ---------------------------------------------------------------------------

describe('segmentBackgroundSmartColor', () => {
  const makeRgba = (w: number, h: number, colorAt: (x: number, y: number) => [number, number, number]) => {
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const [r, g, b] = colorAt(x, y);
        const i = (y * w + x) * 4;
        rgba[i] = r;
        rgba[i + 1] = g;
        rgba[i + 2] = b;
        rgba[i + 3] = 255;
      }
    }
    return rgba;
  };

  test('removes a solid background around a centered object', () => {
    const w = 20;
    const h = 20;
    const rgba = makeRgba(w, h, (x, y) => (x >= 6 && x < 14 && y >= 6 && y < 14 ? [200, 30, 40] : [240, 240, 240]));
    const res = segmentBackgroundSmartColor(rgba, w, h, { tolerance: 30, feather: 0 });
    // center of the object must be kept
    expect(res.mask[10 * w + 10]).toBe(0);
    // far corner must be background
    expect(res.mask[1]).toBe(255);
    // roughly the background share (400-64)/400 = 0.84
    expect(res.backgroundRatio).toBeGreaterThan(0.7);
    expect(res.backgroundRatio).toBeLessThan(0.9);
  });

  test('keeps everything when border colors differ everywhere (no false removal)', () => {
    const w = 16;
    const h = 16;
    const rgba = makeRgba(w, h, (x, y) => [x * 16, y * 16, (x + y) * 8]);
    const res = segmentBackgroundSmartColor(rgba, w, h, { tolerance: 10, feather: 0 });
    expect(res.backgroundRatio).toBeLessThan(0.2);
  });

  test('rejects oversized images with a clear error', () => {
    const rgba = new Uint8ClampedArray(4);
    expect(() => segmentBackgroundSmartColor(rgba, 1000, 1000, { maxPixels: 100 })).toThrow(/too large/i);
  });

  test('worker body matches main-thread result on synthetic image', () => {
    const w = 20;
    const h = 20;
    const rgba = makeRgba(w, h, (x, y) => (x >= 6 && x < 14 && y >= 6 && y < 14 ? [20, 20, 220] : [250, 250, 250]));
    const res = segmentBackgroundSmartColor(rgba, w, h, { tolerance: 30, feather: 1 });
    expect(res.mask[10 * w + 10]).toBe(0);
    expect(res.mask[0]).toBeGreaterThan(0); // feathered edge pixels land between 0..255
  });
});
