'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ToolDefinition } from '@/types/pdf';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { RecentJobsModal } from '@/components/RecentJobsModal';
import {
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Layers,
  Scissors,
  Grid,
  Minimize2,
  FileText,
  Edit3,
  PenTool,
  Stamp,
  Hash,
  Image as ImageIcon,
  FileImage,
  ScanText,
  FileX,
  BookOpen,
  Volume2,
  Activity,
  Trash2,
  Eye,
  Workflow,
  Sparkle,
  FileSpreadsheet,
  Lock,
  Search,
  Code,
  Layers2,
  Share2,
} from 'lucide-react';

// Workspaces
import { MergePdfWorkspace } from '@/components/tools/MergePdfWorkspace';
import { SplitPdfWorkspace } from '@/components/tools/SplitPdfWorkspace';
import { OrganizePdfWorkspace } from '@/components/tools/OrganizePdfWorkspace';
import { CompressPdfWorkspace } from '@/components/tools/CompressPdfWorkspace';
import { PdfToImageWorkspace } from '@/components/tools/PdfToImageWorkspace';
import { ImageToPdfWorkspace } from '@/components/tools/ImageToPdfWorkspace';
import { PdfEditorWorkspace } from '@/components/tools/PdfEditorWorkspace';
import { SignPdfWorkspace } from '@/components/tools/SignPdfWorkspace';
import { WatermarkWorkspace } from '@/components/tools/WatermarkWorkspace';
import { PageNumbersWorkspace } from '@/components/tools/PageNumbersWorkspace';
import { ProtectPdfWorkspace } from '@/components/tools/ProtectPdfWorkspace';
import { PdfMetadataWorkspace } from '@/components/tools/PdfMetadataWorkspace';
import { OcrWorkspace } from '@/components/tools/OcrWorkspace';
import { PdfViewerWorkspace } from '@/components/tools/PdfViewerWorkspace';
import { BatchProcessWorkspace } from '@/components/tools/BatchProcessWorkspace';
import { WorkflowBuilderWorkspace } from '@/components/tools/WorkflowBuilderWorkspace';
import { RemoveBlankPagesWorkspace } from '@/components/tools/RemoveBlankPagesWorkspace';
import { ExtractToolsWorkspace } from '@/components/tools/ExtractToolsWorkspace';
import { FillFormWorkspace } from '@/components/tools/FillFormWorkspace';
import { RedactPdfWorkspace } from '@/components/tools/RedactPdfWorkspace';
import { ComparePdfWorkspace } from '@/components/tools/ComparePdfWorkspace';
import { PdfAssistantWorkspace } from '@/components/tools/PdfAssistantWorkspace';
import { PdfToStudyWorkspace } from '@/components/tools/PdfToStudyWorkspace';
import { ReadAloudWorkspace } from '@/components/tools/ReadAloudWorkspace';
import { BookletMakerWorkspace } from '@/components/tools/BookletMakerWorkspace';
import { PdfHealthWorkspace } from '@/components/tools/PdfHealthWorkspace';
import { PdfSanitizerWorkspace } from '@/components/tools/PdfSanitizerWorkspace';
import { PdfToMarkdownWorkspace } from '@/components/tools/PdfToMarkdownWorkspace';
import { PdfToHtmlWorkspace } from '@/components/tools/PdfToHtmlWorkspace';

const ICON_MAP: Record<string, React.ElementType> = {
  Layers,
  Scissors,
  Grid,
  Minimize2,
  FileText,
  Edit3,
  PenTool,
  ShieldCheck,
  Stamp,
  Hash,
  Image: ImageIcon,
  FileImage,
  ScanText,
  FileX,
  BookOpen,
  Volume2,
  Activity,
  Trash2,
  Eye,
  Workflow,
  Sparkle,
  FileSpreadsheet,
  Lock,
  Search,
  Code,
  Layers2,
  Share2,
};

interface ToolPageClientWrapperProps {
  tool: ToolDefinition;
  children: React.ReactNode;
}

