'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { getRecentJobs, RecentJob } from '@/lib/recent-jobs';

interface RecentActivitySectionProps {
  onOpenRecent: () => void;
}

export const RecentActivitySection: React.FC<RecentActivitySectionProps> = ({ onOpenRecent }) => {
  const [mounted, setMounted] = useState(false);
  const [jobs, setJobs] = useState<RecentJob[]>([]);

  useEffect(() => {
    // Defer loading so server HTML and initial client hydration match perfectly
    const timer = setTimeout(() => {
      setMounted(true);
      setJobs(getRecentJobs().slice(0, 3));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted || jobs.length === 0) {
    return null;
  }

  return (
    <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-[#E5DFD4] dark:border-[#2E2729]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#141213] dark:text-[#F5F0EB]">
          <Clock className="w-4 h-4 text-[#6D1F35] dark:text-[#C6A15B]" />
          <span>Recent Local Activity (Device Only)</span>
        </div>
        <button
          onClick={onOpenRecent}
          className="text-xs text-[#6D1F35] dark:text-[#C6A15B] hover:underline cursor-pointer"
        >
          View all recent jobs
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="p-3.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs space-y-1 shadow-xs"
          >
            <p className="font-semibold text-[#141213] dark:text-[#F5F0EB] truncate">
              {job.fileName}
            </p>
            <div className="flex items-center justify-between text-[11px] text-[#5C554F] dark:text-[#A39991]">
              <span>{job.toolName}</span>
              <span>
                {new Date(job.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
