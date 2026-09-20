import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWARegister } from '@/components/PWARegister';
import { SmartInstallBanner } from '@/components/SmartInstallBanner';
import { PWASplashScreen } from '@/components/PWASplashScreen';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F6EFE3' },
    { media: '(prefers-color-scheme: dark)', color: '#121012' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://pdfly.app'),
  title: {
    default: 'PDFly — Private PDF Tools | Powerful. Local. Secure.',
    template: '%s | PDFly',
  },
  description:
    'PDFly is a modern, privacy-first PDF workspace for editing, converting, organizing and working with documents directly in your browser.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PDFly',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    title: 'PDFly — Private PDF Tools | Powerful. Local. Secure.',
    description:
      'PDFly is a modern, privacy-first PDF workspace for editing, converting, organizing and working with documents directly in your browser.',
    url: 'https://pdfly.app',
    siteName: 'PDFly',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PDFly — Private. Powerful. Local.',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PDFly — Private PDF Tools | Powerful. Local. Secure.',
    description:
      'A private, local-first PDF workspace that processes your documents in your browser. Fast, secure, and independent.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Run early local storage backward compatibility migration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var migrations = [
                  ['pdfora_recent_jobs', 'pdfly_recent_jobs'],
                  ['pdfora_local_library', 'pdfly_local_library'],
                  ['pdfora_theme', 'pdfly_theme'],
                  ['pdfora_saved_signature', 'pdfly_saved_signature'],
                  ['pdfora_local_bookmarks', 'pdfly_local_bookmarks'],
                  ['pdfora_local_notes', 'pdfly_local_notes'],
                  ['pdfora_recent_tools', 'pdfly_recent_tools'],
                  ['pdfora_preferred_lang', 'pdfly_preferred_lang'],
                  ['pdfora_settings', 'pdfly_settings']
                ];
                migrations.forEach(function(pair) {
                  var oldVal = localStorage.getItem(pair[0]);
                  var newVal = localStorage.getItem(pair[1]);
                  if (oldVal && !newVal) {
                    localStorage.setItem(pair[1], oldVal);
                  }
                });
                var theme = localStorage.getItem('pdfly_theme') || localStorage.getItem('pdfora_theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch(e) {}
            `,
          }}
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#741B35" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PDFly" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body suppressHydrationWarning className="antialiased min-h-screen">
        <PWASplashScreen />
        <PWARegister />
        {children}
        <SmartInstallBanner />
      </body>
    </html>
  );
}
