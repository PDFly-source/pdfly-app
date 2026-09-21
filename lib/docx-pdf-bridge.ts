/**
 * PDFMiniFly — Local DOCX ⇄ PDF conversion engines.
 *
 * DOCX → PDF: renders the parsed Word model (paragraphs, headings, bold/
 * italic runs, tables) into a real PDF via pdf-lib, with word wrapping,
 * page breaks, and Unicode-safe text via the existing font-safe layer.
 *
 * PDF → DOCX: extracts text with font sizes, reconstructs paragraphs and
 * headings, and writes a standards-compliant .docx locally.
 *
 * Honest limitations are surfaced by the caller:
 *  - DOCX→PDF is layout-rebuilt, not pixel-perfect: images, headers/footers,
 *    footnotes, and exotic styling are not carried over.
 *  - Non-WinAnsi characters (e.g. Assamese script) are sanitized by the
 *    existing font-safe layer; the PDF stays valid but such glyphs may be
 *    substituted.
 *  - PDF→DOCX reconstructs flow; complex multi-column layouts may reflow.
 *
 * PRIVATE. POWERFUL. LOCAL.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { safeDrawText, safeWidthOfTextAtSize, sanitizeForWinAnsi } from './font-safe';
import { getPdfDocumentFromFile } from './pdfjs-init';
import { buildDocx, reconstructBlocks, DocxDocumentModel as DM, DocxParagraph, DocxTable } from './docx-engine';
import type { ReconstructedBlock } from './docx-engine';

// ============================================================
// DOCX → PDF
// ============================================================

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 56; // ~2cm
const BURGUNDY = rgb(0.478, 0.086, 0.208);

interface FlowOptions {
  bodySize: number;
  lineFactor: number;
}

function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? current + ' ' + word : word;
    const w = safeWidthOfTextAtSize(font, candidate, size);
    if (w <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function docxToPdf(
  model: DM,
  onProgress?: (msg: string, pct: number) => void
): Promise<Blob> {
  onProgress?.('Preparing fonts...', 5);
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([A4.w, A4.h]);
  let y = A4.h - MARGIN;
  const contentW = A4.w - MARGIN * 2;
  const opts: FlowOptions = { bodySize: 11, lineFactor: 1.45 };

  const blocks = model.blocks;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    onProgress?.(`Rendering content (${Math.round((i / Math.max(1, blocks.length)) * 80) + 10}%)...`, 10 + Math.round((i / Math.max(1, blocks.length)) * 80));

    if ('runs' in block) {
      const para: DocxParagraph = block;
      const level = para.headingLevel;
      const size = level ? Math.max(13, 22 - level * 2) : opts.bodySize;
      const useBold = level > 0 || para.runs.every((r) => r.bold);
      const font = useBold ? bold : regular;
      const color = level ? BURGUNDY : rgb(0.12, 0.1, 0.11);

      // flatten runs (bold/italic nuance is lost if mixed; acceptable, disclosed)
      const text = para.runs.map((r) => r.text).join('');
      const indent = para.isListItem ? 14 : 0;
      const lines = wrapText(text, font, size, contentW - indent);
      const lineH = size * opts.lineFactor;

      for (const line of lines) {
        if (y - lineH < MARGIN) {
          page = doc.addPage([A4.w, A4.h]);
          y = A4.h - MARGIN;
        }
        safeDrawText(page, para.isListItem && line === lines[0] ? '• ' + line : line, {
          x: MARGIN + indent,
          y: y - size,
          size,
          font,
          color,
        });
        y -= lineH;
      }
      if (level) y -= 6; // heading breathing room
      else y -= 4;
    } else {
      const table = block as DocxTable;
      // estimate needed height; if it overflows, just draw row by row and
      // page-break when the next row wouldn't fit
      const rowH = 20;
      for (let ri = 0; ri < table.rows.length; ri++) {
        if (y - rowH < MARGIN) {
          page = doc.addPage([A4.w, A4.h]);
          y = A4.h - MARGIN;
        }
        const maxCols = Math.max(...table.rows.map((r) => r.length), 1);
        const colW = contentW / maxCols;
        table.rows[ri].forEach((cell, ci) => {
          const x = MARGIN + ci * colW;
          const isHeader = ri === 0;
          const text = sanitizeForWinAnsi(cell ?? '', regular);
          const truncated = text.length > 60 ? text.slice(0, 58) + '…' : text;
          safeDrawText(page, truncated, {
            x: x + 4,
            y: y - 14,
            size: opts.bodySize - 1,
            font: isHeader ? bold : regular,
            color: isHeader ? BURGUNDY : rgb(0.13, 0.13, 0.13),
          });
        });
        page.drawLine({
          start: { x: MARGIN, y },
          end: { x: MARGIN + contentW, y },
          thickness: 0.5,
          color: rgb(0.85, 0.85, 0.85),
        });
        y -= rowH;
      }
      y -= 10;
    }
  }

  doc.setProducer('PDFMiniFly Local DOCX Converter');
  doc.setCreator('PDFMiniFly');
  onProgress?.('Saving PDF...', 95);
  const bytes = await doc.save({ useObjectStreams: true });
  return new Blob([bytes as any], { type: 'application/pdf' });
}

// ============================================================
// PDF → DOCX
// ============================================================

export interface PdfToDocxOptions {
  /** keep each PDF page as an explicit page break in the DOCX */
  pageBreaks: boolean;
  /** detect headings from font size */
  detectHeadings: boolean;
}

