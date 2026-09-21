/**
 * PDFMiniFly — Local DOCX reader & writer.
 *
 * Reads WordprocessingML (the XML inside .docx) and writes a
 * standards-compliant minimal .docx — all in the browser via JSZip.
 * No Office cloud, no conversion servers.
 *
 * PRIVATE. POWERFUL. LOCAL.
 */

import JSZip from 'jszip';

// ============================================================
// READER — DOCX → structured document model
// ============================================================

export interface DocxTextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export interface DocxParagraph {
  runs: DocxTextRun[];
  /** heading level 1-6, 0 = normal */
  headingLevel: number;
  /** list paragraph (bullet/numbered) */
  isListItem: boolean;
}

export interface DocxTable {
  rows: string[][];
}

export interface DocxDocumentModel {
  blocks: (DocxParagraph | DocxTable)[];
}

function parseParagraphElement(pEl: Element): DocxParagraph {
  const runs: DocxTextRun[] = [];
  const isListItem = !!pEl.getElementsByTagName('w:numPr').length;

  let pStyle = '';
  const pStyleEl = pEl.getElementsByTagName('w:pStyle')[0];
  if (pStyleEl) {
    pStyle = pStyleEl.getAttribute('w:val') || '';
  }
  const headingMatch = pStyle.match(/Heading(\d)/i);
  const headingLevel = headingMatch ? Math.min(6, Number(headingMatch[1])) : 0;

  // runs may nest in w:r directly, or inside w:hyperlink; walk all w:r descendants
  const rEls = pEl.getElementsByTagName('w:r');
  let currentRun: DocxTextRun | null = null;
  for (let i = 0; i < rEls.length; i++) {
    const rEl = rEls[i];
    let bold = !!rEl.getElementsByTagName('w:b').length;
    let italic = !!rEl.getElementsByTagName('w:i').length;
    const tEls = rEl.getElementsByTagName('w:t');
    for (let j = 0; j < tEls.length; j++) {
      const text = tEls[j].textContent || '';
      if (!text) continue;
      const r: DocxTextRun = { text, bold, italic };
      // merge adjacent runs with identical formatting
      if (currentRun && currentRun.bold === bold && currentRun.italic === italic) {
        currentRun.text += text;
      } else {
        currentRun = r;
        runs.push(currentRun);
      }
    }
    // w:tab and w:br
    if (rEl.getElementsByTagName('w:tab').length && currentRun) currentRun.text += '\t';
    if (rEl.getElementsByTagName('w:br').length && currentRun) currentRun.text += '\n';
  }

  return { runs, headingLevel, isListItem };
}

function parseTableElement(tblEl: Element): DocxTable {
  const rows: string[][] = [];
  const trEls = tblEl.getElementsByTagName('w:tr');
  for (let i = 0; i < trEls.length; i++) {
    const row: string[] = [];
    const tcEls = trEls[i].getElementsByTagName('w:tc');
    for (let j = 0; j < tcEls.length; j++) {
      const texts = tcEls[j].getElementsByTagName('w:t');
      let cellText = '';
      for (let k = 0; k < texts.length; k++) cellText += texts[k].textContent || '';
      row.push(cellText.trim());
    }
    rows.push(row);
  }
  return { rows };
}

/**
 * Parse a .docx file into a document model (paragraphs, headings, lists, tables).
 * Throws a clear error for non-docx / corrupted files.
 */
export async function readDocx(file: File | ArrayBuffer): Promise<DocxDocumentModel> {
  const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error('This file is not a valid .docx (Word 2007+) document. Legacy .doc files are not supported.');
  }
  const docEntry = zip.file('word/document.xml');
  if (!docEntry) {
    throw new Error('This file does not contain Word document data (word/document.xml missing).');
  }
  const xml = await docEntry.async('string');
  const parser = new DOMParser();
  const dom = parser.parseFromString(xml, 'application/xml');
  if (dom.getElementsByTagName('parsererror').length) {
    throw new Error('The Word document XML appears corrupted.');
  }

  const body = dom.getElementsByTagName('w:body')[0];
  if (!body) throw new Error('The Word document has no body content.');

  const blocks: (DocxParagraph | DocxTable)[] = [];
  // iterate direct children of body to keep paragraph/table order
  const children = body.children;
  for (let i = 0; i < children.length; i++) {
    const el = children[i];
    const tag = el.tagName.toLowerCase();
    if (tag === 'w:p') {
      const para = parseParagraphElement(el);
      if (para.runs.some((r) => r.text.trim()) || para.headingLevel > 0) blocks.push(para);
    } else if (tag === 'w:tbl') {
      const table = parseTableElement(el);
      if (table.rows.length) blocks.push(table);
    }
    // skip sectPr etc.
  }

  return { blocks };
}

// ============================================================
// WRITER — document model → .docx
// ============================================================

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

function runsXml(text: string, bold = false, italic = false): string {
  const rPr = `${bold ? '<w:b/>' : ''}${italic ? '<w:i/>' : ''}`;
  //  (form feed) = explicit page break; \n = soft line break
  const parts: string[] = [];
  for (const rawLine of text.split('\f')) {
    if (parts.length) parts.push('<w:r><w:br w:type="page"/></w:r>');
    rawLine.split('\n').forEach((line, idx) => {
      if (idx > 0) parts.push('<w:r><w:br/></w:r>');
      parts.push(`<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(line)}</w:t></w:r>`);
    });
  }
  return parts.join('');
}

