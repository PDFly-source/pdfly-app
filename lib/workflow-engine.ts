// ==========================================
// PDFMiniFly Workflow Engine — local-first automation core.
// Reuses existing pdf-engine implementations; adds document analysis,
// recommendations, validation, dry-run, and a sequential step pipeline.
// No network calls. All processing in-browser.
// ==========================================

import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
} from 'pdf-lib';
import {
  compressPdf,
  detectBlankPages,
  organizePdf,
  watermarkPdf,
  addPageNumbers,
  sanitizeMetadataFields,
  getPdfMetadata,
  removePagesFromPdf,
  pageMatchesSelection,
  parsePageRange,
  type OrganizePageItem,
} from './pdf-engine';
import { getPdfDocumentFromFile } from './pdfjs-init';
import { safeDrawText } from './font-safe';

// -----------------------------------------------
// Types
// -----------------------------------------------

export type StepType =
  | 'remove-blank'
  | 'rotate'
  | 'organize'
  | 'ocr'
  | 'compress'
  | 'watermark'
  | 'page-numbers'
  | 'sanitize';

export interface StepCondition {
  pagesGreaterThan?: number;
  fileSizeGreaterThanMB?: number;
  hasBlankPages?: boolean; // true = run only if blanks detected
  hasRotatedPages?: boolean;
  hasMetadata?: boolean;
  hasScannedPages?: boolean;
}

export interface WorkflowStep {
  id: string;
  type: StepType;
  enabled: boolean;
  options: Record<string, any>;
  condition?: StepCondition;
}

export interface PageAnalysis {
  pageNumber: number;
  isBlank: boolean;
  isNearBlank: boolean;
  nonWhiteRatio: number;
  hasText: boolean;
  textLength: number;
  imageOps: number;
  isImageHeavy: boolean;
  rotationAngle: number;
  isRotated: boolean;
  portrait: boolean;
  thumbnail?: string; // small dataURL
}

export interface DocumentAnalysis {
  pageCount: number;
  fileSize: number;
  fileName: string;
  pages: PageAnalysis[];
  textPages: number;
  scannedPages: number;
  blankPages: number[];
  nearBlankPages: number[];
  rotatedPages: { page: number; angle: number }[];
  landscapePages: number;
  portraitPages: number;
  hasMetadata: boolean;
  metadata: {
    title: string;
    author: string;
    subject: string;
    keywords: string;
    creator: string;
    producer: string;
    creationDate: string;
    modificationDate: string;
  };
  ocrRecommended: boolean;
  compressionEstimate?: { sampledPages: number; estimatedBytes: number; basis: 'measurement' };
  encrypted: boolean;
  warnings: string[];
}

export interface StepValidation {
  stepId: string;
  level: 'ok' | 'warn' | 'error';
  message: string;
}

export interface DryRunStepResult {
  stepId: string;
  name: string;
  enabled: boolean;
  conditionMet: boolean;
  description: string;
}

export interface DryRunReport {
  steps: DryRunStepResult[];
  estimatedPages: number;
  estimatedSize: number;
  pageCountBefore: number;
  sizeBefore: number;
}

export interface StepOutcome {
  stepId: string;
  name: string;
  status: 'completed' | 'skipped' | 'failed';
  detail: string;
  pagesRemoved?: number;
  durationMs: number;
}

const ANALYSIS_RENDER_SCALE = 0.4;
const THUMBNAIL_WIDTH = 110;

function s4(): string {
  return Math.random().toString(36).substring(2, 9);
}

export const newStepId = s4;

export function defaultStepOptions(type: StepType): Record<string, any> {
  switch (type) {
    case 'remove-blank':
      return { threshold: 0.003, includeNearBlank: false, selectedPages: null };
    case 'rotate':
      return { mode: 'auto-fix', angle: 90, pages: '' };
    case 'organize':
      return { items: null }; // null = keep original order
    case 'ocr':
      return { language: 'eng', mode: 'all', range: '' };
    case 'compress':
      return { level: 'balanced', removeMetadata: false };
    case 'watermark':
      return {
        type: 'text',
        text: 'CONFIDENTIAL',
        fontSize: 48,
        color: '#6D1F35',
        opacity: 0.35,
        rotation: 0,
        position: 'center',
        pageMode: 'all',
        pageRange: '',
        customX: 0.5,
        customY: 0.5,
      };
    case 'page-numbers':
      return {
        position: 'bottom-center',
        format: 'Page 1 of N',
        startNumber: 1,
        fontSize: 10,
        color: '#333333',
        margin: 25,
      };
    case 'sanitize':
      return {
        title: true, author: true, subject: true, keywords: true,
        creator: true, producer: true, creationDate: true, modificationDate: true,
      };
  }
}