export async function pdfToDocx(
  file: File,
  options: PdfToDocxOptions,
  onProgress?: (msg: string, pct: number) => void
): Promise<{ blob: Blob; paragraphCount: number; headingCount: number }> {
  onProgress?.('Extracting text with layout information...', 10);
  const bytes = await file.arrayBuffer();
  const pdfJsDoc = await getPdfDocumentFromFile(bytes);
  const totalPages = pdfJsDoc.numPages;

  const blocks: any[] = [];
  let headingCount = 0;
  let paragraphCount = 0;
  let anyText = false;

  for (let p = 1; p <= totalPages; p++) {
    onProgress?.(`Reading page ${p} of ${totalPages}...`, 10 + Math.round((p / totalPages) * 70));
    const page = await pdfJsDoc.getPage(p);
    const content = await page.getTextContent();

    interface LineItem { text: string; fontSize: number }
    const lines: LineItem[] = [];
    // group items into lines by y with a fontSize representative (max size in line)
    const rows = new Map<number, { text: string[]; size: number }>();
    for (const item of content.items as any[]) {
      if (!item || typeof item.str !== 'string' || !item.str.trim()) continue;
      anyText = true;
      const y = item.transform ? Math.round(item.transform[5]) : 0;
      const fs = item.height || (item.transform ? Math.abs(item.transform[3]) : 10) || 10;
      const bucket = rows.get(y) ?? { text: [], size: 0 };
      bucket.text.push(item.str);
      bucket.size = Math.max(bucket.size, fs);
      rows.set(y, bucket);
    }
    const sortedY = [...rows.keys()].sort((a, b) => b - a);
    for (const y of sortedY) {
      const bucket = rows.get(y)!;
      lines.push({ text: bucket.text.join(' ').replace(/\s+/g, ' ').trim(), fontSize: bucket.size });
    }

    const reconstructed = options.detectHeadings
      ? reconstructBlocks(lines)
      : lines.map((l) => ({ kind: 'paragraph' as const, text: l.text }));

    for (const b of reconstructed) {
      if (b.kind === 'heading') {
        blocks.push({ runs: [{ text: b.text }], headingLevel: b.level ?? 3, isListItem: false });
        headingCount++;
      } else if (b.text) {
        blocks.push({ runs: [{ text: b.text }], headingLevel: 0, isListItem: false });
        paragraphCount++;
      }
    }

    if (options.pageBreaks && p < totalPages) {
      // explicit page marker: Word renders a manual page break
      blocks.push({ runs: [{ text: '\f' }], headingLevel: 0, isListItem: false });
    }
  }

  if (!anyText) {
    throw new Error('No extractable text found. This PDF appears to be scanned images — run OCR first (OCR PDF tool), then convert.');
  }

  onProgress?.('Building Word document...', 85);
  // insert real page breaks via empty paragraph + w:br type=page is handled in writer
  const model: DM = { blocks };
  const blob = await buildDocx(model, { creator: 'PDFMiniFly Local PDF to DOCX' });

  onProgress?.('Complete!', 100);
  return { blob, paragraphCount, headingCount };
}
