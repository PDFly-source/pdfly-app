'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import {
  inspectFormFields,
  fillAndFlattenPdfForm,
  triggerDownload,
  formatBytes,
} from '@/lib/pdf-engine';
import { FormFieldItem } from '@/types/pdf';
import { addRecentJob } from '@/lib/recent-jobs';
import {
  CheckSquare,
  FileCheck,
  Download,
  CheckCircle2,
  Layers,
  AlertCircle,
} from 'lucide-react';

export const FillFormWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fields, setFields] = useState<FormFieldItem[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [flatten, setFlatten] = useState<boolean>(true);

  // Processing state
  const [isInspecting, setIsInspecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setIsInspecting(true);
    setErrorMessage(null);
    setResultBlob(null);

    try {
      const detectedFields = await inspectFormFields(selected);
      setFields(detectedFields);

      // Initialize default values
      const initialVals: Record<string, any> = {};
      detectedFields.forEach((f) => {
        initialVals[f.name] = f.value ?? (f.type === 'checkbox' ? false : '');
      });
      setValues(initialVals);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Could not inspect form fields in this PDF: ' + (err?.message || ''));
    } finally {
      setIsInspecting(false);
    }
  };

  const updateFieldVal = (name: string, val: any) => {
    setValues((prev) => ({ ...prev, [name]: val }));
  };

  const handleSaveForm = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgressPct(30);

    try {
      const outBlob = await fillAndFlattenPdfForm(file, values, flatten);
      const outName = `${file.name.replace(/\.[^/.]+$/, '')}_filled.pdf`;
      setProgressPct(95);

      setResultBlob(outBlob);
      setResultFileName(outName);

      addRecentJob({
        toolId: 'fill-form',
        toolName: 'Fill PDF Form',
        fileName: outName,
        fileSize: outBlob.size,
        status: 'completed',
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Failed to save filled form: ' + (err?.message || ''));
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
          downloadLabel="Download Filled PDF"
          onDownload={() => triggerDownload(resultBlob, resultFileName)}
          onReset={() => {
            setResultBlob(null);
            setFile(null);
            setFields([]);
          }}
          additionalNote={`Exported filled PDF (${formatBytes(resultBlob.size)})${
            flatten ? ' (permanently flattened)' : ''
          }.`}
        />
      ) : (
        <div className="space-y-6">
          <div className="max-w-xl mx-auto text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5F0EB] mb-2">
              Fill PDF Forms
            </h2>
            <p className="text-xs sm:text-sm text-[#5C554F] dark:text-[#A39991] mb-6">
              Fill interactive form fields locally with zero data transfer, then download or permanently flatten your filled document.
            </p>
          </div>

          {!file ? (
            <div className="max-w-xl mx-auto">
              <FileDropzone
                accept=".pdf,application/pdf"
                maxFiles={1}
                onFilesSelected={handleFileSelected}
                label="Select interactive PDF form"
                sublabel="Processed locally in your browser for supported tools"
              />
            </div>
          ) : isInspecting ? (
            <div className="max-w-md mx-auto p-8 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#6D1F35] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-[#141213] dark:text-[#F5F0EB]">
                Inspecting form fields locally...
              </p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-xs">
                <span className="font-semibold text-[#141213] dark:text-[#F5F0EB]">
                  {file.name} — {fields.length} Interactive {fields.length === 1 ? 'Field' : 'Fields'} Detected
                </span>
                <button onClick={() => setFile(null)} className="text-red-500 hover:underline">
                  Change
                </button>
              </div>

              {fields.length === 0 ? (
                <div className="p-6 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 text-xs text-center space-y-2">
                  <p className="font-bold">No Interactive AcroForm Fields Found</p>
                  <p>
                    This document appears to be a flat scanned PDF or static text document rather than an interactive form. You can use the <strong>PDF Editor</strong> to add text boxes and signature stamps directly on the page.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3 max-h-[500px] overflow-y-auto p-1">
                    {fields.map((f, i) => (
                      <div
                        key={f.name + i}
                        className="p-3.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-[#141213] dark:text-[#F5F0EB]">
                            {f.name}
                          </label>
                          <span className="text-[11px] uppercase font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
                            {f.type}
                          </span>
                        </div>

                        {f.type === 'text' && (
                          <input
                            type="text"
                            value={values[f.name] || ''}
                            onChange={(e) => updateFieldVal(f.name, e.target.value)}
                            placeholder={`Enter ${f.name}...`}
                            className="w-full px-3 py-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#141213] focus:outline-none focus:ring-1 focus:ring-[#6D1F35]"
                          />
                        )}

                        {f.type === 'checkbox' && (
                          <label className="flex items-center gap-2 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={!!values[f.name]}
                              onChange={(e) => updateFieldVal(f.name, e.target.checked)}
                              className="w-4 h-4 rounded text-[#6D1F35] focus:ring-[#6D1F35]"
                            />
                            <span className="text-xs font-medium text-[#141213] dark:text-[#F5F0EB]">
                              Checked
                            </span>
                          </label>
                        )}

                        {f.type === 'dropdown' && (
                          <select
                            value={values[f.name] || ''}
                            onChange={(e) => updateFieldVal(f.name, e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#141213]"
                          >
                            <option value="">-- Select Option --</option>
                            {f.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}

                        {f.type === 'radio' && (
                          <div className="flex flex-wrap items-center gap-3 pt-1">
                            {f.options?.map((opt) => (
                              <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-xs">
                                <input
                                  type="radio"
                                  name={f.name}
                                  value={opt}
                                  checked={values[f.name] === opt}
                                  onChange={() => updateFieldVal(f.name, opt)}
                                  className="w-3.5 h-3.5 text-[#6D1F35]"
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Flatten Form Toggle Option */}
                  <div className="p-3 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-[#141213] dark:text-[#F5F0EB]">
                        Flatten Form (Recommended)
                      </p>
                      <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
                        Permanently renders form values into the page content to prevent future edits.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={flatten}
                        onChange={(e) => setFlatten(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#6D1F35]"></div>
                    </label>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
                      {errorMessage}
                    </div>
                  )}

                  <button
                    onClick={handleSaveForm}
                    className="w-full py-3.5 rounded-xl bg-[#6D1F35] text-white text-xs sm:text-sm font-semibold hover:bg-[#58182a] inline-flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Save & Export PDF Form</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ProcessingModal
        isOpen={isProcessing}
        stepName="Saving filled form data..."
        percentage={progressPct}
      />
    </div>
  );
};
