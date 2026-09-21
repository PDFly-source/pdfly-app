import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'PDFMiniFly',
    short_name: 'PDFMiniFly',
    description:
      'Private, powerful, local-first PDF toolkit for reading, editing, organizing, converting, protecting, and studying documents directly in your browser. No cloud uploads. No account required.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#F6EFE3',
    theme_color: '#7A1635',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
