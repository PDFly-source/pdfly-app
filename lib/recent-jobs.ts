'use client';

import { RecentJob } from '@/types/pdf';

const STORAGE_KEY = 'pdfly_recent_jobs';
const LEGACY_STORAGE_KEY = 'pdfora_recent_jobs';

export function getRecentJobs(): RecentJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export type { RecentJob };

export function addRecentJob(
  job: Partial<Pick<RecentJob, 'id' | 'timestamp'>> & Omit<RecentJob, 'id' | 'timestamp'>
): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getRecentJobs();
    const newEntry: RecentJob = {
      ...job,
      id: job.id || Math.random().toString(36).substring(2, 9),
      timestamp: job.timestamp || Date.now(),
    };
    // Keep at most 20 recent jobs
    const updated = [newEntry, ...existing.filter((j) => j.fileName !== job.fileName || j.toolId !== job.toolId)].slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Could not record recent job:', err);
  }
}

export function clearRecentJobs(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (err) {
    console.warn('Could not clear recent jobs:', err);
  }
}
