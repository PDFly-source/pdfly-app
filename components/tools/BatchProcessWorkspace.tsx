'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import {
  compressPdf,
  updateOrClearMetadata,
  watermarkPdf,
  addPageNumbers,
  triggerDownload,
  formatBytes,
} from '@/lib/pdf-engine';
import JSZip from 'jszip';
import { addRecentJob } from '@/lib/recent-jobs';
import {
  Copy,
  Minimize2,
  FileText,
  Stamp,
  Hash,
  Trash2,
  Download,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

type BatchOperation = 'compress' | 'sanitize' | 'watermark' | 'page-numbers';

export const BatchProcessWorkspace: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [operation, setOperation] = useState<BatchOperation>('compress');
  
  // Operation settings
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [pageNumberFormat, setPageNumberFormat] = useState<'1' | 'Page 1' | '1 / N' | 'Page 1 of N'>('Page 1 of N');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [currentFileLabel, setCurrentFileLabel] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [resultZipBlob, setResultZipBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearFiles = () => {
    setFiles([]);
  };

  const handleRunBatch = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setCompletedCount(0);
    setProgressPct(5);
    setErrorMessage(null);

    const zip = new JSZip();
    const total = files.length;

    try {
      for (let i = 0; i < total; i++) {
        const file = files[i];
        setCurrentFileLabel(`Processing ${file.name} (${i + 1} of ${total})...`);
        setProgressPct(5 + Math.round((i / total) * 85));

        let processedBlob: Blob;

        switch (operation) {
          case 'compress': {
            const compressRes = await compressPdf(file, 'balanced');
            processedBlob = compressRes.blob;
            break;
          }
          case 'sanitize':
            processedBlob = await updateOrClearMetadata(file, {}, true);
            break;
          case 'watermark':
            processedBlob = await watermarkPdf(file, {
              type: 'text',
              text: watermarkText,
              position: 'diagonal',
              opacity: 0.35,
              fontSize: 48,
              color: '#6D1F35',
            });
            break;
          case 'page-numbers':
            processedBlob = await addPageNumbers(file, {
              position: 'bottom-center',
              format: pageNumberFormat,
              startNumber: 1,
              fontSize: 10,
            });
            break;
        }

        const outName = `${file.name.replace(/\.[^/.]+$/, '')}_${operation}.pdf`;
        zip.file(outName, processedBlob);
        setCompletedCount(i + 1);
      }

      setCurrentFileLabel('Packaging ZIP archive...');
      setProgressPct(95);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const outZipName = `PDFMiniFly_Batch_${operation}_${files.length}_files.zip`;

      setResultZipBlob(zipBlob);
      setResultFileName(outZipName);

      addRecentJob({
        toolId: 'batch-process',
        toolName: `Batch ${operation}`,
        fileName: outZipName,
        fileSize: zipBlob.size,
        status: 'completed',
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Batch processing failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] p-6 sm:p-8 shadow-sm">
      {resultZipBlob ? (
        <SuccessView
          fileName={resultFileName}
          fileSize={resultZipBlob.size}
          downloadLabel="Download Batch ZIP"
          onDownload={() => triggerDownload(resultZipBlob, resultFileName)}
          onReset={() => {
            setResultZipBlob(null);
            setFiles([]);
            setCompletedCount(0);
          }}
          additionalNote={`Successfully processed all ${files.length} documents into a single archive.`}
        />
      ) : (
        <div className="space-y-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center mx-auto mb-4">
              <Copy className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5F0EB] mb-2">
              Batch Processing Center
            </h2>
            <p className="text-xs sm:text-sm text-[#5C554F] dark:text-[#A39991] mb-6">
              Apply operations across dozens of PDFs in parallel with local-first processing. No server queues.
            </p>
          </div>

          {/* Operation Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-3xl mx-auto">
            {[
              { id: 'compress', label: 'Batch Compress', icon: Minimize2, desc: 'Reduce file sizes' },
              { id: 'sanitize', label: 'Sanitize Metadata', icon: FileText, desc: 'Purge author tags' },
              { id: 'watermark', label: 'Batch Watermark', icon: Stamp, desc: 'Stamp diagonal mark' },
              { id: 'page-numbers', label: 'Page Numbers', icon: Hash, desc: 'Add footer numbers' },
            ].map((op) => {
              const Icon = op.icon;
              const active = operation === op.id;
              return (
                <button
                  key={op.id}
                  onClick={() => setOperation(op.id as BatchOperation)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    active
                      ? 'border-[#6D1F35] dark:border-[#C6A15B] bg-[#6D1F35]/5 dark:bg-[#C6A15B]/10 ring-1 ring-[#6D1F35]'
                      : 'border-[#E5DFD4] dark:border-[#2E2729] hover:border-[#6D1F35]/50 bg-white dark:bg-[#1E1A1B]'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-1.5 ${active ? 'text-[#6D1F35] dark:text-[#C6A15B]' : 'text-gray-400'}`} />
                  <p className="text-xs font-bold text-[#141213] dark:text-[#F5F0EB]">{op.label}</p>
                  <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">{op.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Operation Specific Config */}
          {operation === 'watermark' && (
            <div className="max-w-md mx-auto p-4 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-xs space-y-2">
              <label className="font-semibold text-[#141213] dark:text-[#F5F0EB]">Watermark Text:</label>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B]"
                placeholder="CONFIDENTIAL"
              />
            </div>
          )}

          {operation === 'page-numbers' && (
            <div className="max-w-md mx-auto p-4 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-xs space-y-2">
              <label className="font-semibold text-[#141213] dark:text-[#F5F0EB]">Numbering Format:</label>
              <select
                value={pageNumberFormat}
                onChange={(e: any) => setPageNumberFormat(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B]"
              >
                <option value="Page 1 of N">Page 1 of N</option>
                <option value="1 / N">1 / N</option>
                <option value="Page 1">Page 1</option>
                <option value="1">1</option>
              </select>
            </div>
          )}

          {/* File Upload Zone */}
          <div className="max-w-2xl mx-auto">
            <FileDropzone
              accept=".pdf,application/pdf"
              multiple={true}
              maxFiles={30}
              onFilesSelected={handleFilesSelected}
              label="Select multiple PDFs for batch queue"
              sublabel="Processed locally in your browser for supported tools"
            />
          </div>

          {/* Selected File List */}
          {files.length > 0 && (
            <div className="max-w-2xl mx-auto space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#141213] dark:text-[#F5F0EB]">
                  Batch Queue ({files.length} PDFs)
                </span>
                <button
                  onClick={clearFiles}
                  className="text-red-600 hover:underline"
                >
                  Clear Queue
                </button>
              </div>

              <div className="divide-y divide-[#E5DFD4] dark:divide-[#2E2729] max-h-56 overflow-y-auto rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2]/50 dark:bg-[#141213]/50">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileCheck className="w-4 h-4 text-[#238B63] shrink-0" />
                      <span className="truncate font-medium text-[#141213] dark:text-[#F5F0EB]">
                        {f.name}
                      </span>
                      <span className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
                        ({formatBytes(f.size)})
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(i)}
                      className="p-1 text-gray-400 hover:text-red-500"
                      title="Remove file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleRunBatch}
                  className="px-6 py-2.5 rounded-xl bg-[#6D1F35] text-white text-xs font-semibold hover:bg-[#58182a] inline-flex items-center gap-2 shadow-xs"
                >
                  <span>Process All ({files.length} PDFs)</span>
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ProcessingModal
        isOpen={isProcessing}
        stepName={`${completedCount} / ${files.length} completed • ${currentFileLabel}`}
        percentage={progressPct}
      />
    </div>
  );
};
