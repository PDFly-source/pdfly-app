# Changelog

## v1.1.0 — 2026-09-28

Image Power Suite: five new local-first image tools, fully client-side.

### Added
- **Image Studio** category with 5 new tools (44 → 49 tools total):
  - **Image Compressor Pro** (`/tools/image-compressor`): JPG/PNG/WebP
    compression by quality or honest target-size search (batch up to 20,
    per-file states, ZIP download-all).
  - **Image Resize & Convert** (`/tools/image-resizer`): exact/fit/percent
    resizing with aspect lock, presets (1:1, 4:5, 16:9, 1080p, 4K), and
    JPG/PNG/WebP conversion (batch).
  - **Advanced Crop Studio** (`/tools/image-crop`): interactive pointer-based
    crop with zoom, pan, rotate 90°, flips, ratio presets, and true-pixel
    export (PNG/JPG/WebP).
  - **Local Background Remover** (`/tools/background-remover`): two genuine
    local modes — AI Person (MediaPipe Selfie Segmentation, model vendored
    same-origin, cached after first use) and Smart Color (deterministic
    border flood-fill in a Web Worker).
  - **Watermark & Annotation Studio** (`/tools/image-watermark`): text and
    logo watermarks (single or tiled), plus real annotations — text, arrow,
    rectangle, circle, highlight, blur, pixelate, and freehand pen — all
    rendered into the exported pixels.
- Pure image math library (`lib/image-geometry.ts`) and segmentation
  (`lib/image-segmentation.ts`) with a bun test suite (`tests/`).
- Tool registry, category filters, search, SEO content, and sitemap updated
  for the new tools.

### Privacy
- All image processing is client-side (Canvas, ImageBitmap, Blob Workers).
- No image bytes are ever uploaded; the only network fetch in the new tools
  is the small local AI model, downloaded once from this site and cached.

## v1.0.0 — 2026-09-22

First public release. Production deployment:
https://pdfly-source.github.io/pdfly-app/

### Added
- 44 local PDF tools across organize, edit, convert, protect, read/analyze,
  study, and automation categories, with client-side engines built on pdf-lib,
  PDF.js, Tesseract.js, JSZip, and node-forge.
- Document Workspace: in-memory document session with pinned/favorites and a
  local-only history library (metadata stored in localStorage; documents are
  never persisted or uploaded).
- Batch Processing: queue multiple files through a chosen tool.
- PDF Workflow Builder: chain multiple steps (e.g. remove blanks → organize →
  compress → watermark); workflows and history are stored only in the browser.
- Study Center: local, in-browser generation of summaries, MCQs, flashcards,
  and quizzes from documents.
- PDF Assistant: local in-browser document analysis (local mode is the
  default and the working mode on the GitHub Pages deployment).
- PWA: installable app with offline support, service worker, manifest, and
  icons including maskable variants.
- SEO/static-hosting layer: sitemap.xml, robots.txt, custom 404 page, and
  deployment-aware basePath handling for GitHub Pages.

### Engineering (phases A–H)
- Document processing engine suite (DOCX/XLSX parsing bridges, N-Up, crop,
  grayscale, compression, splitting by size, and more) with engine test suites.
- Production hardening: shared PDF.js worker, cMap deployment, OCR worker
  lifecycle cleanup, blob/object-URL cleanup, dependency cleanup with
  `bun.lock` as the canonical lockfile, and security/privacy audit fixes.
- Verified via full regression suite (engine tests), production build, and
  production smoke tests on the deployed site.

### Notes
- Document processing is performed locally in your browser whenever
  technically possible. No cloud upload of documents. No absolute security
  guarantees are made.
