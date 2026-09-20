'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useSyncExternalStore(subscribeOnline, getSnapshot, getServerSnapshot);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handleOnline = () => {
      setShowReconnected(true);
      timer = setTimeout(() => setShowReconnected(false), 3500);
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
      clearTimeout(timer);
    };
  }, []);

  // Show reconnected toast briefly
  if (showReconnected) {
    return (
      <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#35C98A] text-[#121012] text-xs font-bold shadow-lg border border-[#35C98A]/40 animate-fade-in">
        <Wifi className="w-3.5 h-3.5" />
        <span>● Back Online</span>
      </div>
    );
  }

  // Show offline indicator non-aggressively
  if (!isOnline) {
    return (
      <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B1719] text-[#F7F1E8] text-xs font-bold shadow-xl border border-[#C9A15A]/60 backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-[#C9A15A] animate-pulse"></span>
        <WifiOff className="w-3.5 h-3.5 text-[#C9A15A]" />
        <span>● Offline — Local tools active</span>
      </div>
    );
  }

  return null;
};
