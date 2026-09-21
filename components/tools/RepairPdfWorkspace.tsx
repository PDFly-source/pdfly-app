'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { repairPdf, triggerDownload, formatBytes, PdfRepairReport } from '@/lib/pdf-engine';
import { addRecentJob } from '@/lib/recent-jobs';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCheck,
  ShieldCheck,
  Activity,
  Layers,
  FileText,
  Clock,
  ArrowRight,
  Download,
  RotateCcw,
} from 'lucide-react';

export const RepairPdfWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Step 1/7: Analyzing raw binary byte streams...');
  const [progressPct, setProgressPct] = useState(0);

  // Recovery Report
  const [report, setReport] = useState<PdfRepairReport | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setReport(null);
    setErrorMessage(null);

    // Auto-initiate the 7-step repair & salvage pipeline upon upload
    setIsProcessing(true);
    setProgressPct(5);

    try {
      const rep = await repairPdf(selected, (step, pct) => {
        setProcessStep(step);
        setProgressPct(pct);
      });

      const baseName = selected.name.replace(/\.pdf$/i, '');
      const outName = `${baseName}_repaired.pdf`;
      setReport(rep);
      setResultFileName(outName);

      if (rep.canExport && rep.blob) {
        addRecentJob({
          toolId: 'repair-pdf',
          toolName: 'Repair & Salvage PDF',
          fileName: outName,
          fileSize: rep.blob.size,
          status: 'completed',
        });
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Failed to complete recovery pipeline on this file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (report?.blob && resultFileName) {
      triggerDownload(report.blob, resultFileName);
    }
  };

  const handleReset = () => {
    setFile(null);
    setReport(null);
    setResultFileName('');
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {!file ? (
        <FileDropzone
          onFilesSelected={handleFileSelected}
          multiple={false}
          accept=".pdf,application/pdf"
          title="Drop damaged or corrupted PDF here"
          subtitle="Analyzes broken cross-reference tables, missing trailers, malformed catalogs, and salvages readable page streams"
        />
      ) : (
        <div className="space-y-6">
          {/* File Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/40 bg-card/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-burgundy/10 text-burgundy border border-burgundy/20">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  {file.name}
                </h3>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)} • Local diagnostic scan</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 self-start sm:self-auto"
            >
              Scan another file
            </button>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Diagnostic Recovery Report (Step 6) */}
          {report && (
            <div className="space-y-6">
              {/* Summary Status Banner */}
              <div
                className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  report.validationResult === 'clean'
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-foreground'
                    : report.validationResult === 'partial'
                    ? 'border-amber-500/30 bg-amber-500/5 text-foreground'
                    : 'border-destructive/30 bg-destructive/5 text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  {report.validationResult === 'clean' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                  ) : report.validationResult === 'partial' ? (
                    <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-destructive shrink-0" />
                  )}
                  <div>
                    <h4 className="font-semibold text-sm">
                      {report.validationResult === 'clean'
                        ? 'Recovery Completed: Clean PDF Reconstructed'
                        : report.validationResult === 'partial'
                        ? 'Partial Recovery: Rescued Available Content'
                        : 'Unrecoverable Corrupted Document'}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{report.summaryMessage}</p>
                  </div>
                </div>

                {report.canExport && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-5 py-2.5 rounded-xl bg-burgundy hover:bg-burgundy-light text-white text-xs font-semibold shadow-md shadow-burgundy/20 flex items-center justify-center gap-2 transition-all self-start sm:self-auto shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    Download Repaired PDF
                  </button>
                )}
              </div>

              {/* 4 Stat Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl border border-border/50 bg-card/60">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Recovered Pages
                  </span>
                  <span className="text-xl font-bold font-mono text-foreground mt-1 block">
                    {report.recoveredPages} / {report.totalDetectedPages}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    {report.unrecoveredPages === 0 ? '100% restored' : `${report.unrecoveredPages} missing`}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-border/50 bg-card/60">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Rescued Objects
                  </span>
                  <span className="text-xl font-bold font-mono text-foreground mt-1 block">
                    {report.recoveredObjectsCount}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">indirect PDF objects</span>
                </div>

                <div className="p-4 rounded-xl border border-border/50 bg-card/60">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Repaired Size
                  </span>
                  <span className="text-xl font-bold font-mono text-foreground mt-1 block">
                    {formatBytes(report.repairedSize)}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    orig: {formatBytes(report.originalSize)}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-border/50 bg-card/60">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Compliance
                  </span>
                  <span className="text-xl font-bold font-mono text-foreground mt-1 block">
                    {report.canExport ? 'ISO 32000' : 'Failed'}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    {report.canExport ? 'Standardized' : 'Non-compliant'}
                  </span>
                </div>
              </div>

              {/* Detected Structural Problems */}
              <div className="p-5 rounded-2xl border border-border/50 bg-card/60 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-burgundy" />
                  Structural Diagnosis Log
                </h4>

                {report.detectedProblems.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No critical structural defects detected in the low-level binary headers.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {report.detectedProblems.map((prob, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between gap-3 p-3 rounded-xl bg-secondary/30 border border-border/40 text-xs"
                      >
                        <div className="flex items-start gap-2.5">
                          {prob.severity === 'critical' ? (
                            <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="font-semibold text-foreground block uppercase text-[10px] tracking-wider">
                              {prob.type} anomaly
                            </span>
                            <span className="text-muted-foreground mt-0.5 block">{prob.description}</span>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-medium shrink-0 ${
                            prob.resolved
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-destructive/10 text-destructive'
                          }`}
                        >
                          {prob.resolved ? 'Repaired' : 'Unresolvable'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions Executed by Repair Engine */}
              <div className="p-5 rounded-2xl border border-border/50 bg-card/60 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-burgundy" />
                  Recovery Operations Executed
                </h4>

                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {report.actionsTaken.map((act, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bottom Action Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Scan Another PDF
                </button>

                {report.canExport && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="w-full sm:w-auto py-3 px-6 rounded-xl bg-burgundy hover:bg-burgundy-light text-white font-semibold text-sm shadow-lg shadow-burgundy/20 hover:shadow-burgundy/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Download Repaired PDF ({formatBytes(report.repairedSize)})
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Processing Modal */}
      <ProcessingModal
        isOpen={isProcessing}
        stepText={processStep}
        progressPercentage={progressPct}
      />
    </div>
  );
};
