'use client';

import React from 'react';
import Link from 'next/link';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Download, Share2, CheckCircle, ArrowRight, Loader2, Smartphone, ExternalLink } from 'lucide-react';

interface Props {
  variant?: 'nav' | 'hero' | 'dedicated' | 'compact';
  onShowGuide?: () => void;
}

export const PWAInstallButton: React.FC<Props> = ({ variant = 'nav', onShowGuide }) => {
  const {
    isInstallable,
    isInstalled,
    isInstalling,
    installState,
    isIOS,
    install,
  } = usePWAInstall();

  const handleAction = async () => {
    if (isInstallable) {
      await install();
      return;
    }

    if (isIOS) {
      const el = document.getElementById('ios-installation-guide');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else if (onShowGuide) {
        onShowGuide();
      }
      return;
    }

    // If beforeinstallprompt hasn't fired yet or browser requires manual menu tap
    const guideEl = document.getElementById('installation-steps') || document.getElementById('platform-guides');
    if (guideEl) {
      guideEl.scrollIntoView({ behavior: 'smooth' });
    } else if (onShowGuide) {
      onShowGuide();
    }
  };

  // 1. STATE: ALREADY INSTALLED
  if (isInstalled) {
    if (variant === 'dedicated') {
      return (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#35C98A]/15 text-[#248A5E] dark:text-[#35C98A] border border-[#35C98A]/30 text-sm font-bold shadow-xs">
            <CheckCircle className="w-4 h-4 text-[#35C98A]" />
            <span>✓ PDFMiniFly Installed</span>
          </div>
          <Link
            href="/workspace"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] text-sm font-bold shadow-xs hover:brightness-110 active:scale-[0.98] transition-all border border-[#C9A15A]/40"
          >
            <span>Open Workspace</span>
            <ArrowRight className="w-4 h-4 text-[#C9A15A]" />
          </Link>
        </div>
      );
    }

    if (variant === 'hero') {
      return (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#35C98A]/15 text-[#248A5E] dark:text-[#35C98A] border border-[#35C98A]/30 text-xs font-bold">
          <CheckCircle className="w-3.5 h-3.5 text-[#35C98A]" />
          <span>✓ PDFMiniFly Installed</span>
        </div>
      );
    }

    // In nav, hide button when already installed
    return null;
  }

  // 2. STATE: REAL INSTALL PROMPT IS AVAILABLE (beforeinstallprompt)
  if (isInstallable) {
    if (variant === 'dedicated') {
      return (
        <button
          id="pwa-install-dedicated-btn"
          onClick={handleAction}
          disabled={isInstalling}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#7A1635] via-[#63112A] to-[#4A0D20] text-[#F7F1E8] text-base font-extrabold shadow-lg hover:shadow-xl hover:brightness-110 active:scale-[0.98] transition-all border border-[#C9A15A]/50 group"
        >
          {isInstalling ? (
            <Loader2 className="w-5 h-5 text-[#C9A15A] animate-spin" />
          ) : (
            <Download className="w-5 h-5 text-[#C9A15A] group-hover:-translate-y-0.5 transition-transform" />
          )}
          <span>{isInstalling ? 'Opening Browser Prompt...' : 'Install PDFMiniFly'}</span>
        </button>
      );
    }

    if (variant === 'hero') {
      return (
        <button
          id="pwa-install-hero-btn"
          onClick={handleAction}
          disabled={isInstalling}
          className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] text-sm font-bold shadow-xs hover:brightness-110 active:scale-[0.98] transition-all border border-[#C9A15A]/40"
        >
          <Download className="w-4 h-4 text-[#C9A15A]" />
          <span>Install PDFMiniFly</span>
        </button>
      );
    }

    return (
      <button
        id="pwa-install-nav-btn"
        onClick={handleAction}
        disabled={isInstalling}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8DFD3] dark:border-[#2E2629] bg-[#FFFDF9] dark:bg-[#1B1719] text-[#1A1416] dark:text-[#F7F1E8] text-xs font-bold hover:border-[#7A1635] dark:hover:border-[#C9A15A] transition-all shadow-2xs"
        title="Install PDFMiniFly on your device"
      >
        <Smartphone className="w-3.5 h-3.5 text-[#7A1635] dark:text-[#C9A15A]" />
        <span>Install PDFMiniFly</span>
      </button>
    );
  }

  // 3. STATE: iOS Safari (Manual Add to Home Screen)
  if (isIOS) {
    if (variant === 'dedicated') {
      return (
        <button
          id="pwa-install-dedicated-ios-btn"
          onClick={handleAction}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] text-base font-extrabold shadow-lg hover:brightness-110 active:scale-[0.98] transition-all border border-[#C9A15A]/50"
        >
          <Share2 className="w-5 h-5 text-[#C9A15A]" />
          <span>Add PDFMiniFly to Home Screen</span>
        </button>
      );
    }

    return (
      <Link
        href="/install"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8DFD3] dark:border-[#2E2629] bg-[#FFFDF9] dark:bg-[#1B1719] text-[#1A1416] dark:text-[#F7F1E8] text-xs font-bold hover:border-[#7A1635] dark:hover:border-[#C9A15A] transition-all shadow-2xs"
      >
        <Smartphone className="w-3.5 h-3.5 text-[#7A1635] dark:text-[#C9A15A]" />
        <span>Install PDFMiniFly</span>
      </Link>
    );
  }

  // 4. STATE: INSTALL NOT YET FIRED OR DESKTOP BROWSER
  // Never disable permanently! Keep primary CTA as "Install PDFMiniFly"
  if (variant === 'dedicated') {
    return (
      <button
        id="pwa-install-dedicated-fallback-btn"
        onClick={handleAction}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] text-base font-extrabold shadow-lg hover:brightness-110 active:scale-[0.98] transition-all border border-[#C9A15A]/50"
      >
        <Download className="w-5 h-5 text-[#C9A15A]" />
        <span>Install PDFMiniFly</span>
      </button>
    );
  }

  return (
    <Link
      href="/install"
      id="pwa-install-nav-link"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8DFD3] dark:border-[#2E2629] bg-[#FFFDF9] dark:bg-[#1B1719] text-[#1A1416] dark:text-[#F7F1E8] text-xs font-bold hover:border-[#7A1635] dark:hover:border-[#C9A15A] transition-all shadow-2xs"
      title="Install PDFMiniFly on your device"
    >
      <Smartphone className="w-3.5 h-3.5 text-[#7A1635] dark:text-[#C9A15A]" />
      <span>Install PDFMiniFly</span>
    </Link>
  );
};