// -----------------------------------------------
// 1. Document Analysis (local, one pass)
// -----------------------------------------------

export async function analyzeDocument(
  file: File,
  onProgress?: (status: string, pct: number) => void,
  withThumbnails = true
): Promise<DocumentAnalysis> {
  onProgress?.('Opening document locally...', 5);
  const pdfJsDoc = await getPdfDocumentFromFile(file);
  const total = pdfJsDoc.numPages;

  const pages: PageAnalysis[] = [];

  onProgress?.('Reading document metadata...', 10);
  let metadata: DocumentAnalysis['metadata'] = {
    title: '', author: '', subject: '', keywords: '', creator: '', producer: '',
    creationDate: '', modificationDate: '',
  };
  let hasMetadata = false;
  try {
    const meta = await getPdfMetadata(file);
    metadata = {
      title: meta.title || '',
      author: meta.author || '',
      subject: meta.subject || '',
      keywords: meta.keywords || '',
      creator: meta.creator || '',
      producer: meta.producer || '',
      creationDate: meta.creationDate || '',
      modificationDate: meta.modificationDate || '',
    };
    hasMetadata = Object.values(metadata).some((v) => v && v.trim().length > 0);
  } catch {
    /* metadata is best-effort */
  }

  let compressedSampleBytes = 0;
  let sampledOriginalBytes = 0;
  const sampleIdx = new Set<number>();
  if (total > 0) {
    sampleIdx.add(1);
    if (total >= 3) sampleIdx.add(Math.floor(total / 2));
    if (total >= 4) sampleIdx.add(total);
  }

  for (let i = 1; i <= total; i++) {
    onProgress?.(`Analyzing page ${i} of ${total}...`, 10 + Math.round((i / total) * 82));
    const page = await pdfJsDoc.getPage(i);
    const viewport = page.getViewport({ scale: ANALYSIS_RENDER_SCALE });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let nonWhiteRatio = 1;
    if (ctx) {
      await page.render({ canvasContext: ctx, viewport }).promise;
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      let nonWhite = 0;
      const totalPx = data.length / 4;
      for (let p = 0; p < data.length; p += 4) {
        if (data[p + 3] > 20 && (data[p] < 240 || data[p + 1] < 240 || data[p + 2] < 240)) nonWhite++;
      }
      nonWhiteRatio = totalPx > 0 ? nonWhite / totalPx : 1;
    }

    let textLength = 0;
    try {
      const content = await page.getTextContent();
      textLength = content.items.map((it: any) => it.str || '').join(' ').trim().length;
    } catch {
      /* text extraction best-effort */
    }

    let imageOps = 0;
    try {
      const opList = await page.getOperatorList();
      for (const fn of opList.fnArray) if (fn === 82 || fn === 85) imageOps++;
    } catch {
      /* ops best-effort */
    }

    const rotationAngle = ((page.rotate % 360) + 360) % 360;
    const portrait = viewport.height >= viewport.width;

    // Compression sample: recompress this low-res render as JPEG and measure
    if (ctx && sampleIdx.has(i)) {
      const jpeg = canvas.toDataURL('image/jpeg', 0.72);
      const b64 = jpeg.split(',')[1] || '';
      // base64 length ≈ bytes; scale up by (1/ANALYSIS_RENDER_SCALE)^2 to approximate full-page raster
      compressedSampleBytes += Math.round(b64.length * 0.75 * (1 / (ANALYSIS_RENDER_SCALE * ANALYSIS_RENDER_SCALE)));
      sampledOriginalBytes += file.size / Math.min(total, 3);
    }

    let thumbnail: string | undefined;
    if (withThumbnails && ctx) {
      const tw = THUMBNAIL_WIDTH;
      const th = Math.max(1, Math.round((canvas.height / canvas.width) * tw));
      const tc = document.createElement('canvas');
      tc.width = tw;
      tc.height = th;
      const tctx = tc.getContext('2d');
      if (tctx) {
        tctx.fillStyle = '#FFFFFF';
        tctx.fillRect(0, 0, tw, th);
        tctx.drawImage(canvas, 0, 0, tw, th);
        thumbnail = tc.toDataURL('image/jpeg', 0.6);
      }
    }

    pages.push({
      pageNumber: i,
      isBlank: nonWhiteRatio <= 0.003,
      isNearBlank: nonWhiteRatio > 0.003 && nonWhiteRatio <= 0.01,
      nonWhiteRatio,
      hasText: textLength > 24,
      textLength,
      imageOps,
      isImageHeavy: imageOps >= 1 && textLength <= 24,
      rotationAngle,
      isRotated: rotationAngle !== 0,
      portrait,
      thumbnail,
    });

    canvas.width = 0;
    canvas.height = 0;
  }

  const textPages = pages.filter((p) => p.hasText).length;
  const scannedPages = pages.filter((p) => p.isImageHeavy).length;
  const blankPages = pages.filter((p) => p.isBlank).map((p) => p.pageNumber);
  const nearBlankPages = pages.filter((p) => p.isNearBlank).map((p) => p.pageNumber);
  const rotatedPages = pages.filter((p) => p.isRotated).map((p) => ({ page: p.pageNumber, angle: p.rotationAngle }));

  const warnings: string[] = [];
  if (file.size > 200 * 1024 * 1024) {
    warnings.push('This is a very large document. Processing may require significant device memory.');
  } else if (file.size > 60 * 1024 * 1024) {
    warnings.push('Large document. Processing may take a while on mobile devices.');
  }

  let compressionEstimate: DocumentAnalysis['compressionEstimate'];
  if (sampleIdx.size > 0 && compressedSampleBytes > 0) {
    const extrapolated = (compressedSampleBytes / sampleIdx.size) * total;
    // Raster-based estimate is only meaningful when the doc is image-heavy
    if (scannedPages >= Math.ceil(total * 0.5)) {
      compressionEstimate = {
        sampledPages: sampleIdx.size,
        estimatedBytes: Math.min(file.size, Math.round(extrapolated * 0.55)),
        basis: 'measurement',
      };
    }
  }

  onProgress?.('Complete!', 100);

  return {
    pageCount: total,
    fileSize: file.size,
    fileName: file.name,
    pages,
    textPages,
    scannedPages,
    blankPages,
    nearBlankPages,
    rotatedPages,
    portraitPages: pages.filter((p) => p.portrait).length,
    landscapePages: pages.filter((p) => !p.portrait).length,
    hasMetadata,
    metadata,
    ocrRecommended: scannedPages >= 1 && scannedPages > textPages,
    compressionEstimate,
    encrypted: false,
    warnings,
  };
}

