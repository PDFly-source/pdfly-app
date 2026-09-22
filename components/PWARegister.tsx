'use client';

import React, { useEffect } from 'react';
import { setGlobalSWRegistration } from '@/hooks/usePWAInstall';
import { withBasePath } from '@/lib/base-path';
import { OfflineIndicator } from './OfflineIndicator';

export const PWARegister: React.FC = () => {

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register(withBasePath('/sw.js'), {
          scope: withBasePath('/'),
        });

        // Check if there is already a waiting worker - immediately skip waiting
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          setGlobalSWRegistration(registration, true);
        }

        // Listen for new service worker being installed
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              setGlobalSWRegistration(registration, true);
            }
          });
        });

        // Check for updates immediately
        registration.update().catch(() => {});

        setGlobalSWRegistration(registration, false);
      } catch (err) {
        console.warn('[PDFMiniFly] Service worker registration notice:', err);
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

  return <OfflineIndicator />;
};
