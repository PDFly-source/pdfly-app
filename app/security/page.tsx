'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  EyeOff,
  Activity,
  Lock,
  Stamp,
  CheckCircle2,
  ArrowRight,
  HardDrive,
  Cpu,
} from 'lucide-react';

export default function SecurityCenterPage() {
  const securityTools = [
    {
      slug: 'pdf-health',
      name: 'PDF Health Check & Diagnostics',
      desc: 'Inspect hidden metadata, JavaScript objects, encryption status, and font vulnerabilities.',
      icon: Activity,
      badge: 'Audit',
    },
    {
      slug: 'pdf-sanitizer',
      name: 'Document Sanitizer',
      desc: 'Purge author information, creation software, revision timestamps, and comments before sharing.',
      icon: ShieldAlert,
      badge: 'Sanitize',
    },
    {
      slug: 'redact-pdf',
      name: 'Smart Redaction 2.0',
      desc: 'Permanently remove PII, emails, phone numbers, and IDs with underlying text destruction.',
      icon: EyeOff,
      badge: 'Redact',
    },
    {
      slug: 'protect-pdf',
      name: 'Protect & Unlock PDF',
      desc: 'Encrypt sensitive files with strong user passwords or decrypt protected documents.',
      icon: Lock,
      badge: 'Encrypt',
    },
    {
      slug: 'watermark-pdf',
      name: 'Confidential Watermarking',
      desc: 'Stamp prominent custom draft, internal, or confidential marks with custom angle and opacity.',
      icon: Stamp,
      badge: 'Watermark',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F3EC] dark:bg-[#141213] text-[#141213] dark:text-[#F5F0EB] transition-colors pb-24 md:pb-16">
      {/* Header */}
      <div className="border-b border-[#E5DFD4] dark:border-[#2E2729] bg-white/70 dark:bg-[#1A1718]/70 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>PDFMiniFly Security & Privacy Center</span>
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#141213] dark:text-[#F5F0EB]">
            Local-First Security & Audit
          </h1>
          <p className="text-sm sm:text-base text-[#5C554F] dark:text-[#A39991] mt-2 max-w-2xl">
            Protect confidential documents, audit hidden structures, purge tracking metadata, and redact sensitive information without sending a single byte to an external server.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718]">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-3">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#141213] dark:text-[#F5F0EB] mb-1">
              Zero Server Uploads
            </h3>
            <p className="text-xs text-[#5C554F] dark:text-[#A39991] leading-relaxed">
              All PDF manipulations, text stripping, and pixel rendering are executed inside browser memory using WebAssembly & Web Workers.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718]">
            <div className="w-10 h-10 rounded-xl bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center mb-3">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#141213] dark:text-[#F5F0EB] mb-1">
              Permanent Destruction
            </h3>
            <p className="text-xs text-[#5C554F] dark:text-[#A39991] leading-relaxed">
              Unlike superficial cosmetic black boxes that leave underlying streams selectable, PDFMiniFly redaction completely purges vectors and text objects.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718]">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-3">
              <HardDrive className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#141213] dark:text-[#F5F0EB] mb-1">
              Complete Data Sovereign
            </h3>
            <p className="text-xs text-[#5C554F] dark:text-[#A39991] leading-relaxed">
              Clear your notes, bookmarks, and document library in one click anytime in Settings.
            </p>
          </div>
        </div>

        {/* Security Tools Suite */}
        <div>
          <h2 className="text-lg font-bold text-[#141213] dark:text-[#F5F0EB] mb-4">
            Security & Compliance Tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {securityTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="p-5 rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] hover:border-[#6D1F35] dark:hover:border-[#C6A15B] transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-black/5 dark:bg-white/5 text-[#5C554F] dark:text-[#A39991]">
                        {tool.badge}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[#141213] dark:text-[#F5F0EB] group-hover:text-[#6D1F35] dark:group-hover:text-[#C6A15B] transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-xs text-[#5C554F] dark:text-[#A39991] mt-1.5 leading-relaxed">
                      {tool.desc}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E5DFD4] dark:border-[#2E2729] flex items-center justify-between text-xs font-semibold text-[#6D1F35] dark:text-[#C6A15B]">
                    <span>Open Tool</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
