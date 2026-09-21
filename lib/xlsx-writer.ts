/**
 * PDFMiniFly — Minimal local XLSX writer.
 *
 * Generates a valid Office Open XML workbook (XLSX) entirely in the browser
 * using JSZip — no server, no cloud, no third-party spreadsheet library.
 *
 * PRIVATE. POWERFUL. LOCAL.
 */

import JSZip from 'jszip';

export type XlsxCellType = 'string' | 'number' | 'date';

export interface XlsxCell {
  value: string;
  type: XlsxCellType;
}

export interface XlsxSheetData {
  /** Rows of cells. row[0] is treated as the header row (rendered bold). */
  rows: XlsxCell[][];
  /** Column display names; optional (defaults: A, B, C...). */
  headerRow?: string[] | null;
  sheetName?: string;
}

/** XML-escape a string for embedding in sheet XML. */
function xmlEscape(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // strip control characters that are illegal in XML 1.0
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

function colLetter(index0: number): string {
  let n = index0;
  let out = '';
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

/** Excel serial date: days since 1899-12-30 (covers the Excel 1900 leap bug era for modern dates). */
function excelSerial(ms: number): number {
  const days = (ms - Date.UTC(1899, 11, 30)) / 86400000;
  return Math.round(days * 1e6) / 1e6;
}

/** True when the value parses as a number the way a spreadsheet would store it. */
export function parseNumeric(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  // Handle common statement formats: 1,234.56 / (123.45) / 1 234,56 / ₹500 / $1,200.50 / -42
  let negative = false;
  let body = trimmed;
  if (/^\(.*\)$/.test(body)) {
    negative = true;
    body = body.slice(1, -1);
  }
  body = body.replace(/^[-+]/, (m) => {
    if (m === '-') negative = !negative;
    return '';
  });
  body = body.replace(/[\s\u00A0]/g, '');
  // strip leading currency symbols
  body = body.replace(/^[$₹€£¥]/, '');
  // trailing percent becomes a plain number (spreadsheet convention)
  body = body.replace(/%$/, '');
  const eurStyle = /^\d{1,3}(\.\d{3})*,\d+$/.test(body); // 1.234,56
  if (eurStyle) body = body.replace(/\./g, '').replace(',', '.');
  else body = body.replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(body)) return null;
  const num = Number(body);
  if (!isFinite(num)) return null;
  return negative ? -num : num;
}

export interface ParsedDate {
  iso: string; // YYYY-MM-DD
  ms: number;
}

/** Parse common human date formats; returns ISO (YYYY-MM-DD) + epoch ms, or null. */
export function parseDate(text: string): ParsedDate | null {
  const t = text.trim();
  if (!t || t.length < 6 || t.length > 24) return null;
  // ISO 2024-03-15 or 2024/03/15
  let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return isoDate(y, mo, d);
  }
  // 15-03-2024 / 15.03.2024 / 03/15/2024 (ambiguous: treat D-M-Y as D-M-Y when first > 12)
  m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) {
    let a = Number(m[1]);
    let b = Number(m[2]);
    const y = Number(m[3]);
    if (a > 12 && b <= 12) return isoDate(y, b, a); // D-M-Y
    if (b > 12 && a <= 12) return isoDate(y, a, b); // M-D-Y
    // ambiguous — prefer D-M-Y (statement convention) but validate
    return isoDate(y, b, a);
  }
  // 15 Mar 2024 / Mar 15, 2024
  const months: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  };
  m = t.match(/^(\d{1,2})\s+([A-Za-z]{3,9})[.,]?\s+(\d{4})$/);
  if (m) {
    const mo = months[m[2].slice(0, 4).toLowerCase()] ?? months[m[2].toLowerCase().slice(0, 3)];
    if (mo) return isoDate(Number(m[3]), mo, Number(m[1]));
  }
  m = t.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const mo = months[m[1].toLowerCase().slice(0, 3)];
    if (mo) return isoDate(Number(m[3]), mo, Number(m[2]));
  }
  return null;
}

function isoDate(y: number, mo: number, d: number): ParsedDate | null {
  if (y < 1000 || y > 9999) return null;
  const ms = Date.UTC(y, mo - 1, d);
  const dt = new Date(ms);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return { iso: `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`, ms };
}

