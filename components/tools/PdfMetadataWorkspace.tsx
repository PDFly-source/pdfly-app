'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { getPdfMetadata, updatePdfMetadata, triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { addRecentJob } from '@/lib/recent-jobs';
import { FileText, Save, AlertCircle } from 'lucide-react';

export const PdfMetadataWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [subject, setSubject] = useState('');
  const [keywords, setKeywords] = useState('');
  const [producer, setProducer] = useState('');
  const [creator, setCreator] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Updating metadata...');
  const [progressPct, setProgressPct] = useState(0);

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setErrorMessage(null);

    try {
      const meta = await getPdfMetadata(selected);
      setTitle(meta.title || '');
      setAuthor(meta.author || '');
      setSubject(meta.subject || '');
      setKeywords(meta.keywords || '');
      setProducer(meta.producer || 'PDFMiniFly Local Toolkit');
      setCreator(meta.creator || 'PDFMiniFly');
    } catch {
      // Continue gracefully
    }
  };

  const handleSave = async () => {
    if (!file) return;
    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPct(10);

    try {
      const outBlob = await updatePdfMetadata(
        file,
        {
          title,
          author,
          subject,
          keywords,
          producer,
          creator,
        },
        (step, pct) => {
          setProcessStep(step);
          setProgressPct(pct);
        }
      );

      const outName = `metadata_${file.name}`;
      setResultBlob(outBlob);
      setResultFileName(outName);

      addRecentJob({
        toolId: 'edit-metadata',
        toolName: 'Edit PDF Metadata',
        fileName: outName,
        fileSize: outBlob.size,
        status: 'completed',
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Failed to update metadata.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (resultBlob && resultFileName) {
      triggerDownload(resultBlob, resultFileName);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResultBlob(null);
    setResultFileName('');
    setErrorMessage(null);
  };

  if (resultBlob && file) {
    return (
      <SuccessView
        fileName={resultFileName}
        fileSize={resultBlob.size}
        downloadLabel="Download Updated PDF"
        onDownload={handleDownload}
        onReset={handleReset}
        additionalNote="Document properties and metadata updated locally."
      />
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {!file ? (
        <FileDropzone
          onFilesSelected={handleFileSelected}
          multiple={false}
          accept=".pdf,application/pdf"
          label="Choose PDF to Inspect & Edit Metadata"
          sublabel="View or update document Title, Author, Subject, and Keywords locally."
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729]">
            <div>
              <h3 className="text-sm font-semibold text-[#141213] dark:text-[#F5F0EB]">
                {file.name}
              </h3>
              <p className="text-xs text-[#5C554F] dark:text-[#A39991]">
                Size: {formatBytes(file.size)}
              </p>
            </div>

            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] text-xs font-medium text-[#5C554F] dark:text-[#A39991] hover:text-[#141213]"
            >
              Change File
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729] space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB]">
              Document Properties
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[#141213] dark:text-[#F5F0EB] block mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#141213] dark:text-[#F5F0EB] block mb-1">
                  Author
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#141213] dark:text-[#F5F0EB] block mb-1">
                  Subject / Topic
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#141213] dark:text-[#F5F0EB] block mb-1">
                  Keywords (comma separated)
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#141213] dark:text-[#F5F0EB] block mb-1">
                  Creator Application
                </label>
                <input
                  type="text"
                  value={creator}
                  onChange={(e) => setCreator(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#141213] dark:text-[#F5F0EB] block mb-1">
                  PDF Producer
                </label>
                <input
                  type="text"
                  value={producer}
                  onChange={(e) => setProducer(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F3EC]/90 dark:bg-[#141213]/90 border border-[#E5DFD4] dark:border-[#2E2729] flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-[#5C554F] dark:text-[#A39991]">
              Saved directly into the document dictionary.
            </span>

            <button
              id="action-save-metadata-btn"
              onClick={handleSave}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#6D1F35] hover:bg-[#58182a] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <Save className="w-4 h-4" />
              <span>Save Metadata</span>
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 flex items-center gap-2.5 p-3.5 rounded-xl bg-[#C94A4A]/10 border border-[#C94A4A]/25 text-[#C94A4A] text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <ProcessingModal
        isOpen={isProcessing}
        stepName={processStep}
        percentage={progressPct}
      />
    </div>
  );
};
