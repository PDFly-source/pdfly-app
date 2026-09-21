/**
 * PDFMiniFly — Local PDF table detection & extraction.
 *
 * Detects rows, columns, cell boundaries, headers, and typed values
 * (numbers, dates, currency) from PDF text coordinates — entirely
 * in the browser. No OCR round-trip, no cloud, no external APIs.
 *
 * PRIVATE. POWERFUL. LOCAL.
 */

import { parseDate, parseNumeric, XlsxCellType } from './xlsx-writer';

export interface TextItemBox {
  str: string;
  x: number; // left
  xEnd: number; // right
  y: number; // top (PDF y inverted to top-down)
  height: number;
  fontSize: number;
}

export interface ExtractedCell {
  text: string;
  type: XlsxCellType;
}

export interface DetectedTable {
  /** 0-indexed source page */
  pageIndex: number;
  rows: ExtractedCell[][];
  /** number of columns (max row width) */
  columnCount: number;
  /** Detected header row (first row if headerLike) */
  hasHeaderRow: boolean;
  /** mean row height in pt; used for layout heuristics */
  confidence: number; // 0..1 rough structure confidence
}

export interface TableExtractionResult {
  tables: DetectedTable[];
  /** true when at least one page yielded believable table structure */
  textBased: boolean;
  notes: string[];
}

interface RawItem {
  str: string;
  x: number;
  xEnd: number;
  y: number;
  height: number;
  fontSize: number;
}

function collectItems(items: any[]): RawItem[] {
  const out: RawItem[] = [];
  for (const it of items) {
    if (!it || typeof it.str !== 'string' || !it.str.trim()) continue;
    const tr = it.transform || [1, 0, 0, 0, 1, 0];
    const x = tr[4];
    const y = tr[5];
    const h = it.height || (tr[3] !== 0 ? Math.abs(tr[3]) : 10);
    const w = (it.width !== undefined ? it.width : it.str.length * h * 0.5) || h;
    out.push({
      str: it.str,
      x,
      xEnd: x + w,
      y,
      height: h,
      fontSize: h,
    });
  }
  return out;
}

/** Merge items on the same visual row & overlapping x-ranges into text runs (handles split cells). */
function mergeRowRuns(row: RawItem[]): { text: string; x: number; xEnd: number }[] {
  const sorted = [...row].sort((a, b) => a.x - b.x);
  const runs: { text: string; x: number; xEnd: number; height: number }[] = [];
  for (const item of sorted) {
    const last = runs[runs.length - 1];
    const gap = item.x - (last?.xEnd ?? Infinity);
    // same run if horizontal gap smaller than ~40% of char height (typical word spacing)
    if (last && gap < item.height * 0.4 && gap > -item.height) {
      last.text += gap > 0 ? ' ' + item.str.trim() : item.str.trim();
      last.xEnd = Math.max(last.xEnd, item.xEnd);
    } else {
      runs.push({ text: item.str.trim(), x: item.x, xEnd: item.xEnd, height: item.height });
    }
  }
  return runs;
}

/** Cluster items into rows by vertical proximity. */
function clusterRows(items: RawItem[], medianH: number): RawItem[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y); // top-down
  const tol = Math.max(2, medianH * 0.6);
  const rows: RawItem[][] = [];
  let current: RawItem[] = [];
  let currentY: number | null = null;
  for (const it of sorted) {
    if (currentY === null || Math.abs(it.y - currentY) <= tol) {
      current.push(it);
      currentY = currentY === null ? it.y : (currentY * (current.length - 1) + it.y) / current.length;
    } else {
      rows.push(current);
      current = [it];
      currentY = it.y;
    }
  }
  if (current.length) rows.push(current);
  return rows;
}

/**
 * Derive column SEPARATORS from the gaps BETWEEN runs in each row.
 * A gap position that persists across many rows (>= 15% and >= 2 rows)
 * marks a column boundary. Works for left- AND right-aligned columns
 * because the separator is the whitespace between cells, not the cell edge.
 */
function deriveColumnSeparators(rows: { text: string; x: number; xEnd: number }[][]): number[] {
  const gapCandidates: { pos: number; weight: number }[] = [];
  for (const row of rows) {
    if (row.length < 2) continue;
    const sorted = [...row].sort((a, b) => a.x - b.x);
    for (let i = 1; i < sorted.length; i++) {
      const mid = (sorted[i - 1].xEnd + sorted[i].x) / 2;
      gapCandidates.push({ pos: mid, weight: 1 });
    }
  }
  if (!gapCandidates.length) return [];
  gapCandidates.sort((a, b) => a.pos - b.pos);
  // cluster gap positions within tolerance
  const tol = 8;
  const clustered: { pos: number; weight: number }[] = [];
  for (const g of gapCandidates) {
    const last = clustered[clustered.length - 1];
    if (last && g.pos - last.pos <= tol) {
      last.pos = (last.pos * last.weight + g.pos) / (last.weight + 1);
      last.weight += g.weight;
    } else {
      clustered.push({ ...g });
    }
  }
  const rowCount = Math.max(1, rows.length);
  return clustered
    .filter((c) => c.weight >= Math.max(2, rowCount * 0.15))
    .map((c) => c.pos)
    .sort((a, b) => a - b);
}

