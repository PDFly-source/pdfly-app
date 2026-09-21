'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Layers, PlusCircle, FolderKanban, History } from 'lucide-react';

interface Props {
  onOpenRecent: () => void;
}

export const MobileBottomNav: React.FC<Props> = ({ onOpenRecent }) => {
  const pathname = usePathname();

  const isHome = pathname === '/';
  const isTools = pathname === '/#tools' || pathname.startsWith('/tools/');
  const isWorkspace = pathname.startsWith('/workspace');

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#F7F3EC]/95 dark:bg-[#141213]/95 backdrop-blur-lg border-t border-[#E5DFD4] dark:border-[#2E2729] safe-area-pb"
    >
      <div className="grid grid-cols-5 h-15 items-center px-1">
        {/* 1. Home */}
        <Link
          href="/"
          id="mobile-bottom-nav-home"
          className={`flex flex-col items-center justify-center py-1 gap-1 text-[11px] font-medium transition-colors ${
            isHome
              ? 'text-[#6D1F35] dark:text-[#C6A15B]'
              : 'text-[#5C554F] dark:text-[#A39991] hover:text-[#141213] dark:hover:text-[#F5F0EB]'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </Link>

        {/* 2. Tools */}
        <Link
          href="/#tools"
          id="mobile-bottom-nav-tools"
          className={`flex flex-col items-center justify-center py-1 gap-1 text-[11px] font-medium transition-colors ${
            isTools && !pathname.includes('edit-pdf')
              ? 'text-[#6D1F35] dark:text-[#C6A15B]'
              : 'text-[#5C554F] dark:text-[#A39991] hover:text-[#141213] dark:hover:text-[#F5F0EB]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Tools</span>
        </Link>

        {/* 3. Create (Center highlighted button) */}
        <Link
          href="/tools/edit-pdf"
          id="mobile-bottom-nav-create"
          className="flex flex-col items-center justify-center -mt-4 group"
        >
          <div className="w-11 h-11 rounded-full bg-[#6D1F35] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <PlusCircle className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-bold text-[#6D1F35] dark:text-[#C6A15B] mt-0.5">
            Create
          </span>
        </Link>

        {/* 4. Workspace */}
        <Link
          href="/workspace"
          id="mobile-bottom-nav-workspace"
          className={`flex flex-col items-center justify-center py-1 gap-1 text-[11px] font-medium transition-colors ${
            isWorkspace
              ? 'text-[#6D1F35] dark:text-[#C6A15B]'
              : 'text-[#5C554F] dark:text-[#A39991] hover:text-[#141213] dark:hover:text-[#F5F0EB]'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          <span>Workspace</span>
        </Link>

        {/* 5. Recent */}
        <button
          id="mobile-bottom-nav-recent"
          onClick={onOpenRecent}
          className="flex flex-col items-center justify-center py-1 gap-1 text-[11px] font-medium text-[#5C554F] dark:text-[#A39991] hover:text-[#141213] dark:hover:text-[#F5F0EB] transition-colors"
        >
          <History className="w-4 h-4" />
          <span>Recent</span>
        </button>
      </div>
    </nav>
  );
};
