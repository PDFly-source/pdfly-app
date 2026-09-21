'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { SuccessView } from '@/components/SuccessView';
import { signPdf, triggerDownload, formatBytes } from '@/lib/pdf-engine';
import { getPdfDocumentFromFile, renderPageThumbnail } from '@/lib/pdfjs-init';
import { addRecentJob } from '@/lib/recent-jobs';
import {
  PenTool,
  Type,
  Upload,
  Eraser,
  Check,
  AlertCircle,
  Calendar,
  Layers,
  RotateCw,
  Sliders,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';

export const SignPdfWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPage, setSelectedPage] = useState(1);
  const [pagePreviewUrl, setPagePreviewUrl] = useState<string | null>(null);

  // Signature creation mode: 'draw' | 'type' | 'upload'
  const [signMode, setSignMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedName, setTypedName] = useState('');
  const [typedFont, setTypedFont] = useState<'Dancing Script' | 'Caveat' | 'Great Vibes'>('Dancing Script');

  // Signature placement & transform settings
  const [posX, setPosX] = useState(150); // pt
  const [posY, setPosY] = useState(150); // pt
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [opacity, setOpacity] = useState(1.0); // 0.2 - 1.0
  const [addDateStamp, setAddDateStamp] = useState(true);

  // Remember signature locally
  const [rememberSignature, setRememberSignature] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return Boolean(localStorage.getItem('pdfly_saved_signature'));
    } catch {
      return false;
    }
  });
  const [hasSavedSignature, setHasSavedSignature] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return Boolean(localStorage.getItem('pdfly_saved_signature'));
    } catch {
      return false;
    }
  });

  // Drawing canvas ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [uploadedSignatureUrl, setUploadedSignatureUrl] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('Signing document...');
  const [progressPct, setProgressPct] = useState(0);

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFileName, setResultFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize canvas
  useEffect(() => {
    if (signMode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#141213';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [signMode, file]);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setErrorMessage(null);

    try {
      const pdfJsDoc = await getPdfDocumentFromFile(selected);
      setTotalPages(pdfJsDoc.numPages);
      setSelectedPage(pdfJsDoc.numPages); // Often signatures go on the last page

      const thumb = await renderPageThumbnail(pdfJsDoc, pdfJsDoc.numPages, 400);
      setPagePreviewUrl(thumb);
    } catch (err) {
      console.error(err);
      setErrorMessage('Could not render page preview.');
    }
  };

  const handlePageChange = async (newPage: number) => {
    setSelectedPage(newPage);
    if (!file) return;

    try {
      const pdfJsDoc = await getPdfDocumentFromFile(file);
      const thumb = await renderPageThumbnail(pdfJsDoc, newPage, 400);
      setPagePreviewUrl(thumb);
    } catch (e) {
      console.error(e);
    }
  };

  // Drawing event handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasDrawn(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedSignatureUrl(reader.result as string);
    };
    reader.readAsDataURL(uploaded);
  };

  const loadSavedSignature = () => {
    try {
      const saved = localStorage.getItem('pdfly_saved_signature');
      if (saved) {
        setUploadedSignatureUrl(saved);
        setSignMode('upload');
      }
    } catch (e) {
      // ignore
    }
  };

  const getSignatureDataUrl = (): string | null => {
    if (signMode === 'draw') {
      if (!canvasRef.current || !hasDrawn) return null;
      return canvasRef.current.toDataURL('image/png');
    }

    if (signMode === 'type') {
      if (!typedName.trim()) return null;
      const offscreen = document.createElement('canvas');
      offscreen.width = 400;
      offscreen.height = 140;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = '#141213';
      ctx.font = `italic 42px cursive`;
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, 20, 70);
      return offscreen.toDataURL('image/png');
    }

    if (signMode === 'upload') {
      return uploadedSignatureUrl;
    }

    return null;
  };

  const handleApplySignature = async () => {
    if (!file) return;
    const sigDataUrl = getSignatureDataUrl();
    if (!sigDataUrl) {
      setErrorMessage('Please create or provide a signature first.');
      return;
    }

    // Save locally if requested
    if (rememberSignature) {
      try {
        localStorage.setItem('pdfly_saved_signature', sigDataUrl);
        setHasSavedSignature(true);
      } catch (e) {
        // ignore
      }
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPct(15);

    try {
      const outBlob = await signPdf(
        file,
        {
          signatureDataUrl: sigDataUrl,
          pageNumber: selectedPage,
          x: posX,
          y: posY,
          width: 160 * scale,
          height: 60 * scale,
          addDateStamp,
          signerName: typedName.trim() || undefined,
        },
        (step, pct) => {
          setProcessStep(step);
          setProgressPct(pct);
        }
      );

      const outName = `signed_${file.name}`;
      setResultBlob(outBlob);
      setResultFileName(outName);

      addRecentJob({
        id: Math.random().toString(36).substring(2, 9),
        toolId: 'sign-pdf',
        toolName: 'Sign PDF',
        fileName: outName,
        fileSize: outBlob.size,
        timestamp: Date.now(),
        status: 'completed',
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Failed to apply signature.');
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
    clearCanvas();
  };

  if (resultBlob && file) {
    return (
      <SuccessView
        fileName={resultFileName}
        fileSize={resultBlob.size}
        downloadLabel="Download Signed PDF"
        onDownload={handleDownload}
        onReset={handleReset}
        additionalNote="Digitally embedded on your device without transmitting biometric signatures over the internet."
      />
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {!file ? (
        <FileDropzone
          onFilesSelected={handleFileSelected}
          maxFiles={1}
          accept=".pdf,application/pdf"
          label="Choose PDF to Sign"
          sublabel="Draw, type, or upload your signature directly in your secure local browser."
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729]">
            <div>
              <h3 className="text-sm font-semibold text-[#141213] dark:text-[#F5F0EB]">
                {file.name}
              </h3>
              <p className="text-xs text-[#5C554F] dark:text-[#A39991]">
                {formatBytes(file.size)} • {totalPages} Pages
              </p>
            </div>

            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] text-xs font-medium text-[#5C554F] dark:text-[#A39991] hover:text-[#141213]"
            >
              Change File
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Signature Creation */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729] space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB]">
                  1. Create Signature
                </h4>

                <div className="flex items-center gap-1 bg-[#F7F3EC] dark:bg-[#141213] p-1 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729]">
                  <button
                    onClick={() => setSignMode('draw')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      signMode === 'draw'
                        ? 'bg-white dark:bg-[#1E1A1B] text-[#6D1F35] dark:text-[#C6A15B] shadow-xs'
                        : 'text-[#5C554F] dark:text-[#A39991]'
                    }`}
                  >
                    Draw
                  </button>
                  <button
                    onClick={() => setSignMode('type')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      signMode === 'type'
                        ? 'bg-white dark:bg-[#1E1A1B] text-[#6D1F35] dark:text-[#C6A15B] shadow-xs'
                        : 'text-[#5C554F] dark:text-[#A39991]'
                    }`}
                  >
                    Type
                  </button>
                  <button
                    onClick={() => setSignMode('upload')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      signMode === 'upload'
                        ? 'bg-white dark:bg-[#1E1A1B] text-[#6D1F35] dark:text-[#C6A15B] shadow-xs'
                        : 'text-[#5C554F] dark:text-[#A39991]'
                    }`}
                  >
                    Upload
                  </button>
                </div>
              </div>

              {hasSavedSignature && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#FAF7F2] dark:bg-[#141213] border border-[#E5DFD4] dark:border-[#2E2729] text-xs">
                  <span className="text-[#5C554F] dark:text-[#A39991] flex items-center gap-1">
                    <BookmarkCheck className="w-3.5 h-3.5 text-[#238B63]" />
                    <span>Saved local signature available</span>
                  </span>
                  <button
                    onClick={loadSavedSignature}
                    className="text-[#6D1F35] dark:text-[#C6A15B] font-semibold hover:underline"
                  >
                    Use Saved
                  </button>
                </div>
              )}

              {/* Draw canvas */}
              {signMode === 'draw' && (
                <div>
                  <div className="relative border-2 border-dashed border-[#E5DFD4] dark:border-[#383033] rounded-xl bg-[#FAF7F2] dark:bg-[#141213] overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      width={420}
                      height={160}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-40 cursor-crosshair touch-none"
                    />
                    {!hasDrawn && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-[#5C554F]/50">
                        Sign your signature with mouse or finger
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-end">
                    <button
                      onClick={clearCanvas}
                      className="inline-flex items-center gap-1 text-xs text-[#C94A4A] hover:underline"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      <span>Clear Pad</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Type mode */}
              {signMode === 'type' && (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Enter your full name..."
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-[#FAF7F2] dark:bg-[#141213] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D1F35]"
                  />
                  {typedName && (
                    <div className="p-4 rounded-xl bg-[#FAF7F2] dark:bg-[#141213] border border-[#E5DFD4] dark:border-[#2E2729] text-center">
                      <p className="font-serif italic text-2xl text-[#141213] dark:text-[#F5F0EB]">
                        {typedName}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Upload mode */}
              {signMode === 'upload' && (
                <div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleSignatureUpload}
                    className="text-xs text-[#5C554F]"
                  />
                  {uploadedSignatureUrl && (
                    <div className="mt-3 p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#141213] border border-[#E5DFD4] flex items-center justify-center h-28">
                      <img
                        src={uploadedSignatureUrl}
                        alt="Signature"
                        className="max-h-full object-contain"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Remember signature & metadata checkboxes */}
              <div className="pt-3 border-t border-[#E5DFD4] dark:border-[#2E2729] space-y-2">
                <label className="flex items-center gap-2 text-xs font-medium text-[#141213] dark:text-[#F5F0EB] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberSignature}
                    onChange={(e) => setRememberSignature(e.target.checked)}
                    className="w-4 h-4 rounded text-[#6D1F35] focus:ring-[#6D1F35]"
                  />
                  <span>Remember signature locally on this device</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-[#141213] dark:text-[#F5F0EB] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addDateStamp}
                    onChange={(e) => setAddDateStamp(e.target.checked)}
                    className="w-4 h-4 rounded text-[#6D1F35] focus:ring-[#6D1F35]"
                  />
                  <span>Include current date stamp ({new Date().toLocaleDateString()})</span>
                </label>
              </div>
            </div>

            {/* Right: Placement & Page */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729] space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB]">
                2. Select Page & Position
              </h4>

              {/* Page selector */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-[#5C554F] dark:text-[#A39991]">
                  Apply to Page:
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedPage}
                    onChange={(e) => handlePageChange(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs font-medium"
                  >
                    {Array.from({ length: totalPages }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Page {i + 1} {i + 1 === totalPages ? '(Last)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Position and Scale sliders */}
              <div className="space-y-3 pt-2 border-t border-[#E5DFD4] dark:border-[#2E2729]">
                <div>
                  <div className="flex justify-between text-xs mb-1 text-[#5C554F] dark:text-[#A39991]">
                    <span>Horizontal Position (X)</span>
                    <span className="font-mono">{posX} pt</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="450"
                    value={posX}
                    onChange={(e) => setPosX(parseInt(e.target.value, 10))}
                    className="w-full accent-[#6D1F35] dark:accent-[#C6A15B]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 text-[#5C554F] dark:text-[#A39991]">
                    <span>Vertical Position from Bottom (Y)</span>
                    <span className="font-mono">{posY} pt</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="650"
                    value={posY}
                    onChange={(e) => setPosY(parseInt(e.target.value, 10))}
                    className="w-full accent-[#6D1F35] dark:accent-[#C6A15B]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1 text-[#5C554F] dark:text-[#A39991]">
                      <span>Scale</span>
                      <span className="font-mono">{scale}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="1.8"
                      step="0.1"
                      value={scale}
                      onChange={(e) => setScale(parseFloat(e.target.value))}
                      className="w-full accent-[#6D1F35] dark:accent-[#C6A15B]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1 text-[#5C554F] dark:text-[#A39991]">
                      <span>Opacity</span>
                      <span className="font-mono">{Math.round(opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="1.0"
                      step="0.05"
                      value={opacity}
                      onChange={(e) => setOpacity(parseFloat(e.target.value))}
                      className="w-full accent-[#6D1F35] dark:accent-[#C6A15B]"
                    />
                  </div>
                </div>
              </div>

              {/* Page visual indicator */}
              {pagePreviewUrl && (
                <div className="mt-3 relative aspect-3/4 max-h-48 mx-auto rounded-xl bg-[#FAF7F2] dark:bg-[#141213] border border-[#E5DFD4] flex items-center justify-center overflow-hidden p-2">
                  <img
                    src={pagePreviewUrl}
                    alt="Page preview"
                    className="max-h-full max-w-full object-contain"
                  />
                  <div className="absolute top-2 left-2 text-[11px] px-2 py-0.5 rounded-md bg-black/70 text-white font-mono">
                    Page {selectedPage}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="sticky bottom-4 z-30 p-4 rounded-2xl bg-[#F7F3EC]/90 dark:bg-[#141213]/90 border border-[#E5DFD4] dark:border-[#2E2729] shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-[#5C554F] dark:text-[#A39991]">
              Embedded directly into the PDF byte stream with local-first privacy.
            </span>

            <button
              id="action-apply-signature-btn"
              onClick={handleApplySignature}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#6D1F35] hover:bg-[#58182a] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <PenTool className="w-4 h-4" />
              <span>Apply Signature & Save</span>
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
