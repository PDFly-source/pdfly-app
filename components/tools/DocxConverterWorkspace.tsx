'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { FileNameInput } from '@/components/toolkit/FileNameInput';
import { PdfPreviewModal } from '@/components/toolkit/PdfPreviewModal';
import { readDocx, DocxDocumentModel } from '@/lib/docx-engine';
import { docxToPdf, pdfToDocx } from '@/lib/docx-pdf-bridge';
import { triggerDownload, formatBytes, extractTextFromPdf } from '@/lib/pdf-engine';
import { addRecentJob } from '@/lib/recent-jobs';
import { AlertTriangle, RefreshCw, Eye, FileText, ArrowRight, CheckCircle2 } from 'lucide-react';

/**
 * DOCX ↔ PDF — local Word/PDF conversion with honest limitation notices.
 * PRIVATE. POWERFUL. LOCAL.
 */
export const DocxConverterWorkspace: React.FC<{ mode: 'docx-to-pdf' | 'pdf-to-docx' }> = ({ mode }) => {
  const isDocxToPdf = mode === 'docx-to-pdf';
  const accept = isDocxToPdf ? '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document' : '.pdf,application/pdf';

  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState(isDocxToPdf ? 'converted' : 'converted');
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<{ paragraphs: number; headings: number; tables: number } | null>(null);

  const [keepPageBreaks, setKeepPageBreaks] = useState(true);
  const [detectHeadings, setDetectHeadings] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Converting...');
  const [progressPct, setProgressPct] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; size: number } | null>(null);

  const reset = () => {
    if (resultBlobUrl) URL.revokeObjectURL(resultBlobUrl);
    setFile(null); setResult(null); setResultBlobUrl(null); setErrorMessage(null);
    setPreviewText(null); setStats(null); setIsPreviewOpen(false);
  };

  const handleFileSelected = (files: File[]) => {
    if (!files?.length) return;
    reset();
    setFile(files[0]);
    setFileName(files[0].name.replace(/\.(pdf|docx)$/i, '') + (isDocxToPdf ? '' : '_converted'));
    // build a quick local text preview
    (async () => {
      try {
        if (isDocxToPdf) {
          const model: DocxDocumentModel = await readDocx(files[0]);
          const paras = model.blocks.filter((b) => 'runs' in b) as any[];
          const tables = model.blocks.filter((b) => 'rows' in b) as any[];
          const text = paras.map((p) => p.runs.map((r: any) => r.text).join('')).join('\n').slice(0, 4000);
          setPreviewText(text || '(no text content found)');
          setStats({
            paragraphs: paras.length,
            headings: paras.filter((p) => p.headingLevel > 0).length,
            tables: tables.length,
          });
        } else {
          const res = await extractTextFromPdf(files[0]);
          setPreviewText(res.pages.map((p) => p.text).join('\n\n').slice(0, 4000));
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Could not read this file.');
        setFile(null);
      }
    })();
  };

  const handleConvert = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      let blob: Blob;
      if (isDocxToPdf) {
        const model = await readDocx(file);
        blob = await docxToPdf(model, (msg, pct) => { setProcessStep(msg); setProgressPct(pct); });
        setResultBlobUrl(URL.createObjectURL(blob));
      } else {
        const res = await pdfToDocx(
          file,
          { pageBreaks: keepPageBreaks, detectHeadings },
          (msg, pct) => { setProcessStep(msg); setProgressPct(pct); }
        );
        blob = res.blob;
        setStats({ paragraphs: res.paragraphCount, headings: res.headingCount, tables: 0 });
      }
      setResult({ blob, size: blob.size });
      addRecentJob({
        toolId: mode,
        toolName: isDocxToPdf ? 'Word to PDF' : 'PDF to Word',
        fileName: fileName + (isDocxToPdf ? '.pdf' : '.docx'),
        fileSize: blob.size,
        status: 'completed',
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Conversion failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (result) triggerDownload(result.blob, `${fileName}.${isDocxToPdf ? 'pdf' : 'docx'}`);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {!file && (
        <FileDropzone
          onFilesSelected={handleFileSelected}
          accept={accept}
          label={isDocxToPdf ? 'Drop your Word document here' : 'Drop your PDF here'}
          sublabel={isDocxToPdf ? 'DOCX (Word 2007+) — text, headings, lists and tables convert locally' : 'Text, paragraphs and headings are reconstructed into an editable Word file'}
        />
      )}

      {file && (
        <>
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div className="min-w-0">
              <p className="truncate font-bold text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <button onClick={reset} className="shrink-0 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-accent min-h-[44px]">
              <RefreshCw className="h-4 w-4" /> New file
            </button>
          </div>

          {previewText !== null && (
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold inline-flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Content preview</p>
                <button onClick={() => setIsPreviewOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline min-h-[44px]">
                  <Eye className="h-4 w-4" /> Open full preview
                </button>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-4">{previewText.slice(0, 400)}…</p>
              {stats && (
                <p className="text-xs text-muted-foreground">
                  {stats.paragraphs > 0 && `${stats.paragraphs} paragraphs`}
                  {stats.headings > 0 && ` • ${stats.headings} headings`}
                  {stats.tables > 0 && ` • ${stats.tables} tables`}
                </p>
              )}
            </div>
          )}

          {!isDocxToPdf && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <label className="flex items-center gap-3 text-sm font-medium min-h-[44px]">
                <input type="checkbox" checked={keepPageBreaks} onChange={(e) => setKeepPageBreaks(e.target.checked)} className="h-4 w-4 accent-[#6D1F35]" />
                Keep PDF page breaks as Word page breaks
              </label>
              <label className="flex items-center gap-3 text-sm font-medium min-h-[44px]">
                <input type="checkbox" checked={detectHeadings} onChange={(e) => setDetectHeadings(e.target.checked)} className="h-4 w-4 accent-[#6D1F35]" />
                Detect headings from font size
              </label>
            </div>
          )}

          <div className="rounded-xl border border-amber-300/50 bg-amber-50/60 dark:bg-amber-950/20 p-4 text-xs">
            <p className="font-bold inline-flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4" /> Honest limitations</p>
            <p>
              {isDocxToPdf
                ? 'This converter rebuilds the document layout locally — text, paragraphs, headings, lists, and tables carry over. Images, headers/footers, footnotes, and exotic styling are not carried over, and non-Latin scripts (e.g. Assamese) may be substituted where the PDF font cannot encode them. For pixel-perfect fidelity use the original file.'
                : 'This converter extracts text and reconstructs paragraphs and headings. Complex multi-column layouts, images, and scanned pages cannot be faithfully reconstructed — scanned PDFs need OCR first. Converted text remains fully editable.'}
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-4">
            <FileNameInput
              label="Output filename"
              value={fileName}
              onChange={setFileName}
              extension={isDocxToPdf ? '.pdf' : '.docx'}
              hint="Processed and saved 100% on this device"
            />
            <button
              onClick={handleConvert}
              disabled={isProcessing}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[48px]"
            >
              {isDocxToPdf ? 'Convert to PDF' : 'Convert to Word'} <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {errorMessage && (
            <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {result && (
            <SuccessView
              fileName={`${fileName}.${isDocxToPdf ? 'pdf' : 'docx'}`}
              fileSize={result.size}
              title={isDocxToPdf ? 'PDF created' : 'Word document created'}
              downloadLabel="Download"
              onDownload={handleDownload}
              onReset={reset}
              resetLabel="Convert another"
              onPreview={isDocxToPdf && resultBlobUrl ? () => setIsPreviewOpen(true) : undefined}
              previewLabel="Preview PDF"
              additionalNote="Converted 100% locally — no document ever left this device."
            />
          )}

          <PdfPreviewModal
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            blobUrl={resultBlobUrl ?? undefined}
            title="Converted PDF preview"
          />
        </>
      )}

      <ProcessingModal isOpen={isProcessing} stepName={processStep} percentage={progressPct} fileName={file?.name} />
    </div>
  );
};
