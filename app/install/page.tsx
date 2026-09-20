'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Logo } from '@/components/Logo';
import { PWAInstallButton } from '@/components/PWAInstallButton';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import {
  Smartphone,
  Laptop,
  Apple,
  Share2,
  PlusSquare,
  ShieldCheck,
  Zap,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  Download,
  CheckCircle2,
  ExternalLink,
  Layers,
  ArrowRight,
  Info,
  Monitor,
  Check,
  Sparkles,
  Lock,
  Files,
  Scissors,
  Minimize2,
  LayoutGrid,
} from 'lucide-react';

export default function InstallPage() {
  const {
    isInstallable,
    isInstalled,
    installState,
    isIOS,
    isAndroid,
    isWindows,
    isMac,
    swRegistration,
  } = usePWAInstall();

  // Platform selection for interactive guides
  const [userSelectedPlatform, setUserSelectedPlatform] = useState<'android' | 'ios' | 'desktop' | 'windows' | 'mac' | null>(null);

  const detectedPlatform: 'android' | 'ios' | 'desktop' | 'windows' | 'mac' = isIOS
    ? 'ios'
    : isAndroid
    ? 'android'
    : isWindows
    ? 'windows'
    : isMac
    ? 'mac'
    : 'desktop';

  const activePlatform = userSelectedPlatform ?? detectedPlatform;

  // Connection status for App Status card
  const isOnline = useSyncExternalStore(
    (callback) => {
      window.addEventListener('online', callback);
      window.addEventListener('offline', callback);
      return () => {
        window.removeEventListener('online', callback);
        window.removeEventListener('offline', callback);
      };
    },
    () => navigator.onLine,
    () => true
  );

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // Developer Diagnostics State
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagInfo, setDiagInfo] = useState<{
    manifestFound: boolean;
    swActive: boolean;
    cacheExists: boolean;
    isHttps: boolean;
    standalone: boolean;
  }>({
    manifestFound: true,
    swActive: false,
    cacheExists: false,
    isHttps: false,
    standalone: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const runDiag = async () => {
      const isHttps = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.startsWith('android-app://');

      let cacheExists = false;
      if ('caches' in window) {
        cacheExists = (await caches.has('pdfly-shell-v1')) || (await caches.has('pdfly-cache-v3'));
      }

      setDiagInfo({
        manifestFound: !!document.querySelector('link[rel="manifest"]'),
        swActive: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
        cacheExists,
        isHttps,
        standalone,
      });
    };

    runDiag();
  }, [swRegistration]);

  const faqs = [
    {
      q: 'What is PDFly?',
      a: 'PDFly is a private, modern, browser-based document workspace. It allows you to view, merge, split, rotate, convert, sign, and organize PDF documents locally on your device without sending your sensitive files to third-party cloud servers.',
    },
    {
      q: 'What is a Progressive Web App (PWA)?',
      a: 'A Progressive Web App is a website built using modern browser APIs that can be installed on your phone, tablet, or computer. It launches in a dedicated fullscreen window, provides offline access to cached features, and feels just like a native app—without taking up gigabytes of disk space.',
    },
    {
      q: 'Does installing PDFly upload my files to any cloud server?',
      a: 'No, absolutely never. Installation is purely a browser convenience that creates an app launcher and caches the application interface. All document processing continues to happen locally in your browser memory via WebAssembly and JavaScript.',
    },
    {
      q: 'Can I uninstall PDFly anytime?',
      a: 'Yes, easily. On Android, press and hold the PDFly icon and tap "Uninstall". On iPhone/iPad, press and hold the icon and tap "Delete Bookmark". On Windows/Mac, open PDFly, click the three-dots menu in the title bar, and select "Uninstall PDFly".',
    },
    {
      q: 'Does PDFly work offline?',
      a: 'Yes! Once installed or loaded once, the core application shell and client-side processing tools (PDF Viewer, Merge, Split, Rotate, Organize, Fill & Sign, and Redact) run completely offline without an active internet connection. Features requiring AI (like the Gemini Document Assistant) require a network connection.',
    },
    {
      q: 'How do I install PDFly on Android?',
      a: 'Open PDFly in Google Chrome on your Android phone or tablet. Tap the "Install PDFly" button at the top of this page, or tap the three dots (⋮) in Chrome and select "Install app" or "Add to Home screen".',
    },
    {
      q: 'How do I install PDFly on iPhone or iPad?',
      a: 'Open PDFly in Apple Safari. Tap the Share button (square icon with an arrow pointing up) in Safari’s toolbar. Scroll down and tap "Add to Home Screen", then tap "Add" in the top-right corner. Apple only supports PWA installation via Safari.',
    },
    {
      q: 'How do I install PDFly on Windows?',
      a: 'Open PDFly in Google Chrome or Microsoft Edge on your PC. Click the "Install" icon in the address bar (a computer monitor with a downward arrow), or select "Install PDFly" from the browser menu. You can then pin it to your Windows Taskbar or Start Menu.',
    },
    {
      q: 'How do I install PDFly on Mac?',
      a: 'On macOS Sonoma (14+) with Safari, click File in the top menu bar and select "Add to Dock...". In Chrome or Edge on macOS, click the Install icon in the address bar. PDFly will appear in your Dock and Launchpad like any native Mac application.',
    },
    {
      q: 'Does PDFly require an account or subscription to install?',
      a: 'No account, sign-up, email, or credit card is required. PDFly is completely free to install and use for all standard local document tasks.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F6EFE3] dark:bg-[#121012] text-[#1A1416] dark:text-[#F7F1E8] transition-colors selection:bg-[#7A1635] selection:text-[#F7F1E8]">
      <Navbar />

      <main className="flex-1 w-full pb-20">
        {/* ============================================================ */}
        {/* A. HERO SECTION — INSPIRED BY REFERENCE PWA DESIGN            */}
        {/* ============================================================ */}
        <section className="relative px-4 sm:px-6 lg:px-8 pt-8 md:pt-14 pb-12 max-w-5xl mx-auto">
          {/* Main Rich Burgundy Hero Card */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#5A0C1E] via-[#430916] to-[#2B050E] text-[#F7F1E8] p-7 sm:p-12 shadow-2xl border border-[#C9A15A]/30">
            {/* Subtle radial glow inside card */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#C9A15A]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#7A1635]/40 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl">
              {/* Official Master Logo & Badge */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Logo size="md" variant="compact" href="" />
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-[#C9A15A]/40 text-[#C9A15A] text-xs font-bold uppercase tracking-wider shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#C9A15A] animate-pulse" />
                  <span>Official PWA</span>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.15] text-[#F7F1E8] mb-4">
                Your Private PDF Workspace.{' '}
                <span className="text-[#DFC17E]">Now in Your Pocket.</span>
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-[#F7F1E8]/85 leading-relaxed mb-6 font-normal">
                Process, edit and secure your documents with PDFly — fast, private, and local. No uploads, zero cloud latency.
              </p>

              {/* 4 Value Checkmarks Row */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-[#F7F1E8]/95 mb-8">
                <div className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#C9A15A] stroke-[3]" />
                  <span>Faster Access</span>
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#C9A15A] stroke-[3]" />
                  <span>Offline Ready</span>
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#C9A15A] stroke-[3]" />
                  <span>100% Private</span>
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#C9A15A] stroke-[3]" />
                  <span>Zero Cloud Uploads</span>
                </div>
              </div>

              {/* Action Buttons: Real PWA Install + Explore */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mb-5">
                <PWAInstallButton variant="dedicated" />

                <Link
                  href="/workspace"
                  id="hero-explore-app-btn"
                  className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-black/30 hover:bg-black/40 border border-[#F7F1E8]/20 text-[#F7F1E8] text-sm font-bold transition-all shadow-xs hover:border-[#C9A15A]/50 text-center"
                >
                  <span>{isInstalled ? 'Explore Workspace' : 'Continue in Browser'}</span>
                  <ArrowRight className="w-4 h-4 text-[#C9A15A]" />
                </Link>
              </div>

              {/* Dynamic Status Text */}
              <div className="flex items-center gap-2 text-xs text-[#DFC17E]">
                {isInstalled ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#35C98A] shrink-0" />
                    <span className="font-semibold">ALREADY INSTALLED — PDFly is active on this device.</span>
                  </>
                ) : isInstallable ? (
                  <>
                    <Sparkles className="w-4 h-4 text-[#C9A15A] shrink-0" />
                    <span className="font-semibold">INSTALL READY — Tap above to trigger the browser installation prompt.</span>
                  </>
                ) : isIOS ? (
                  <>
                    <Info className="w-4 h-4 text-[#C9A15A] shrink-0" />
                    <span className="font-semibold">MANUAL INSTALL — Tap Safari Share (⬆) then &quot;Add to Home Screen&quot;.</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#C9A15A] shrink-0" />
                    <span className="font-semibold">INSTALL READY — Tap above to install or use your browser&apos;s menu.</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* B. APP STATUS GRID (6 CARDS MATCHING REFERENCE SCREENSHOT)    */}
        {/* ============================================================ */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-16">
          <h2 className="text-xs font-black tracking-[0.2em] text-[#7A1635] dark:text-[#C9A15A] uppercase mb-4 pl-1">
            App Status
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* 1. INSTALLATION */}
            <div className="p-4 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-xs">
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-[#5C5256] dark:text-[#AFA6A8] mb-1.5">
                <span className={`w-2 h-2 rounded-full ${isInstalled ? 'bg-[#35C98A]' : 'bg-[#C9A15A]'} shrink-0`} />
                <span>Installation</span>
              </div>
              <p className="text-base font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-0.5">
                {isInstalled ? 'Installed' : isInstallable ? 'Install Ready' : 'In Browser'}
              </p>
              <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                {isInstalled
                  ? 'PDFly is on this device.'
                  : isInstallable
                  ? 'Ready to install to Home Screen.'
                  : 'Full toolkit available in browser.'}
              </p>
            </div>

            {/* 2. LOCAL PRIVACY */}
            <div className="p-4 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-xs">
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-[#5C5256] dark:text-[#AFA6A8] mb-1.5">
                <span className="w-2 h-2 rounded-full bg-[#35C98A] shrink-0" />
                <span>Privacy & Security</span>
              </div>
              <p className="text-base font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-0.5">
                100% Private
              </p>
              <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                Files processed locally in client memory with zero cloud uploads.
              </p>
            </div>

            {/* 3. CONNECTIVITY */}
            <div className="p-4 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-xs">
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-[#5C5256] dark:text-[#AFA6A8] mb-1.5">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#35C98A]' : 'bg-[#E36B6B]'} shrink-0`} />
                <span>Connectivity</span>
              </div>
              <p className="text-base font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-0.5">
                {isOnline ? 'Online' : 'Offline'}
              </p>
              <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                {isOnline ? 'Connected to internet.' : 'Local offline engine active.'}
              </p>
            </div>

            {/* 4. OFFLINE */}
            <div className="p-4 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-xs">
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-[#5C5256] dark:text-[#AFA6A8] mb-1.5">
                <span className="w-2 h-2 rounded-full bg-[#35C98A] shrink-0" />
                <span>Offline Processing</span>
              </div>
              <p className="text-base font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-0.5">
                Ready
              </p>
              <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                App shell and local WebAssembly PDF engine cached for offline work.
              </p>
            </div>

            {/* 5. VERSION */}
            <div className="p-4 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-xs">
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-[#5C5256] dark:text-[#AFA6A8] mb-1.5">
                <span className="w-2 h-2 rounded-full bg-[#35C98A] shrink-0" />
                <span>Version</span>
              </div>
              <p className="text-base font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-0.5">
                Current
              </p>
              <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                PDFly v3.1 — application shell is up to date.
              </p>
            </div>

            {/* 6. APP SHELL */}
            <div className="p-4 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-xs">
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-[#5C5256] dark:text-[#AFA6A8] mb-1.5">
                <span className={`w-2 h-2 rounded-full ${diagInfo.swActive ? 'bg-[#35C98A]' : 'bg-[#C9A15A]'} shrink-0`} />
                <span>App Shell</span>
              </div>
              <p className="text-base font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-0.5">
                {diagInfo.swActive ? 'Active' : 'Standby'}
              </p>
              <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                Service worker registered with local cache storage.
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* C. MY SHORTCUTS (MATCHING REFERENCE SCREENSHOT)               */}
        {/* ============================================================ */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-16">
          <div className="flex items-center gap-2 mb-4 pl-1">
            <Zap className="w-3.5 h-3.5 text-[#C9A15A]" />
            <h2 className="text-xs font-black tracking-[0.2em] text-[#7A1635] dark:text-[#C9A15A] uppercase">
              My Shortcuts
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <Link
              href="/tools/merge"
              className="p-4 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] hover:border-[#7A1635]/40 dark:hover:border-[#C9A15A]/40 transition-all shadow-xs group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#7A1635]/10 dark:bg-[#7A1635]/20 text-[#7A1635] dark:text-[#C9A15A] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Files className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-0.5">Merge PDF</p>
              <p className="text-[11px] text-[#5C5256] dark:text-[#AFA6A8]">Combine files</p>
            </Link>

            <Link
              href="/tools/split"
              className="p-4 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] hover:border-[#7A1635]/40 dark:hover:border-[#C9A15A]/40 transition-all shadow-xs group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#7A1635]/10 dark:bg-[#7A1635]/20 text-[#7A1635] dark:text-[#C9A15A] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Scissors className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-0.5">Split PDF</p>
              <p className="text-[11px] text-[#5C5256] dark:text-[#AFA6A8]">Extract pages</p>
            </Link>

            <Link
              href="/tools/compress"
              className="p-4 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] hover:border-[#7A1635]/40 dark:hover:border-[#C9A15A]/40 transition-all shadow-xs group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#7A1635]/10 dark:bg-[#7A1635]/20 text-[#7A1635] dark:text-[#C9A15A] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Minimize2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-0.5">Compress</p>
              <p className="text-[11px] text-[#5C5256] dark:text-[#AFA6A8]">Reduce file size</p>
            </Link>

            <Link
              href="/workspace"
              className="p-4 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] hover:border-[#7A1635]/40 dark:hover:border-[#C9A15A]/40 transition-all shadow-xs group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#7A1635]/10 dark:bg-[#7A1635]/20 text-[#7A1635] dark:text-[#C9A15A] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-0.5">Workspace</p>
              <p className="text-[11px] text-[#5C5256] dark:text-[#AFA6A8]">All PDF tools</p>
            </Link>
          </div>
        </section>

        {/* ============================================================ */}
        {/* D. DEVICE-SPECIFIC INSTALLATION GUIDES                        */}
        {/* ============================================================ */}
        <section id="installation-steps" className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-20 scroll-mt-20">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A1416] dark:text-[#F7F1E8] mb-2">
              Installation Guides by Device
            </h2>
            <p className="text-sm text-[#5C5256] dark:text-[#AFA6A8]">
              Select your platform below for clear, accurate step-by-step instructions.
            </p>
          </div>

          {/* Platform Switcher Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {[
              { id: 'android', label: 'Android (Chrome)', icon: Smartphone },
              { id: 'ios', label: 'iPhone / iPad (Safari)', icon: Apple },
              { id: 'desktop', label: 'Desktop (Chrome/Edge)', icon: Laptop },
              { id: 'windows', label: 'Windows PC', icon: Monitor },
              { id: 'mac', label: 'Mac (Safari/Chrome)', icon: Apple },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activePlatform === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setUserSelectedPlatform(tab.id as 'android' | 'ios' | 'desktop' | 'windows' | 'mac')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-2xs ${
                    isActive
                      ? 'bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] border border-[#C9A15A]/40'
                      : 'bg-[#FFFDF9] dark:bg-[#1B1719] text-[#5C5256] dark:text-[#AFA6A8] border border-[#E8DFD3] dark:border-[#2E2629] hover:text-[#1A1416] dark:hover:text-[#F7F1E8]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#C9A15A]' : ''}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Platform Tab Content Card */}
          <div className="rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] p-6 sm:p-10 shadow-lg">
            {/* 1. ANDROID */}
            {activePlatform === 'android' && (
              <div id="android-guide" className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#E8DFD3] dark:border-[#2E2629] pb-4">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-6 h-6 text-[#7A1635] dark:text-[#C9A15A]" />
                    <h3 className="text-lg font-bold text-[#1A1416] dark:text-[#F7F1E8]">
                      Installing on Android (Google Chrome)
                    </h3>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#35C98A]/15 text-[#248A5E] dark:text-[#35C98A]">
                    Native WebAPK Support
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-[#F6EFE3]/50 dark:bg-[#241D20]/50 border border-[#E8DFD3] dark:border-[#2E2629]">
                    <div className="w-8 h-8 rounded-full bg-[#7A1635] text-[#F7F1E8] flex items-center justify-center font-bold text-xs mb-3">
                      1
                    </div>
                    <p className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1">
                      Tap &quot;Install PDFly&quot;
                    </p>
                    <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                      Tap the primary button on this page, or open Chrome&apos;s menu (three dots ⋮ in top-right) and tap <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F6EFE3]/50 dark:bg-[#241D20]/50 border border-[#E8DFD3] dark:border-[#2E2629]">
                    <div className="w-8 h-8 rounded-full bg-[#7A1635] text-[#F7F1E8] flex items-center justify-center font-bold text-xs mb-3">
                      2
                    </div>
                    <p className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1">
                      Confirm Installation
                    </p>
                    <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                      The native Android/Chrome prompt appears. Tap <strong>&quot;Install&quot;</strong>. Android generates the WebAPK package in the background.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F6EFE3]/50 dark:bg-[#241D20]/50 border border-[#E8DFD3] dark:border-[#2E2629]">
                    <div className="w-8 h-8 rounded-full bg-[#7A1635] text-[#F7F1E8] flex items-center justify-center font-bold text-xs mb-3">
                      3
                    </div>
                    <p className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1">
                      Launch Standalone
                    </p>
                    <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                      Find the official PDFly icon on your Home Screen or App Drawer. Tap to open in true standalone mode with no browser address bar.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. IOS */}
            {activePlatform === 'ios' && (
              <div id="ios-installation-guide" className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#E8DFD3] dark:border-[#2E2629] pb-4">
                  <div className="flex items-center gap-3">
                    <Apple className="w-6 h-6 text-[#7A1635] dark:text-[#C9A15A]" />
                    <h3 className="text-lg font-bold text-[#1A1416] dark:text-[#F7F1E8]">
                      Installing on iPhone &amp; iPad (Apple Safari)
                    </h3>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#C9A15A]/15 text-[#9E7326] dark:text-[#DFC17E]">
                    Requires Safari
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-[#F6EFE3]/50 dark:bg-[#241D20]/50 border border-[#E8DFD3] dark:border-[#2E2629]">
                    <div className="w-8 h-8 rounded-full bg-[#7A1635] text-[#F7F1E8] flex items-center justify-center font-bold text-xs mb-3">
                      1
                    </div>
                    <p className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1">Open in Safari</p>
                    <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                      Apple requires using <strong>Safari</strong> for Home Screen installation.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F6EFE3]/50 dark:bg-[#241D20]/50 border border-[#E8DFD3] dark:border-[#2E2629]">
                    <div className="w-8 h-8 rounded-full bg-[#7A1635] text-[#F7F1E8] flex items-center justify-center font-bold text-xs mb-3">
                      2
                    </div>
                    <p className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1">Tap Share (⬆)</p>
                    <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                      Tap the <strong>Share</strong> button (square icon with upward arrow) in the bottom toolbar.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F6EFE3]/50 dark:bg-[#241D20]/50 border border-[#E8DFD3] dark:border-[#2E2629]">
                    <div className="w-8 h-8 rounded-full bg-[#7A1635] text-[#F7F1E8] flex items-center justify-center font-bold text-xs mb-3">
                      3
                    </div>
                    <p className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1">Add to Home Screen</p>
                    <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                      Scroll down in the share sheet and select <strong>&quot;Add to Home Screen&quot;</strong>.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F6EFE3]/50 dark:bg-[#241D20]/50 border border-[#E8DFD3] dark:border-[#2E2629]">
                    <div className="w-8 h-8 rounded-full bg-[#7A1635] text-[#F7F1E8] flex items-center justify-center font-bold text-xs mb-3">
                      4
                    </div>
                    <p className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1">Tap &quot;Add&quot;</p>
                    <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                      Tap <strong>&quot;Add&quot;</strong> in the top-right corner. PDFly will appear on your Home Screen.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 3. DESKTOP */}
            {activePlatform === 'desktop' && (
              <div id="desktop-guide" className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#E8DFD3] dark:border-[#2E2629] pb-4">
                  <div className="flex items-center gap-3">
                    <Laptop className="w-6 h-6 text-[#7A1635] dark:text-[#C9A15A]" />
                    <h3 className="text-lg font-bold text-[#1A1416] dark:text-[#F7F1E8]">
                      Installing on Desktop (Chrome, Edge, Brave)
                    </h3>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#35C98A]/15 text-[#248A5E] dark:text-[#35C98A]">
                    Desktop Window Mode
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-[#F6EFE3]/50 dark:bg-[#241D20]/50 border border-[#E8DFD3] dark:border-[#2E2629]">
                    <div className="w-8 h-8 rounded-full bg-[#7A1635] text-[#F7F1E8] flex items-center justify-center font-bold text-xs mb-3">
                      1
                    </div>
                    <p className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1">Click Install Button</p>
                    <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                      Click <strong>&quot;Install PDFly&quot;</strong> at the top of this page, or locate the install icon (monitor with arrow) in your browser address bar.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F6EFE3]/50 dark:bg-[#241D20]/50 border border-[#E8DFD3] dark:border-[#2E2629]">
                    <div className="w-8 h-8 rounded-full bg-[#7A1635] text-[#F7F1E8] flex items-center justify-center font-bold text-xs mb-3">
                      2
                    </div>
                    <p className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1">Confirm in Dialog</p>
                    <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                      A confirmation dialog will appear. Click <strong>&quot;Install&quot;</strong> to create the desktop shortcut.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F6EFE3]/50 dark:bg-[#241D20]/50 border border-[#E8DFD3] dark:border-[#2E2629]">
                    <div className="w-8 h-8 rounded-full bg-[#7A1635] text-[#F7F1E8] flex items-center justify-center font-bold text-xs mb-3">
                      3
                    </div>
                    <p className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1">Standalone Window</p>
                    <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                      PDFly immediately opens in a dedicated window with no tabs, no address bar, and full local performance.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 4. WINDOWS */}
            {activePlatform === 'windows' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#E8DFD3] dark:border-[#2E2629] pb-4">
                  <div className="flex items-center gap-3">
                    <Monitor className="w-6 h-6 text-[#7A1635] dark:text-[#C9A15A]" />
                    <h3 className="text-lg font-bold text-[#1A1416] dark:text-[#F7F1E8]">
                      Installing on Windows 11 &amp; 10
                    </h3>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#35C98A]/15 text-[#248A5E] dark:text-[#35C98A]">
                    Taskbar Pinning
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-[#F6EFE3]/50 dark:bg-[#241D20]/50 border border-[#E8DFD3] dark:border-[#2E2629]">
                    <div className="w-8 h-8 rounded-full bg-[#7A1635] text-[#F7F1E8] flex items-center justify-center font-bold text-xs mb-3">
                      1
                    </div>
                    <p className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1">Open Edge or Chrome</p>
                    <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                      Click the Install icon in the address bar or tap the &quot;Install PDFly&quot; button above.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F6EFE3]/50 dark:bg-[#241D20]/50 border border-[#E8DFD3] dark:border-[#2E2629]">
                    <div className="w-8 h-8 rounded-full bg-[#7A1635] text-[#F7F1E8] flex items-center justify-center font-bold text-xs mb-3">
                      2
                    </div>
                    <p className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1">Pin to Taskbar / Start</p>
                    <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                      Windows will prompt you with checkboxes to pin PDFly to your Taskbar and Start Menu. Check both and confirm.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F6EFE3]/50 dark:bg-[#241D20]/50 border border-[#E8DFD3] dark:border-[#2E2629]">
                    <div className="w-8 h-8 rounded-full bg-[#7A1635] text-[#F7F1E8] flex items-center justify-center font-bold text-xs mb-3">
                      3
                    </div>
                    <p className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1">One-Click Launch</p>
                    <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                      Launch PDFly directly from your Windows taskbar like Microsoft Office or Adobe Acrobat.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 5. MAC */}
            {activePlatform === 'mac' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#E8DFD3] dark:border-[#2E2629] pb-4">
                  <div className="flex items-center gap-3">
                    <Apple className="w-6 h-6 text-[#7A1635] dark:text-[#C9A15A]" />
                    <h3 className="text-lg font-bold text-[#1A1416] dark:text-[#F7F1E8]">
                      Installing on macOS (Safari or Chrome)
                    </h3>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#35C98A]/15 text-[#248A5E] dark:text-[#35C98A]">
                    Dock &amp; Launchpad
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-[#F6EFE3]/50 dark:bg-[#241D20]/50 border border-[#E8DFD3] dark:border-[#2E2629]">
                    <div className="w-8 h-8 rounded-full bg-[#7A1635] text-[#F7F1E8] flex items-center justify-center font-bold text-xs mb-3">
                      1
                    </div>
                    <p className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1">In Safari (macOS Sonoma+)</p>
                    <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                      Click <strong>File</strong> in the top menu bar, then select <strong>&quot;Add to Dock...&quot;</strong>.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F6EFE3]/50 dark:bg-[#241D20]/50 border border-[#E8DFD3] dark:border-[#2E2629]">
                    <div className="w-8 h-8 rounded-full bg-[#7A1635] text-[#F7F1E8] flex items-center justify-center font-bold text-xs mb-3">
                      2
                    </div>
                    <p className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1">In Chrome / Edge on Mac</p>
                    <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                      Click the Install icon in the address bar or tap &quot;Install PDFly&quot; above.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F6EFE3]/50 dark:bg-[#241D20]/50 border border-[#E8DFD3] dark:border-[#2E2629]">
                    <div className="w-8 h-8 rounded-full bg-[#7A1635] text-[#F7F1E8] flex items-center justify-center font-bold text-xs mb-3">
                      3
                    </div>
                    <p className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1">Native Dock Integration</p>
                    <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                      PDFly appears in your macOS Dock, Launchpad, and Application Switcher (⌘ + Tab).
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ============================================================ */}
        {/* E. HONEST OFFLINE CAPABILITIES BREAKDOWN                     */}
        {/* ============================================================ */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-20">
          <div className="rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] p-6 sm:p-10 shadow-lg">
            <div className="max-w-2xl mb-8">
              <h2 className="text-2xl font-black tracking-tight text-[#1A1416] dark:text-[#F7F1E8] mb-2">
                Offline Capabilities
              </h2>
              <p className="text-sm text-[#5C5256] dark:text-[#AFA6A8]">
                We believe in complete honesty about what runs locally versus what requires an internet connection.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Works 100% Offline */}
              <div className="p-5 rounded-2xl bg-[#35C98A]/5 border border-[#35C98A]/25 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#248A5E] dark:text-[#35C98A]">
                  <WifiOff className="w-4 h-4" />
                  <span>Works 100% Offline (Local Browser Processing)</span>
                </div>
                <ul className="space-y-2 text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#35C98A]" />
                    <span>PDF Viewer &amp; Page Navigation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#35C98A]" />
                    <span>Merge Multiple PDFs into One</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#35C98A]" />
                    <span>Split &amp; Extract Page Ranges</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#35C98A]" />
                    <span>Rotate &amp; Reorder Pages</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#35C98A]" />
                    <span>Fill &amp; Digital Signatures (Canvas)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#35C98A]" />
                    <span>Blackout &amp; Permanent Redaction</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#35C98A]" />
                    <span>Local Bookmarks, Notes &amp; Recent Jobs</span>
                  </li>
                </ul>
              </div>

              {/* 2. Requires Internet */}
              <div className="p-5 rounded-2xl bg-[#C9A15A]/5 border border-[#C9A15A]/25 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#9E7326] dark:text-[#DFC17E]">
                  <Wifi className="w-4 h-4" />
                  <span>Requires Internet Connection</span>
                </div>
                <ul className="space-y-2 text-xs text-[#5C5256] dark:text-[#AFA6A8]">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9A15A]" />
                    <span>Gemini AI Document Summaries &amp; Q&amp;A</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9A15A]" />
                    <span>First-time application updates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C9A15A]" />
                    <span>Initial OCR neural-net weights download</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* F. FAQ ACCORDION                                             */}
        {/* ============================================================ */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto mb-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A1416] dark:text-[#F7F1E8] mb-2">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-[#5C5256] dark:text-[#AFA6A8]">
              Everything you need to know about installing and running PDFly on your devices.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] overflow-hidden transition-all shadow-2xs"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between p-5 text-left font-bold text-sm text-[#1A1416] dark:text-[#F7F1E8] hover:text-[#7A1635] dark:hover:text-[#C9A15A] transition-colors gap-4"
                  >
                    <span>{faq.q}</span>
                    <span className="shrink-0 text-[#C9A15A]">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed border-t border-[#E8DFD3]/50 dark:border-[#2E2629]/50 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ============================================================ */}
        {/* G. DEVELOPER DIAGNOSTICS                                     */}
        {/* ============================================================ */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
          <div className="p-4 rounded-2xl bg-[#FFFDF9]/60 dark:bg-[#1B1719]/60 border border-[#E8DFD3] dark:border-[#2E2629]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#5C5256] dark:text-[#AFA6A8]">
                <ShieldCheck className="w-4 h-4 text-[#35C98A]" />
                <span>PWA System Diagnostics</span>
              </div>
              <button
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="text-xs font-semibold text-[#7A1635] dark:text-[#C9A15A] hover:underline"
              >
                {showDiagnostics ? 'Hide Details' : 'Inspect PWA Status'}
              </button>
            </div>

            {showDiagnostics && (
              <div className="mt-4 p-4 rounded-xl bg-[#F6EFE3] dark:bg-[#241D20] border border-[#E8DFD3] dark:border-[#2E2629] space-y-2.5 font-mono text-xs text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#FFFDF9] dark:bg-[#1B1719]">
                    <span>Web App Manifest:</span>
                    <span className={diagInfo.manifestFound ? 'text-[#35C98A] font-bold' : 'text-red-500 font-bold'}>
                      {diagInfo.manifestFound ? '✓ Loaded (/manifest.json)' : '✗ Missing'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#FFFDF9] dark:bg-[#1B1719]">
                    <span>Service Worker Controller:</span>
                    <span className={diagInfo.swActive ? 'text-[#35C98A] font-bold' : 'text-[#C9A15A] font-bold'}>
                      {diagInfo.swActive ? '✓ Active (/sw.js)' : 'Registering...'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#FFFDF9] dark:bg-[#1B1719]">
                    <span>Cache Storage:</span>
                    <span className={diagInfo.cacheExists ? 'text-[#35C98A] font-bold' : 'text-[#AFA6A8]'}>
                      {diagInfo.cacheExists ? '✓ pdfly-shell-v1 ready' : 'Priming cache'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#FFFDF9] dark:bg-[#1B1719]">
                    <span>Display Mode:</span>
                    <span className="font-bold text-[#1A1416] dark:text-[#F7F1E8]">
                      {diagInfo.standalone ? 'standalone (installed)' : 'browser'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#FFFDF9] dark:bg-[#1B1719]">
                    <span>Install Prompt State:</span>
                    <span className={isInstallable ? 'text-[#35C98A] font-bold' : 'text-[#C9A15A] font-bold'}>
                      {installState}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#FFFDF9] dark:bg-[#1B1719]">
                    <span>Secure Context (HTTPS):</span>
                    <span className={diagInfo.isHttps ? 'text-[#35C98A] font-bold' : 'text-red-500 font-bold'}>
                      {diagInfo.isHttps ? '✓ Secure' : '✗ Insecure'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
