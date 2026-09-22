'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { recordRecentTool } from '@/lib/recent-tools';
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
  Wrench,
  Contrast,
} from 'lucide-react';

// Workspaces
/** Shared suspense-free loading skeleton shown while a lazily loaded workspace chunk arrives. */
const WorkspaceLoading = () => (
  <div
    className="flex items-center justify-center py-24"
    role="status"
    aria-busy="true"
    aria-label="Loading tool"
  >
    <div className="w-6 h-6 rounded-full border-2 border-[#E5DFD4] dark:border-[#2E2729] border-t-[#6D1F35] dark:border-t-[#C6A15B] animate-spin motion-reduce:animate-[spin_1.5s_linear_infinite_reverse]" />
  </div>
);

const MergePdfWorkspace = dynamic(
  () => import('@/components/tools/MergePdfWorkspace').then((m) => ({ default: m.MergePdfWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const SplitPdfWorkspace = dynamic(
  () => import('@/components/tools/SplitPdfWorkspace').then((m) => ({ default: m.SplitPdfWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const OrganizePdfWorkspace = dynamic(
  () => import('@/components/tools/OrganizePdfWorkspace').then((m) => ({ default: m.OrganizePdfWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const CompressPdfWorkspace = dynamic(
  () => import('@/components/tools/CompressPdfWorkspace').then((m) => ({ default: m.CompressPdfWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const PdfToImageWorkspace = dynamic(
  () => import('@/components/tools/PdfToImageWorkspace').then((m) => ({ default: m.PdfToImageWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const ImageToPdfWorkspace = dynamic(
  () => import('@/components/tools/ImageToPdfWorkspace').then((m) => ({ default: m.ImageToPdfWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const PdfEditorWorkspace = dynamic(
  () => import('@/components/tools/PdfEditorWorkspace').then((m) => ({ default: m.PdfEditorWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const SignPdfWorkspace = dynamic(
  () => import('@/components/tools/SignPdfWorkspace').then((m) => ({ default: m.SignPdfWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const WatermarkWorkspace = dynamic(
  () => import('@/components/tools/WatermarkWorkspace').then((m) => ({ default: m.WatermarkWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const PageNumbersWorkspace = dynamic(
  () => import('@/components/tools/PageNumbersWorkspace').then((m) => ({ default: m.PageNumbersWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const ProtectPdfWorkspace = dynamic(
  () => import('@/components/tools/ProtectPdfWorkspace').then((m) => ({ default: m.ProtectPdfWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const PdfMetadataWorkspace = dynamic(
  () => import('@/components/tools/PdfMetadataWorkspace').then((m) => ({ default: m.PdfMetadataWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const OcrWorkspace = dynamic(
  () => import('@/components/tools/OcrWorkspace').then((m) => ({ default: m.OcrWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const PdfViewerWorkspace = dynamic(
  () => import('@/components/tools/PdfViewerWorkspace').then((m) => ({ default: m.PdfViewerWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const BatchProcessWorkspace = dynamic(
  () => import('@/components/tools/BatchProcessWorkspace').then((m) => ({ default: m.BatchProcessWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const WorkflowBuilderWorkspace = dynamic(
  () => import('@/components/tools/WorkflowBuilderWorkspace').then((m) => ({ default: m.WorkflowBuilderWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const RemoveBlankPagesWorkspace = dynamic(
  () => import('@/components/tools/RemoveBlankPagesWorkspace').then((m) => ({ default: m.RemoveBlankPagesWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const ExtractToolsWorkspace = dynamic(
  () => import('@/components/tools/ExtractToolsWorkspace').then((m) => ({ default: m.ExtractToolsWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const FillFormWorkspace = dynamic(
  () => import('@/components/tools/FillFormWorkspace').then((m) => ({ default: m.FillFormWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const RedactPdfWorkspace = dynamic(
  () => import('@/components/tools/RedactPdfWorkspace').then((m) => ({ default: m.RedactPdfWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const ComparePdfWorkspace = dynamic(
  () => import('@/components/tools/ComparePdfWorkspace').then((m) => ({ default: m.ComparePdfWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const PdfAssistantWorkspace = dynamic(
  () => import('@/components/tools/PdfAssistantWorkspace').then((m) => ({ default: m.PdfAssistantWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const PdfToStudyWorkspace = dynamic(
  () => import('@/components/tools/PdfToStudyWorkspace').then((m) => ({ default: m.PdfToStudyWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const ReadAloudWorkspace = dynamic(
  () => import('@/components/tools/ReadAloudWorkspace').then((m) => ({ default: m.ReadAloudWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const BookletMakerWorkspace = dynamic(
  () => import('@/components/tools/BookletMakerWorkspace').then((m) => ({ default: m.BookletMakerWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const PdfHealthWorkspace = dynamic(
  () => import('@/components/tools/PdfHealthWorkspace').then((m) => ({ default: m.PdfHealthWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const PdfSanitizerWorkspace = dynamic(
  () => import('@/components/tools/PdfSanitizerWorkspace').then((m) => ({ default: m.PdfSanitizerWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const PdfToMarkdownWorkspace = dynamic(
  () => import('@/components/tools/PdfToMarkdownWorkspace').then((m) => ({ default: m.PdfToMarkdownWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const PdfToHtmlWorkspace = dynamic(
  () => import('@/components/tools/PdfToHtmlWorkspace').then((m) => ({ default: m.PdfToHtmlWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const PdfToExcelWorkspace = dynamic(
  () => import('@/components/tools/PdfToExcelWorkspace').then((m) => ({ default: m.PdfToExcelWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const DocxConverterWorkspace = dynamic(
  () => import('@/components/tools/DocxConverterWorkspace').then((m) => ({ default: m.DocxConverterWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const CompressTargetWorkspace = dynamic(
  () => import('@/components/tools/CompressTargetWorkspace').then((m) => ({ default: m.CompressTargetWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const SplitBySizeWorkspace = dynamic(
  () => import('@/components/tools/SplitBySizeWorkspace').then((m) => ({ default: m.SplitBySizeWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const CropTrimWorkspace = dynamic(
  () => import('@/components/tools/CropTrimWorkspace').then((m) => ({ default: m.CropTrimWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const NupWorkspace = dynamic(
  () => import('@/components/tools/NupWorkspace').then((m) => ({ default: m.NupWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const GrayscaleWorkspace = dynamic(
  () => import('@/components/tools/GrayscaleWorkspace').then((m) => ({ default: m.GrayscaleWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const BatesStampingWorkspace = dynamic(
  () => import('@/components/tools/BatesStampingWorkspace').then((m) => ({ default: m.BatesStampingWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const FlattenPdfWorkspace = dynamic(
  () => import('@/components/tools/FlattenPdfWorkspace').then((m) => ({ default: m.FlattenPdfWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const DigitalCertificateSignatureWorkspace = dynamic(
  () => import('@/components/tools/DigitalCertificateSignatureWorkspace').then((m) => ({ default: m.DigitalCertificateSignatureWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const RepairPdfWorkspace = dynamic(
  () => import('@/components/tools/RepairPdfWorkspace').then((m) => ({ default: m.RepairPdfWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);
const InvertColorsWorkspace = dynamic(
  () => import('@/components/tools/InvertColorsWorkspace').then((m) => ({ default: m.InvertColorsWorkspace })),
  { ssr: false, loading: WorkspaceLoading }
);

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
  Wrench,
  Contrast,
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

  // Track tool usage (local only) so the command palette's
  // "Recently Used" section reflects real visits, not just palette launches.
  useEffect(() => {
    recordRecentTool(tool.slug);
  }, [tool.slug]);

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
      case 'pdf-to-excel':
        return <PdfToExcelWorkspace />;
      case 'docx-to-pdf':
        return <DocxConverterWorkspace mode="docx-to-pdf" />;
      case 'pdf-to-docx':
        return <DocxConverterWorkspace mode="pdf-to-docx" />;
      case 'compress-to-target-size':
        return <CompressTargetWorkspace />;
      case 'split-by-size':
        return <SplitBySizeWorkspace />;
      case 'crop-trim-pdf':
        return <CropTrimWorkspace />;
      case 'nup-pdf':
        return <NupWorkspace />;
      case 'grayscale-ink-saver':
        return <GrayscaleWorkspace />;
      case 'bates-stamping':
      case 'bates-numbering':
      case 'legal-numbering':
        return <BatesStampingWorkspace />;
      case 'flatten-pdf':
      case 'flatten-forms':
      case 'lock-pdf':
        return <FlattenPdfWorkspace />;
      case 'sign-pdf-cert':
      case 'digital-signature':
      case 'cert-sign-pdf':
      case 'validate-signatures':
        return <DigitalCertificateSignatureWorkspace />;
      case 'repair-pdf':
      case 'fix-pdf':
      case 'salvage-pdf':
      case 'recover-pdf':
        return <RepairPdfWorkspace />;
      case 'invert-colors':
      case 'dark-mode-pdf':
      case 'dark-reader-pdf':
      case 'invert-pdf':
        return <InvertColorsWorkspace />;
      default:
        return <MergePdfWorkspace />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6EFE3] dark:bg-[#121012] text-[#1A1416] dark:text-[#F7F1E8] transition-colors">
      <Navbar onOpenRecent={() => setRecentOpen(true)} />

      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col">
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
