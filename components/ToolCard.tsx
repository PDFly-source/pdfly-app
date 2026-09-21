'use client';

import React from 'react';
import Link from 'next/link';
import { ToolDefinition } from '@/types/pdf';
import {
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
  Image,
  FileImage,
  ScanText,
  ArrowRight,
  Sparkles,
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
  CheckCircle2,
  Shield,
  Layers2,
  Share2,
} from 'lucide-react';

interface ToolCardProps {
  tool: ToolDefinition;
}

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
  Image,
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

export const ToolCard: React.FC<ToolCardProps> = ({ tool }) => {
  const IconComponent = ICON_MAP[tool.iconName] || FileText;

  return (
    <Link
      href={`/tools/${tool.slug}`}
      id={`tool-card-${tool.slug}`}
      className="group relative flex flex-col justify-between p-5 rounded-2xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] hover:border-[#7A1635]/50 dark:hover:border-[#C9A15A]/60 shadow-2xs hover:shadow-md hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 transition-all duration-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
    >
      <div>
        {/* Top bar with Icon and Local-First Badge */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#F6EFE3] dark:bg-[#241D20] text-[#7A1635] dark:text-[#C9A15A] flex items-center justify-center border border-[#E8DFD3] dark:border-[#3D3035] group-hover:scale-105 group-hover:bg-[#7A1635]/10 dark:group-hover:bg-[#C9A15A]/15 transition-all duration-200 shadow-2xs">
            <IconComponent className="w-5 h-5 transition-transform duration-200 group-hover:rotate-3" />
          </div>

          <div className="flex items-center gap-1.5">
            {tool.badge ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7A1635]/10 text-[#7A1635] dark:bg-[#C9A15A]/15 dark:text-[#C9A15A]">
                <Sparkles className="w-2.5 h-2.5" />
                {tool.badge}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold tracking-wider uppercase bg-[#35C98A]/10 text-[#258B5C] dark:text-[#35C98A] border border-[#35C98A]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#35C98A]"></span>
                LOCAL
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8] mb-1.5 group-hover:text-[#7A1635] dark:group-hover:text-[#C9A15A] transition-colors line-clamp-1">
          {tool.name}
        </h3>

        {/* Description */}
        <p className="text-xs text-[#5C5256] dark:text-[#AFA6A8] line-clamp-2 leading-relaxed">
          {tool.description}
        </p>
      </div>

      {/* Bottom link indicator */}
      <div className="mt-4 pt-3 border-t border-[#E8DFD3]/60 dark:border-[#2E2629] flex items-center justify-between text-xs font-semibold text-[#7A1635] dark:text-[#C9A15A]">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C5256] dark:text-[#AFA6A8] group-hover:text-[#7A1635] dark:group-hover:text-[#C9A15A] transition-colors">
          Open Tool
        </span>
        <ArrowRight className="w-3.5 h-3.5 transform translate-x-0 group-hover:translate-x-1 transition-transform text-[#7A1635] dark:text-[#C9A15A]" />
      </div>
    </Link>
  );
};
