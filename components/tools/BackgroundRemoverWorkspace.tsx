'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ProcessingModal } from '@/components/ProcessingModal';
import { useRevokeOnUnmount } from '@/lib/use-revoke-on-unmount';
import { formatBytes } from '@/lib/pdf-engine';
import { addRecentJob } from '@/lib/recent-jobs';
import {
  loadImage,
  assertDecodedSize,
  removeBackgroundSmartColor,
  removeBackgroundPerson,
  disposePersonSegmenter,
} from '@/lib/image-engine';
import {
  Wand,
  RefreshCw,
  AlertTriangle,
  Download,
  ShieldCheck,
  Cpu,
  Palette,
  Wifi,
} from 'lucide-react';

/**
 * Local Background Remover — two genuine local modes:
 *
 * 1. AI PERSON (MediaPipe Selfie Segmentation): model runs in-browser on
 *    GPU/WASM. The small model files are fetched once from THIS site and
 *    cached by the service worker; inference is local and offline-capable.
 *    The image itself is NEVER uploaded.
 *
 * 2. SMART COLOR: deterministic border flood-fill segmentation for product
 *    shots on plain backgrounds. Runs in a Web Worker for big images.
 *
 * PRIVATE. POWERFUL. LOCAL.
 */

type Mode = 'person' | 'color';

