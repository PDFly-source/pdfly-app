'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from './Logo';
import { ShieldCheck, Lock, Cpu, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#F6EFE3] dark:bg-[#121012] border-t border-[#E8DFD3] dark:border-[#2E2629] pt-14 pb-20 md:pb-12 text-[#5C5256] dark:text-[#AFA6A8] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand Info */}
          <div className="space-y-4">
            <Logo size="md" variant="compact" showTagline={true} />
            <p className="text-xs leading-relaxed max-w-sm text-[#5C5256] dark:text-[#AFA6A8]">
              PDFMiniFly is a private, local-first PDF workspace that processes your documents directly in your browser. Read, edit, convert, and protect documents securely without unnecessary cloud uploads.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-[#35C98A] font-semibold pt-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Local-First Browser Architecture</span>
            </div>
          </div>

          {/* Core Tools Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1416] dark:text-[#F7F1E8] mb-3.5">
              Popular Tools
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/tools/merge-pdf" className="hover:text-[#7A1635] dark:hover:text-[#C9A15A] transition-colors">
                  Merge PDF
                </Link>
              </li>
              <li>
                <Link href="/tools/split-pdf" className="hover:text-[#7A1635] dark:hover:text-[#C9A15A] transition-colors">
                  Split PDF
                </Link>
              </li>
              <li>
                <Link href="/tools/compress-pdf" className="hover:text-[#7A1635] dark:hover:text-[#C9A15A] transition-colors">
                  Compress PDF
                </Link>
              </li>
              <li>
                <Link href="/tools/edit-pdf" className="hover:text-[#7A1635] dark:hover:text-[#C9A15A] transition-colors">
                  Edit & Annotate PDF
                </Link>
              </li>
              <li>
                <Link href="/tools/sign-pdf" className="hover:text-[#7A1635] dark:hover:text-[#C9A15A] transition-colors">
                  Fill & Sign PDF
                </Link>
              </li>
              <li>
                <Link href="/tools/organize-pdf" className="hover:text-[#7A1635] dark:hover:text-[#C9A15A] transition-colors">
                  Organize & Rotate Pages
                </Link>
              </li>
              <li>
                <Link href="/tools/ocr-pdf" className="hover:text-[#7A1635] dark:hover:text-[#C9A15A] transition-colors">
                  OCR Text Recognition
                </Link>
              </li>
            </ul>
          </div>

          {/* Privacy & Principles */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1416] dark:text-[#F7F1E8] mb-3.5">
              Privacy & Security
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/privacy" className="hover:text-[#7A1635] dark:hover:text-[#C9A15A] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/security" className="hover:text-[#7A1635] dark:hover:text-[#C9A15A] transition-colors">
                  Security Architecture
                </Link>
              </li>
              <li>
                <Link href="/about#technology" className="hover:text-[#7A1635] dark:hover:text-[#C9A15A] transition-colors">
                  Open Source Foundations
                </Link>
              </li>
              <li>
                <Link href="/tools/workflow-builder" className="hover:text-[#7A1635] dark:hover:text-[#C9A15A] transition-colors">
                  Automated Workflows
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Support */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A1416] dark:text-[#F7F1E8] mb-3.5">
              About & Help
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/about" className="hover:text-[#7A1635] dark:hover:text-[#C9A15A] transition-colors">
                  About PDFMiniFly
                </Link>
              </li>
              <li>
                <Link href="/install" className="hover:text-[#7A1635] dark:hover:text-[#C9A15A] transition-colors font-semibold text-[#7A1635] dark:text-[#C9A15A]">
                  Install App (PWA)
                </Link>
              </li>
              <li>
                <Link href="/about#faq" className="hover:text-[#7A1635] dark:hover:text-[#C9A15A] transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link href="/workspace" className="hover:text-[#7A1635] dark:hover:text-[#C9A15A] transition-colors">
                  Document Workspace
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-[#7A1635] dark:hover:text-[#C9A15A] transition-colors">
                  Preferences & Cache
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Creator Credit */}
        <div className="pt-8 border-t border-[#E8DFD3] dark:border-[#2E2629] flex flex-col items-center text-center gap-2.5">
          <div className="flex items-center font-sans">
            <span
              className="text-lg font-black text-[#7A1635] dark:text-[#C15B72] tracking-tight"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              PDF
            </span>
            <span
              className="text-lg font-black text-[#1A1416] dark:text-[#F7F1E8] tracking-tight"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              MiniFly
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#35C98A]"></span>
            <span className="font-extrabold tracking-[0.18em] uppercase text-[11px] text-[#4A0D20] dark:text-[#C9A15A]">
              Private • Powerful • Local
            </span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <span aria-hidden="true" className="h-px w-6 sm:w-8 rounded-full bg-[#C9A15A]/50 dark:bg-[#C9A15A]/40" />
            <p className="text-xs font-light tracking-[0.08em] text-[#5C5256] dark:text-[#AFA6A8]">
              Crafted &amp; Developed by{' '}
              <span className="ml-0.5 font-black text-sm tracking-wide text-[#1A1416] dark:text-[#F7F1E8]">
                PKD
              </span>
            </p>
            <span aria-hidden="true" className="h-px w-6 sm:w-8 rounded-full bg-[#C9A15A]/50 dark:bg-[#C9A15A]/40" />
          </div>
          <p className="text-[11px] text-[#5C5256] dark:text-[#AFA6A8]">
            &copy; 2026 PDFMiniFly. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
