'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-8">
        <Logo size="lg" variant="compact" showTagline={true} />
      </div>

      <div className="w-16 h-16 rounded-2xl bg-[#E36B6B]/10 dark:bg-[#E36B6B]/20 text-[#E36B6B] flex items-center justify-center mx-auto mb-6 shadow-xs border border-[#E36B6B]/30">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-black text-[#1A1416] dark:text-[#F7F1E8] mb-2 font-serif">
        Something Went Wrong
      </h1>
      <p className="text-sm text-[#5C5256] dark:text-[#AFA6A8] max-w-md mx-auto mb-8 leading-relaxed">
        An unexpected error occurred while running the local PDF engine. Your files remain safe in your browser memory.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-xs border border-[#C9A15A]/40"
        >
          <RefreshCw className="w-4 h-4 text-[#C9A15A]" />
          <span>Try Again</span>
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-[#1B1719] text-[#1A1416] dark:text-[#F7F1E8] text-xs font-bold border border-[#E8DFD3] dark:border-[#2E2629] hover:border-[#7A1635]/40 transition-all shadow-2xs"
        >
          <Home className="w-4 h-4 text-[#7A1635] dark:text-[#C9A15A]" />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  );
}
