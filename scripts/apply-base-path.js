/**
 * Apply the deployment base path to static public assets that Next.js
 * does not transform (files in /public are copied verbatim).
 *
 * Currently handles:
 *   - public/manifest.json (PWA manifest referenced by the app)
 *
 * Idempotent: paths are first normalized back to root-relative form,
 * then prefixed with NEXT_PUBLIC_BASE_PATH (if set). Safe to run
 * repeatedly with different base paths.
 *
 * Usage: NEXT_PUBLIC_BASE_PATH=/pdfly-app node scripts/apply-base-path.js
 */
const fs = require('fs');
const path = require('path');

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

function applyBase(p) {
  if (typeof p !== 'string' || !p.startsWith('/')) return p;
  return BASE_PATH + p;
}

function normalize(p) {
  // Strip a previously applied base path to guarantee idempotence across
  // repeated builds with the same NEXT_PUBLIC_BASE_PATH.
  if (BASE_PATH && p.startsWith(BASE_PATH)) {
    return p.slice(BASE_PATH.length);
  }
  return p;
}

function processManifest(manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Root-relative identity/URL fields
  for (const key of ['id', 'start_url', 'scope']) {
    if (typeof manifest[key] === 'string' && manifest[key].startsWith('/')) {
      manifest[key] = applyBase(normalize(manifest[key]));
    }
  }

  if (Array.isArray(manifest.icons)) {
    manifest.icons = manifest.icons.map((icon) => ({
      ...icon,
      src: applyBase(normalize(icon.src)),
    }));
  }

  if (Array.isArray(manifest.shortcuts)) {
    manifest.shortcuts = manifest.shortcuts.map((s) => ({
      ...s,
      url: applyBase(normalize(s.url)),
      ...(Array.isArray(s.icons)
        ? { icons: s.icons.map((i) => ({ ...i, src: applyBase(normalize(i.src)) })) }
        : {}),
    }));
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`apply-base-path: updated ${manifestPath} (base path: '${BASE_PATH || '/'}')`);
}

const publicDir = path.join(__dirname, '..', 'public');
processManifest(path.join(publicDir, 'manifest.json'));
