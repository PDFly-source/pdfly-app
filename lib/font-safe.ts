import { PDFFont, PDFPage, RGB, degrees } from 'pdf-lib';

export const INDIC_DIGIT_MAP: Record<string, string> = {
  // Assamese & Bengali digits (U+09E6 - U+09EF)
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
  // Devanagari / Hindi digits (U+0966 - U+096F)
  '०': '0',
  '१': '1',
  '२': '2',
  '३': '3',
  '४': '4',
  '५': '5',
  '६': '6',
  '७': '7',
  '८': '8',
  '९': '9',
  // Eastern Arabic-Indic digits (U+0660 - U+0669)
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
  // Extended Arabic-Indic / Persian digits (U+06F0 - U+06F9)
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
};

export const COMMON_PUNCTUATION_MAP: Record<string, string> = {
  '“': '"',
  '”': '"',
  '‘': "'",
  '’': "'",
  '‚': ',',
  '„': '"',
  '—': '-',
  '–': '-',
  '―': '-',
  '…': '...',
  '•': '*',
  '·': '*',
  '°': ' deg',
  '₹': 'Rs.',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '©': '(c)',
  '®': '(R)',
  '™': 'TM',
};

/**
 * Sanitizes any string so it can be safely used with pdf-lib StandardFonts (WinAnsi).
 * Automatically converts Indic digits (including Assamese/Bengali '১' -> '1'),
 * standardizes quotes/dashes/currency, and filters out characters not supported
 * by the embedded font's character set.
 */
export function sanitizeForWinAnsi(text: string, font?: PDFFont): string {
  if (!text) return '';

  let converted = '';
  for (const ch of text) {
    if (INDIC_DIGIT_MAP[ch]) {
      converted += INDIC_DIGIT_MAP[ch];
    } else if (COMMON_PUNCTUATION_MAP[ch]) {
      converted += COMMON_PUNCTUATION_MAP[ch];
    } else {
      converted += ch;
    }
  }

  let supportedSet: Set<number> | null = null;
  if (font && typeof font.getCharacterSet === 'function') {
    try {
      supportedSet = new Set(font.getCharacterSet());
    } catch {
      supportedSet = null;
    }
  }

  let result = '';
  for (let i = 0; i < converted.length; i++) {
    const ch = converted[i];
    const code = ch.charCodeAt(0);

    if (supportedSet) {
      if (supportedSet.has(code)) {
        result += ch;
      } else {
        result += ' ';
      }
    } else {
      // Default WinAnsi range fallback (ASCII printable 32..126, Latin-1 supplement 160..255)
      if (
        (code >= 32 && code <= 126) ||
        (code >= 160 && code <= 255) ||
        code === 10 ||
        code === 13 ||
        code === 9
      ) {
        result += ch;
      } else {
        result += ' ';
      }
    }
  }

  return result;
}

/**
 * Calculates text width using font.widthOfTextAtSize safely without throwing on non-WinAnsi characters.
 */
export function safeWidthOfTextAtSize(font: PDFFont, text: string, fontSize: number): number {
  try {
    const safeText = sanitizeForWinAnsi(text, font);
    return font.widthOfTextAtSize(safeText, fontSize);
  } catch {
    return (text.length * fontSize) / 2;
  }
}

/**
 * Calls page.drawText safely with WinAnsi character sanitization and error recovery.
 */
export function safeDrawText(
  page: PDFPage,
  text: string,
  options: {
    x?: number;
    y?: number;
    size?: number;
    font?: PDFFont;
    color?: RGB;
    opacity?: number;
    rotate?: ReturnType<typeof degrees>;
    lineHeight?: number;
    maxWidth?: number;
  }
): void {
  try {
    const safeText = options.font ? sanitizeForWinAnsi(text, options.font) : sanitizeForWinAnsi(text);
    if (!safeText.trim()) return;

    page.drawText(safeText, options);
  } catch (err) {
    console.warn('safeDrawText encountered unencodable glyph, falling back to ASCII stripping:', err);
    try {
      const asciiOnly = text.replace(/[^\x20-\x7E]/g, ' ');
      if (asciiOnly.trim()) {
        page.drawText(asciiOnly, options);
      }
    } catch {
      // Gracefully prevent throwing
    }
  }
}
