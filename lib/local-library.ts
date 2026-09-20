'use client';

import { DocumentLibraryItem, LibraryCategory } from '@/types/pdf';

const STORAGE_KEY = 'pdfly_local_library';
const LEGACY_STORAGE_KEY = 'pdfora_local_library';

const INITIAL_DOCUMENTS: DocumentLibraryItem[] = [
  {
    id: 'doc-seed-1',
    name: 'Assam Year Book 2025.pdf',
    size: 4280000,
    type: 'pdf',
    pageCount: 38,
    addedAt: Date.now() - 3600000 * 24 * 2,
    lastOpenedAt: Date.now() - 3600000 * 4,
    pinned: true,
    favorite: true,
    tags: ['Study', 'General Knowledge', 'Reference'],
    note: 'Important chapters on history, geography, and constitutional updates.',
  },
  {
    id: 'doc-seed-2',
    name: 'Professional Resume_2025.pdf',
    size: 345000,
    type: 'pdf',
    pageCount: 2,
    addedAt: Date.now() - 3600000 * 24 * 5,
    lastOpenedAt: Date.now() - 3600000 * 24 * 1,
    pinned: true,
    favorite: true,
    tags: ['Career', 'Resume'],
    note: 'Updated with latest projects, certifications, and achievements.',
  },
  {
    id: 'doc-seed-3',
    name: 'Research Notes - Natural Language Processing.pdf',
    size: 1890000,
    type: 'pdf',
    pageCount: 16,
    addedAt: Date.now() - 3600000 * 24 * 7,
    lastOpenedAt: Date.now() - 3600000 * 12,
    pinned: false,
    favorite: false,
    tags: ['Research', 'AI'],
    note: 'Study notes on attention mechanisms and transformer architecture.',
  },
  {
    id: 'doc-seed-4',
    name: 'Apartment Lease Agreement_Signed.pdf',
    size: 890000,
    type: 'pdf',
    pageCount: 6,
    addedAt: Date.now() - 3600000 * 24 * 14,
    lastOpenedAt: Date.now() - 3600000 * 48,
    pinned: false,
    favorite: true,
    tags: ['Legal', 'Personal'],
    note: 'Signed copy with deposit details and inventory annexure.',
  },
];

export function getLibraryDocuments(): DocumentLibraryItem[] {
  if (typeof window === 'undefined') return INITIAL_DOCUMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DOCUMENTS));
      return INITIAL_DOCUMENTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse local library documents:', e);
    return INITIAL_DOCUMENTS;
  }
}

export function saveLibraryDocuments(docs: DocumentLibraryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch (e) {
    console.warn('Failed to save local library documents:', e);
  }
}

export function addLibraryDocument(
  doc: Partial<DocumentLibraryItem> & Pick<DocumentLibraryItem, 'name' | 'size' | 'type'>
): DocumentLibraryItem {
  const current = getLibraryDocuments();
  const newItem: DocumentLibraryItem = {
    pinned: false,
    favorite: false,
    ...doc,
    tags: doc.tags || [],
    id: doc.id || 'doc-' + Math.random().toString(36).substring(2, 9),
    addedAt: doc.addedAt || Date.now(),
    lastOpenedAt: doc.lastOpenedAt || Date.now(),
  };

  // Avoid duplicates by name
  const filtered = current.filter((d) => d.name.toLowerCase() !== newItem.name.toLowerCase());
  const updated = [newItem, ...filtered];
  saveLibraryDocuments(updated);
  return newItem;
}

export function togglePinDocument(id: string): DocumentLibraryItem[] {
  const current = getLibraryDocuments();
  const updated = current.map((d) => (d.id === id ? { ...d, pinned: !d.pinned } : d));
  saveLibraryDocuments(updated);
  return updated;
}

export function toggleFavoriteDocument(id: string): DocumentLibraryItem[] {
  const current = getLibraryDocuments();
  const updated = current.map((d) => (d.id === id ? { ...d, favorite: !d.favorite } : d));
  saveLibraryDocuments(updated);
  return updated;
}

export function renameLibraryDocument(id: string, newName: string): DocumentLibraryItem[] {
  const current = getLibraryDocuments();
  const updated = current.map((d) => (d.id === id ? { ...d, name: newName } : d));
  saveLibraryDocuments(updated);
  return updated;
}

export function deleteLibraryDocument(id: string): DocumentLibraryItem[] {
  const current = getLibraryDocuments();
  const updated = current.filter((d) => d.id !== id);
  saveLibraryDocuments(updated);
  return updated;
}

export function updateDocumentLastOpened(name: string): void {
  const current = getLibraryDocuments();
  const match = current.find((d) => d.name.toLowerCase() === name.toLowerCase());
  if (match) {
    const updated = current.map((d) => (d.id === match.id ? { ...d, lastOpenedAt: Date.now() } : d));
    saveLibraryDocuments(updated);
  }
}

export function clearLibraryDocuments(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear library documents:', e);
  }
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Aliases for workspace and settings pages
export const getLocalLibrary = getLibraryDocuments;
export const saveLocalLibrary = saveLibraryDocuments;
export const addDocumentToLibrary = addLibraryDocument;
export const removeDocumentFromLibrary = deleteLibraryDocument;
export const clearLocalLibrary = clearLibraryDocuments;