function paragraphXml(text: string, opts?: { heading?: number; bold?: boolean }): string {
  const heading = opts?.heading ?? 0;
  const pPr = heading
    ? `<w:pPr><w:pStyle w:val="Heading${Math.min(6, heading)}"/></w:pPr>`
    : '';
  return `<w:p>${pPr}${runsXml(text, opts?.bold ?? false)}</w:p>`;
}

function tableXml(rows: string[][]): string {
  const maxCols = Math.max(...rows.map((r) => r.length), 1);
  const trs = rows
    .map(
      (row) =>
        `<w:tr>${Array.from({ length: maxCols }, (_, c) => row[c] ?? '')
          .map(
            (cell) =>
              `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr><w:p>${runsXml(cell)}</w:p></w:tc>`
          )
          .join('')}</w:tr>`
    )
    .join('');
  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblBorders>` +
    ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
      .map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="999999"/>`)
      .join('') +
    `</w:tblBorders></w:tblPr>${trs}</w:tbl>`;
}

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

/**
 * Build a .docx from the document model. Paragraphs, headings, tables,
 * page breaks ('\\f' in text) supported.
 */
export async function buildDocx(
  model: DocxDocumentModel,
  options?: { creator?: string }
): Promise<Blob> {
  const zip = new JSZip();

  const bodyParts: string[] = [];
  for (const block of model.blocks) {
    if ('runs' in block) {
      if (block.runs.length === 0) {
        bodyParts.push('<w:p/>');
        continue;
      }
      const pPr = block.headingLevel
        ? `<w:pPr><w:pStyle w:val="Heading${Math.min(6, block.headingLevel)}"/></w:pPr>`
        : block.isListItem
          ? '<w:pPr><w:ind w:left="720"/></w:pPr>'
          : '';
      const runs = block.runs
        .map((r) => runsXml(r.text, r.bold, r.italic))
        .join('');
      bodyParts.push(`<w:p>${pPr}${runs}</w:p>`);
    } else {
      bodyParts.push(tableXml(block.rows));
      // Word requires a paragraph after a table
      bodyParts.push('<w:p/>');
    }
  }

  zip.file(
    'word/document.xml',
    XML_HEAD +
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>` +
      bodyParts.join('') +
      `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>` +
      `</w:body></w:document>`
  );

  zip.file(
    '[Content_Types].xml',
    XML_HEAD +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`
  );

  zip.file(
    '_rels/.rels',
    XML_HEAD +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  zip.file(
    'word/_rels/document.xml.rels',
    XML_HEAD +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  );

  // styles: Heading1-6 + TableGrid, all using standard fallbacks Word provides
  const headingStyles = Array.from({ length: 6 }, (_, i) => {
    const lvl = i + 1;
    const sz = Math.max(20, 32 - lvl * 2);
    return `<w:style w:type="paragraph" w:styleId="Heading${lvl}">
<w:name w:val="heading ${lvl}"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/></w:pPr>
<w:rPr>${lvl === 1 ? '<w:b/>' : ''}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:style>`;
  }).join('');

  zip.file(
    'word/styles.xml',
    XML_HEAD +
      `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:rPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
${headingStyles}
<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/></w:style>
</w:styles>`
  );

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

// ============================================================
// Convenience helpers for PDF → DOCX reconstruction
// ============================================================

export interface ReconstructedBlock {
  kind: 'heading' | 'paragraph' | 'pagebreak';
  text: string;
  level?: number;
}

/** Heuristics: short standalone lines → headings; blank lines split paragraphs. */
export function reconstructBlocks(lines: { text: string; fontSize?: number }[]): ReconstructedBlock[] {
  const blocks: ReconstructedBlock[] = [];
  const sizes = lines.map((l) => l.fontSize ?? 0).filter(Boolean).sort((a, b) => a - b);
  const bodySize = sizes[Math.floor(sizes.length / 2)] || 11;

  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) {
      blocks.push({ kind: 'paragraph', text: paragraph.join(' ').replace(/\s+/g, ' ').trim() });
      paragraph = [];
    }
  };

  for (const line of lines) {
    const t = line.text.trim();
    if (!t) {
      flush();
      continue;
    }
    const fs = line.fontSize ?? bodySize;
    const short = t.length <= 80;
    if (fs > bodySize * 1.18 && short) {
      flush();
      blocks.push({
        kind: 'heading',
        text: t,
        level: fs > bodySize * 1.6 ? 1 : fs > bodySize * 1.35 ? 2 : 3,
      });
    } else if (short && /^[A-Z0-9][A-Z0-9 .,\-—:&'()]+$/.test(t) && t.length <= 60 && !t.endsWith('.')) {
      // ALL-CAPS short line (title case ignored)
      flush();
      blocks.push({ kind: 'heading', text: t, level: 3 });
    } else {
      paragraph.push(t);
    }
  }
  flush();
  return blocks;
}
