'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRecentJobs, clearRecentJobs } from '@/lib/recent-jobs';
import { RecentJob } from '@/types/pdf';
import { formatBytes } from '@/lib/pdf-engine';
import { X, History, Trash2, Clock, ShieldCheck, ArrowRight, FileText } from 'lucide-react';

interface RecentJobsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RecentJobsModal: React.FC<RecentJobsModalProps> = ({ isOpen, onClose }) => {
  const [jobs, setJobs] = useState<RecentJob[]>([]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setJobs(getRecentJobs());
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClear = () => {
    clearRecentJobs();
    setJobs([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        id="recent-jobs-modal"
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#383033] p-6 shadow-2xl flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5DFD4] dark:border-[#2E2729]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#6D1F35]/10 dark:bg-[#C6A15B]/15 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#141213] dark:text-[#F5F0EB]">
                Recent Local Activity
              </h3>
              <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
                Stored only in your browser session
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#5C554F] hover:text-[#141213] dark:text-[#A39991] dark:hover:text-[#F5F0EB]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Privacy Note */}
        <div className="my-3 px-3 py-2 rounded-xl bg-[#F7F3EC] dark:bg-[#141213] border border-[#E5DFD4] dark:border-[#2E2729] flex items-center gap-2 text-[11px] text-[#5C554F] dark:text-[#A39991]">
          <ShieldCheck className="w-4 h-4 text-[#238B63] dark:text-[#2EB682] shrink-0" />
          <span>PDFly never stores document contents. Only local filenames and timestamps are kept.</span>
        </div>

        {/* Jobs List */}
        <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
          {jobs.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#5C554F] dark:text-[#A39991]">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No recent local tasks yet.</p>
              <p className="text-[11px] mt-1">Processed documents will show here.</p>
            </div>
          ) : (
            jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#181516] border border-[#E5DFD4]/70 dark:border-[#2E2729] text-xs"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-7 h-7 rounded-lg bg-white dark:bg-[#1E1A1B] text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center shrink-0 border border-[#E5DFD4] dark:border-[#2E2729]">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <p className="font-medium text-[#141213] dark:text-[#F5F0EB] truncate">
                      {job.fileName}
                    </p>
                    <p className="text-[10px] text-[#5C554F] dark:text-[#A39991]">
                      {job.toolName} • {formatBytes(job.fileSize)} • {new Date(job.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/tools/${job.toolId}`}
                  onClick={onClose}
                  className="shrink-0 p-1.5 text-[#6D1F35] dark:text-[#C6A15B] hover:underline flex items-center gap-1 text-[11px] font-medium"
                >
                  <span>Re-open</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {jobs.length > 0 && (
          <div className="pt-3 border-t border-[#E5DFD4] dark:border-[#2E2729] flex items-center justify-between">
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 text-xs text-[#C94A4A] hover:underline"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#6D1F35] text-white text-xs font-medium hover:bg-[#58182a]"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
