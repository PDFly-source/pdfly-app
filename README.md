# PDFMiniFly

**PRIVATE. POWERFUL. LOCAL.**

PDFMiniFly is a privacy-first, local-first, browser-based PDF toolkit. Document
processing is performed locally in your browser whenever technically possible:
files are not uploaded to a server for the local tools, and nothing is stored
in the cloud.

**Production:** https://pdfly-source.github.io/pdfly-app/

## What it is

A browser-based PDF workspace with **44 tools** covering organizing, editing,
converting, protecting, analyzing, and automating PDF documents. The
application ships as a static site (Next.js static export) and installs as a
Progressive Web App (PWA) for offline use.

Tool categories include:

- **Organize** — merge, split, organize/rotate, extract pages, remove blank
  pages, booklet maker, split by size, N-Up
- **Edit** — compress, edit, page numbers, crop/trim, watermark, Bates
  stamping, invert colors, grayscale ink saver
- **Convert** — PDF to image/text/markdown/HTML/Excel/DOCX, image/DOCX to PDF,
  OCR (English, Assamese, Hindi, Bengali)
- **Protect** — watermark, redact, sign, certificate-based digital signature,
  password protect, metadata cleaning, PDF sanitizer
- **Read & Analyze** — viewer, read aloud, compare, health check, metadata
- **Study** — turn documents into summaries, MCQs, flashcards, and quizzes
  (generated locally in your browser)
- **Automation** — batch processing of multiple files, and a workflow builder
  that chains multiple steps; workflows and history are stored only in your
  browser (localStorage)

## Privacy architecture

- All PDF processing runs client-side, in your browser, using pdf-lib,
  PDF.js, Tesseract.js (OCR), and JSZip. Local tools never transmit document
  bytes to a remote server.
- The Document Workspace keeps documents in browser memory only; metadata and
  history are stored locally in your browser and are never uploaded.
- The PDF Assistant defaults to **Local mode** (in-browser analysis). An
  optional cloud mode exists in the code but requires a server runtime that is
  not part of this GitHub Pages deployment; on this deployment it is not
  available and the app tells you so, with the local mode as the working
  fallback.
- See the in-app **Privacy** and **Security** pages for details.

No absolute security guarantees are made. Local processing means your documents
are not sent to a server for the local tools; standard browser security still
applies.

## Tech stack

- [Next.js](https://nextjs.org) static export (`output: 'export'`), deployed on
  GitHub Pages
- [pdf-lib](https://pdf-lib.js.org) — PDF manipulation
- [PDF.js](https://mozilla.github.io/pdf.js) — rendering, text and image
  extraction (shared worker + cMaps)
- [Tesseract.js](https://github.com/naptha/tesseract.js) — local OCR
- [JSZip](https://stuk.github.io/jszip) — DOCX/XLSX parsing
- [node-forge](https://github.com/digitalbazaar/node-forge) — certificate-based
  signing
- [Bun](https://bun.sh) — package manager; `bun.lock` is the canonical lockfile

## Development

```bash
bun install            # frozen install per bun.lock

# Local dev (served from '/')
npm run dev

# Production build for GitHub Pages (basePath /pdfly-app)
NEXT_PUBLIC_BASE_PATH=/pdfly-app \
NEXT_PUBLIC_SITE_URL=https://pdfly-source.github.io/pdfly-app \
npm run build
```

The static export is written to `out/`. `NEXT_PUBLIC_BASE_PATH` controls the
base path; it is set by the GitHub Actions workflow for the Pages deployment
and left empty for local development or a future custom domain.

## Deployment

GitHub Actions builds and publishes the static export to GitHub Pages on every
push to `main`. The deployment is fully static: no server, no database, no
API endpoints are used in production.

## Release history

See [CHANGELOG.md](./CHANGELOG.md).
