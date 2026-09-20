'use client';

// Dynamic client-side PDF.js loader with safe fallback
let pdfjsLib: any = null;

export async function getPdfjs() {
  if (typeof window === 'undefined') return null;
  if (!pdfjsLib) {
    const imported = await import('pdfjs-dist');
    pdfjsLib = imported;
    try {
      if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
        // Use local same-origin worker from /public/pdf.worker.min.mjs matching pdfjs-dist version
        const workerUrl =
          typeof window !== 'undefined' && window.location
            ? new URL('/pdf.worker.min.mjs', window.location.href).toString()
            : '/pdf.worker.min.mjs';
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      }
    } catch (e) {
      console.warn('PDF.js worker initialization notice:', e);
    }
  }
  return pdfjsLib;
}

export async function getPdfDocumentFromFile(file: File | ArrayBuffer) {
  const pdfjs = await getPdfjs();
  if (!pdfjs) throw new Error('PDF.js is only available in browser environments.');

  let arrayBuffer: ArrayBuffer;
  if (file instanceof File) {
    arrayBuffer = await file.arrayBuffer();
  } else {
    arrayBuffer = file;
  }

  const cMapUrl =
    typeof window !== 'undefined' && window.location
      ? new URL('/cmaps/', window.location.href).toString()
      : '/cmaps/';

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl,
    cMapPacked: true,
  });

  return await loadingTask.promise;
}

export async function renderPageToCanvas(
  pdfPage: any,
  canvas: HTMLCanvasElement,
  scale = 1.0
): Promise<void> {
  const viewport = pdfPage.getViewport({ scale });
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context could not be created');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const renderContext = {
    canvasContext: ctx,
    viewport: viewport,
  };

  await pdfPage.render(renderContext).promise;
}

export async function renderPageThumbnail(
  pdfDoc: any,
  pageNumber: number,
  targetWidth = 200
): Promise<string> {
  try {
    const page = await pdfDoc.getPage(pageNumber);
    const initialViewport = page.getViewport({ scale: 1.0 });
    const scale = targetWidth / initialViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return '';

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    // Cleanup canvas
    canvas.width = 0;
    canvas.height = 0;
    return dataUrl;
  } catch (err) {
    console.warn(`Failed to render thumbnail for page ${pageNumber}:`, err);
    return '';
  }
}