// -----------------------------------------------
// 2. Smart recommendation
// -----------------------------------------------

export interface Recommendation {
  reasons: string[];
  steps: { type: StepType; options: Record<string, any>; note: string }[];
}

export function buildRecommendation(analysis: DocumentAnalysis): Recommendation {
  const reasons: string[] = [];
  const steps: Recommendation['steps'] = [];

  if (analysis.blankPages.length > 0) {
    reasons.push(`${analysis.blankPages.length} blank page${analysis.blankPages.length === 1 ? '' : 's'} detected`);
    steps.push({ type: 'remove-blank', options: { ...defaultStepOptions('remove-blank') }, note: `Removes ${analysis.blankPages.length} blank page(s)` });
  }
  if (analysis.rotatedPages.length > 0) {
    reasons.push(`${analysis.rotatedPages.length} rotated page${analysis.rotatedPages.length === 1 ? '' : 's'} detected`);
    steps.push({ type: 'rotate', options: { ...defaultStepOptions('rotate'), mode: 'auto-fix' }, note: 'Fixes page orientation metadata' });
  }
  if (analysis.ocrRecommended) {
    reasons.push(`${analysis.scannedPages} scanned page${analysis.scannedPages === 1 ? '' : 's'} without selectable text`);
    steps.push({ type: 'ocr', options: { ...defaultStepOptions('ocr') }, note: 'Makes scanned text searchable (local OCR)' });
  }
  if (analysis.compressionEstimate) {
    reasons.push('large image streams found');
    steps.push({ type: 'compress', options: { ...defaultStepOptions('compress') }, note: 'Recompresses image streams' });
  }
  if (analysis.hasMetadata) {
    reasons.push('document metadata present');
    steps.push({ type: 'sanitize', options: { ...defaultStepOptions('sanitize') }, note: 'Clears author, creator, producer and dates' });
  }

  if (steps.length === 0) {
    reasons.push('document already looks clean and optimized');
  }

  return { reasons, steps };
}

// -----------------------------------------------
// 3. Validation
// -----------------------------------------------

