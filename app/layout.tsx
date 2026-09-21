import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SITE_URL, SITE_DESCRIPTION, LOGO_URL } from '@/lib/site';
import { JsonLd } from '@/components/JsonLd';
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
  metadataBase: new URL(SITE_URL),
  applicationName: 'PDFMiniFly',
  title: {
    default: 'PDFMiniFly — Free Private PDF Tools | Merge, Split, Compress & Edit PDFs',
    template: '%s | PDFMiniFly',
  },
  description: SITE_DESCRIPTION,
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PDFMiniFly',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    title: 'PDFMiniFly — Free Private PDF Tools | Merge, Split, Compress & Edit PDFs',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: 'PDFMiniFly',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PDFMiniFly — Private. Powerful. Local.',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PDFMiniFly — Free Private PDF Tools | Merge, Split, Compress & Edit PDFs',
    description: SITE_DESCRIPTION,
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {

// Site-wide structured data (server-rendered on every public page)
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'PDFMiniFly',
  url: SITE_URL,
  description: SITE_DESCRIPTION,
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'PDFMiniFly',
  alternateName: 'PDFMiniFly',
  url: SITE_URL,
  logo: LOGO_URL,
};

const webAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'PDFMiniFly',
  url: SITE_URL,
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any (web browser)',
  browserRequirements: 'Requires a modern web browser. Works offline once installed as a PWA.',
  description: SITE_DESCRIPTION,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  isAccessibleForFree: true,
};

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
                  if (oldVal) {
                    localStorage.removeItem(pair[0]);
                  }
                });
                var theme = localStorage.getItem('pdfly_theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch(e) {}
            `,
          }}
        />
        <title>PDFMiniFly — Private PDF Tools | Powerful. Local. Secure.</title>
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="PDFMiniFly" />
        <meta name="theme-color" content="#741B35" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PDFMiniFly" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body suppressHydrationWarning className="antialiased min-h-screen">
        <JsonLd data={websiteSchema} />
        <JsonLd data={organizationSchema} />
        <JsonLd data={webAppSchema} />
        <PWASplashScreen />
        <PWARegister />
        {children}
        <SmartInstallBanner />
      </body>
    </html>
  );
}