export const ToolPageClientWrapper: React.FC<ToolPageClientWrapperProps> = ({
  tool,
  children,
}) => {
  const [recentOpen, setRecentOpen] = useState(false);
  const IconComponent = ICON_MAP[tool.iconName] || FileText;

  const renderWorkspace = () => {
    switch (tool.slug) {
      case 'merge-pdf':
      case 'combine-pdf':
        return <MergePdfWorkspace />;
      case 'split-pdf':
      case 'extract-pages':
      case 'separate-pdf':
        return <SplitPdfWorkspace />;
      case 'organize-pdf':
      case 'reorder-pdf':
      case 'rotate-pdf':
        return <OrganizePdfWorkspace />;
      case 'compress-pdf':
      case 'reduce-pdf-size':
        return <CompressPdfWorkspace />;
      case 'pdf-to-image':
      case 'pdf-to-jpg':
      case 'pdf-to-png':
        return <PdfToImageWorkspace />;
      case 'image-to-pdf':
      case 'jpg-to-pdf':
      case 'png-to-pdf':
        return <ImageToPdfWorkspace />;
      case 'edit-pdf':
      case 'annotate-pdf':
        return <PdfEditorWorkspace />;
      case 'sign-pdf':
      case 'fill-and-sign':
        return <SignPdfWorkspace />;
      case 'watermark-pdf':
        return <WatermarkWorkspace />;
      case 'page-numbers':
      case 'add-page-numbers':
        return <PageNumbersWorkspace />;
      case 'protect-pdf':
      case 'encrypt-pdf':
      case 'unlock-pdf':
        return <ProtectPdfWorkspace />;
      case 'pdf-metadata':
        return <PdfMetadataWorkspace />;
      case 'ocr-pdf':
        return <OcrWorkspace />;
      case 'pdf-viewer':
        return <PdfViewerWorkspace />;
      case 'batch-process':
        return <BatchProcessWorkspace />;
      case 'workflow-builder':
        return <WorkflowBuilderWorkspace />;
      case 'remove-blank-pages':
        return <RemoveBlankPagesWorkspace />;
      case 'extract-text':
      case 'extract-images':
        return <ExtractToolsWorkspace initialMode={tool.slug === 'extract-text' ? 'text' : 'images'} />;
      case 'fill-form':
        return <FillFormWorkspace />;
      case 'redact-pdf':
        return <RedactPdfWorkspace />;
      case 'compare-pdf':
        return <ComparePdfWorkspace />;
      case 'pdf-assistant':
        return <PdfAssistantWorkspace />;
      case 'pdf-to-study':
        return <PdfToStudyWorkspace />;
      case 'read-aloud':
        return <ReadAloudWorkspace />;
      case 'booklet-maker':
        return <BookletMakerWorkspace />;
      case 'pdf-health':
        return <PdfHealthWorkspace />;
      case 'pdf-sanitizer':
        return <PdfSanitizerWorkspace />;
      case 'pdf-to-markdown':
        return <PdfToMarkdownWorkspace />;
      case 'pdf-to-html':
        return <PdfToHtmlWorkspace />;
      default:
        return <MergePdfWorkspace />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6EFE3] dark:bg-[#121012] text-[#1A1416] dark:text-[#F7F1E8] transition-colors">
      <Navbar onOpenRecent={() => setRecentOpen(true)} />

      <main className="flex-1 flex flex-col">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#5C5256] dark:text-[#AFA6A8] mb-6">
            <Link href="/" className="hover:text-[#7A1635] dark:hover:text-[#C9A15A] transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            <Link href="/#tools" className="hover:text-[#7A1635] dark:hover:text-[#C9A15A] transition-colors">
              Tools
            </Link>
            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            <span className="font-bold text-[#1A1416] dark:text-[#F7F1E8]">
              {tool.name}
            </span>
          </nav>

          {/* Premium Tool Hero Mini-Banner (Section 15) */}
          <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 mb-8 bg-gradient-to-r from-[#7A1635]/15 via-[#FFFDF9] to-[#C9A15A]/15 dark:from-[#4A0D20]/40 dark:via-[#1B1719] dark:to-[#C9A15A]/15 border border-[#7A1635]/30 dark:border-[#C9A15A]/30 shadow-xs">
            {/* Top Label & Privacy Badge */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#7A1635] dark:text-[#C9A15A]">
                PDF TOOL • {tool.category.toUpperCase()}
              </span>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#35C98A]/10 text-[#258B5C] dark:text-[#35C98A] text-[10.5px] font-bold uppercase tracking-wider border border-[#35C98A]/20">
                <span className="w-2 h-2 rounded-full bg-[#35C98A] animate-pulse"></span>
                <span>LOCAL-FIRST</span>
              </div>
            </div>

            {/* Main Title & Icon */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] flex items-center justify-center shrink-0 border border-[#C9A15A]/40 shadow-sm">
                <IconComponent className="w-7 h-7 text-[#C9A15A]" />
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A1416] dark:text-[#F7F1E8] uppercase">
                  {tool.name}
                </h1>
                <p className="text-xs sm:text-sm text-[#5C5256] dark:text-[#AFA6A8] max-w-2xl mt-1 leading-relaxed font-normal">
                  {tool.description}
                </p>
              </div>
            </div>
          </div>

          {/* Unified Tool Workspace Component */}
          <div className="mb-10">
            {renderWorkspace()}
          </div>

          {/* Privacy Note Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] flex items-start gap-3 shadow-2xs mb-12">
            <ShieldCheck className="w-5 h-5 text-[#35C98A] shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-[#1A1416] dark:text-[#F7F1E8]">
                Zero Cloud Uploads:
              </span>{' '}
              <span className="text-[#5C5256] dark:text-[#AFA6A8] leading-relaxed">
                PDFMiniFly processes this document directly inside your browser using client-side WebAssembly and web workers. Your confidential data is never transmitted to or retained on any remote server.
              </span>
            </div>
          </div>
        </div>

        {/* Remaining Guide, FAQs, Related Tools */}
        {children}
      </main>

      <Footer />
      <MobileBottomNav onOpenRecent={() => setRecentOpen(true)} />
      <RecentJobsModal isOpen={recentOpen} onClose={() => setRecentOpen(false)} />
    </div>
  );
};
