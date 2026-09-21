/**
 * PDFMiniFly — N-Up imposition engine.
 *
 * Places 1/2/4/6/9 pages per sheet with margins, gutter, borders,
 * and custom paper sizes — locally via pdf-lib.
 *
 * PRIVATE. POWERFUL. LOCAL.
 */

import { PDFDocument, degrees, rgb } from 'pdf-lib';

export type NupLayout = 1 | 2 | 4 | 6 | 9;
export type SheetOrientation = 'portrait' | 'landscape';
export type PageOrder = 'across' | 'down';

export interface NupOptions {
  layout: NupLayout;
  sheetOrientation: SheetOrientation;
  /** base sheet size in points */
  paperWidth: number;
  paperHeight: number;
  /** page orientation on the sheet cells */
  cellOrientation: SheetOrientation;
  margin: number;
  gutter: number;
  showBorder: boolean;
  borderColor?: string; // hex like '#7A1635'
  pageOrder: PageOrder;
  /** true = scale each page to fill its cell (keeps aspect, letterboxes) */
  fitToCell: boolean;
}

/** Grid rows/cols per layout count. */
function gridFor(layout: NupLayout, sheetOrientation: SheetOrientation): { rows: number; cols: number } {
  switch (layout) {
    case 1:
      return { rows: 1, cols: 1 };
    case 2:
      return sheetOrientation === 'portrait' ? { rows: 2, cols: 1 } : { rows: 1, cols: 2 };
    case 4:
      return { rows: 2, cols: 2 };
    case 6:
      return sheetOrientation === 'portrait' ? { rows: 3, cols: 2 } : { rows: 2, cols: 3 };
    case 9:
      return { rows: 3, cols: 3 };
  }
}

export interface NupResult {
  blob: Blob;
  sheets: number;
  pagesConsumed: number;
}

export async function nupPdf(
  file: File,
  options: NupOptions,
  onProgress?: (msg: string, pct: number) => void
): Promise<NupResult> {
  onProgress?.('Loading document...', 5);
  const srcBytes = await file.arrayBuffer();
  const src = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
  const totalPages = src.getPageCount();
  if (totalPages === 0) throw new Error('This PDF has no pages.');

  const out = await PDFDocument.create();
  const embedded = await out.embedPdf(src, Array.from({ length: totalPages }, (_, i) => i));

  const {
    layout,
    sheetOrientation,
    paperWidth,
    paperHeight,
    cellOrientation,
    margin,
    gutter,
    showBorder,
    borderColor,
    pageOrder,
    fitToCell,
  } = options;

  const sheetW = sheetOrientation === 'portrait' ? paperWidth : paperHeight;
  const sheetH = sheetOrientation === 'portrait' ? paperHeight : paperWidth;
  const { rows, cols } = gridFor(layout, sheetOrientation);

  const cellsPerSheet = rows * cols;
  const sheets = Math.ceil(totalPages / cellsPerSheet);

  // cell geometry
  const cellW = (sheetW - margin * 2 - gutter * (cols - 1)) / cols;
  const cellH = (sheetH - margin * 2 - gutter * (rows - 1)) / rows;

  const hexToRgb = (hex: string) => {
    const m = hex.replace('#', '');
    return rgb(parseInt(m.slice(0, 2), 16) / 255, parseInt(m.slice(2, 4), 16) / 255, parseInt(m.slice(4, 6), 16) / 255);
  };
  const border = showBorder ? (borderColor ? hexToRgb(borderColor) : rgb(0.6, 0.6, 0.6)) : null;

  for (let sheet = 0; sheet < sheets; sheet++) {
    onProgress?.(`Composing sheet ${sheet + 1} of ${sheets}...`, 10 + Math.round((sheet / Math.max(1, sheets)) * 85));
    const page = out.addPage([sheetW, sheetH]);

    for (let slot = 0; slot < cellsPerSheet; slot++) {
      // page order: 'across' (left-to-right then down) or 'down' (top-to-bottom then across)
      let row: number;
      let col: number;
      if (pageOrder === 'across') {
        row = Math.floor(slot / cols);
        col = slot % cols;
      } else {
        row = slot % rows;
        col = Math.floor(slot / rows);
      }

      const pageIndex = sheet * cellsPerSheet + slot;
      if (pageIndex >= totalPages) break;

      const em = embedded[pageIndex];
      // cell box (PDF coords: bottom-left origin)
      const cellX = margin + col * (cellW + gutter);
      const cellY = sheetH - margin - (row + 1) * cellH - row * gutter;

      // draw border inside the cell
      if (border) {
        page.drawRectangle({ x: cellX, y: cellY, width: cellW, height: cellH, borderColor: border, borderWidth: 0.75 });
      }

      const cx = cellX + cellW / 2;
      const cy = cellY + cellH / 2;
      const isLandscapePage = em.width > em.height;
      const rotate = cellOrientation === 'landscape' && !isLandscapePage;

      if (rotate) {
        // Rotate the portrait page -90° to lie landscape in its cell.
        // After -90° rotation about the image origin, the image's height runs
        // along +x and its width along -y, so scale against swapped axes.
        const s = Math.min(cellW / em.height, cellH / em.width);
        const w = em.width * s;
        const h = em.height * s;
        page.drawPage(em, {
          x: cx - h / 2,
          y: cy + w / 2,
          width: w,
          height: h,
          rotate: degrees(-90),
        });
      } else {
        // scale page into the cell, keep aspect (fit to the smaller dimension)
        let drawW = cellW;
        let drawH = (cellW * em.height) / em.width;
        if (drawH > cellH) {
          drawH = cellH;
          drawW = (cellH * em.width) / em.height;
        }
        page.drawPage(em, {
          x: cx - drawW / 2,
          y: cy - drawH / 2,
          width: drawW,
          height: drawH,
        });
      }
    }
  }

  out.setProducer('PDFMiniFly Local N-Up Composer');
  onProgress?.('Saving imposed document...', 95);
  const bytes = await out.save({ useObjectStreams: true });
  return {
    blob: new Blob([bytes as any], { type: 'application/pdf' }),
    sheets,
    pagesConsumed: totalPages,
  };
}

/** Standard paper sizes in points. */
export const PAPER_SIZES: Record<string, { label: string; width: number; height: number }> = {
  a4: { label: 'A4 (210×297 mm)', width: 595.28, height: 841.89 },
  a3: { label: 'A3 (297×420 mm)', width: 841.89, height: 1190.55 },
  letter: { label: 'US Letter (8.5×11")', width: 612, height: 792 },
  legal: { label: 'US Legal (8.5×14")', width: 612, height: 1008 },
};

export const NUP_LAYOUTS: { value: NupLayout; label: string; hint: string }[] = [
  { value: 1, label: '1-up', hint: 'One page per sheet' },
  { value: 2, label: '2-up', hint: 'Two pages side by side' },
  { value: 4, label: '4-up', hint: '2×2 grid' },
  { value: 6, label: '6-up', hint: '3×2 grid' },
  { value: 9, label: '9-up', hint: '3×3 grid' },
];