export function validateWorkflow(steps: WorkflowStep[], analysis: DocumentAnalysis | null): StepValidation[] {
  const out: StepValidation[] = [];
  for (const step of steps) {
    const o = { ...defaultStepOptions(step.type), ...step.options };
    switch (step.type) {
      case 'remove-blank':
        out.push({ stepId: step.id, level: 'ok', message: `Sensitivity ${((o.threshold || 0.003) * 100).toFixed(1)}% — detection runs at execution` });
        break;
      case 'rotate':
        if (o.mode === 'range' && !String(o.pages || '').trim()) {
          out.push({ stepId: step.id, level: 'error', message: 'Page range is empty' });
        } else {
          out.push({ stepId: step.id, level: 'ok', message: o.mode === 'auto-fix' ? 'Auto-fixes rotated pages' : `Rotates ${o.angle}°` });
        }
        break;
      case 'organize':
        out.push({ stepId: step.id, level: 'ok', message: 'Page order configured' });
        break;
      case 'ocr':
        if (o.mode === 'range' && !String(o.range || '').trim()) {
          out.push({ stepId: step.id, level: 'error', message: 'OCR page range is empty' });
        } else {
          out.push({ stepId: step.id, level: 'ok', message: `Language ${o.language}` });
        }
        break;
      case 'compress':
        out.push({ stepId: step.id, level: 'ok', message: `Mode ${o.level}` });
        break;
      case 'watermark':
        if (o.type === 'text' && !String(o.text || '').trim()) {
          out.push({ stepId: step.id, level: 'error', message: 'Watermark text is empty' });
        } else if (o.type === 'image' && !o.imageBuffer) {
          out.push({ stepId: step.id, level: 'error', message: 'No watermark image selected' });
        } else if (o.pageMode === 'range' && !String(o.pageRange || '').trim()) {
          out.push({ stepId: step.id, level: 'error', message: 'Watermark page range is empty' });
        } else {
          out.push({ stepId: step.id, level: 'ok', message: `Text "${String(o.text || '').slice(0, 24)}" on ${o.pageMode === 'all' ? 'all pages' : `${o.pageMode} pages`}` });
        }
        break;
      case 'page-numbers': {
        const anyPos = Boolean(o.position);
        if (!anyPos) {
          out.push({ stepId: step.id, level: 'error', message: 'Position missing' });
        } else {
          out.push({ stepId: step.id, level: 'ok', message: `Format "${o.format}", ${String(o.position).replace('-', ' ')}` });
        }
        break;
      }
      case 'sanitize': {
        const any = Object.values(o).some(Boolean);
        out.push({ stepId: step.id, level: any ? 'ok' : 'warn', message: any ? 'Fields selected for removal' : 'No fields selected — nothing will be removed' });
        break;
      }
    }
  }
  return out;
}

// -----------------------------------------------
// 4. Dry run (no document modification)
// -----------------------------------------------

const STEP_NAMES: Record<StepType, string> = {
  'remove-blank': 'Remove Blank Pages',
  rotate: 'Rotate Pages',
  organize: 'Organize Pages',
  ocr: 'OCR (Searchable Text)',
  compress: 'Compress Document',
  watermark: 'Add Watermark',
  'page-numbers': 'Add Page Numbers',
  sanitize: 'Sanitize Metadata',
};

