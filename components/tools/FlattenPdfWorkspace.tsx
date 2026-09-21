'use client';

import React, { useState, useEffect } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { flattenPdf, triggerDownload, formatBytes, FlattenPdfResult } from '@/lib/pdf-engine';
import { PDFDocument } from 'pdf-lib';
import { addRecentJob } from '@/lib/recent-jobs';
import {
  Layers,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  ShieldAlert,
  HelpCircle,
  FileText,
  Lock,
} from 'lucide-react';

export const FlattenPdfWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [formFieldsFound, setFormFieldsFound] = useState(0);
  const [annotsFound, setAnnotsFound] = useState(0);
  const [isInspecting, setIsInspecting] = useState(false);

  // Flatten options
  const [mode, setMode] = useState<'all' | 'forms' | 'annotations'>('all');
  const [confirmedWarning, setConfirmedWarning] = useState(false);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Flattening PDF layers...');
  const [progressPct, setProgressPct] = useState(0);

  const [result, setResult] = useState<FlattenPdfResult | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setErrorMessage(null);
    setConfirmedWarning(false);
    setIsInspecting(true);

    try {
      const buffer = await selected.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      setTotalPages(doc.getPageCount());

      // Count form fields
      let fieldsCount = 0;
      try {
        const form = doc.getForm();
        fieldsCount = form.getFields().length;
      } catch {
        fieldsCount = 0;
      }
      setFormFieldsFound(fieldsCount);

      // Count annotations
      let annotsCount = 0;
      const pages = doc.getPages();
      for (const p of pages) {
        const a = p.node.Annots();
        if (a) annotsCount += a.size();
      }
      setAnnotsFound(annotsCount);
    } catch (err: any) {
      console.error('Inspection error:', err);
    } finally {
      setIsInspecting(false);
    }
  };

  const handleFlatten = async () => {
    if (!file || !confirmedWarning) return;
    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPct(10);

    try {
      const out = await flattenPdf(file, mode, (step, pct) => {
        setProcessStep(step);
        setProgressPct(pct);
      });

      const baseName = file.name.replace(/\.pdf$/i, '');
      const outName = `${baseName}_flattened.pdf`;
      setResult(out);
      setResultFileName(outName);

      addRecentJob({
        toolId: 'flatten-pdf',
        toolName: 'Flatten PDF',
        fileName: outName,
        fileSize: out.blob.size,
        status: 'completed',
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Failed to flatten PDF document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (result && resultFileName) {
      triggerDownload(result.blob, resultFileName);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setResultFileName('');
    setErrorMessage(null);
    setConfirmedWarning(false);
  };

  if (result && file) {
    return (
      <SuccessView
        fileName={resultFileName}
        fileSize={result.blob.size}
        pageCount={totalPages}
        downloadLabel="Download Flattened PDF"
        onDownload={handleDownload}
        onReset={handleReset}
        additionalNote={`Successfully converted ${result.formsFlattened} form field(s) and ${result.annotsFlattened} annotation markup(s) into immutable background page graphics.`}
      />
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      {!file ? (
        <FileDropzone
          onFilesSelected={handleFileSelected}
          multiple={false}
          accept=".pdf,application/pdf"
          title="Drop PDF to flatten form fields & annotations"
          subtitle="Converts interactive elements into permanent, immutable page content for legal archiving"
        />
      ) : (
        <div className="space-y-6">
          {/* File Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/40 bg-card/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-burgundy/10 text-burgundy border border-burgundy/20">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  {file.name}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-mono">
                    {totalPages} {totalPages === 1 ? 'page' : 'pages'}
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)} • Client-side processing</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 self-start sm:self-auto"
            >
              Choose different file
            </button>
          </div>

          {/* Interactive Inspection Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-border/50 bg-card/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Interactive Form Fields
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                    formFieldsFound > 0 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {formFieldsFound} detected
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {formFieldsFound > 0
                  ? 'AcroForm inputs, checkboxes, and radio buttons will be locked into static page graphics.'
                  : 'No standard interactive AcroForm fields were detected in this document.'}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/50 bg-card/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Annotations & Markups
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                    annotsFound > 0 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {annotsFound} detected
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {annotsFound > 0
                  ? 'Comment markups, sticky notes, and stamps will have interactive triggers removed.'
                  : 'No annotation markup streams were detected in this document.'}
              </p>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="p-5 rounded-2xl border border-border/50 bg-card/60 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Flatten Scope
            </h4>

            <div className="space-y-3">
              {[
                {
                  id: 'all',
                  title: 'Flatten Everything Applicable (Recommended)',
                  desc: 'Bakes all interactive form fields, checkboxes, and markup annotations into static page content. Ideal for legal archiving and final court filings.',
                },
                {
                  id: 'forms',
                  title: 'Flatten Form Fields Only',
                  desc: 'Permanently fixes form responses and entered values while retaining standard interactive comments or markups.',
                },
                {
                  id: 'annotations',
                  title: 'Flatten Annotations Only',
                  desc: 'Bakes comments, highlights, and stamps into background graphics while keeping fillable form fields active.',
                },
              ].map((item) => (
                <label
                  key={item.id}
                  onClick={() => setMode(item.id as any)}
                  className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                    mode === item.id
                      ? 'border-burgundy/60 bg-burgundy/5 shadow-sm'
                      : 'border-border/50 hover:bg-card/80'
                  }`}
                >
                  <input
                    type="radio"
                    name="flattenMode"
                    value={item.id}
                    checked={mode === item.id}
                    onChange={() => setMode(item.id as any)}
                    className="mt-0.5 accent-burgundy"
                  />
                  <div>
                    <span className="font-semibold text-sm text-foreground block">{item.title}</span>
                    <span className="text-xs text-muted-foreground mt-0.5 block">{item.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Prominent Irreversible Warning Box */}
          <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold text-foreground">
                  Permanent Immutability Notice
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Flattening permanently converts interactive form fields, checkboxes, and markup annotations into static, non-editable page graphics. Once exported, form fields cannot be edited or filled again.
                </p>
                <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                  <strong>Notice:</strong> Flattening prevents casual form tampering, but is not encryption. For cryptographic non-repudiation and tamper detection, use the Digital Certificate Signature tool.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-amber-500/20">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmedWarning}
                  onChange={(e) => setConfirmedWarning(e.target.checked)}
                  className="w-4 h-4 rounded border-amber-500/40 text-burgundy accent-burgundy cursor-pointer"
                />
                <span className="text-xs font-medium text-foreground">
                  I understand that flattening is permanent and renders interactive elements uneditable.
                </span>
              </label>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm">
              {errorMessage}
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            disabled={!confirmedWarning}
            onClick={handleFlatten}
            className="w-full py-4 px-6 rounded-xl bg-burgundy hover:bg-burgundy-light disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold shadow-lg shadow-burgundy/20 hover:shadow-burgundy/30 transition-all flex items-center justify-center gap-2 text-base"
          >
            <Layers className="w-5 h-5" />
            Flatten PDF Document
          </button>
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
