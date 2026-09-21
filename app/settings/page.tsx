'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getLocalLibrary, clearLocalLibrary } from '@/lib/local-library';
import { clearRecentJobs, getRecentJobs } from '@/lib/recent-jobs';
import { clearAllAnnotations } from '@/lib/document-annotations';
import { getPreferredLanguage, setPreferredLanguage, SupportedLang } from '@/lib/i18n';
import {
  Settings,
  Globe,
  Palette,
  HardDrive,
  Trash2,
  Command,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowLeft,
  Sparkles,
  Lock,
} from 'lucide-react';

export default function SettingsPage() {
  const [lang, setLang] = useState<SupportedLang>(() => {
    if (typeof window === 'undefined') return 'en';
    return getPreferredLanguage();
  });
  const [docCount, setDocCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return getLocalLibrary().length;
  });
  const [jobsCount, setJobsCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return getRecentJobs().length;
  });
  const [clearedMsg, setClearedMsg] = useState('');

  const handleLangChange = (newLang: SupportedLang) => {
    setLang(newLang);
    setPreferredLanguage(newLang);
  };

  const handleClearRecent = () => {
    clearRecentJobs();
    setJobsCount(0);
    setClearedMsg('Recent processing history cleared.');
    setTimeout(() => setClearedMsg(''), 3000);
  };

  const handleClearAllStorage = () => {
    if (window.confirm('Clear all local workspace documents, notes, bookmarks, and recent jobs? This cannot be undone.')) {
      clearLocalLibrary();
      clearRecentJobs();
      clearAllAnnotations();
      setDocCount(0);
      setJobsCount(0);
      setClearedMsg('All local workspace data purged.');
      setTimeout(() => setClearedMsg(''), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F3EC] dark:bg-[#141213] text-[#141213] dark:text-[#F5F0EB] transition-colors pb-24 md:pb-16">
      {/* Header */}
      <div className="border-b border-[#E5DFD4] dark:border-[#2E2729] bg-white/70 dark:bg-[#1A1718]/70 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/workspace"
              className="p-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] hover:border-[#6D1F35] text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Workspace</span>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#141213] dark:text-[#F5F0EB]">
            Settings & Preferences
          </h1>
          <p className="text-sm text-[#5C554F] dark:text-[#A39991] mt-1">
            Manage your local-first document privacy, interface languages, appearance, and memory.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {clearedMsg && (
          <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{clearedMsg}</span>
          </div>
        )}

        {/* 1. Language & Regional Settings */}
        <div className="p-6 rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#141213] dark:text-[#F5F0EB]">
                Language & Regional Support
              </h2>
              <p className="text-xs text-[#5C554F] dark:text-[#A39991]">
                PDFMiniFly supports Northeast India & South Asian languages natively.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[
              { id: 'en', label: 'English', sub: 'Default' },
              { id: 'as', label: 'অসমীয়া', sub: 'Assamese' },
              { id: 'hi', label: 'हिन्दी', sub: 'Hindi' },
              { id: 'bn', label: 'বাংলা', sub: 'Bengali' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleLangChange(item.id as SupportedLang)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  lang === item.id
                    ? 'border-[#6D1F35] dark:border-[#C6A15B] bg-[#6D1F35]/5 dark:bg-[#C6A15B]/5 ring-2 ring-[#6D1F35]/20'
                    : 'border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] hover:border-black/20'
                }`}
              >
                <div className="text-sm font-bold text-[#141213] dark:text-[#F5F0EB]">
                  {item.label}
                </div>
                <div className="text-[11px] text-[#7A7067]">{item.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Theme & Appearance */}
        <div className="p-6 rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#141213] dark:text-[#F5F0EB]">
                  Appearance & Dark Theme
                </h2>
                <p className="text-xs text-[#5C554F] dark:text-[#A39991]">
                  Rich burgundy & dark chocolate canvas optimized for long reading sessions.
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* 3. Storage & Local Data Management */}
        <div className="p-6 rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#141213] dark:text-[#F5F0EB]">
                Local Storage & In-Browser Memory
              </h2>
              <p className="text-xs text-[#5C554F] dark:text-[#A39991]">
                All data is kept strictly on your local computer or phone.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213]">
              <div className="text-[11px] text-[#7A7067]">Library Documents</div>
              <div className="text-lg font-bold text-[#141213] dark:text-[#F5F0EB]">{docCount}</div>
            </div>
            <div className="p-3.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213]">
              <div className="text-[11px] text-[#7A7067]">Recent Export Jobs</div>
              <div className="text-lg font-bold text-[#141213] dark:text-[#F5F0EB]">{jobsCount}</div>
            </div>
            <div className="p-3.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213]">
              <div className="text-[11px] text-[#7A7067]">Cloud Sync</div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Disabled (Local)</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleClearRecent}
              className="px-4 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] text-xs font-semibold text-[#5C554F] hover:text-[#141213] transition-colors"
            >
              Clear Recent History
            </button>
            <button
              onClick={handleClearAllStorage}
              className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-semibold hover:bg-rose-100 transition-colors"
            >
              Purge All Local Data
            </button>
          </div>
        </div>

        {/* 4. Keyboard Shortcuts Guide */}
        <div className="p-6 rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center">
              <Command className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#141213] dark:text-[#F5F0EB]">
                Global Keyboard Shortcuts
              </h2>
              <p className="text-xs text-[#5C554F] dark:text-[#A39991]">
                Speed up navigation and document reading.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF7F2] dark:bg-[#141213] border border-[#E5DFD4] dark:border-[#2E2729]">
              <span className="text-[#5C554F] dark:text-[#A39991]">Global Command Palette</span>
              <kbd className="font-mono text-[11px] px-2 py-0.5 rounded border border-black/20 bg-white dark:bg-[#1E1A1B]">
                Ctrl / ⌘ + K
              </kbd>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF7F2] dark:bg-[#141213] border border-[#E5DFD4] dark:border-[#2E2729]">
              <span className="text-[#5C554F] dark:text-[#A39991]">Reader Next Page</span>
              <kbd className="font-mono text-[11px] px-2 py-0.5 rounded border border-black/20 bg-white dark:bg-[#1E1A1B]">
                → / Right Arrow
              </kbd>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF7F2] dark:bg-[#141213] border border-[#E5DFD4] dark:border-[#2E2729]">
              <span className="text-[#5C554F] dark:text-[#A39991]">Reader Previous Page</span>
              <kbd className="font-mono text-[11px] px-2 py-0.5 rounded border border-black/20 bg-white dark:bg-[#1E1A1B]">
                ← / Left Arrow
              </kbd>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF7F2] dark:bg-[#141213] border border-[#E5DFD4] dark:border-[#2E2729]">
              <span className="text-[#5C554F] dark:text-[#A39991]">Close Dialog / Modal</span>
              <kbd className="font-mono text-[11px] px-2 py-0.5 rounded border border-black/20 bg-white dark:bg-[#1E1A1B]">
                Escape
              </kbd>
            </div>
          </div>
        </div>

        {/* 5. About PDFMiniFly */}
        <div className="p-6 rounded-3xl border border-[#E8DFD3] dark:border-[#2E2629] bg-[#FFFDF9] dark:bg-[#1B1719] shadow-xs text-center space-y-2">
          <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8]">
            PDFMiniFly — Private. Powerful. Local.
          </h3>
          <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] max-w-lg mx-auto">
            Built as a private, client-first workspace for reading, studying, redacting, converting, and securing documents without relying on external cloud tracking.
          </p>
        </div>
      </div>
    </div>
  );
}