export async function dryRunWorkflow(
  steps: WorkflowStep[],
  analysis: DocumentAnalysis
): Promise<DryRunReport> {
  let pages = analysis.pageCount;
  let size = analysis.fileSize;

  const results: DryRunStepResult[] = [];

  for (const step of steps) {
    const o = { ...defaultStepOptions(step.type), ...step.options };
    const met = evaluateCondition(step.condition, { pages, sizeBytes: size, analysis });
    let description = '';

    switch (step.type) {
      case 'remove-blank': {
        const blanks = o.includeNearBlank
          ? [...analysis.blankPages, ...analysis.nearBlankPages]
          : analysis.blankPages;
        const selected = Array.isArray(o.selectedPages) && o.selectedPages.length
          ? o.selectedPages
          : blanks;
        description = `Would remove ${selected.length} page(s)${selected.length ? `: ${selected.slice(0, 12).join(', ')}${selected.length > 12 ? '…' : ''}` : ' (none detected)'}`;
        pages -= selected.length;
        break;
      }
      case 'rotate': {
        const count = o.mode === 'auto-fix'
          ? analysis.rotatedPages.length
          : o.mode === 'all'
            ? analysis.pageCount
            : parsePageRange(String(o.pages || ''), analysis.pageCount).size;
        description = o.mode === 'auto-fix'
          ? `Would normalize ${count} rotated page(s)`
          : `Would rotate ${count} page(s) by ${o.angle}°`;
        break;
      }
      case 'organize': {
        const items = o.items as OrganizePageItem[] | null;
        if (items && items.length) {
          description = `Would rebuild document as ${items.length} page(s) in the configured order`;
          pages = items.length;
        } else {
          description = 'No page changes configured';
        }
        break;
      }
      case 'ocr': {
        const count = o.mode === 'all' ? analysis.pageCount : parsePageRange(String(o.range || ''), analysis.pageCount).size;
        description = `Would OCR ${count} page(s) (${o.language}) and embed an invisible text layer`;
        break;
      }
      case 'compress': {
        if (analysis.compressionEstimate) {
          description = `Would recompress (~${(analysis.compressionEstimate.estimatedBytes / 1024 / 1024).toFixed(1)} MB estimated from samples)`;
          size = Math.min(size, analysis.compressionEstimate.estimatedBytes);
        } else {
          description = 'Would recompress image streams (no estimate available for this document)';
        }
        break;
      }
      case 'watermark': {
        const count = o.pageMode === 'all'
          ? analysis.pageCount
          : o.pageMode === 'first' || o.pageMode === 'last'
            ? 1
            : o.pageMode === 'odd' || o.pageMode === 'even'
              ? Math.ceil(analysis.pageCount / 2)
              : parsePageRange(String(o.pageRange || ''), analysis.pageCount).size;
        description = `Would stamp "${String(o.text || 'image').slice(0, 24)}" on ${count} page(s)`;
        break;
      }
      case 'page-numbers':
        description = `Would number all ${pages} page(s) starting at ${o.startNumber}`;
        break;
      case 'sanitize': {
        const fields = Object.entries(o).filter(([, v]) => v === true).map(([k]) => k);
        description = fields.length ? `Would clear: ${fields.join(', ')}` : 'No fields selected';
        break;
      }
    }

    results.push({ stepId: step.id, name: STEP_NAMES[step.type], enabled: step.enabled, conditionMet: met, description });
  }

  return {
    steps: results,
    estimatedPages: Math.max(0, pages),
    estimatedSize: Math.max(1024, size),
    pageCountBefore: analysis.pageCount,
    sizeBefore: analysis.fileSize,
  };
}

// -----------------------------------------------
// 5. Conditions
// -----------------------------------------------

interface ConditionContext {
  pages: number;
  sizeBytes: number;
  analysis: DocumentAnalysis;
}

function evaluateCondition(cond: StepCondition | undefined, ctx: ConditionContext): boolean {
  if (!cond) return true;
  if (cond.pagesGreaterThan !== undefined && !(ctx.pages > cond.pagesGreaterThan)) return false;
  if (cond.fileSizeGreaterThanMB !== undefined && !(ctx.sizeBytes > cond.fileSizeGreaterThanMB * 1024 * 1024)) return false;
  if (cond.hasBlankPages === true && ctx.analysis.blankPages.length === 0) return false;
  if (cond.hasRotatedPages === true && ctx.analysis.rotatedPages.length === 0) return false;
  if (cond.hasMetadata === true && !ctx.analysis.hasMetadata) return false;
  if (cond.hasScannedPages === true && ctx.analysis.scannedPages === 0) return false;
  return true;
}

// -----------------------------------------------
// 6. Rotation helper (absolute set, engine-level via pdf-lib)
// -----------------------------------------------

async function setPagesRotation(
  file: File,
  mode: 'auto-fix' | 'all' | 'range',
  angle: number,
  pagesRange: string
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pages = doc.getPages();
  const total = pages.length;

  const targets = new Set<number>();
  if (mode === 'auto-fix') {
    // normalize: remove rotation metadata
    for (let i = 0; i < total; i++) targets.add(i);
  } else if (mode === 'all') {
    for (let i = 0; i < total; i++) targets.add(i);
  } else {
    for (const p of parsePageRange(pagesRange, total)) targets.add(p - 1);
  }

  for (const idx of targets) {
    const page = pages[idx];
    if (!page) continue;
    if (mode === 'auto-fix') {
      page.setRotation(degrees(0));
    } else {
      const current = page.getRotation().angle;
      page.setRotation(degrees((((current + angle) % 360) + 360) % 360));
    }
  }

  const bytes = await doc.save();
  return new Blob([bytes as any], { type: 'application/pdf' });
}

// -----------------------------------------------
// 7. OCR — invisible text layer on ORIGINAL pages
// -----------------------------------------------