export const BackgroundRemoverWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [img, setImg] = useState<{ width: number; height: number } | null>(null);
  const loadedRef = useRef<Awaited<ReturnType<typeof loadImage>> | null>(null);

  const [mode, setMode] = useState<Mode>('person');
  const [tolerance, setTolerance] = useState(32);
  const [feather, setFeather] = useState(2);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [processStep, setProcessStep] = useState('Analyzing…');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warnMessage, setWarnMessage] = useState<string | null>(null);

  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBytes, setResultBytes] = useState(0);
  const [resultName, setResultName] = useState('');
  useRevokeOnUnmount(resultUrl);
  useRevokeOnUnmount(sourceUrl);

  // release the ML runtime when the tool unmounts
  useEffect(() => () => disposePersonSegmenter(), []);

  const reset = () => {
    loadedRef.current?.dispose();
    loadedRef.current = null;
    setFile(null);
    setImg(null);
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceUrl(null);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setErrorMessage(null);
    setWarnMessage(null);
    setProgressPct(0);
  };

  const handleFiles = async (files: File[]) => {
    if (!files?.length) return;
    reset();
    const f = files[0];
    try {
      const loaded = await loadImage(f);
      assertDecodedSize(loaded.width, loaded.height);
      loadedRef.current = loaded;
      setFile(f);
      setImg({ width: loaded.width, height: loaded.height });
      setSourceUrl(URL.createObjectURL(f));
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  };

  const handleRemove = async () => {
    if (!file || !loadedRef.current) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setWarnMessage(null);
    setProgressPct(5);
    try {
      let blob: Blob;
      if (mode === 'person') {
        const res = await removeBackgroundPerson(loadedRef.current, {
          onProgress: (pct, label) => {
            setProgressPct(pct);
            setProcessStep(label);
          },
        });
        blob = res.blob;
      } else {
        const res = await removeBackgroundSmartColor(loadedRef.current, {
          tolerance,
          feather,
          onProgress: (pct, label) => {
            setProgressPct(pct);
            setProcessStep(label);
          },
        });
        blob = res.blob;
        if (res.backgroundRatio < 0.05) {
          setWarnMessage(
            'Almost no background was detected. Smart Color mode works best on plain, uniform backgrounds — try AI Person mode for photos of people, or increase the tolerance.'
          );
        } else if (res.backgroundRatio > 0.95) {
          setWarnMessage(
            'Nearly the whole image was treated as background — the subject may be too close to the background color. Lower the tolerance and try again.'
          );
        }
      }
      const name = `${file.name.replace(/\.[^.]+$/, '')}-nobg.png`;
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(URL.createObjectURL(blob));
      setResultBytes(blob.size);
      setResultName(name);
      addRecentJob({
        toolId: 'background-remover',
        toolName: 'Local Background Remover',
        fileName: name,
        fileSize: blob.size,
        status: 'completed',
      });
    } catch (err) {
      setErrorMessage((err as Error).message || 'Background removal failed.');
    } finally {
      setIsProcessing(false);
      setProgressPct(0);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        Image processing stays on your device. For AI Person mode, the local AI model may be downloaded once for inference — your image is never uploaded.
      </p>

      {!file && (
        <FileDropzone
          onFilesSelected={handleFiles}
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          label="Drop an image here"
          sublabel="People photos (AI mode) or objects on plain backgrounds (Smart Color mode)"
        />
      )}

      {file && img && (
        <>
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div className="min-w-0">
              <p className="truncate font-bold text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground">{img.width}×{img.height} px · {formatBytes(file.size)}</p>
            </div>
            <button onClick={reset} className="shrink-0 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-accent min-h-[44px]">
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> New image
            </button>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-4">
            <p className="text-sm font-bold inline-flex items-center gap-2"><Wand className="h-4 w-4 text-primary" aria-hidden="true" /> Removal mode</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode('person')}
                aria-pressed={mode === 'person'}
                className={`rounded-lg border px-3 py-2.5 text-sm font-semibold min-h-[84px] flex flex-col items-center gap-0.5 text-left ${mode === 'person' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
              >
                <span className="inline-flex items-center gap-1.5"><Cpu className="h-4 w-4" aria-hidden="true" /> AI Person</span>
                <span className="text-[10px] opacity-80 font-normal text-center">Local model for photos of people</span>
              </button>
              <button
                onClick={() => setMode('color')}
                aria-pressed={mode === 'color'}
                className={`rounded-lg border px-3 py-2.5 text-sm font-semibold min-h-[84px] flex flex-col items-center gap-0.5 text-left ${mode === 'color' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
              >
                <span className="inline-flex items-center gap-1.5"><Palette className="h-4 w-4" aria-hidden="true" /> Smart Color</span>
                <span className="text-[10px] opacity-80 font-normal text-center">Objects on plain backgrounds</span>
              </button>
            </div>

            {mode === 'color' ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="text-xs font-semibold text-muted-foreground space-y-1 block">
                  Color tolerance: {tolerance}
                  <input
                    type="range" min="8" max="90" value={tolerance}
                    onChange={(e) => setTolerance(Number(e.target.value))}
                    className="w-full accent-[#6D1F35]" aria-label="Color tolerance"
                  />
                  <span className="block font-normal">Higher removes more colors near the background.</span>
                </label>
                <label className="text-xs font-semibold text-muted-foreground space-y-1 block">
                  Edge softness: {feather}px
                  <input
                    type="range" min="0" max="12" value={feather}
                    onChange={(e) => setFeather(Number(e.target.value))}
                    className="w-full accent-[#6D1F35]" aria-label="Edge feathering"
                  />
                  <span className="block font-normal">Smooths the cut-out edge.</span>
                </label>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Wifi className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                First use downloads the small local model (~250 KB) from this site — that is a model download, not an image upload. It is cached for offline use afterwards.
              </p>
            )}
          </div>

          <button
            onClick={handleRemove}
            disabled={isProcessing}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[48px]"
          >
            <Wand className="h-4 w-4" aria-hidden="true" /> Remove background
          </button>

          {errorMessage && (
            <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <p>{errorMessage}</p>
                {mode === 'person' && (
                  <p className="text-xs text-muted-foreground">
                    If the model cannot load or run on this device, switch to Smart Color mode — it uses no model at all.
                  </p>
                )}
              </div>
            </div>
          )}

          {warnMessage && !errorMessage && (
            <div role="status" className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{warnMessage}</span>
            </div>
          )}

          {resultUrl && (
            <div className="rounded-xl border bg-card p-4 space-y-3" role="status">
              <p className="text-sm font-bold">Result — checkered preview shows transparency</p>
              <div
                className="rounded-lg border overflow-hidden"
                style={{
                  backgroundImage:
                    'linear-gradient(45deg, #2a2426 25%, transparent 25%), linear-gradient(-45deg, #2a2426 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2426 75%), linear-gradient(-45deg, transparent 75%, #2a2426 75%)',
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                  backgroundColor: '#3a3436',
                }}
              >
                <img src={resultUrl} alt="Image with background removed" className="w-full h-auto" />
              </div>
              {sourceUrl && (
                <div className="grid grid-cols-2 gap-3">
                  <figure className="space-y-1">
                    <img src={sourceUrl} alt="Original image" className="w-full h-auto rounded-md border" />
                    <figcaption className="text-xs text-muted-foreground text-center">Before</figcaption>
                  </figure>
                  <figure className="space-y-1">
                    <img src={resultUrl} alt="After background removal" className="w-full h-auto rounded-md border" />
                    <figcaption className="text-xs text-muted-foreground text-center">After</figcaption>
                  </figure>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Transparent PNG · {formatBytes(resultBytes)} — produced locally.</p>
              <a
                href={resultUrl}
                download={resultName}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 min-h-[48px]"
              >
                <Download className="h-4 w-4" aria-hidden="true" /> Save PNG
              </a>
            </div>
          )}
        </>
      )}

      <ProcessingModal isOpen={isProcessing} stepName={processStep} percentage={progressPct} />
    </div>
  );
};
