'use client';

import { DocumentBookmark, DocumentNote } from '@/types/pdf';

const BOOKMARKS_KEY = 'pdfly_local_bookmarks';
const LEGACY_BOOKMARKS_KEY = 'pdfora_local_bookmarks';

const NOTES_KEY = 'pdfly_local_notes';
const LEGACY_NOTES_KEY = 'pdfora_local_notes';

export function getDocumentBookmarks(docName?: string): DocumentBookmark[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY) || localStorage.getItem(LEGACY_BOOKMARKS_KEY);
    if (!raw) return [];
    const all: DocumentBookmark[] = JSON.parse(raw);
    if (!docName) return all;
    return all.filter((b) => b.docName.toLowerCase() === docName.toLowerCase());
  } catch {
    return [];
  }
}

export function addDocumentBookmark(
  bookmark: Omit<DocumentBookmark, 'id' | 'createdAt'>
): DocumentBookmark {
  const all = getDocumentBookmarks();
  const newItem: DocumentBookmark = {
    ...bookmark,
    id: 'bm-' + Math.random().toString(36).substring(2, 9),
    createdAt: Date.now(),
  };
  const updated = [newItem, ...all];
  if (typeof window !== 'undefined') {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  }
  return newItem;
}

export function deleteDocumentBookmark(id: string): void {
  const all = getDocumentBookmarks();
  const updated = all.filter((b) => b.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  }
}

export function getDocumentNotes(docName?: string): DocumentNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTES_KEY) || localStorage.getItem(LEGACY_NOTES_KEY);
    if (!raw) return [];
    const all: DocumentNote[] = JSON.parse(raw);
    if (!docName) return all;
    return all.filter((n) => n.docName.toLowerCase() === docName.toLowerCase());
  } catch {
    return [];
  }
}

export function addOrUpdateDocumentNote(
  docName: string,
  pageNumber: number,
  content: string
): DocumentNote {
  const all = getDocumentNotes();
  const existingIdx = all.findIndex(
    (n) => n.docName.toLowerCase() === docName.toLowerCase() && n.pageNumber === pageNumber
  );

  let resultNote: DocumentNote;

  if (existingIdx >= 0) {
    resultNote = {
      ...all[existingIdx],
      content,
      updatedAt: Date.now(),
    };
    all[existingIdx] = resultNote;
  } else {
    resultNote = {
      id: 'note-' + Math.random().toString(36).substring(2, 9),
      docName,
      pageNumber,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    all.unshift(resultNote);
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(NOTES_KEY, JSON.stringify(all));
  }
  return resultNote;
}

export function deleteDocumentNote(id: string): void {
  const all = getDocumentNotes();
  const updated = all.filter((n) => n.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(NOTES_KEY, JSON.stringify(updated));
  }
}

export function clearAllNotesAndBookmarks(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(BOOKMARKS_KEY);
  localStorage.removeItem(LEGACY_BOOKMARKS_KEY);
  localStorage.removeItem(NOTES_KEY);
  localStorage.removeItem(LEGACY_NOTES_KEY);
}

export const clearAllAnnotations = clearAllNotesAndBookmarks;
