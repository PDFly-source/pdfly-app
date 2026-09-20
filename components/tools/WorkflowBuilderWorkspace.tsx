'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import {
  compressPdf,
  detectBlankPages,
  removePagesFromPdf,
  watermarkPdf,
  addPageNumbers,
  updateOrClearMetadata,
  triggerDownload,
  formatBytes,
} from '@/lib/pdf-engine';
import { addRecentJob } from '@/lib/recent-jobs';
import {
  Workflow,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Play,
  CheckCircle2,
  Layers,
  FileX,
  Minimize2,
  Stamp,
  Hash,
  FileText,
  GripVertical,
  Settings,
} from 'lucide-react';

interface PipelineStep {
  id: string;
  type: 'remove-blank' | 'compress' | 'watermark' | 'page-numbers' | 'sanitize';
  name: string;
  desc: string;
  options: Record<string, any>;
}

const AVAILABLE_STEPS: { type: PipelineStep['type']; name: string; desc: string }[] = [
  { type: 'remove-blank', name: 'Remove Blank Pages', desc: 'Detect and drop empty scanned sheets' },
  { type: 'compress', name: 'Compress Document', desc: 'Optimize image streams and font tables' },
  { type: 'watermark', name: 'Add Watermark', desc: 'Stamp diagonal text identifier' },
  { type: 'page-numbers', name: 'Add Page Numbers', desc: 'Insert footer pagination' },
  { type: 'sanitize', name: 'Sanitize Metadata', desc: 'Scrub author, creation, and app tags' },
];

