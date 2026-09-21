'use client';

import React, { useState } from 'react';
import { Sparkles, ShieldCheck, ChevronDown, ChevronUp, FileSearch, AlertTriangle } from 'lucide-react';
import type { DocumentAnalysis, Recommendation } from '@/lib/workflow-engine';
import { formatBytes } from '@/lib/pdf-engine';

interface DocumentAnalysisCardProps {
  analysis: DocumentAnalysis;
  recommendation: Recommendation;
  onApplyRecommended: () => void;
  onCustomize: () => void;
  onDismiss: () => void;
}

export const DocumentAnalysisCard: React.FC<DocumentAnalysisCardProps> = ({
  analysis,
  recommendation,
  onApplyRecommended,
  onCustomize,
  onDismiss,
}) => {
  const [expanded, setExpanded] = useState(false);

  const stats: { label: string; value: string }[] = [
    { label: 'Pages', value: String(analysis.pageCount) },
    { label: 'Size', value: formatBytes(analysis.fileSize) },
    { label: 'Text Pages', value: String(analysis.textPages) },
    { label: 'Scanned Pages', value: String(analysis.scannedPages) },
    { label: 'Blank Pages', value: String(analysis.blankPages.length) },
    { label: 'Rotated Pages', value: String(analysis.rotatedPages.length) },
    { label: 'OCR', value: analysis.ocrRecommended ? 'Recommended' : analysis.scannedPages > 0 ? 'Optional' : 'Not needed' },
    { label: 'Metadata', value: analysis.hasMetadata ? 'Present' : 'None' },
  ];

  return (
    <div className="rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#141213] dark:text-[#F5F0EB] inline-flex items-center gap-2">
          <FileSearch className="w-4 h-4 text-[#6D1F35] dark:text-[#C9A15A]" />
          Document Analysis
        </h3>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#35C98A]/10 border border-[#35C98A]/25 text-[#258B5C] dark:text-[#35C98A] text-[10px] font-bold uppercase tracking-wider">
          <ShieldCheck className="w-3 h-3" />
          <span>Analyzed locally</span>
        </span>
      </div>

      {analysis.warnings.map((w) => (
        <div key={w} className="mb-3 flex items-start gap-2 p-3 rounded-xl bg-[#C9A15A]/10 border border-[#C9A15A]/30 text-[#8A6D2F] dark:text-[#C9A15A] text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{w}</span>
        </div>
      ))}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        {stats.map((s) => (
          <div key={s.label} className="p-2.5 rounded-xl bg-[#F7F3EC] dark:bg-[#141213] border border-[#E5DFD4] dark:border-[#2E2729]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C554F] dark:text-[#A39991]">{s.label}</p>
            <p className="text-xs font-bold text-[#141213] dark:text-[#F5F0EB] truncate">{s.value}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => setExpanded((e) => !e)}
        className="text-[11px] font-semibold text-[#6D1F35] dark:text-[#C9A15A] inline-flex items-center gap-1 mb-3"
        aria-expanded={expanded}
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {expanded ? 'Hide page details' : 'Show per-page details'}
      </button>

      {expanded && (
        <div className="mb-4 max-h-56 overflow-y-auto rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] divide-y divide-[#E5DFD4] dark:divide-[#2E2729]">
          {analysis.pages.map((p) => (
            <div key={p.pageNumber} className="flex items-center gap-3 px-3 py-2">
              {p.thumbnail ? (
                <img src={p.thumbnail} alt="" className="w-8 h-10 object-cover rounded-md border border-[#E5DFD4] dark:border-[#2E2729]" />
              ) : (
                <span className="w-8 h-10 rounded-md bg-[#F7F3EC] dark:bg-[#141213]" />
              )}
              <div className="text-[11px]">
                <span className="font-bold text-[#141213] dark:text-[#F5F0EB]">Page {p.pageNumber}</span>
                <span className="text-[#5C554F] dark:text-[#A39991]">
                  {' · '}
                  {p.isBlank ? 'blank' : p.isNearBlank ? 'near-blank' : p.hasText ? 'text' : 'image'}
                  {p.isRotated ? ` · rotated ${p.rotationAngle}°` : ''}
                  {p.portrait ? ' · portrait' : ' · landscape'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recommendation */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#6D1F35]/5 to-[#C9A15A]/10 dark:from-[#C9A15A]/5 dark:to-[#6D1F35]/10 border border-[#C9A15A]/30">
        <p className="text-xs font-bold text-[#141213] dark:text-[#F5F0EB] inline-flex items-center gap-1.5 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-[#8A6D2F] dark:text-[#C9A15A]" />
          PDFly found:
        </p>
        <ul className="space-y-1 mb-3">
          {recommendation.reasons.map((r) => (
            <li key={r} className="text-[11px] text-[#5C554F] dark:text-[#A39991] flex items-start gap-1.5">
              <span className="text-[#258B5C] mt-0.5">✓</span>
              <span className="capitalize">{r}</span>
            </li>
          ))}
        </ul>

        {recommendation.steps.length > 0 ? (
          <>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5C554F] dark:text-[#A39991] mb-1.5">Recommended workflow</p>
            <ol className="mb-4 space-y-1">
              {recommendation.steps.map((s, i) => (
                <li key={i} className="text-[11px] font-semibold text-[#141213] dark:text-[#F5F0EB]">
                  {i + 1}. {s.note}
                </li>
              ))}
            </ol>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={onApplyRecommended}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] text-xs font-bold border border-[#C9A15A]/40 hover:brightness-110 active:scale-[0.98] transition-all"
              >
                Apply Recommended Workflow
              </button>
              <button
                onClick={onCustomize}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#E8DFD3] dark:border-[#2E2629] bg-white dark:bg-[#1B1719] text-xs font-bold text-[#1A1416] dark:text-[#F7F1E8] hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              >
                Customize
              </button>
              <button
                onClick={onDismiss}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#5C554F] dark:text-[#A39991] hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <p className="text-[11px] text-[#5C554F] dark:text-[#A39991] mb-3">
            Nothing to fix — you can still build a custom pipeline below.
          </p>
        )}
      </div>
    </div>
  );
};
