'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';

export const SmartInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install, hasDismissedBanner, dismissBanner } = usePWAInstall();
  const [delayedVisible, setDelayedVisible] = useState(false);

  useEffect(() => {
    // Respect user: only show after a calm 4-second delay so it never blocks immediate user intent
    const timer = setTimeout(() => {
      setDelayedVisible(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!delayedVisible) return null;
  if (isInstalled || hasDismissedBanner) return null;
  if (!isInstallable && !isIOS) return null;

  return (
    <aside
      aria-label="Install PDFly Application"
      id="smart-pwa-install-banner"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 p-4 rounded-3xl bg-[#FFFDF9]/95 dark:bg-[#1B1719]/95 backdrop-blur-md border border-[#E8DFD3] dark:border-[#2E2629] shadow-2xl transition-all animate-fade-in"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7A1635] to-[#4A0D20] text-[#C9A15A] flex items-center justify-center shrink-0 shadow-xs border border-[#C9A15A]/30">
          <Smartphone className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-bold text-[#1A1416] dark:text-[#F7F1E8]">
              Install PDFly
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#7A1635]/10 text-[#7A1635] dark:bg-[#C9A15A]/15 dark:text-[#C9A15A]">
              <Sparkles className="w-2.5 h-2.5" />
              PWA
            </span>
          </div>
          <p className="text-[11px] text-[#5C5256] dark:text-[#AFA6A8] leading-tight mb-3">
            Get a faster app-like experience with offline local PDF tools.
          </p>

          <div className="flex items-center gap-2">
            {isInstallable ? (
              <button
                onClick={() => install()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-xs border border-[#C9A15A]/40"
              >
                <Download className="w-3.5 h-3.5 text-[#C9A15A]" />
                <span>Install PDFly</span>
              </button>
            ) : (
              <Link
                href="/install"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-xs border border-[#C9A15A]/40"
              >
                <Download className="w-3.5 h-3.5 text-[#C9A15A]" />
                <span>How to Install</span>
              </Link>
            )}

            <button
              onClick={() => dismissBanner(7)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-[#5C5256] dark:text-[#AFA6A8] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              Later
            </button>
          </div>
        </div>

        <button
          onClick={() => dismissBanner(7)}
          className="text-[#5C5256] hover:text-[#1A1416] dark:text-[#AFA6A8] dark:hover:text-[#F7F1E8] p-1 -mr-1 -mt-1 rounded-lg transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
