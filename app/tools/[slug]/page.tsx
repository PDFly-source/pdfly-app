import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ALL_TOOLS, getToolBySlug } from '@/lib/tools-data';
import { TOOL_SEO_CONTENT } from '@/lib/tool-seo-content';
import { ToolPageClientWrapper } from './ToolPageClientWrapper';
import { ToolCard } from '@/components/ToolCard';
import { JsonLd } from '@/components/JsonLd';
import { SITE_URL } from '@/lib/site';
import { HelpCircle, ChevronRight, ShieldCheck } from 'lucide-react';

interface ToolPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return ALL_TOOLS.map((tool) => ({
    slug: tool.slug,
  }));
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    return {
      title: { absolute: 'Tool Not Found | PDFMiniFly' },
      description: 'The requested PDF tool could not be found.',
    };
  }

  const title = tool.seoTitle || `${tool.name} - Free & Private Local PDF Tool | PDFMiniFly`;
  const description =
    tool.seoDescription ||
    `${tool.description} Fast, secure, and processed 100% locally in your browser with PDFMiniFly.`;

  return {
    title: { absolute: title },
    description,
    keywords: [tool.name, ...(tool.keywords || []), 'PDFMiniFly', 'local PDF', 'private PDF tool', 'browser PDF editor'],
    alternates: {
      canonical: `/tools/${tool.slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'PDFMiniFly',
      url: `${SITE_URL}/tools/${tool.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    notFound();
  }

  const seoContent = TOOL_SEO_CONTENT[tool.slug];
  const relatedTools = ALL_TOOLS.filter((t) => t.slug !== tool.slug && t.category === tool.category).slice(0, 3);
  const fallbackRelated =
    relatedTools.length < 3
      ? [
          ...relatedTools,
          ...ALL_TOOLS.filter((t) => t.slug !== tool.slug && !relatedTools.some((r) => r.slug === t.slug)).slice(
            0,
            3 - relatedTools.length
          ),
        ]
      : relatedTools;

  const toolUrl = `${SITE_URL}/tools/${tool.slug}`;

  // Visible FAQs (schema must match these exactly)
  const visibleFaqs: { q: string; a: string }[] = seoContent
    ? [
        ...seoContent.faqs,
        {
          q: 'Are my files uploaded to a server?',
          a: 'No. PDFMiniFly processes everything locally inside your browser. Your document never leaves your device, and once the app is installed it also works offline.',
        },
      ]
    : [];

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'PDF Tools', item: `${SITE_URL}/tools` },
      { '@type': 'ListItem', position: 3, name: tool.name, item: toolUrl },
    ],
  };

  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: `${tool.name} — PDFMiniFly`,
    url: toolUrl,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any (web browser)',
    browserRequirements: 'Requires a modern web browser. Works offline once installed.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isAccessibleForFree: true,
  };

  const faqSchema =
    visibleFaqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: visibleFaqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }
      : null;

  return (
    <ToolPageClientWrapper tool={tool}>
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={softwareSchema} />
      {faqSchema && <JsonLd data={faqSchema} />}

      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Breadcrumb Navigation (visible; matches BreadcrumbList schema) */}
        <nav aria-label="Breadcrumb" className="pt-8 pb-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-[#5C5256] dark:text-[#AFA6A8]">
            <li>
              <Link href="/" className="hover:text-[#7A1635] dark:hover:text-[#C9A15A] font-semibold">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5" />
              <Link href="/tools" className="hover:text-[#7A1635] dark:hover:text-[#C9A15A] font-semibold">
                PDF Tools
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="w-3.5 h-3.5 inline" />
            </li>
            <li aria-current="page" className="text-[#1A1416] dark:text-[#F7F1E8] font-bold">
              {tool.name}
            </li>
          </ol>
        </nav>

        {/* Tool-specific introduction */}
        {seoContent && (
          <section className="mb-10 max-w-3xl">
            <p className="text-sm sm:text-base text-[#3D3438] dark:text-[#C9C0C2] leading-relaxed">
              {seoContent.intro}
            </p>
          </section>
        )}

        {/* How It Works (3-step) */}
        <section className="mb-16 pt-10 border-t border-[#E8DFD3] dark:border-[#2E2629]">
          <h2 className="text-xl font-black text-[#1A1416] dark:text-[#F7F1E8] text-center mb-8">
            How to use {tool.name} in 3 simple steps
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-2xs">
              <span className="w-8 h-8 rounded-full bg-[#7A1635]/10 text-[#7A1635] dark:bg-[#C9A15A]/15 dark:text-[#C9A15A] font-bold text-sm flex items-center justify-center mb-4">
                1
              </span>
              <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1">
                Select Your Files
              </h3>
              <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
                Drag and drop your document directly into the browser. Your file stays on your hardware and is never transmitted across the network.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-2xs">
              <span className="w-8 h-8 rounded-full bg-[#7A1635]/10 text-[#7A1635] dark:bg-[#C9A15A]/15 dark:text-[#C9A15A] font-bold text-sm flex items-center justify-center mb-4">
                2
              </span>
              <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1">
                Configure Options
              </h3>
              <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
                Customize parameters, page sequence, orientation, or compression presets with instant interactive live feedback.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-2xs">
              <span className="w-8 h-8 rounded-full bg-[#7A1635]/10 text-[#7A1635] dark:bg-[#C9A15A]/15 dark:text-[#C9A15A] font-bold text-sm flex items-center justify-center mb-4">
                3
              </span>
              <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1">
                Save &amp; Download
              </h3>
              <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
                Click the action button. The new document is compiled in memory and downloaded straight to your device.
              </p>
            </div>
          </div>
        </section>

        {/* Frequently Asked Questions (tool-specific + shared privacy answer) */}
        {visibleFaqs.length > 0 && (
          <section className="my-16 max-w-3xl mx-auto">
            <h2 className="text-xl font-black text-[#1A1416] dark:text-[#F7F1E8] text-center mb-6">
              Frequently Asked Questions
            </h2>

            <div className="space-y-3">
              {visibleFaqs.map((f) => (
                <div
                  key={f.q}
                  className="p-5 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629]"
                >
                  <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1.5 flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-[#7A1635] dark:text-[#C9A15A] shrink-0 mt-0.5" />
                    <span>{f.q}</span>
                  </h3>
                  <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed pl-6">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related Tools */}
        <section className="my-16 pt-10 border-t border-[#E8DFD3] dark:border-[#2E2629]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-[#1A1416] dark:text-[#F7F1E8]">
              Explore Other PDF Tools
            </h2>
            <Link
              href="/tools"
              className="text-xs font-bold text-[#7A1635] dark:text-[#C9A15A] hover:underline"
            >
              View all {ALL_TOOLS.length} tools →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {fallbackRelated.map((t) => (
              <ToolCard key={t.slug} tool={t} />
            ))}
          </div>
        </section>
      </div>
    </ToolPageClientWrapper>
  );
}
