// ==========================================
// Batch output naming — local, predictable, no network.
// Rules:
// - preserve the original extension
// - kebab-case operation suffix (document.pdf -> document-compressed.pdf)
// - strip an existing operation suffix on re-runs (no double suffixes)
// - resolve duplicate output names safely (document-compressed-2.pdf)
// - never equal the original filename (never overwrite the source)
// ==========================================

const EXT_RE = /(\.[^./]+)$/;

/** Strips a known trailing operation suffix (e.g. "-compressed") from a base name. */
export function stripOperationSuffix(baseName: string, opSuffix: string): string {
  if (!opSuffix) return baseName;
  const re = new RegExp(`[-_ ]?${escapeRegExp(opSuffix)}$`, 'i');
  return baseName.replace(re, '');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds a predictable, collision-free output filename for one batch item.
 *
 * @param originalName  the uploaded file's name (e.g. "contract final.pdf")
 * @param opSuffix      the operation label (e.g. "compressed", "watermarked")
 * @param taken         set of output names already used in this batch
 * @returns e.g. "contract-final-compressed.pdf"
 */
export function buildBatchOutputName(
  originalName: string,
  opSuffix: string,
  taken: Set<string>
): string {
  const extMatch = originalName.match(EXT_RE);
  const ext = extMatch ? extMatch[1].toLowerCase() : '.pdf';
  let base = originalName.slice(0, originalName.length - ext.length).trim() || 'document';

  // Re-running a batch on an already-processed file must not stack suffixes.
  base = stripOperationSuffix(base, opSuffix);

  // kebab-case: "Contract Final" -> "contract-final"
  base = base
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96)
    .toLowerCase() || 'document';

  // Outputs must never overwrite the source, and duplicates (e.g. two copies
  // of "scan.pdf", or re-running an already-suffixed file) resolve numerically:
  // name-2.pdf, name-3.pdf, ... — the established collision-safe convention.
  let candidate = `${base}-${opSuffix}${ext}`;
  let n = 1;
  while (
    candidate.toLowerCase() === originalName.toLowerCase() ||
    taken.has(candidate.toLowerCase())
  ) {
    n++;
    candidate = `${base}-${opSuffix}-${n}${ext}`;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}

/** Formats a duration in ms as "1.2s" / "14.0s". */
export function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}