export async function runOcrSearchableLayer(
  file: File,
  opts: { language: string; mode: 'all' | 'range'; range: string },
  onProgress?: (status: string, pct: number) => void
): Promise<{ blob: Blob; ocrPages: number; failedPages: number }> {
  const { createWorker } = await import('tesseract.js');
  onProgress?.('Starting local OCR engine...', 5);

  const pdfJsDoc = await getPdfDocumentFromFile(file);
  const total = pdfJsDoc.numPages;
  const targets =
    opts.mode === 'all'
      ? Array.from({ length: total }, (_, i) => i + 1)
      : [...parsePageRange(opts.range, total)];

  const pdfDoc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const docPages = pdfDoc.getPages();

  const worker = await createWorker(opts.language);
  let failedPages = 0;

  try {
    for (let pi = 0; pi < targets.length; pi++) {
      const pageNum = targets[pi];
      onProgress?.(`OCR page ${pageNum} of ${targets.length}...`, 10 + Math.round((pi / targets.length) * 85));

      try {
        const page = await pdfJsDoc.getPage(pageNum);
        const scale = 2.0;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unavailable');

        // White background for transparent pages
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;

        const ret = await worker.recognize(canvas);

        const docPage = docPages[pageNum - 1];
        if (docPage && ret.data.text && ret.data.text.trim()) {
          const { width, height } = docPage.getSize();
          const lines: any[] = (ret.data as any).lines || (ret.data as any).blocks?.flatMap((b: any) => b?.paragraphs?.flatMap((par: any) => par?.lines || []) || []) || [];

          if (lines.length > 0) {
            // Positioned invisible text per OCR line
            for (const line of lines) {
              const text = String(line.text || '').trim();
              const bbox = line.bbox;
              if (!text || !bbox) continue;
              // pdf-lib origin is bottom-left; OCR bbox is top-left
              const y = viewport.height - bbox.y1;
              const x = bbox.x0;
              const fontSize = Math.max(6, Math.min(24, (bbox.y1 - bbox.y0) * 0.85));
              safeDrawText(docPage, text, {
                x: (x / viewport.width) * width,
                y: (y / viewport.height) * height,
                size: fontSize,
                font,
                color: rgb(0, 0, 0),
                opacity: 0, // invisible but searchable/selectable
              });
            }
          } else {
            // Fallback: stacked invisible lines
            const all = (ret.data.text || '').split('\n').filter((l: string) => l.trim());
            let y = height - 20;
            for (const line of all) {
              if (y < 20) break;
              safeDrawText(docPage, line.substring(0, 110), {
                x: 20,
                y,
                size: 9,
                font,
                color: rgb(0, 0, 0),
                opacity: 0,
              });
              y -= 13;
            }
          }
        }

        canvas.width = 0;
        canvas.height = 0;
      } catch (pageErr) {
        console.warn(`OCR page ${pageNum} failed`, pageErr);
        failedPages++;
      }
    }
  } finally {
    try {
      await worker.terminate();
    } catch {
      /* ignore */
    }
  }

  onProgress?.('Saving searchable PDF...', 95);
  const bytes = await pdfDoc.save();
  onProgress?.('OCR complete!', 100);

  return {
    blob: new Blob([bytes as any], { type: 'application/pdf' }),
    ocrPages: targets.length - failedPages,
    failedPages,
  };
}

// -----------------------------------------------
// 8. Execution pipeline
// -----------------------------------------------

export interface PipelineEvents {
  onStepStart?: (index: number, name: string) => void;
  onStepProgress?: (index: number, status: string, pct: number) => void;
  onStepDone?: (index: number, outcome: StepOutcome) => void;
}

export interface PipelineResult {
  blob: Blob;
  outcomes: StepOutcome[];
  durationMs: number;
  pagesBefore: number;
  pagesAfter: number;
}

function blobToFile(blob: Blob): File {
  return new File([blob], 'pipeline-stage.pdf', { type: 'application/pdf' });
}

async function countPages(file: File): Promise<number> {
  try {
    const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
    return doc.getPageCount();
  } catch {
    return 0;
  }
}

export interface PipelineOptions extends PipelineEvents {
  /** Checked between steps; when true the run aborts gracefully. */
  shouldCancel?: () => boolean;
}

export class WorkflowCancelledError extends Error {
  constructor(public completedOutcomes: StepOutcome[]) {
    super('Workflow cancelled by user');
    this.name = 'WorkflowCancelledError';
  }
}

