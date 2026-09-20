'use client';

import { useState, useEffect } from 'react';

export type SupportedLanguage = 'en' | 'as' | 'hi' | 'bn';
export type SupportedLang = SupportedLanguage;

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  region: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', region: 'Global' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', region: 'Assam, India' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', region: 'India' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', region: 'West Bengal / Bangladesh' },
];

export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    workspace: 'Workspace',
    tools: 'Tools',
    workflows: 'Workflows',
    batch: 'Batch',
    privacy: 'Privacy',
    security: 'Security',
    settings: 'Settings',
    searchPlaceholder: 'Search tools or commands (⌘K)...',
    recentJobs: 'Recent Jobs',
    localFirstBanner: 'Local-First Document Workspace • Private & In-Memory',
    openFile: 'Open File',
    newDocument: 'New Document',
    importFile: 'Import',
    recentDocuments: 'Recent Documents',
    pinnedDocuments: 'Pinned Documents',
    allDocuments: 'All Documents',
    favorites: 'Favorites',
    offlineReady: 'Offline-Ready',
    noUploads: 'No document uploads. Files stay entirely in browser.',
    clearData: 'Clear Local Data',
    studyMode: 'Study Mode',
    readAloud: 'Read Aloud',
    healthCheck: 'Health Check',
    sanitize: 'Sanitize',
    compare: 'Compare',
    redact: 'Redact',
  },
  as: {
    workspace: 'কৰ্মক্ষেত্ৰ',
    tools: 'সঁজুলিসমূহ',
    workflows: 'কাৰ্যপ্ৰণালী',
    batch: 'একত্ৰ প্ৰক্ৰিয়া',
    privacy: 'গোপনীয়তা',
    security: 'সুৰক্ষা',
    settings: 'ছেটিংছ',
    searchPlaceholder: 'সঁজুলি অনুসন্ধান কৰক (⌘K)...',
    recentJobs: 'শেহতীয়া কাম',
    localFirstBanner: 'স্থানীয়-প্ৰথম নথি কৰ্মক্ষেত্ৰ • ব্যক্তিগত আৰু মেমৰিত',
    openFile: 'নথি খোলক',
    newDocument: 'নতুন নথি',
    importFile: 'আমদানি',
    recentDocuments: 'শেহতীয়া নথিসমূহ',
    pinnedDocuments: 'পিন কৰা নথিসমূহ',
    allDocuments: 'সকলো নথি',
    favorites: 'প্ৰিয়সমূহ',
    offlineReady: 'অফলাইন প্ৰস্তুত',
    noUploads: 'নথিপত্ৰ বাহিৰলৈ আপলোড নহয়। সকলো আপোনাৰ ব্ৰাউজাৰতে থাকে।',
    clearData: 'স্থানীয় তথ্য মচক',
    studyMode: 'অধ্যয়ন মোড',
    readAloud: 'পঢ়ি শুনক',
    healthCheck: 'স্বাস্থ্য পৰীক্ষা',
    sanitize: 'পৰিশোধন',
    compare: 'তুলনা কৰক',
    redact: 'গোপন কৰক',
  },
  hi: {
    workspace: 'कार्यक्षेत्र',
    tools: 'उपकरण',
    workflows: 'कार्यप्रवाह',
    batch: 'बैच प्रक्रिया',
    privacy: 'गोपनीयता',
    security: 'सुरक्षा',
    settings: 'सेटिंग्स',
    searchPlaceholder: 'उपकरण खोजें (⌘K)...',
    recentJobs: 'हालिया कार्य',
    localFirstBanner: 'स्थानीय-प्रथम दस्तावेज़ कार्यक्षेत्र • पूर्णतः निजी',
    openFile: 'फ़ाइल खोलें',
    newDocument: 'नया दस्तावेज़',
    importFile: 'इंपोर्ट करें',
    recentDocuments: 'हालिया दस्तावेज़',
    pinnedDocuments: 'पिन किए गए दस्तावेज़',
    allDocuments: 'सभी दस्तावेज़',
    favorites: 'पसंदीदा',
    offlineReady: 'ऑफ़लाइन सक्षम',
    noUploads: 'दस्तावेज़ कभी सर्वर पर अपलोड नहीं होते।',
    clearData: 'लोकल डेटा हटाएं',
    studyMode: 'अध्ययन मोड',
    readAloud: 'बोलकर सुनें',
    healthCheck: 'हेल्थ चेक',
    sanitize: 'सैनिटाइज़',
    compare: 'तुलना करें',
    redact: 'रीडैक्ट करें',
  },
  bn: {
    workspace: 'ওয়ার্কস্পেস',
    tools: 'টুলস',
    workflows: 'ওয়ার্কফ্লো',
    batch: 'ব্যাচ প্রসেস',
    privacy: 'গোপনীয়তা',
    security: 'সুরক্ষা',
    settings: 'সেটিংস',
    searchPlaceholder: 'টুল অনুসন্ধান করুন (⌘K)...',
    recentJobs: 'সাম্প্রতিক কাজ',
    localFirstBanner: 'লোকাল-ফার্স্ট ডকুমেন্ট ওয়ার্কস্পেস • সম্পূর্ণ ব্যক্তিগত',
    openFile: 'ফাইল খুলুন',
    newDocument: 'নতুন নথি',
    importFile: 'ইমপোর্ট',
    recentDocuments: 'সাম্প্রতিক নথি',
    pinnedDocuments: 'পিন করা নথি',
    allDocuments: 'সকল নথি',
    favorites: 'প্রিয়সমূহ',
    offlineReady: 'অফলাইন প্রস্তুত',
    noUploads: 'নথি কখনোই সার্ভারে আপলোড করা হয় না।',
    clearData: 'লোকাল ডাটা মুছুন',
    studyMode: 'স্টাডি মোড',
    readAloud: 'পড়ে শুনুন',
    healthCheck: 'হেলথ চেক',
    sanitize: 'স্যানিটাইজ',
    compare: 'তুলনা করুন',
    redact: 'রিড্যাক্ট করুন',
  },
};

const LANG_KEY = 'pdfly_preferred_lang';
const LEGACY_LANG_KEY = 'pdfora_preferred_lang';

export function getPreferredLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = localStorage.getItem(LANG_KEY) || localStorage.getItem(LEGACY_LANG_KEY);
    if (stored && ['en', 'as', 'hi', 'bn'].includes(stored)) {
      return stored as SupportedLanguage;
    }
  } catch {}
  return 'en';
}

export function setPreferredLanguage(lang: SupportedLanguage): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LANG_KEY, lang);
    window.dispatchEvent(new CustomEvent('pdfly:lang_changed', { detail: lang }));
  } catch {}
}

export function useTranslation() {
  const [lang, setLang] = useState<SupportedLanguage>(() => {
    if (typeof window === 'undefined') return 'en';
    return getPreferredLanguage();
  });

  useEffect(() => {
    const handleLangChange = (e: any) => {
      if (e.detail) setLang(e.detail);
    };
    window.addEventListener('pdfly:lang_changed', handleLangChange);
    return () => {
      window.removeEventListener('pdfly:lang_changed', handleLangChange);
    };
  }, []);

  const t = (key: string, fallback?: string): string => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || fallback || key;
  };

  const changeLanguage = (newLang: SupportedLanguage) => {
    setPreferredLanguage(newLang);
    setLang(newLang);
  };

  return { lang, t, changeLanguage, supportedLanguages: SUPPORTED_LANGUAGES };
}
