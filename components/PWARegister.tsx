'use client';

import React, { useEffect, useState } from 'react';
import { setGlobalSWRegistration } from '@/hooks/usePWAInstall';
import { OfflineIndicator } from './OfflineIndicator';
import { RefreshCw, Sparkles } from 'lucide-react';

export const PWARegister: React.FC = () => {
  const [updateWaiting, setUpdateWaiting] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // Check if there is already a waiting worker
        if (registration.waiting) {
          setUpdateWaiting(true);
          setWaitingWorker(registration.waiting);
          setGlobalSWRegistration(registration, true);
        }

        // Listen for new service worker being installed
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateWaiting(true);
              setWaitingWorker(newWorker);
              setGlobalSWRegistration(registration, true);
            }
          });
        });

        setGlobalSWRegistration(registration, false);
      } catch (err) {
        console.warn('[PDFly] Service worker registration notice:', err);
      }
    };

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
      return () => window.removeEventListener('load', registerSW);
    }
  }, []);

  // Listen for controlling service worker change to safely reload
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  return (
    <>
      <OfflineIndicator />

      {/* Subtle update banner when new version is available */}
      {updateWaiting && (
        <div
          id="pdfly-update-banner"
          className="fixed top-20 right-4 z-50 flex items-center gap-3 p-3.5 rounded-2xl bg-[#1B1719] text-[#F7F1E8] border border-[#C9A15A]/70 shadow-2xl backdrop-blur-md max-w-sm animate-fade-in"
        >
          <div className="w-8 h-8 rounded-xl bg-[#7A1635] text-[#C9A15A] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#F7F1E8]">New PDFly Version Ready</p>
            <p className="text-[11px] text-[#AFA6A8]">Update to get the latest offline enhancements.</p>
          </div>
          <button
            onClick={handleUpdate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] text-xs font-bold hover:brightness-110 active:scale-95 transition-all border border-[#C9A15A]/40 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#C9A15A]" />
            <span>Update PDFly</span>
          </button>
        </div>
      )}
    </>
  );
};
