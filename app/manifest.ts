import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'PDFly – Private, Powerful, Local PDF Toolkit',
    short_name: 'PDFly',
    description: 'A private, local-first PDF workspace that processes your documents in your browser. Read, edit, convert, and protect documents securely.',
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