function buildSheetXml(sheet: XlsxSheetData): { xml: string; maxCols: number } {
  const rows = sheet.rows;
  let maxCols = 0;

  const rowsXml = rows
    .map((row, rIdx) => {
      maxCols = Math.max(maxCols, row.length);
      const cells = row
        .map((cell, cIdx) => {
          const ref = `${colLetter(cIdx)}${rIdx + 1}`;
          if (cell.type === 'number') {
            const n = parseNumeric(cell.value);
            if (n !== null) return `<c r="${ref}" t="n"><v>${n}</v></c>`;
          }
          if (cell.type === 'date') {
            const d = parseDate(cell.value);
            if (d) {
              // style 2 = date format
              return `<c r="${ref}" s="2" t="n"><v>${excelSerial(d.ms)}</v></c>`;
            }
          }
          const str = xmlEscape(cell.value);
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${str}</t></is></c>`;
        })
        .join('');
      return `<row r="${rIdx + 1}">${cells}</row>`;
    })
    .join('');

  return { xml: `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowsXml}</sheetData></worksheet>`, maxCols };
}

const SHEET_XML_HEAD =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

/** Column widths + frozen header + bold header come via styles.xml + a cols block. */
function addPresentation(sheetXml: string, sheet: XlsxSheetData, maxCols: number): string {
  if (!sheet.headerRow || maxCols === 0) return sheetXml;
  // compute display widths (capped) so columns are readable on open
  const widths: number[] = [];
  for (let c = 0; c < maxCols; c++) {
    let w = String(sheet.headerRow[c] ?? colLetter(c)).length;
    for (const row of sheet.rows) {
      const len = (row[c]?.value ?? '').length;
      if (len > w) w = len;
    }
    widths.push(Math.min(Math.max(w + 2, 8), 40));
  }
  const colsXml = widths
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join('');
  // freeze the first row
  const sheetViews = '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>';
  return sheetXml.replace(
    '<sheetData>',
    `${sheetViews}<cols>${colsXml}</cols><sheetData>`
  );
}

export async function buildXlsx(
  sheets: XlsxSheetData[]
): Promise<Blob> {
  const zip = new JSZip();

  zip.file(
    '[Content_Types].xml',
    SHEET_XML_HEAD +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`
  );

  zip.file(
    '_rels/.rels',
    SHEET_XML_HEAD +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
  );

  const sheetNames = sheets.map((s, i) => (s.sheetName || `Sheet${i + 1}`).replace(/[\\/?*[\]:]/g, '').slice(0, 31) || `Sheet${i + 1}`);

  zip.file(
    'xl/workbook.xml',
    SHEET_XML_HEAD +
      `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
${sheetNames.map((n, i) => `<sheet name="${xmlEscape(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('\n')}
</sheets>
</workbook>`
  );

  zip.file(
    'xl/_rels/workbook.xml.rels',
    SHEET_XML_HEAD +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheetNames
  .map(
    (_, i) =>
      `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
  )
  .join('\n')}
<Relationship Id="rId${sheetNames.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  );

  // styles: 0 default, 1 bold (header), 2 date format
  zip.file(
    'xl/styles.xml',
    SHEET_XML_HEAD +
      `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/></numFmts>
<fonts count="2"><font/><font><b/></font></fonts>
<fills count="2"><fill/><fill/></fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf/></cellStyleXfs>
<cellXfs count="3">
<xf/>
<xf fontId="1" applyFont="1"/>
<xf numFmtId="164" applyNumberFormat="1"/>
</cellXfs>
</styleSheet>`
  );

  sheets.forEach((sheet, i) => {
    const { xml, maxCols } = buildSheetXml(sheet);
    zip.file(`xl/worksheets/sheet${i + 1}.xml`, SHEET_XML_HEAD + addPresentation(xml, sheet, maxCols));
  });

  const out = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  return out;
}

/** Serialize rows to CSV text with configurable delimiter, UTF-8 safe. */
export function buildCsv(rows: string[][], delimiter: string): string {
  const d = delimiter === 'tab' ? '\t' : delimiter === ';' ? ';' : ',';
  const escape = (val: string) => {
    const s = String(val ?? '');
    if (s.includes('"') || s.includes('\n') || s.includes(d)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  return rows.map((r) => r.map(escape).join(d)).join('\r\n');
}

/** Build a downloadable CSV Blob with BOM so Excel opens Unicode/Assamese correctly. */
export function buildCsvBlob(rows: string[][], delimiter: string): Blob {
  const text = '\uFEFF' + buildCsv(rows, delimiter);
  return new Blob([text], { type: 'text/csv;charset=utf-8' });
}
