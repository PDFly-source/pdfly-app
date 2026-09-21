'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { PWAInstallButton } from './PWAInstallButton';
import { GlobalSearchModal } from './GlobalSearchModal';
import { BottomSheet } from './ui/BottomSheet';
import { Menu, X, History, Search, ArrowRight, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  onOpenRecent?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenRecent }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();

  // Listen for Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navLinks = [
    { name: 'Workspace', href: '/workspace' },
    { name: 'Install App', href: '/install' },
    { name: 'All Tools', href: '/#tools' },
    { name: 'Workflows', href: '/tools/workflow-builder' },
    { name: 'Security', href: '/security' },
    { name: 'Privacy', href: '/privacy' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#F6EFE3]/90 dark:bg-[#121012]/90 backdrop-blur-md border-b border-[#E8DFD3] dark:border-[#2E2629] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Logo & Navigation */}
          <div className="flex items-center gap-7">
            <Logo size="md" variant="compact" />

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                      isActive
                        ? 'text-[#7A1635] dark:text-[#C9A15A] bg-[#7A1635]/10 dark:bg-[#C9A15A]/10 font-bold'
                        : 'text-[#5C5256] dark:text-[#AFA6A8] hover:text-[#1A1416] dark:hover:text-[#F7F1E8] hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Desktop Controls */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Command Search Trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-[#E8DFD3] dark:border-[#2E2629] bg-[#FFFDF9] dark:bg-[#1B1719] text-xs text-[#5C5256] dark:text-[#AFA6A8] hover:text-[#1A1416] dark:hover:text-[#F7F1E8] hover:border-[#7A1635]/30 dark:hover:border-[#C9A15A]/40 transition-all shadow-2xs"
              title="Search tools (Ctrl+K or ⌘K)"
            >
              <Search className="w-3.5 h-3.5 text-[#7A1635] dark:text-[#C9A15A]" />
              <span className="text-xs">Search tools...</span>
              <kbd className="font-mono text-[11px] px-1.5 py-0.5 bg-[#F6EFE3] dark:bg-[#241D20] text-[#7A1635] dark:text-[#C9A15A] rounded border border-[#E8DFD3] dark:border-[#3D3035] font-semibold">
                ⌘K
              </kbd>
            </button>

            {onOpenRecent && (
              <button
                id="desktop-recent-jobs-btn"
                onClick={onOpenRecent}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#5C5256] dark:text-[#AFA6A8] hover:text-[#7A1635] dark:hover:text-[#C9A15A] hover:bg-[#7A1635]/5 dark:hover:bg-[#C9A15A]/5 transition-colors"
                title="View recent local jobs"
              >
                <History className="w-3.5 h-3.5" />
                <span>Recent</span>
              </button>
            )}

            <PWAInstallButton variant="nav" />

            <ThemeToggle />

            <Link
              href="/#tools"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] text-xs font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-xs border border-[#C9A15A]/30"
            >
              <span>Explore Tools</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#C9A15A]" />
            </Link>
          </div>

          {/* Mobile Header Right */}
          <div className="flex md:hidden items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#5C5256] dark:text-[#AFA6A8] hover:text-[#7A1635] dark:hover:text-[#C9A15A] transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            <ThemeToggle />

            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#5C5256] dark:text-[#AFA6A8] hover:text-[#1A1416] dark:hover:text-[#F7F1E8] transition-colors"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-[#7A1635] dark:text-[#C9A15A]" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

      </header>

      {/* Mobile Menu — native-style bottom sheet for one-handed reach */}
      <div className="md:hidden">
        <BottomSheet
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          label="Site menu"
          title="Menu"
        >
          <nav className="space-y-1" aria-label="Site">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-[48px] items-center px-3 rounded-xl text-sm font-semibold text-[#1A1416] dark:text-[#F7F1E8] hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.99] motion-reduce:active:scale-100 transition-transform"
              >
                {link.name}
              </Link>
            ))}
            <Link
              href="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-[48px] items-center px-3 rounded-xl text-sm font-semibold text-[#1A1416] dark:text-[#F7F1E8] hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.99] motion-reduce:active:scale-100 transition-transform"
            >
              Settings
            </Link>
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-[48px] items-center px-3 rounded-xl text-sm font-semibold text-[#1A1416] dark:text-[#F7F1E8] hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.99] motion-reduce:active:scale-100 transition-transform"
            >
              About PDFMiniFly
            </Link>
          </nav>

          <div className="mt-3 pt-3 border-t border-[#E8DFD3] dark:border-[#2E2629] flex items-center justify-between gap-3">
            <PWAInstallButton variant="nav" />
            {onOpenRecent && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenRecent();
                }}
                className="inline-flex min-h-[44px] items-center gap-1.5 px-3 rounded-xl text-xs font-semibold text-[#7A1635] dark:text-[#C9A15A]"
              >
                <History className="w-3.5 h-3.5" />
                <span>Recent Jobs</span>
              </button>
            )}
          </div>
        </BottomSheet>
      </div>

      {/* Global Command Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
