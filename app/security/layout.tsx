import type { Metadata } from 'next';
import React from 'react';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: { absolute: 'PDFMiniFly Security — Local Processing & Document Privacy' },
  description:
    'How PDFMiniFly keeps your documents private: all PDF processing runs locally in your browser, no cloud uploads, no accounts, and offline-first operation.',
  alternates: { canonical: '/security' },
  openGraph: {
    title: { absolute: 'PDFMiniFly Security — Local Processing & Document Privacy' },
    description: 'All PDF processing runs locally in your browser. No cloud uploads.',
    url: `${SITE_URL}/security`,
    siteName: 'PDFMiniFly',
    type: 'website',
  },
};

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
