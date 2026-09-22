'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ALL_TOOLS, TOOL_CATEGORIES, toolMatchesCategory } from '@/lib/tools-data';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { RecentJobsModal } from '@/components/RecentJobsModal';
import { RecentActivitySection } from '@/components/RecentActivitySection';
import { ToolCard } from '@/components/ToolCard';
import { PWAInstallButton } from '@/components/PWAInstallButton';
import {
  ShieldCheck,
  Zap,
  HardDrive,
  Wifi,
  Search,
  ArrowRight,
  UploadCloud,
  Layers,
  Scissors,
  Minimize2,
  Grid,
  PenTool,
  Image as ImageIcon,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  ChevronRight,
  FileCheck,
  Cpu,
  Lock,
  Workflow,
  ScanText,
  FileSearch,
  BookOpen,
  FileText,
  Shield,
  Download,
  Flame,
  LayoutGrid,
} from 'lucide-react';
import { formatBytes } from '@/lib/pdf-engine';

export default function HomePage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentOpen, setRecentOpen] = useState(false);

  // Quick Drop state
  const [quickDroppedFile, setQuickDroppedFile] = useState<File | null>(null);
  const [isQuickDragOver, setIsQuickDragOver] = useState(false);

  // Popular tools (top 8)
  const popularTools = useMemo(() => {
    const popularSlugs = [
      'merge-pdf',
      'split-pdf',
      'compress-pdf',
      'organize-pdf',
      'edit-pdf',
      'sign-pdf',
      'ocr-pdf',
      'workflow-builder',
    ];
    return popularSlugs
      .map((slug) => ALL_TOOLS.find((t) => t.slug === slug))
      .filter(Boolean) as typeof ALL_TOOLS;
  }, []);

  // Filter tools
  const filteredTools = useMemo(() => {
    return ALL_TOOLS.filter((tool) => {
      const matchesCat = toolMatchesCategory(tool, selectedCategory);
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        (tool.keywords || []).some((kw) => kw.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleQuickDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsQuickDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setQuickDroppedFile(files[0]);
    }
  };

  const handleQuickFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setQuickDroppedFile(files[0]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6EFE3] dark:bg-[#121012] text-[#1A1416] dark:text-[#F7F1E8] transition-colors">
      <Navbar onOpenRecent={() => setRecentOpen(true)} />

      <main id="main-content" tabIndex={-1} className="flex-1">
        {/* ======================================================== */}
        {/* HERO SECTION WITH 3D LAYERED VISUAL (REF: file_00000000d1208207a0e6a218a6e3b9b6.png) */}
        {/* ======================================================== */}
        <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-24 border-b border-[#E8DFD3] dark:border-[#2E2629]">
          {/* Subtle Ambient Background Gradients */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none -z-10 opacity-35 dark:opacity-20 bg-radial from-[#7A1635]/25 via-transparent to-transparent blur-3xl" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Headlines, Value Prop, Actions */}
              <div className="lg:col-span-7 text-center lg:text-left">
                {/* Privacy Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#7A1635]/10 dark:bg-[#C9A15A]/15 text-[#7A1635] dark:text-[#C9A15A] text-xs font-bold uppercase tracking-wider mb-5 border border-[#7A1635]/20 dark:border-[#C9A15A]/30 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#35C98A] animate-pulse"></span>
                  <span>PRIVATE • POWERFUL • LOCAL</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#1A1416] dark:text-[#F7F1E8] leading-[1.08] mb-5">
                  Private PDF Tools.{' '}
                  <span className="block mt-1 bg-gradient-to-r from-[#7A1635] via-[#941C42] to-[#C9A15A] bg-clip-text text-transparent">
                    Powerful. Fast. Local.
                  </span>
                </h1>

                <p className="text-sm sm:text-base lg:text-lg text-[#5C5256] dark:text-[#AFA6A8] max-w-xl mx-auto lg:mx-0 leading-relaxed mb-8 font-normal">
                  A complete PDF workspace designed to edit, convert, organize, and protect documents directly inside your browser. No cloud uploads. No account required.
                </p>

                {/* Primary Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 mb-8">
                  <Link
                    href="/workspace"
                    id="hero-open-workspace-btn"
                    className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] text-sm font-bold inline-flex items-center justify-center gap-2 shadow-sm hover:brightness-110 active:scale-[0.98] transition-all border border-[#C9A15A]/40"
                  >
                    <span>Open Workspace</span>
                    <ArrowRight className="w-4 h-4 text-[#C9A15A]" />
                  </Link>

                  <a
                    href="#tools"
                    id="hero-explore-tools-btn"
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] text-[#1A1416] dark:text-[#F7F1E8] text-sm font-bold inline-flex items-center justify-center gap-2 hover:border-[#7A1635]/40 dark:hover:border-[#C9A15A]/40 shadow-2xs transition-all active:scale-[0.98]"
                  >
                    <span>Explore All Tools</span>
                    <ChevronRight className="w-4 h-4 text-[#7A1635] dark:text-[#C9A15A]" />
                  </a>

                  <div className="w-full sm:w-auto">
                    <PWAInstallButton variant="hero" />
                  </div>
                </div>

                {/* Trust Indicators Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-[#E8DFD3] dark:border-[#2E2629] max-w-xl mx-auto lg:mx-0">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#1A1416] dark:text-[#F7F1E8]">
                    <CheckCircle2 className="w-4 h-4 text-[#35C98A] shrink-0" />
                    <span>100% Local</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#1A1416] dark:text-[#F7F1E8]">
                    <CheckCircle2 className="w-4 h-4 text-[#35C98A] shrink-0" />
                    <span>Zero Cloud Storage</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#1A1416] dark:text-[#F7F1E8]">
                    <CheckCircle2 className="w-4 h-4 text-[#35C98A] shrink-0" />
                    <span>Offline PWA</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#1A1416] dark:text-[#F7F1E8]">
                    <CheckCircle2 className="w-4 h-4 text-[#35C98A] shrink-0" />
                    <span>No Sign-Up</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Master Hero Visual Matching Reference Asset */}
              <div className="lg:col-span-5 flex justify-center items-center">
                <div className="relative w-full max-w-sm sm:max-w-md aspect-square flex items-center justify-center select-none">
                  {/* Glowing Golden Ring Orbit */}
                  <div className="absolute inset-4 rounded-full border-2 border-dashed border-[#C9A15A]/30 dark:border-[#C9A15A]/40 animate-[spin_60s_linear_infinite]" />
                  <div className="absolute inset-10 rounded-full bg-radial from-[#7A1635]/25 via-transparent to-transparent blur-2xl" />

                  {/* Back Stacked Tilted Card */}
                  <div className="absolute w-56 h-72 rounded-3xl bg-[#4A0D20] dark:bg-[#1B1719] border border-[#7A1635]/40 shadow-xl transform -rotate-12 -translate-x-6 opacity-70" />

                  {/* Mid Stacked Tilted Card */}
                  <div className="absolute w-60 h-76 rounded-3xl bg-[#7A1635]/80 dark:bg-[#241D20] border border-[#C9A15A]/30 shadow-2xl transform rotate-6 translate-x-4 opacity-90" />

                  {/* Front Master Document Stage */}
                  <div className="relative z-10 w-64 h-80 rounded-3xl bg-gradient-to-b from-[#FFFDF9] via-[#F6EFE3] to-[#EDE3D3] dark:from-[#1E181B] dark:via-[#161214] dark:to-[#100D0E] border-2 border-[#7A1635]/30 dark:border-[#C9A15A]/40 shadow-2xl p-6 flex flex-col justify-between overflow-hidden">
                    {/* Corner Origami Fold */}
                    <div className="absolute top-0 right-0 w-12 h-12 overflow-hidden">
                      <div className="absolute top-0 right-0 w-12 h-12 bg-[#C9A15A] transform rotate-45 translate-x-6 -translate-y-6 shadow-xs" />
                    </div>

                    {/* Top Sheet Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#7A1635] text-[#F7F1E8] flex items-center justify-center font-black text-xs shadow-xs">
                          PDF
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-[#1A1416] dark:text-[#F7F1E8]">PDFMiniFly Sheet</span>
                          <span className="text-[11px] text-[#35C98A] font-bold">In-Memory Engine</span>
                        </div>
                      </div>
                    </div>

                    {/* Document Center Mockup with Embossed Gold Lines */}
                    <div className="space-y-3 py-4">
                      <div className="w-3/4 h-3 rounded-full bg-[#7A1635]/20 dark:bg-[#C9A15A]/30" />
                      <div className="w-full h-2 rounded-full bg-[#7A1635]/10 dark:bg-[#C9A15A]/20" />
                      <div className="w-5/6 h-2 rounded-full bg-[#7A1635]/10 dark:bg-[#C9A15A]/20" />
                      <div className="w-2/3 h-2 rounded-full bg-[#7A1635]/10 dark:bg-[#C9A15A]/20" />
                    </div>

                    {/* Bottom Status Ribbon */}
                    <div className="pt-3 border-t border-[#E8DFD3] dark:border-[#2E2629] flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#7A1635] dark:text-[#C9A15A]">
                        PRIVATE • LOCAL
                      </span>
                      <ShieldCheck className="w-4 h-4 text-[#35C98A]" />
                    </div>
                  </div>

                  {/* Floating Micro Status Pill Badges (as in reference image) */}
                  {/* Top Right: Secure */}
                  <div className="absolute -top-1 -right-2 z-20 px-3 py-1.5 rounded-xl bg-[#4A0D20]/95 text-[#F7F1E8] border border-[#C9A15A]/60 shadow-lg text-xs font-bold flex items-center gap-1.5 backdrop-blur-md">
                    <Lock className="w-3.5 h-3.5 text-[#C9A15A]" />
                    <span>Secure</span>
                  </div>

                  {/* Center Left: Fast */}
                  <div className="absolute top-1/2 -left-4 -translate-y-1/2 z-20 px-3 py-1.5 rounded-xl bg-[#7A1635]/95 text-[#F7F1E8] border border-[#C9A15A]/60 shadow-lg text-xs font-bold flex items-center gap-1.5 backdrop-blur-md">
                    <Zap className="w-3.5 h-3.5 text-[#C9A15A]" />
                    <span>Fast</span>
                  </div>

                  {/* Bottom Right: Offline */}
                  <div className="absolute -bottom-2 right-4 z-20 px-3 py-1.5 rounded-xl bg-[#241D20]/95 text-[#F7F1E8] border border-[#35C98A]/60 shadow-lg text-xs font-bold flex items-center gap-1.5 backdrop-blur-md">
                    <Wifi className="w-3.5 h-3.5 text-[#35C98A]" />
                    <span>Offline</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* QUICK ACTION BAR (Merge, Compress, Convert, Edit, OCR) */}
        {/* ======================================================== */}
        <section className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-5">
            <span className="text-[11px] font-extrabold tracking-widest text-[#7A1635] dark:text-[#C9A15A] uppercase">
              Quick Launch
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              {
                title: 'Merge PDF',
                desc: 'Combine files into one',
                slug: 'merge-pdf',
                icon: Layers,
              },
              {
                title: 'Compress PDF',
                desc: 'Reduce file size',
                slug: 'compress-pdf',
                icon: Minimize2,
              },
              {
                title: 'PDF to JPG',
                desc: 'Extract clean pages',
                slug: 'pdf-to-image',
                icon: ImageIcon,
              },
              {
                title: 'Edit PDF',
                desc: 'Add text & annotate',
                slug: 'edit-pdf',
                icon: PenTool,
              },
              {
                title: 'OCR PDF',
                desc: 'Extract text locally',
                slug: 'ocr-pdf',
                icon: ScanText,
              },
            ].map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="group flex flex-col items-center text-center p-4 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] hover:border-[#7A1635]/50 dark:hover:border-[#C9A15A]/60 shadow-2xs hover:shadow-sm hover:-translate-y-0.5 transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#F6EFE3] dark:bg-[#241D20] text-[#7A1635] dark:text-[#C9A15A] flex items-center justify-center mb-2.5 group-hover:scale-105 group-hover:bg-[#7A1635]/10 dark:group-hover:bg-[#C9A15A]/15 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-[#1A1416] dark:text-[#F7F1E8] group-hover:text-[#7A1635] dark:group-hover:text-[#C9A15A] transition-colors">
                    {tool.title}
                  </span>
                  <span className="text-[10.5px] text-[#5C5256] dark:text-[#AFA6A8] mt-0.5 line-clamp-1">
                    {tool.desc}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Quick Drop Zone */}
          <div className="max-w-2xl mx-auto mt-6">
            {!quickDroppedFile ? (
              <div
                data-tool-dropzone="true"
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsQuickDragOver(true);
                }}
                onDragLeave={() => setIsQuickDragOver(false)}
                onDrop={handleQuickDrop}
                onClick={() => document.getElementById('quick-file-input')?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                  isQuickDragOver
                    ? 'border-[#7A1635] bg-[#7A1635]/5 dark:border-[#C9A15A] dark:bg-[#C9A15A]/10 scale-[1.01]'
                    : 'border-[#E8DFD3] dark:border-[#3D3035] bg-[#FFFDF9]/60 dark:bg-[#1B1719]/60 hover:border-[#7A1635]/60 hover:bg-[#FFFDF9] dark:hover:bg-[#1B1719]'
                }`}
              >
                <input
                  id="quick-file-input"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleQuickFileInput}
                  className="hidden"
                />
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-[#F6EFE3] dark:bg-[#241D20] text-[#7A1635] dark:text-[#C9A15A] flex items-center justify-center mb-2">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-[#1A1416] dark:text-[#F7F1E8]">
                    Drop any PDF to instantly suggest tools
                  </p>
                  <p className="text-[11px] text-[#5C5256] dark:text-[#AFA6A8] mt-0.5">
                    Your file stays on your hardware and is never transmitted across the network.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#7A1635]/40 dark:border-[#C9A15A]/50 shadow-md text-left">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E8DFD3] dark:border-[#2E2629]">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <FileCheck className="w-5 h-5 text-[#35C98A] shrink-0" />
                    <div className="truncate">
                      <p className="text-xs font-bold text-[#1A1416] dark:text-[#F7F1E8] truncate">
                        {quickDroppedFile.name}
                      </p>
                      <p className="text-[11px] text-[#5C5256] dark:text-[#AFA6A8]">
                        {formatBytes(quickDroppedFile.size)} • Ready for local operations
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setQuickDroppedFile(null)}
                    className="text-xs text-[#E36B6B] hover:underline font-semibold"
                  >
                    Clear
                  </button>
                </div>

                <p className="text-xs font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-2">
                  Select an action for this document:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { name: 'Organize', slug: 'organize-pdf', icon: Grid },
                    { name: 'Compress', slug: 'compress-pdf', icon: Minimize2 },
                    { name: 'Sign', slug: 'sign-pdf', icon: PenTool },
                    { name: 'Redact', slug: 'redact-pdf', icon: Lock },
                    { name: 'Extract OCR', slug: 'ocr-pdf', icon: ScanText },
                    { name: 'Compare', slug: 'compare-pdf', icon: FileSearch },
                    { name: 'Ask PDF', slug: 'pdf-assistant', icon: Sparkles },
                    { name: 'Study Notes', slug: 'pdf-to-study', icon: BookOpen },
                  ].map((act) => {
                    const Icon = act.icon;
                    return (
                      <Link
                        key={act.slug}
                        href={`/tools/${act.slug}`}
                        className="flex items-center gap-2 p-2.5 rounded-xl border border-[#E8DFD3] dark:border-[#2E2629] hover:border-[#7A1635] dark:hover:border-[#C9A15A] hover:bg-[#7A1635]/5 text-xs font-semibold text-[#1A1416] dark:text-[#F7F1E8] transition-all"
                      >
                        <Icon className="w-3.5 h-3.5 text-[#7A1635] dark:text-[#C9A15A]" />
                        <span>{act.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ======================================================== */}
        {/* POPULAR TOOLS SHOWCASE (TOP 8) */}
        {/* ======================================================== */}
        <section className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-[#E8DFD3] dark:border-[#2E2629]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#7A1635] dark:text-[#C9A15A] mb-1">
                <Flame className="w-3.5 h-3.5" />
                <span>Frequently Used</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#1A1416] dark:text-[#F7F1E8]">
                Popular PDF Tools
              </h2>
            </div>
            <a
              href="#tools"
              className="text-xs font-bold text-[#7A1635] dark:text-[#C9A15A] hover:underline inline-flex items-center gap-1"
            >
              <span>View all {ALL_TOOLS.length} tools</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularTools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </section>

        {/* ======================================================== */}
        {/* WORKFLOW BUILDER SHOWCASE BANNER */}
        {/* ======================================================== */}
        <section className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-7 sm:p-9 rounded-3xl bg-gradient-to-r from-[#7A1635]/15 via-[#FFFDF9] to-[#C9A15A]/15 dark:from-[#4A0D20]/40 dark:via-[#1B1719] dark:to-[#C9A15A]/15 border border-[#7A1635]/30 dark:border-[#C9A15A]/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7A1635]/15 text-[#7A1635] dark:text-[#C9A15A] text-[11px] font-bold uppercase">
                <Workflow className="w-3.5 h-3.5" />
                <span>Multi-Step Pipelines</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-[#1A1416] dark:text-[#F7F1E8]">
                Automate Repetitive PDF Workflows
              </h3>
              <p className="text-xs sm:text-sm text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed font-normal">
                Chain multiple PDF operations together (e.g. Merge → Compress → Watermark → Encrypt) and execute them sequentially in a single automated pass.
              </p>
            </div>

            <Link
              href="/tools/workflow-builder"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] text-xs sm:text-sm font-bold inline-flex items-center gap-2 shrink-0 shadow-xs hover:brightness-110 active:scale-[0.98] transition-all border border-[#C9A15A]/30"
            >
              <span>Build a Workflow</span>
              <ArrowRight className="w-4 h-4 text-[#C9A15A]" />
            </Link>
          </div>
        </section>

        {/* ======================================================== */}
        {/* ALL TOOLS DIRECTORY (SEARCH, CATEGORIES, TOOLS COUNT) */}
        {/* ======================================================== */}
        <section id="tools" className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-[#E8DFD3] dark:border-[#2E2629]">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#7A1635] dark:text-[#C9A15A] mb-1">
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Official Registry</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A1416] dark:text-[#F7F1E8]">
                All PDFMiniFly Tools{' '}
                <span className="text-sm font-bold text-[#7A1635] dark:text-[#C9A15A] ml-2 px-2.5 py-0.5 rounded-full bg-[#7A1635]/10 dark:bg-[#C9A15A]/15 border border-[#7A1635]/20 dark:border-[#C9A15A]/30">
                  {ALL_TOOLS.length} Tools
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-[#5C5256] dark:text-[#AFA6A8] mt-1">
                Select any utility below to launch its dedicated in-browser workstation.
              </p>
            </div>

            {/* Instant Search input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#7A1635] dark:text-[#C9A15A]" />
              <input
                id="tool-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools (merge, split, sign, ocr)..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#7A1635] dark:focus:ring-[#C9A15A] shadow-2xs"
              />
            </div>
          </div>

          {/* Category Filter Pills (Organize, Compress, Edit, Convert, Security, OCR, Extract, AI, Productivity) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-8 scrollbar-none">
            {TOOL_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    active
                      ? 'bg-[#7A1635] text-[#F7F1E8] shadow-xs'
                      : 'bg-[#FFFDF9] dark:bg-[#1B1719] text-[#5C5256] dark:text-[#AFA6A8] border border-[#E8DFD3] dark:border-[#2E2629] hover:border-[#7A1635]/40 hover:text-[#1A1416] dark:hover:text-[#F7F1E8]'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Tool Cards Grid */}
          {filteredTools.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629]">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-30 text-[#7A1635] dark:text-[#C9A15A]" />
              <p className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8]">
                No tools found for &quot;{searchQuery}&quot;
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-3 text-xs text-[#7A1635] dark:text-[#C9A15A] font-bold hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTools.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>
          )}
        </section>

        {/* ======================================================== */}
        {/* WHY PDFMINIFLY IS DIFFERENT */}
        {/* ======================================================== */}
        <section id="why-different" className="py-16 sm:py-20 bg-[#F2ECE3] dark:bg-[#0E0C0D] border-t border-b border-[#E8DFD3] dark:border-[#2E2629]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7A1635]/10 text-[#7A1635] dark:text-[#C9A15A] text-xs font-bold uppercase tracking-wider mb-3 border border-[#7A1635]/20 dark:border-[#C9A15A]/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Architectural Standards</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A1416] dark:text-[#F7F1E8] mb-3">
                Why PDFMiniFly is Different
              </h2>
              <p className="text-xs sm:text-sm text-[#5C5256] dark:text-[#AFA6A8]">
                Built with precision engineering, prioritizing privacy, performance, and transparency.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-6 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] space-y-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-[#7A1635]/10 dark:bg-[#C9A15A]/15 text-[#7A1635] dark:text-[#C9A15A] flex items-center justify-center">
                  <HardDrive className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8]">
                  Local-First by Design
                </h3>
                <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
                  Supported operations run directly within your browser&apos;s isolated JavaScript and WebAssembly sandbox. No unnecessary intermediate servers.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] space-y-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-[#35C98A]/10 text-[#35C98A] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8]">
                  Zero Server Storage
                </h3>
                <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
                  Your files are loaded into device memory and never stored on remote servers. When you close the tab, the in-memory data evaporates.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] space-y-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-[#C9A15A]/15 text-[#C9A15A] flex items-center justify-center">
                  <Wifi className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8]">
                  Offline-Ready PWA
                </h3>
                <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
                  Install PDFMiniFly onto your desktop or mobile device. Core PDF manipulation features continue working seamlessly without an active internet connection.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] space-y-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8]">
                  No Artificial Size Limits
                </h3>
                <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
                  Because files process on your hardware rather than congested upload queues, you aren&apos;t restricted by arbitrary paywalled upload limits.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] space-y-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8]">
                  No Account Needed
                </h3>
                <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
                  Zero sign-ups, zero email capture forms, and zero tracking cookies. Open the site and process your documents immediately.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] space-y-3 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8]">
                  Open Architecture
                </h3>
                <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
                  Built on transparent open-source PDF foundations including pdf-lib and pdf.js, delivering verifiable, deterministic document manipulation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* PWA / OFFLINE BANNER */}
        {/* ======================================================== */}
        <section className="py-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-[#4A0D20] via-[#7A1635] to-[#4A0D20] text-[#F7F1E8] border border-[#C9A15A]/40 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2 max-w-xl text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C9A15A]/20 text-[#C9A15A] text-[11px] font-extrabold uppercase tracking-wider">
                <Wifi className="w-3.5 h-3.5" />
                <span>OFFLINE CAPABLE APPLICATION</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                Install PDFMiniFly on Your Device
              </h3>
              <p className="text-xs sm:text-sm text-[#F6EFE3]/80 leading-relaxed">
                Take PDFMiniFly everywhere. Install it as a standalone progressive web app on your laptop or phone for instant, offline document manipulation.
              </p>
            </div>

            <div className="shrink-0">
              <PWAInstallButton variant="hero" />
            </div>
          </div>
        </section>

        {/* Recent Activity Section if any */}
        <RecentActivitySection onOpenRecent={() => setRecentOpen(true)} />

        {/* ======================================================== */}
        {/* FAQ SECTION */}
        {/* ======================================================== */}
        <section className="py-16 sm:py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A1416] dark:text-[#F7F1E8] mb-2">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-[#5C5256] dark:text-[#AFA6A8]">
              Everything you need to know about PDFMiniFly’s local-first architecture.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-5 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629]">
              <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1.5 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#7A1635] dark:text-[#C9A15A]" />
                <span>Can I safely process confidential bank statements or contracts?</span>
              </h3>
              <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
                Yes. Because supported tools in PDFMiniFly process documents directly within your browser&apos;s local sandbox, your documents are edited on your machine. You can inspect your browser’s Network tab to confirm that no document bytes are transmitted during local tool execution.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629]">
              <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1.5 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#7A1635] dark:text-[#C9A15A]" />
                <span>How does the PWA / offline mode work?</span>
              </h3>
              <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
                You can click the <strong>Install App</strong> button in the navigation bar to add PDFMiniFly to your desktop dock or phone home screen. Once installed, service workers cache the application shell and core local processing modules, allowing you to edit PDFs even without internet access.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629]">
              <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1.5 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#7A1635] dark:text-[#C9A15A]" />
                <span>Are there limits on file sizes?</span>
              </h3>
              <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
                PDFMiniFly enforces no artificial paywall limits. The only constraint is your device’s available memory (RAM). For large files (&gt;100MB), the app will display a gentle advisory so your browser tab remains responsive.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <MobileBottomNav onOpenRecent={() => setRecentOpen(true)} />
      <RecentJobsModal isOpen={recentOpen} onClose={() => setRecentOpen(false)} />
    </div>
  );
}
