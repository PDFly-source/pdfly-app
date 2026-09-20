import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Logo } from '@/components/Logo';
import {
  ShieldCheck,
  Zap,
  Cpu,
  ChevronRight,
  Code2,
  Mail,
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About PDFly | The Private, Client-Side PDF Toolkit',
  description:
    'Learn about PDFly’s mission to provide fast, private, browser-based PDF tools with zero unauthorized cloud uploads or paywalls.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F6EFE3] dark:bg-[#141012] text-[#1A1416] dark:text-[#F7F1E8] transition-colors">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#5C5256] dark:text-[#AFA6A8] mb-6">
          <Link href="/" className="hover:text-[#7A1635] dark:hover:text-[#C9A15A]">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-50" />
          <span className="font-bold text-[#1A1416] dark:text-[#F7F1E8]">
            About
          </span>
        </nav>

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="flex justify-center mb-4">
            <Logo size="xl" variant="icon" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A1416] dark:text-[#F7F1E8] mb-2 font-serif">
            PDFly
          </h1>
          <p className="text-xs font-bold tracking-widest text-[#7A1635] dark:text-[#C9A15A] mb-4 uppercase">
            PRIVATE. POWERFUL. LOCAL.
          </p>
          <p className="text-sm sm:text-base text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
            PDFly is built on an uncompromising principle: your files belong to you, and your browser is powerful enough to handle them without uploading them to remote servers.
          </p>
        </div>

        {/* Mission Statement */}
        <div className="p-8 rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-xs mb-12 space-y-4">
          <h2 className="text-lg font-bold text-[#1A1416] dark:text-[#F7F1E8] font-serif">
            Why We Built PDFly
          </h2>
          <p className="text-xs sm:text-sm text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
            For years, performing basic operations like combining two PDFs, rotating a sideways scan, or removing page 4 meant uploading confidential contracts, tax returns, and identity documents to random third-party websites. Many of these sites require subscriptions, bombard users with intrusive ads, or retain user files on remote servers.
          </p>
          <p className="text-xs sm:text-sm text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
            With modern WebAssembly and HTML5 capabilities, browser engines can process documents in milliseconds. PDFly provides a suite of PDF utilities that look, feel, and perform like a premium desktop app—free of charge, without forced accounts or hidden fees.
          </p>
        </div>

        {/* Tech Stack */}
        <section id="technology" className="mb-12">
          <h2 className="text-xl font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-6 font-serif">
            Under the Hood: Local-First Engineering
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-xs">
              <div className="flex items-center gap-2 mb-2 text-[#7A1635] dark:text-[#C9A15A]">
                <Code2 className="w-4 h-4" />
                <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8]">pdf-lib Engine</h3>
              </div>
              <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
                Direct binary manipulation of PDF structures. Enables splitting, merging, rotating, watermarking, and signature embedding with pristine mathematical precision.
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-xs">
              <div className="flex items-center gap-2 mb-2 text-[#7A1635] dark:text-[#C9A15A]">
                <Cpu className="w-4 h-4" />
                <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8]">PDF.js by Mozilla</h3>
              </div>
              <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
                High-fidelity rendering of PDF pages into HTML5 Canvas. Generates sharp thumbnails and enables visual drag-and-drop page organization.
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-xs">
              <div className="flex items-center gap-2 mb-2 text-[#7A1635] dark:text-[#C9A15A]">
                <Zap className="w-4 h-4" />
                <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8]">Tesseract.js OCR</h3>
              </div>
              <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
                Neural optical character recognition running via WebAssembly inside a background Web Worker, extracting text from scans without cloud AI APIs.
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-xs">
              <div className="flex items-center gap-2 mb-2 text-[#7A1635] dark:text-[#C9A15A]">
                <ShieldCheck className="w-4 h-4" />
                <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8]">PWA & Offline Worker</h3>
              </div>
              <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
                Configured with service worker caching so you can install PDFly on iPhone, Android, Mac, or Windows and use supported tools offline anywhere.
              </p>
            </div>
          </div>
        </section>

        {/* Supported Formats */}
        <section id="formats" className="mb-12 p-8 rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-xs">
          <h2 className="text-lg font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-4 font-serif">
            Supported File Formats
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#F6EFE3] dark:bg-[#241D20] border border-[#E8DFD3] dark:border-[#2E2629]">
              <span className="font-bold text-[#7A1635] dark:text-[#C9A15A] block mb-0.5">.PDF</span>
              <span className="text-[#5C5256] dark:text-[#AFA6A8]">Adobe Acrobat 1.0 - 2.0</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F6EFE3] dark:bg-[#241D20] border border-[#E8DFD3] dark:border-[#2E2629]">
              <span className="font-bold text-[#7A1635] dark:text-[#C9A15A] block mb-0.5">.JPG / .JPEG</span>
              <span className="text-[#5C5256] dark:text-[#AFA6A8]">High-resolution images</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F6EFE3] dark:bg-[#241D20] border border-[#E8DFD3] dark:border-[#2E2629]">
              <span className="font-bold text-[#7A1635] dark:text-[#C9A15A] block mb-0.5">.PNG</span>
              <span className="text-[#5C5256] dark:text-[#AFA6A8]">Transparent graphics</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F6EFE3] dark:bg-[#241D20] border border-[#E8DFD3] dark:border-[#2E2629]">
              <span className="font-bold text-[#7A1635] dark:text-[#C9A15A] block mb-0.5">.WEBP</span>
              <span className="text-[#5C5256] dark:text-[#AFA6A8]">Modern web images</span>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mb-12 space-y-3">
          <h2 className="text-xl font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-4 font-serif">
            Frequently Asked Questions
          </h2>

          <div className="p-5 rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-xs">
            <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1">
              Are my files uploaded to any servers?
            </h3>
            <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
              No. Zero bytes of your documents are ever transmitted to any remote servers or APIs for local tools. All computation executes locally inside your web browser.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-xs">
            <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1">
              Is there any file size limit?
            </h3>
            <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
              Because files are processed on your device, the main limit is your device’s available RAM. Modern devices can easily process files exceeding 100MB without issue.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-xs">
            <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1">
              Is PDFly free to use?
            </h3>
            <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
              Yes, 100% free with no account required, no subscription paywalls, and no watermarks placed on your exported files.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="p-8 rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-xs text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-2xl bg-[#7A1635]/10 text-[#7A1635] dark:text-[#C9A15A] flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1 font-serif">
            Questions or Suggestions?
          </h2>
          <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] max-w-sm mx-auto mb-4">
            We are dedicated to building the cleanest, most private PDF experience on the web.
          </p>
          <a
            href="mailto:support@pdfly.local"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] text-xs font-bold hover:brightness-110 transition-all border border-[#C9A15A]/40 shadow-xs"
          >
            <span>support@pdfly.local</span>
          </a>
        </section>
      </main>

      <Footer />
    </div>
  );
}