export async function executeWorkflow(
  input: File,
  steps: WorkflowStep[],
  analysis: DocumentAnalysis,
  eventsOrOptions: PipelineEvents = {}
): Promise<PipelineResult> {
  const events: PipelineEvents = eventsOrOptions;
  const shouldCancel = (eventsOrOptions as PipelineOptions).shouldCancel;
  const started = Date.now();
  const activeSteps = steps.filter((s) => s.enabled);

  let currentFile: File = input;
  const outcomes: StepOutcome[] = [];

  let pages = analysis.pageCount;
  let size = analysis.fileSize;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const name = STEP_NAMES[step.type];
    const t0 = Date.now();

    if (!step.enabled) {
      outcomes.push({ stepId: step.id, name, status: 'skipped', detail: 'Step disabled', durationMs: 0 });
      events.onStepDone?.(i, outcomes[outcomes.length - 1]);
      continue;
    }

    if (shouldCancel?.()) {
      throw new WorkflowCancelledError(outcomes);
    }

    const met = evaluateCondition(step.condition, { pages, sizeBytes: size, analysis });
    if (!met) {
      outcomes.push({ stepId: step.id, name, status: 'skipped', detail: 'Condition not met', durationMs: 0 });
      events.onStepDone?.(i, outcomes[outcomes.length - 1]);
      continue;
    }

    events.onStepStart?.(i, name);
    const o = { ...defaultStepOptions(step.type), ...step.options };

    try {
      switch (step.type) {
        case 'remove-blank': {
          const detected = await detectBlankPages(
            currentFile,
            o.threshold || 0.003,
            (s, p) => events.onStepProgress?.(i, s, p)
          );
          let pageNumbers = detected.map((d) => d.pageNumber);
          if (o.includeNearBlank) {
            const near = new Set([
              ...analysis.blankPages,
              ...analysis.nearBlankPages,
            ]);
            // Remove pages found blank at stricter threshold too
            for (const d of detected) near.add(d.pageNumber);
            pageNumbers = [...near].sort((a, b) => a - b);
          }
          if (Array.isArray(o.selectedPages)) {
            const allowed = new Set(o.selectedPages);
            pageNumbers = pageNumbers.filter((p) => allowed.has(p));
          }
          if (pageNumbers.length === 0) {
            outcomes.push({ stepId: step.id, name, status: 'completed', detail: 'No blank pages found', pagesRemoved: 0, durationMs: Date.now() - t0 });
            break;
          }
          if (pageNumbers.length >= pages) {
            throw new Error('Refusing to remove every page — check blank page selection.');
          }
          const blob = await removePagesFromPdf(currentFile, pageNumbers);
          currentFile = blobToFile(blob);
          pages -= pageNumbers.length;
          outcomes.push({
            stepId: step.id, name, status: 'completed',
            detail: `Removed pages ${pageNumbers.join(', ')}`,
            pagesRemoved: pageNumbers.length,
            durationMs: Date.now() - t0,
          });
          break;
        }

        case 'rotate': {
          const blob = await setPagesRotation(currentFile, o.mode, o.angle, String(o.pages || ''));
          currentFile = blobToFile(blob);
          const n = o.mode === 'auto-fix' ? analysis.rotatedPages.length : o.mode === 'all' ? pages : parsePageRange(String(o.pages || ''), pages).size;
          outcomes.push({ stepId: step.id, name, status: 'completed', detail: o.mode === 'auto-fix' ? `Normalized ${n} rotated page(s)` : `Rotated ${n} page(s) by ${o.angle}°`, durationMs: Date.now() - t0 });
          break;
        }

        case 'organize': {
          const items = o.items as OrganizePageItem[] | null;
          if (!items || items.length === 0) {
            outcomes.push({ stepId: step.id, name, status: 'completed', detail: 'No page changes', durationMs: Date.now() - t0 });
            break;
          }
          const blob = await organizePdf(currentFile, items, (s, p) => events.onStepProgress?.(i, s, p));
          currentFile = blobToFile(blob);
          pages = items.length;
          outcomes.push({ stepId: step.id, name, status: 'completed', detail: `Rebuilt as ${items.length} page(s)`, durationMs: Date.now() - t0 });
          break;
        }

        case 'ocr': {
          const res = await runOcrSearchableLayer(
            currentFile,
            { language: o.language, mode: o.mode, range: String(o.range || '') },
            (s, p) => events.onStepProgress?.(i, s, p)
          );
          currentFile = blobToFile(res.blob);
          size = res.blob.size;
          outcomes.push({
            stepId: step.id, name, status: 'completed',
            detail: res.failedPages > 0
              ? `OCR on ${res.ocrPages} page(s); ${res.failedPages} failed`
              : `OCR completed on ${res.ocrPages} page(s) (invisible text layer added)`,
            durationMs: Date.now() - t0,
          });
          break;
        }

        case 'compress': {
          const res = await compressPdf(currentFile, { level: o.level, removeMetadata: !!o.removeMetadata }, (s, p) => events.onStepProgress?.(i, s, p));
          currentFile = blobToFile(res.blob);
          size = res.blob.size;
          outcomes.push({ stepId: step.id, name, status: 'completed', detail: `${res.savedPercentage > 0 ? `${res.savedPercentage}% smaller` : 'Structure optimized'} (${(res.originalSize / 1024 / 1024).toFixed(1)} MB → ${(res.newSize / 1024 / 1024).toFixed(1)} MB)`, durationMs: Date.now() - t0 });
          break;
        }

        case 'watermark': {
          const blob = await watermarkPdf(currentFile, {
            type: o.type,
            text: o.text,
            fontSize: o.fontSize,
            color: o.color,
            opacity: o.opacity,
            rotation: o.rotation,
            position: o.position,
            customX: o.customX,
            customY: o.customY,
            imageBuffer: o.imageBuffer,
            imageType: o.imageType,
            imageScale: o.imageScale,
            pageSelection: { mode: o.pageMode || 'all', range: o.pageRange },
          }, (s, p) => events.onStepProgress?.(i, s, p));
          currentFile = blobToFile(blob);
          outcomes.push({ stepId: step.id, name, status: 'completed', detail: `Stamped "${String(o.text || 'image').slice(0, 24)}" on ${o.pageMode || 'all'} pages`, durationMs: Date.now() - t0 });
          break;
        }

        case 'page-numbers': {
          const blob = await addPageNumbers(currentFile, {
            position: o.position,
            format: o.format,
            startNumber: o.startNumber,
            fontSize: o.fontSize,
            color: o.color,
            margin: o.margin,
          }, (s, p) => events.onStepProgress?.(i, s, p));
          currentFile = blobToFile(blob);
          outcomes.push({ stepId: step.id, name, status: 'completed', detail: `Numbered ${pages} page(s) ("${o.format}")`, durationMs: Date.now() - t0 });
          break;
        }

        case 'sanitize': {
          const blob = await sanitizeMetadataFields(currentFile, {
            title: o.title, author: o.author, subject: o.subject, keywords: o.keywords,
            creator: o.creator, producer: o.producer,
            creationDate: o.creationDate, modificationDate: o.modificationDate,
          }, (s, p) => events.onStepProgress?.(i, s, p));
          currentFile = blobToFile(blob);
          const fields = Object.entries(o).filter(([, v]) => v === true).map(([k]) => k);
          outcomes.push({ stepId: step.id, name, status: 'completed', detail: fields.length ? `Cleared: ${fields.join(', ')}` : 'Nothing selected', durationMs: Date.now() - t0 });
          break;
        }
      }
    } catch (err: any) {
      throw new WorkflowStepError(
        i,
        name,
        err?.message || 'The step could not be completed.',
        outcomes
      );
    }

    events.onStepDone?.(i, outcomes[outcomes.length - 1]);
  }

  const pagesAfter = await countPages(currentFile);

  return {
    blob: currentFile.slice(0, currentFile.size, 'application/pdf') as Blob,
    outcomes,
    durationMs: Date.now() - started,
    pagesBefore: analysis.pageCount,
    pagesAfter,
  };
}

