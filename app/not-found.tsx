'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { ArrowLeft, Home, FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-8">
        <Logo size="lg" variant="compact" showTagline={true} />
      </div>

      <div className="w-16 h-16 rounded-2xl bg-[#7A1635]/10 dark:bg-[#C9A15A]/15 text-[#7A1635] dark:text-[#C9A15A] flex items-center justify-center mx-auto mb-6 shadow-xs border border-[#7A1635]/20 dark:border-[#C9A15A]/30">
        <FileQuestion className="w-8 h-8" />
      </div>

      <h1 className="text-3xl font-black text-[#1A1416] dark:text-[#F7F1E8] mb-2 font-serif">
        Page Not Found
      </h1>
      <p className="text-sm text-[#5C5256] dark:text-[#AFA6A8] max-w-md mx-auto mb-8 leading-relaxed">
        The tool or page you are looking for doesn&apos;t exist or may have been moved.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-xs border border-[#C9A15A]/40"
        >
          <Home className="w-4 h-4 text-[#C9A15A]" />
          <span>Return Home</span>
        </Link>
        <Link
          href="/workspace"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-[#1B1719] text-[#1A1416] dark:text-[#F7F1E8] text-xs font-bold border border-[#E8DFD3] dark:border-[#2E2629] hover:border-[#7A1635]/40 transition-all shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4 text-[#7A1635] dark:text-[#C9A15A]" />
          <span>Open Workspace</span>
        </Link>
      </div>
    </div>
  );
}
