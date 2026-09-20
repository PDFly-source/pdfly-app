'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { createBookletPdf, triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { addRecentJob } from '@/lib/recent-jobs';
import {
  BookOpen,
  Printer,
  Sliders,
  Download,
  FileText,
  CheckCircle2,
} from 'lucide-react';

export const BookletMakerWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [paperSize, setPaperSize] = useState<'A4' | 'Letter' | 'A5'>('A4');
  const [binding, setBinding] = useState<'left' | 'right'>('left');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreateBooklet = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgressPct(30);
    setErrorMessage(null);

    try {
      const outBlob = await createBookletPdf(file, {
        pageSize: paperSize,
        binding,
      });

      const outName = `${file.name.replace(/\.[^/.]+$/, '')}_booklet_${paperSize}.pdf`;
      setProgressPct(95);

      setResultBlob(outBlob);
      setResultFileName(outName);

      addRecentJob({
        toolId: 'booklet-maker',
        toolName: 'Booklet Maker',
        fileName: outName,
        fileSize: outBlob.size,
        status: 'completed',
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Booklet generation failed: ' + (err?.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] p-6 sm:p-8 shadow-sm">
      {resultBlob ? (
        <SuccessView
          fileName={resultFileName}
          fileSize={resultBlob.size}
          downloadLabel="Download Booklet PDF"
          onDownload={() => triggerDownload(resultBlob, resultFileName)}
          onReset={() => {
            setResultBlob(null);
            setFile(null);
          }}
          additionalNote={`Successfully generated 2-up imposition booklet (${formatBytes(resultBlob.size)}). Ready for duplex printing.`}
        />
      ) : (
        <div className="space-y-6">
          <div className="max-w-xl mx-auto text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5F0EB] mb-2">
              PDF Booklet Maker (Printable 2-Up)
            </h2>
            <p className="text-xs sm:text-sm text-[#5C554F] dark:text-[#A39991] mb-6">
              Re-impose pages into printable 2-up spreads so you can print double-sided, fold down the center, and staple into a booklet.
            </p>
          </div>

          {!file ? (
            <div className="max-w-xl mx-auto">
              <FileDropzone
                accept=".pdf,application/pdf"
                maxFiles={1}
                onFilesSelected={(files) => setFile(files[0])}
                label="Drop PDF to convert into booklet"
                sublabel="Processed locally in your browser for supported tools"
              />
            </div>
          ) : (
            <div className="max-w-xl mx-auto space-y-5">
              <div className="p-3.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] flex items-center justify-between text-xs">
                <span className="font-semibold text-[#141213] dark:text-[#F5F0EB] truncate">
                  {file.name} ({formatBytes(file.size)})
                </span>
                <button onClick={() => setFile(null)} className="text-red-500 hover:underline">
                  Change
                </button>
              </div>

              {/* Options Grid */}
              <div className="p-5 rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs space-y-4 shadow-xs">
                <div className="space-y-2">
                  <label className="font-bold text-[#141213] dark:text-[#F5F0EB]">
                    Output Paper Sheet Size:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'A4' as const, label: 'A4 Paper (Spreads to A3)' },
                      { id: 'Letter' as const, label: 'US Letter' },
                      { id: 'A5' as const, label: 'A5 Paper (Pocket)' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPaperSize(p.id)}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          paperSize === p.id
                            ? 'border-[#6D1F35] dark:border-[#C6A15B] bg-[#6D1F35]/5 dark:bg-[#C6A15B]/10 font-bold ring-1 ring-[#6D1F35]'
                            : 'border-[#E5DFD4] dark:border-[#2E2729] hover:bg-[#FAF7F2]'
                        }`}
                      >
                        <p className="text-xs">{p.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-[#141213] dark:text-[#F5F0EB]">
                    Binding Spine Orientation:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setBinding('left')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        binding === 'left'
                          ? 'border-[#6D1F35] dark:border-[#C6A15B] bg-[#6D1F35]/5 dark:bg-[#C6A15B]/10 font-bold ring-1 ring-[#6D1F35]'
                          : 'border-[#E5DFD4] dark:border-[#2E2729] hover:bg-[#FAF7F2]'
                      }`}
                    >
                      Left-to-Right (Standard English/Latin)
                    </button>
                    <button
                      onClick={() => setBinding('right')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        binding === 'right'
                          ? 'border-[#6D1F35] dark:border-[#C6A15B] bg-[#6D1F35]/5 dark:bg-[#C6A15B]/10 font-bold ring-1 ring-[#6D1F35]'
                          : 'border-[#E5DFD4] dark:border-[#2E2729] hover:bg-[#FAF7F2]'
                      }`}
                    >
                      Right-to-Left (Manga / Arabic / Urdu)
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 text-amber-800 dark:text-amber-200 rounded-xl text-[11px] leading-relaxed">
                  <strong>Printing Guide:</strong> When printing the exported PDF, select <strong>Duplex (Two-Sided) Printing</strong> with <strong>Short-Edge Binding (Flip on short edge)</strong>. Then fold all sheets down the center spine!
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
                    {errorMessage}
                  </div>
                )}

                <button
                  onClick={handleCreateBooklet}
                  className="w-full py-3.5 rounded-xl bg-[#6D1F35] text-white text-xs sm:text-sm font-semibold hover:bg-[#58182a] inline-flex items-center justify-center gap-2 shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Generate Printable 2-Up Booklet</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ProcessingModal
        isOpen={isProcessing}
        stepName="Imposing pages into 2-up spreads..."
        percentage={progressPct}
      />
    </div>
  );
};
