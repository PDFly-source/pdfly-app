import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ShieldCheck, Cpu, ServerOff, ChevronRight, HardDrive } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy & Local Processing Architecture | PDFMiniFly',
  description:
    'Learn how PDFMiniFly guarantees document privacy by executing PDF operations locally in your browser sandbox with WebAssembly. Zero unauthorized file uploads.',
};

export default function PrivacyPage() {
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
            Privacy & Architecture
          </span>
        </nav>

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#7A1635]/10 text-[#7A1635] dark:text-[#C9A15A] text-xs font-bold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Local-First Processing Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A1416] dark:text-[#F7F1E8] mb-4 font-serif">
            Private, Local-First PDF Engineering.
          </h1>
          <p className="text-sm sm:text-base text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
            PDFMiniFly is architected local-first. Supported PDF utilities execute directly within your browser’s isolated JavaScript sandbox on your computer.
          </p>
        </div>

        {/* 3 Core Architecture Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-4">
              <ServerOff className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1.5">
              Zero Server Uploads
            </h3>
            <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
              When you drop a file into PDFMiniFly, it remains inside your browser&apos;s local memory. No backend server receives your document bytes for local operations.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-[#7A1635]/10 dark:bg-[#C9A15A]/15 text-[#7A1635] dark:text-[#C9A15A] flex items-center justify-center mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1.5">
              WebAssembly & Web Workers
            </h3>
            <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
              PDF manipulation, compression, and OCR run on your device&apos;s native CPU utilizing WebAssembly and client-side JavaScript streams.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-[#C9A15A]/15 text-[#C9A15A] flex items-center justify-center mb-4">
              <HardDrive className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1.5">
              No Content Storage
            </h3>
            <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
              Your document contents are wiped from memory as soon as you close or reload the browser tab. We never write your files to remote databases.
            </p>
          </div>
        </div>

        {/* Detailed Privacy Statement */}
        <article id="architecture" className="p-8 rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-xs space-y-6 text-xs sm:text-sm leading-relaxed text-[#5C5256] dark:text-[#AFA6A8]">
          <section>
            <h2 className="text-base font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-2">
              1. What Information Do We Collect?
            </h2>
            <p>
              We believe the best way to safeguard user data is <strong>to not collect it in the first place</strong>. PDFMiniFly does not collect, log, store, or inspect:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>The contents, text, images, or metadata of any files you process.</li>
              <li>Your identity, personal email, or passwords used to lock documents.</li>
              <li>Biometric data, signatures, or drawings you create on signatures.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-2">
              2. How Does Browser-Based Processing Work?
            </h2>
            <p>
              Traditional PDF websites rely on cloud servers where your PDF is uploaded, saved to temporary disks, processed by a server script, and sent back. Even when servers claim to “delete files after 1 hour”, your private data traverses the public internet and sits in third-party storage.
            </p>
            <p className="mt-2">
              PDFMiniFly uses high-performance modern web technologies (HTML5 Canvas, PDF-Lib, PDF.js, and Tesseract.js WebAssembly). The entire processing engine runs right inside the tab on your device. You can verify this anytime by inspecting your browser Network tab during file operations—you will notice 0 bytes of document payloads transmitted.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-2">
              3. Local Activity History
            </h2>
            <p>
              PDFMiniFly includes a convenience “Recent Jobs” counter. This information is saved strictly to your local browser storage (<code className="font-mono bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded">localStorage</code>) and only contains the filename, tool name, and completion timestamp. Document contents are never stored, and you can clear this history anytime with one click.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-2">
              4. Offline Capability & Data Isolation
            </h2>
            <p>
              Because PDFMiniFly is designed as a Progressive Web App (PWA), the core application bundle is cached in your browser. Supported tools work offline without an active internet connection.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-2">
              5. Optional Cloud AI Services (PDF Assistant)
            </h2>
            <p>
              While standard tools (Merge, Split, Compress, Organize, Sign, Redact, Booklet, OCR, etc.) execute locally in your browser, advanced generative AI features (such as Cloud AI summarization or Q&A in the PDF Assistant) require external intelligence. To guarantee total user sovereignty, Cloud AI is strictly opt-in: the app will never send document excerpts to an AI endpoint unless you explicitly confirm and consent in the prompt modal. By default, local heuristic analysis is used.
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
