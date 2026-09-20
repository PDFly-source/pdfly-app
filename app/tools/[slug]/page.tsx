import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ALL_TOOLS, getToolBySlug } from '@/lib/tools-data';
import { ToolPageClientWrapper } from './ToolPageClientWrapper';
import { ToolCard } from '@/components/ToolCard';
import { HelpCircle, ChevronRight } from 'lucide-react';

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
      title: 'Tool Not Found | PDFly',
      description: 'The requested PDF tool could not be found.',
    };
  }

  return {
    title: `${tool.name} - Free & Private Local PDF Tool | PDFly`,
    description: `${tool.description} Fast, secure, and processed 100% locally in your browser with PDFly.`,
    keywords: [tool.name, ...(tool.keywords || []), 'PDFly', 'local PDF', 'private PDF tool', 'browser PDF editor'],
    openGraph: {
      title: `${tool.name} - PDFly`,
      description: tool.description,
      type: 'website',
      siteName: 'PDFly',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${tool.name} - PDFly`,
      description: tool.description,
    },
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    notFound();
  }

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

  return (
    <ToolPageClientWrapper tool={tool}>
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-16">
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
                Save & Download
              </h3>
              <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
                Click the action button. The new document is compiled in memory and downloaded straight to your device.
              </p>
            </div>
          </div>
        </section>

        {/* Frequently Asked Questions */}
        <section className="my-16 max-w-3xl mx-auto">
          <h2 className="text-xl font-black text-[#1A1416] dark:text-[#F7F1E8] text-center mb-6">
            Frequently Asked Questions
          </h2>

          <div className="space-y-3">
            <div className="p-5 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629]">
              <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1.5 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#7A1635] dark:text-[#C9A15A]" />
                <span>Is {tool.name} safe to use for sensitive contracts or financial documents?</span>
              </h3>
              <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
                Yes, completely. Unlike conventional PDF websites that send your confidential documents to unknown remote servers, PDFly operates exclusively inside your browser sandbox using WebAssembly and client-side JavaScript. Your file data never leaves your device.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629]">
              <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1.5 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#7A1635] dark:text-[#C9A15A]" />
                <span>Does this work offline?</span>
              </h3>
              <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
                Yes! Once PDFly is loaded or installed as a Progressive Web App (PWA), the PDF processing engine operates even when you have no internet connection.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629]">
              <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1.5 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#7A1635] dark:text-[#C9A15A]" />
                <span>Are there any usage limits or paywalls?</span>
              </h3>
              <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
                No account, no subscriptions, and no intrusive ads. You can use PDFly as much as you need on your phone, tablet, or desktop.
              </p>
            </div>
          </div>
        </section>

        {/* Related Tools */}
        <section className="my-16 pt-10 border-t border-[#E8DFD3] dark:border-[#2E2629]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-[#1A1416] dark:text-[#F7F1E8]">
              Explore Other PDF Tools
            </h2>
            <Link
              href="/#tools"
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