function assignRowToColumns(row: { text: string; x: number; xEnd: number }[], separators: number[]): string[] {
  if (!separators.length) return row.map((r) => r.text);
  const cells: string[] = new Array(separators.length + 1).fill('');
  for (const run of row) {
    const center = (run.x + run.xEnd) / 2;
    // column index = number of separators to the left of the run center
    let idx = 0;
    while (idx < separators.length && separators[idx] < center) idx++;
    cells[idx] = cells[idx] ? `${cells[idx]} ${run.text}`.trim() : run.text;
  }
  // remove trailing empties (ragged rows)
  while (cells.length && !cells[cells.length - 1]) cells.pop();
  return cells;
}

function classifyCell(text: string): XlsxCellType {
  const t = text.trim();
  if (!t) return 'string';
  if (parseNumeric(t) !== null && /^[-+()]?[\s\u00A0]?[$₹€£¥]?[\d.,]+[\s\u00A0]?%?$/.test(t.replace(/[()]/g, ''))) {
    // avoid misclassifying phone numbers / IDs with slashes and pure long digit-strings as numbers
    if (/^[()\-+\s$₹€£¥\d.,%]+$/.test(t)) {
      // IDs like 123456789012 stay strings only when they look like long codes with separators — keep numbers
      return 'number';
    }
  }
  if (parseDate(t)) return 'date';
  return 'string';
}

function looksLikeHeader(cells: string[]): boolean {
  if (!cells.length || cells.length < 2) return false;
  let alpha = 0;
  for (const c of cells) {
    const t = c.trim();
    if (!t) continue;
    if (/[A-Za-z\u0080-\uFFFF]{2,}/.test(t) && !parseNumeric(t) && !parseDate(t)) alpha++;
  }
  return alpha >= Math.ceil(cells.filter((c) => c.trim()).length * 0.6);
}

/** Structure confidence: fraction of rows sharing a consistent column count. */
function structureConfidence(rows: string[][]): number {
  if (rows.length < 2) return rows.length === 1 ? 0.4 : 0;
  const counts = new Map<number, number>();
  for (const r of rows) counts.set(r.length, (counts.get(r.length) ?? 0) + 1);
  let best = 0;
  for (const n of counts.values()) best = Math.max(best, n);
  return Math.min(1, best / rows.length);
}

/**
 * Detect a table from raw pdf.js text items for a single page.
 * Exported for logic testing.
 */
export function detectTableFromItems(rawItems: any[], pageNum: number): DetectedTable | null {
  const items = collectItems(rawItems);
  if (items.length < 4) return null;

  const medianH = items.map((i) => i.height).sort((a, b) => a - b)[Math.floor(items.length / 2)] || 10;
  const rawRows = clusterRows(items, medianH);
  if (rawRows.length < 2) return null;

  const runsPerRow = rawRows.map((r) => mergeRowRuns(r));
  const boundaries = deriveColumnSeparators(runsPerRow);
  if (!boundaries.length) return null;

  const grid: string[][] = runsPerRow.map((r) => assignRowToColumns(r, boundaries));
  const filled = grid.filter((r) => r.some((c) => c.trim()));
  if (filled.length < 2) return null;

  const headerLike = looksLikeHeader(filled[0]);
  const rows: ExtractedCell[][] = filled.map((r) => r.map((text) => ({ text, type: classifyCell(text) })));

  return {
    pageIndex: pageNum - 1,
    rows,
    columnCount: Math.max(...filled.map((r) => r.length)),
    hasHeaderRow: headerLike,
    confidence: structureConfidence(filled),
  };
}

/**
 * Extract tables from the given pages of a PDF.
 * pdfJsDoc: loaded pdf.js document (from getPdfDocumentFromFile).
 * pageNumbers: 1-indexed pages to analyze.
 */
export async function extractTablesFromPdf(
  pdfJsDoc: any,
  pageNumbers: number[],
  onProgress?: (msg: string, pct: number) => void
): Promise<TableExtractionResult> {
  const tables: DetectedTable[] = [];
  const notes: string[] = [];
  let anyText = false;

  for (let pi = 0; pi < pageNumbers.length; pi++) {
    const pageNum = pageNumbers[pi];
    onProgress?.(`Scanning page ${pageNum} for table structure...`, 10 + Math.round((pi / pageNumbers.length) * 80));
    const page = await pdfJsDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    if (textContent.items.length === 0) {
      notes.push(`Page ${pageNum}: no extractable text (likely a scan). OCR may be required.`);
      continue;
    }
    anyText = true;

    const table = detectTableFromItems(textContent.items, pageNum);
    if (!table) {
      notes.push(`Page ${pageNum}: text found but no clear column structure detected.`);
      continue;
    }
    tables.push(table);
  }

  onProgress?.('Table detection complete.', 100);
  return {
    tables,
    textBased: anyText,
    notes: Array.from(new Set(notes)),
  };
}
