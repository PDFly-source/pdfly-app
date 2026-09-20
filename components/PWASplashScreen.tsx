'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Logo } from './Logo';

export const PWASplashScreen: React.FC = () => {
  const [fadingOut, setFadingOut] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Subscribe safely to client standalone & session storage without hydration mismatch
  const shouldSplash = useSyncExternalStore(
    () => () => {},
    () => {
      if (typeof window === 'undefined') return false;
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.startsWith('android-app://');

      if (!isStandalone) return false;
      try {
        return !sessionStorage.getItem('pdfly_standalone_splashed');
      } catch {
        return false;
      }
    },
    () => false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect standalone mode to assign root class
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.startsWith('android-app://');

    if (isStandalone) {
      document.documentElement.classList.add('standalone-mode');
    } else {
      document.documentElement.classList.remove('standalone-mode');
    }

    if (!shouldSplash) return;

    try {
      sessionStorage.setItem('pdfly_standalone_splashed', 'true');
    } catch {
      // ignore
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const displayDuration = prefersReducedMotion ? 400 : 950;
    const fadeDuration = prefersReducedMotion ? 150 : 350;

    const fadeTimer = setTimeout(() => {
      setFadingOut(true);
    }, displayDuration);

    const hideTimer = setTimeout(() => {
      setDismissed(true);
    }, displayDuration + fadeDuration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [shouldSplash]);

  if (!shouldSplash || dismissed) return null;

  return (
    <div
      id="pdfly-pwa-splash"
      aria-hidden="true"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#0F0B0D] text-[#F7F1E8] select-none pointer-events-none transition-opacity duration-300 ${
        fadingOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Subtle burgundy / gold ambient radial glow */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="w-96 h-96 rounded-full bg-radial from-[#741B35]/35 via-[#C9A15A]/10 to-transparent blur-3xl" />
      </div>

      {/* Branded Splash Emblem & Typography */}
      <div className="relative flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="transform transition-transform duration-700 ease-out scale-100">
          <Logo size="xl" showTagline={true} href="" />
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C9A15A] animate-pulse" />
            <span className="text-[11px] font-bold tracking-[0.25em] text-[#C9A15A] uppercase">
              Fast · Secure · Local Engine
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
