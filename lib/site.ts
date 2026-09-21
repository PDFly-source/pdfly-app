// Central site/SEO configuration for PDFMiniFly.
// The production canonical URL is the actual live deployment.
// Deployment-aware canonical site URL.
// Defaults to the existing production URL; the GitHub Pages workflow (and any
// future custom-domain deployment) overrides it with NEXT_PUBLIC_SITE_URL.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pdfly-1.ai.studio';
export const SITE_NAME = 'PDFMiniFly';
export const SITE_TAGLINE = 'PRIVATE. POWERFUL. LOCAL.';
export const SITE_DESCRIPTION =
  'Create, edit, merge, split, compress, convert, organize and protect PDFs directly in your browser. PDFMiniFly is a private, local-first PDF toolkit with no cloud PDF uploads.';
export const LOGO_URL = `${SITE_URL}/pdfminifly-logo.png`;
