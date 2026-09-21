import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ALL_TOOLS } from '@/lib/tools-data';
import { ToolCard } from '@/components/ToolCard';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { JsonLd } from '@/components/JsonLd';
import { SITE_URL, SITE_DESCRIPTION } from '@/lib/site';

export const metadata: Metadata = {
  title: { absolute: 'All PDF Tools — Merge, Split, Compress, Convert, Sign & Protect | PDFMiniFly' },
  description:
    `Browse all ${ALL_TOOLS.length} free private PDF tools: merge, split, compress, convert, OCR, sign, protect, watermark, organize, and automate PDFs — processed locally in your browser with no cloud uploads.`,
  alternates: {
    canonical: '/tools',
  },
  openGraph: {
    title: 'All PDF Tools | PDFMiniFly',
    description: 'Free, private, local-first PDF tools for every document task.',
    url: `${SITE_URL}/tools`,
    siteName: 'PDFMiniFly',
    type: 'website',
  },
};

export default function ToolsIndexPage() {
  // Group tools by their category label, preserving first-seen order
  const categories = new Map<string, typeof ALL_TOOLS>();
  for (const tool of ALL_TOOLS) {
    const list = categories.get(tool.categoryLabel) || [];
    list.push(tool);
    categories.set(tool.categoryLabel, list);
  }

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'PDFMiniFly PDF Tools',
    url: `${SITE_URL}/tools`,
    description: SITE_DESCRIPTION,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: ALL_TOOLS.length,
      itemListElement: ALL_TOOLS.map((tool, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: tool.name,
        url: `${SITE_URL}/tools/${tool.slug}`,
      })),
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'PDF Tools', item: `${SITE_URL}/tools` },
    ],
  };

  return (
    <>
      <JsonLd data={itemListSchema} />
      <JsonLd data={breadcrumbSchema} />
      <Navbar />
      <main className="flex-1 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <header className="max-w-3xl mb-10">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1A1416] dark:text-[#F7F1E8]">
              All PDF Tools
            </h1>
            <p className="mt-3 text-sm sm:text-base text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
              {ALL_TOOLS.length} free, private tools for reading, editing, converting, organizing,
              protecting, and automating PDFs. Every tool runs locally in your browser — files are
              never uploaded, and installed apps keep working offline.
            </p>
          </header>

          {[...categories.entries()].map(([label, tools]) => (
            <section key={label} className="mb-12">
              <h2 className="text-lg font-black text-[#1A1416] dark:text-[#F7F1E8] mb-4">{label}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tools.map((tool) => (
                  <ToolCard key={tool.slug} tool={tool} />
                ))}
              </div>
            </section>
          ))}

          <section className="mt-12 max-w-3xl">
            <h2 className="text-lg font-black text-[#1A1416] dark:text-[#F7F1E8] mb-3">
              Why PDFMiniFly is different
            </h2>
            <p className="text-sm text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
              Conventional online PDF websites upload your documents to their servers for processing.
              PDFMiniFly takes the opposite approach: the PDF engine runs inside your browser, so
              contracts, scans, and personal documents never leave your device. Install it as an app
              and it keeps working offline.{' '}
              <Link
                href="/install"
                className="font-bold text-[#7A1635] dark:text-[#C9A15A] hover:underline"
              >
                Install PDFMiniFly
              </Link>{' '}
              or{' '}
              <Link
                href="/about"
                className="font-bold text-[#7A1635] dark:text-[#C9A15A] hover:underline"
              >
                learn how it works
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
