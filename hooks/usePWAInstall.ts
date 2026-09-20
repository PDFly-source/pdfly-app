'use client';

import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type PWAInstallState =
  | 'INSTALL_AVAILABLE'
  | 'INSTALL_NOT_AVAILABLE'
  | 'ALREADY_INSTALLED'
  | 'IOS_MANUAL_INSTALL'
  | 'UNSUPPORTED';

// Global singleton so all components across the app share the exact beforeinstallprompt event
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let globalRegistration: ServiceWorkerRegistration | null = null;
let globalUpdateAvailable = false;
const listeners = new Set<() => void>();

function notifyAll() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error(e);
    }
  });
}

// Attach window listeners once on module evaluation in browser
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyAll();
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    notifyAll();
  });
}

function detectIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.startsWith('android-app://')
  );
}

export function usePWAInstall() {
  const [, setTick] = useState(0);
  const [installOutcome, setInstallOutcome] = useState<'accepted' | 'dismissed' | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  // Subscribe to global singleton events
  useEffect(() => {
    const handleUpdate = () => setTick((t) => t + 1);
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const isInstalled = detectIsStandalone();

  // Platform heuristics
  const ua = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
  const isIOS =
    typeof window !== 'undefined'
      ? /iphone|ipad|ipod/.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      : false;
  const isAndroid = /android/.test(ua);
  const isWindows = /windows/.test(ua);
  const isMac = /macintosh|mac os x/.test(ua) && !isIOS;
  const isChromium = typeof window !== 'undefined' ? /chrome|chromium|edg|opr/.test(ua) : false;
  const isMobile = isIOS || isAndroid || /mobile/.test(ua);

  // Determine current high-level PWA installation state
  let installState: PWAInstallState = 'INSTALL_NOT_AVAILABLE';

  if (isInstalled) {
    installState = 'ALREADY_INSTALLED';
  } else if (globalDeferredPrompt) {
    installState = 'INSTALL_AVAILABLE';
  } else if (isIOS) {
    installState = 'IOS_MANUAL_INSTALL';
  } else if (isChromium || isAndroid) {
    installState = 'INSTALL_NOT_AVAILABLE';
  } else {
    installState = 'UNSUPPORTED';
  }

  // Dismissal cooldown helper for floating banners
  const [hasDismissedBanner, setHasDismissedBanner] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const dismissedUntil = localStorage.getItem('pdfly_pwa_banner_dismissed_until');
      if (dismissedUntil) {
        return Number(dismissedUntil) > Date.now();
      }
    } catch {
      // ignore
    }
    return false;
  });

  const dismissBanner = useCallback((days = 7) => {
    try {
      const until = Date.now() + days * 24 * 60 * 60 * 1000;
      localStorage.setItem('pdfly_pwa_banner_dismissed_until', String(until));
      setHasDismissedBanner(true);
    } catch {
      // ignore
    }
  }, []);

  // Trigger REAL native PWA installation prompt
  const install = useCallback(async (): Promise<boolean> => {
    if (!globalDeferredPrompt) {
      return false;
    }

    setIsInstalling(true);
    try {
      await globalDeferredPrompt.prompt();
      const choiceResult = await globalDeferredPrompt.userChoice;

      setInstallOutcome(choiceResult.outcome);
      if (choiceResult.outcome === 'accepted') {
        globalDeferredPrompt = null;
        notifyAll();
        setIsInstalling(false);
        return true;
      }
    } catch (err) {
      console.warn('[PDFly PWA] Installation prompt error:', err);
    } finally {
      setIsInstalling(false);
    }

    return false;
  }, []);

  // Diagnostic helper to verify environment & installation readiness
  const getDiagnostics = useCallback(() => {
    const isHttps = typeof window !== 'undefined' ? window.location.protocol === 'https:' || window.location.hostname === 'localhost' : false;
    const hasSW = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
    return {
      isHttps,
      manifestUrl: '/manifest.json',
      hasServiceWorker: hasSW,
      swRegistered: !!globalRegistration,
      swActive: !!globalRegistration?.active,
      isStandalone: isInstalled,
      hasDeferredPrompt: !!globalDeferredPrompt,
      installState,
      userAgent: ua,
      platform: isIOS ? 'ios' : isAndroid ? 'android' : isWindows ? 'windows' : isMac ? 'mac' : 'desktop',
    };
  }, [isInstalled, installState, ua, isIOS, isAndroid, isWindows, isMac]);

  return {
    deferredPrompt: globalDeferredPrompt,
    isInstallable: !!globalDeferredPrompt,
    isInstalled,
    isInstalling,
    installOutcome,
    installState,
    isIOS,
    isAndroid,
    isWindows,
    isMac,
    isMobile,
    install,
    hasDismissedBanner,
    dismissBanner,
    swRegistration: globalRegistration,
    swUpdateAvailable: globalUpdateAvailable,
    getDiagnostics,
  };
}

export function setGlobalSWRegistration(reg: ServiceWorkerRegistration, updateAvailable: boolean) {
  globalRegistration = reg;
  globalUpdateAvailable = updateAvailable;
  notifyAll();
}
