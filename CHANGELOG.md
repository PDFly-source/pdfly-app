# Changelog

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