export class WorkflowStepError extends Error {
  constructor(
    public stepIndex: number,
    public stepName: string,
    public reason: string,
    public completedOutcomes: StepOutcome[]
  ) {
    super(`Step "${stepName}" failed: ${reason}`);
    this.name = 'WorkflowStepError';
  }
}

// -----------------------------------------------
// 9. Output naming helpers (local)
// -----------------------------------------------

export type NameMode = 'custom' | 'original' | 'smart' | 'date' | 'workflow';

export function buildOutputFileName(
  mode: NameMode,
  workflowName: string,
  originalName: string,
  custom: string,
  hasDate: boolean
): string {
  let base = '';
  switch (mode) {
    case 'original':
      base = originalName.replace(/\.pdf$/i, '');
      break;
    case 'smart':
      base = originalName.replace(/\.pdf$/i, '').replace(/[_\s]+/g, '_').slice(0, 48) || 'PDFMiniFly_Document';
      break;
    case 'workflow':
      base = workflowName.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '_') || 'PDFMiniFly_Workflow';
      break;
    case 'date': {
      const d = new Date();
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      base = `${originalName.replace(/\.pdf$/i, '').slice(0, 40)}_${stamp}`;
      break;
    }
    default:
      base = custom.trim() || 'PDFMiniFly_Workflow_Output';
  }
  if (mode !== 'date' && hasDate) {
    const d = new Date();
    base += `_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }
  // collapse accidental double extensions
  base = base.replace(/(\.pdf)+$/i, '');
  return `${base}.pdf`;
}

export const STEP_LABELS = STEP_NAMES;
