'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { checkPdfHealth, getDocumentStatistics, formatBytes } from '@/lib/pdf-engine';
import { DocumentHealthReport, DocumentStatistics } from '@/types/pdf';
import Link from 'next/link';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  Download,
  RotateCcw,
  CheckCircle2,
  Info,
  Lock,
  Unlock,
  Sliders,
} from 'lucide-react';

export const PdfHealthWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<DocumentHealthReport | null>(null);
  const [stats, setStats] = useState<DocumentStatistics | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setLoading(true);

    try {
      const [healthReport, documentStats] = await Promise.all([
        checkPdfHealth(selected),
        getDocumentStatistics(selected),
      ]);
      setReport(healthReport);
      setStats(documentStats);
    } catch (err) {
      console.error('Health check failed:', err);
      alert('Could not inspect document. The PDF may be corrupted or password encrypted.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = () => {
    if (!report || !stats) return;
    const exportData = {
      timestamp: new Date().toISOString(),
      report,
      statistics: stats,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name || 'document'}_health_report.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  };

  return (
    <div className="rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] overflow-hidden shadow-xs">
      {!file || !report ? (
        <div className="p-8 sm:p-12 text-center">
          <div className="max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center mx-auto mb-4">
              <Activity className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5F0EB] mb-2">
              PDF Health Check & Diagnostics
            </h2>
            <p className="text-xs sm:text-sm text-[#5C554F] dark:text-[#A39991] mb-6 leading-relaxed">
              Analyze structure, detect hidden metadata, inspect font and image density, check for JavaScript scripts, and get actionable security recommendations.
            </p>
            <FileDropzone
              accept=".pdf,application/pdf"
              maxFiles={1}
              onFilesSelected={handleFilesSelected}
              label={loading ? 'Analyzing document structure...' : 'Drop PDF here or click to inspect'}
              sublabel="100% Private In-Browser Diagnostic • Never Uploaded"
            />
          </div>
        </div>
      ) : (
        <div className="p-6 sm:p-8 space-y-8">
          {/* Header Summary Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5DFD4] dark:border-[#2E2729]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-[#141213] dark:text-[#F5F0EB] truncate max-w-md">
                  {report.fileName}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    report.healthScore === 'Healthy'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : report.healthScore === 'Moderate'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                  }`}
                >
                  {report.healthScore}
                </span>
              </div>
              <p className="text-xs text-[#5C554F] dark:text-[#A39991]">
                {report.pdfVersion} • {report.pageCount} Pages • {formatBytes(report.fileSize)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportReport}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-xs font-semibold hover:border-[#6D1F35] transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#6D1F35] dark:text-[#C6A15B]" />
                <span>Export Report (JSON)</span>
              </button>
              <button
                onClick={() => {
                  setFile(null);
                  setReport(null);
                  setStats(null);
                }}
                className="p-2 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-xs font-semibold hover:bg-gray-100 dark:hover:bg-[#252021]"
                title="Inspect another document"
              >
                <RotateCcw className="w-4 h-4 text-[#5C554F]" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213]">
              <div className="flex items-center gap-2 text-xs text-[#5C554F] dark:text-[#A39991] mb-1">
                <FileText className="w-3.5 h-3.5" />
                <span>Total Words</span>
              </div>
              <div className="text-lg font-bold text-[#141213] dark:text-[#F5F0EB]">
                {stats?.words.toLocaleString() || '—'}
              </div>
              <span className="text-[11px] text-[#7A7067]">~{stats?.estimatedReadingTimeMinutes || 1} min read</span>
            </div>

            <div className="p-4 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213]">
              <div className="flex items-center gap-2 text-xs text-[#5C554F] dark:text-[#A39991] mb-1">
                <Layers className="w-3.5 h-3.5" />
                <span>Embedded Images</span>
              </div>
              <div className="text-lg font-bold text-[#141213] dark:text-[#F5F0EB]">
                {report.imageCount}
              </div>
              <span className="text-[11px] text-[#7A7067]">{stats?.averagePageSize}</span>
            </div>

            <div className="p-4 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213]">
              <div className="flex items-center gap-2 text-xs text-[#5C554F] dark:text-[#A39991] mb-1">
                <Sliders className="w-3.5 h-3.5" />
                <span>Form Fields & Annots</span>
              </div>
              <div className="text-lg font-bold text-[#141213] dark:text-[#F5F0EB]">
                {report.formFieldCount + report.annotationCount}
              </div>
              <span className="text-[11px] text-[#7A7067]">{report.formFieldCount} forms, {report.annotationCount} marks</span>
            </div>

            <div className="p-4 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213]">
              <div className="flex items-center gap-2 text-xs text-[#5C554F] dark:text-[#A39991] mb-1">
                {report.encrypted ? <Lock className="w-3.5 h-3.5 text-emerald-500" /> : <Unlock className="w-3.5 h-3.5 text-gray-400" />}
                <span>Encryption & Script</span>
              </div>
              <div className="text-lg font-bold text-[#141213] dark:text-[#F5F0EB]">
                {report.encrypted ? 'Encrypted' : 'Unencrypted'}
              </div>
              <span className="text-[11px] text-[#7A7067]">{report.hasJavaScript ? '⚠️ Contains JS' : 'No Scripts'}</span>
            </div>
          </div>

          {/* Audit Findings */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#5C554F] dark:text-[#A39991] mb-3">
              Diagnostic Findings ({report.findings.length})
            </h3>
            <div className="space-y-2.5">
              {report.findings.map((f, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] flex items-start gap-3"
                >
                  {f.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : f.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="text-xs font-semibold text-[#141213] dark:text-[#F5F0EB]">
                      {f.title}
                    </h4>
                    <p className="text-xs text-[#5C554F] dark:text-[#A39991] mt-0.5">
                      {f.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Metadata Inspection */}
          {report.hasMetadata && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#5C554F] dark:text-[#A39991] mb-3">
                Detected Metadata ({report.metadataItems.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {report.metadataItems.map((meta, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-xs"
                  >
                    <span className="font-semibold text-[#6D1F35] dark:text-[#C6A15B] mr-2">{meta.key}:</span>
                    <span className="text-[#141213] dark:text-[#F5F0EB] font-mono break-all">{meta.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Suggestions */}
          {report.suggestions.length > 0 && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#5C554F] dark:text-[#A39991] mb-3">
                Recommended Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {report.suggestions.map((s, i) => (
                  <Link
                    key={i}
                    href={`/tools/${s.actionSlug}`}
                    className="p-4 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] hover:border-[#6D1F35] dark:hover:border-[#C6A15B] transition-all group flex items-start justify-between gap-2"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-[#141213] dark:text-[#F5F0EB] group-hover:text-[#6D1F35] dark:group-hover:text-[#C6A15B] transition-colors flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#C6A15B]" />
                        <span>{s.title}</span>
                      </h4>
                      <p className="text-xs text-[#5C554F] dark:text-[#A39991] mt-1">
                        {s.description}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#5C554F] group-hover:translate-x-0.5 transition-transform shrink-0 mt-0.5" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