export const WorkflowBuilderWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [steps, setSteps] = useState<PipelineStep[]>([
    {
      id: 'step-1',
      type: 'remove-blank',
      name: 'Remove Blank Pages',
      desc: 'Detect and drop empty scanned sheets',
      options: { threshold: 0.003 },
    },
    {
      id: 'step-2',
      type: 'compress',
      name: 'Compress Document',
      desc: 'Optimize image streams and font tables',
      options: { level: 'medium' },
    },
    {
      id: 'step-3',
      type: 'watermark',
      name: 'Add Watermark',
      desc: 'Stamp diagonal text identifier',
      options: { text: 'PDFly Verified' },
    },
  ]);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStepName, setCurrentStepName] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= steps.length) return;
    const next = [...steps];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    setSteps(next);
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const addStep = (type: PipelineStep['type']) => {
    const meta = AVAILABLE_STEPS.find((s) => s.type === type);
    if (!meta) return;
    setSteps((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        type,
        name: meta.name,
        desc: meta.desc,
        options: {},
      },
    ]);
    setAddModalOpen(false);
  };

  const handleRunWorkflow = async () => {
    if (!file || steps.length === 0) return;
    setIsProcessing(true);
    setProgressPct(5);
    setErrorMessage(null);

    try {
      let currentBlob: Blob = file;
      let currentFileObj = file;

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        setCurrentStepName(`Executing Step ${i + 1} of ${steps.length}: ${step.name}...`);
        setProgressPct(10 + Math.round((i / steps.length) * 80));

        switch (step.type) {
          case 'remove-blank': {
            const blanks = await detectBlankPages(currentFileObj, step.options.threshold || 0.003);
            if (blanks.length > 0) {
              const pagesToRemove = blanks.map((b) => b.pageNumber);
              currentBlob = await removePagesFromPdf(currentFileObj, pagesToRemove);
              currentFileObj = new File([currentBlob], 'temp.pdf', { type: 'application/pdf' });
            }
            break;
          }
          case 'compress': {
            const compressRes = await compressPdf(currentFileObj, step.options.level || 'medium');
            currentBlob = compressRes.blob;
            currentFileObj = new File([currentBlob], 'temp.pdf', { type: 'application/pdf' });
            break;
          }
          case 'watermark': {
            currentBlob = await watermarkPdf(currentFileObj, {
              type: 'text',
              text: step.options.text || 'CONFIDENTIAL',
              position: 'diagonal',
              opacity: 0.25,
              fontSize: 48,
              color: '#6D1F35',
            });
            currentFileObj = new File([currentBlob], 'temp.pdf', { type: 'application/pdf' });
            break;
          }
          case 'page-numbers': {
            currentBlob = await addPageNumbers(currentFileObj, {
              position: 'bottom-center',
              format: 'Page 1 of N',
              startNumber: 1,
              fontSize: 10,
            });
            currentFileObj = new File([currentBlob], 'temp.pdf', { type: 'application/pdf' });
            break;
          }
          case 'sanitize': {
            currentBlob = await updateOrClearMetadata(currentFileObj, {}, true);
            currentFileObj = new File([currentBlob], 'temp.pdf', { type: 'application/pdf' });
            break;
          }
        }
      }

      setCurrentStepName('Finalizing output...');
      setProgressPct(95);

      const outName = `${file.name.replace(/\.[^/.]+$/, '')}_workflow_processed.pdf`;
      setResultBlob(currentBlob);
      setResultFileName(outName);

      addRecentJob({
        toolId: 'workflow-builder',
        toolName: 'Workflow Builder',
        fileName: outName,
        fileSize: currentBlob.size,
        status: 'completed',
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Workflow execution error: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const getStepIcon = (type: PipelineStep['type']) => {
    switch (type) {
      case 'remove-blank':
        return <FileX className="w-4 h-4 text-[#C94A4A]" />;
      case 'compress':
        return <Minimize2 className="w-4 h-4 text-[#238B63]" />;
      case 'watermark':
        return <Stamp className="w-4 h-4 text-[#6D1F35] dark:text-[#C6A15B]" />;
      case 'page-numbers':
        return <Hash className="w-4 h-4 text-blue-500" />;
      case 'sanitize':
        return <FileText className="w-4 h-4 text-purple-500" />;
    }
  };

  return (
    <div className="rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] p-6 sm:p-8 shadow-sm">
      {resultBlob ? (
        <SuccessView
          fileName={resultFileName}
          fileSize={resultBlob.size}
          downloadLabel="Download Workflow Output"
          additionalNote={`Applied ${steps.length} automated operations. Result size: ${formatBytes(resultBlob.size)}.`}
          onDownload={() => triggerDownload(resultBlob, resultFileName)}
          onReset={() => {
            setResultBlob(null);
            setFile(null);
          }}
        />
      ) : (
        <div className="space-y-6">
          <div className="max-w-xl mx-auto text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center mx-auto mb-4">
              <Workflow className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5F0EB] mb-2">
              PDF Workflow Pipeline
            </h2>
            <p className="text-xs sm:text-sm text-[#5C554F] dark:text-[#A39991] mb-6">
              Chain multiple operations together into an automated, local-first recipe.
            </p>
          </div>

          {!file ? (
            <div className="max-w-xl mx-auto">
              <FileDropzone
                accept=".pdf,application/pdf"
                maxFiles={1}
                onFilesSelected={(files) => setFile(files[0])}
                label="Drop PDF here to run workflow"
                sublabel="Processed locally in your browser for supported tools"
              />
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Selected File Banner */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="px-2 py-0.5 rounded bg-[#6D1F35]/10 text-[#6D1F35] dark:text-[#C6A15B] font-bold">
                    INPUT
                  </span>
                  <span className="font-semibold text-[#141213] dark:text-[#F5F0EB] truncate">
                    {file.name}
                  </span>
                  <span className="text-[#5C554F] dark:text-[#A39991]">
                    ({formatBytes(file.size)})
                  </span>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="text-red-500 hover:underline text-xs"
                >
                  Change
                </button>
              </div>

              {/* Step Sequence Builder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#5C554F] dark:text-[#A39991]">
                  <span>Execution Order ({steps.length} Steps)</span>
                  <button
                    onClick={() => setAddModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[#6D1F35] dark:text-[#C6A15B] hover:underline normal-case font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Step</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {steps.map((step, idx) => (
                    <div
                      key={step.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#FAF7F2] dark:bg-[#141213] flex items-center justify-center font-bold text-[11px] text-[#5C554F] dark:text-[#A39991]">
                          {idx + 1}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStepIcon(step.type)}
                          <div>
                            <p className="font-bold text-[#141213] dark:text-[#F5F0EB]">
                              {step.name}
                            </p>
                            <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveStep(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-gray-400 hover:text-black dark:hover:text-white disabled:opacity-20"
                          title="Move Up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveStep(idx, 'down')}
                          disabled={idx === steps.length - 1}
                          className="p-1 text-gray-400 hover:text-black dark:hover:text-white disabled:opacity-20"
                          title="Move Down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeStep(step.id)}
                          className="p-1 text-gray-400 hover:text-red-600 ml-1"
                          title="Delete Step"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
                  {errorMessage}
                </div>
              )}

              {/* Run Workflow CTA */}
              <div className="pt-3">
                <button
                  onClick={handleRunWorkflow}
                  disabled={steps.length === 0}
                  className="w-full py-3.5 rounded-xl bg-[#6D1F35] text-white text-xs sm:text-sm font-semibold hover:bg-[#58182a] inline-flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-[0.99] disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Run Workflow ({steps.length} Steps)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Step Dialog */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1E1A1B] rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5DFD4] dark:border-[#2E2729]">
              <h3 className="text-sm font-bold text-[#141213] dark:text-[#F5F0EB]">
                Add Step to Pipeline
              </h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {AVAILABLE_STEPS.map((s) => (
                <button
                  key={s.type}
                  onClick={() => addStep(s.type)}
                  className="w-full p-3 text-left rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] hover:border-[#6D1F35] dark:hover:border-[#C6A15B] hover:bg-[#F7F3EC] dark:hover:bg-[#252021] transition-all"
                >
                  <p className="text-xs font-bold text-[#141213] dark:text-[#F5F0EB]">{s.name}</p>
                  <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <ProcessingModal
        isOpen={isProcessing}
        stepName={currentStepName}
        percentage={progressPct}
      />
    </div>
  );
};
