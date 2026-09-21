'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, RotateCw, Copy, Trash2, ChevronUp, ChevronDown, ArrowDownToLine, FlipHorizontal2, Sparkles } from 'lucide-react';
import type { WorkflowStep, DocumentAnalysis } from '@/lib/workflow-engine';

interface StepSettingsSheetProps {
  step: WorkflowStep;
  analysis: DocumentAnalysis;
  file: File | null;
  onChange: (options: Record<string, any>) => void;
  onClose: () => void;
}

const inputCls =
  'w-full px-3 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] text-xs font-medium text-[#141213] dark:text-[#F5F0EB]';
const labelCls =
  'text-xs font-semibold uppercase tracking-wider text-[#141213] dark:text-[#F5F0EB] block mb-2';

export const StepSettingsSheet: React.FC<StepSettingsSheetProps> = ({ step, analysis, file, onChange, onClose }) => {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#FFFDF9] dark:bg-[#1B1719] border border-[#E8DFD3] dark:border-[#2E2629] shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[#FFFDF9] dark:bg-[#1B1719] border-b border-[#E8DFD3] dark:border-[#2E2629]">
          <h3 className="text-sm font-bold text-[#1A1416] dark:text-[#F7F1E8]">Step Settings</h3>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[#5C554F] dark:text-[#A39991]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {step.type === 'remove-blank' && <RemoveBlankSettings step={step} analysis={analysis} onChange={onChange} />}
          {step.type === 'rotate' && <RotateSettings step={step} analysis={analysis} onChange={onChange} />}
          {step.type === 'organize' && <OrganizeSettings step={step} analysis={analysis} onChange={onChange} />}
          {step.type === 'ocr' && <OcrSettings step={step} analysis={analysis} onChange={onChange} />}
          {step.type === 'compress' && <CompressSettings step={step} analysis={analysis} onChange={onChange} />}
          {step.type === 'watermark' && <WatermarkSettings step={step} analysis={analysis} file={file} onChange={onChange} onClose={onClose} />}
          {step.type === 'page-numbers' && <PageNumbersSettings step={step} analysis={analysis} onChange={onChange} />}
          {step.type === 'sanitize' && <SanitizeSettings step={step} analysis={analysis} onChange={onChange} />}
        </div>
      </div>
    </div>
  );
};

type SettingsProps = {
  step: WorkflowStep;
  analysis: DocumentAnalysis;
  onChange: (options: Record<string, any>) => void;
};

const set = (onChange: SettingsProps['onChange'], options: Record<string, any>, patch: Record<string, any>) =>
  onChange({ ...options, ...patch });

// ============ REMOVE BLANK ============
const RemoveBlankSettings: React.FC<SettingsProps> = ({ step, analysis, onChange }) => {
  const o = step.options;
  const blanks = analysis.blankPages;
  const near = analysis.nearBlankPages;
  const detected = [...blanks, ...near].sort((a, b) => a - b);
  const selected: number[] = Array.isArray(o.selectedPages) ? o.selectedPages : [...blanks];

  return (
    <>
      <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
        Detection re-runs during execution with this sensitivity. Pages you deselect are kept.
      </p>
      <div>
        <label className={labelCls}>Sensitivity</label>
        <select
          value={o.threshold ?? 0.003}
          onChange={(e) => set(onChange, o, { threshold: parseFloat(e.target.value) })}
          className={inputCls}
        >
          <option value={0.001}>Strict — only fully blank pages</option>
          <option value={0.003}>Standard (recommended)</option>
          <option value={0.006}>Relaxed — also catches faint scans</option>
        </select>
      </div>

      <label className="flex items-center gap-2.5 text-xs font-medium text-[#141213] dark:text-[#F5F0EB]">
        <input
          type="checkbox"
          checked={!!o.includeNearBlank}
          onChange={(e) => set(onChange, o, { includeNearBlank: e.target.checked })}
          className="w-4 h-4 rounded accent-[#6D1F35]"
        />
        Include near-blank pages (low content)
      </label>

      <div>
        <p className={labelCls}>Detected pages ({detected.length})</p>
        {detected.length === 0 ? (
          <p className="text-[11px] text-[#258B5C] bg-[#35C98A]/10 border border-[#35C98A]/25 rounded-xl px-3 py-2.5">
            No blank or near-blank pages found in this document. This step will be a no-op.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {detected.map((p) => {
              const isBlank = blanks.includes(p);
              const isSel = selected.includes(p);
              return (
                <label
                  key={p}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                    isSel
                      ? 'border-[#6D1F35] bg-[#6D1F35]/10 text-[#6D1F35] dark:text-[#C9A15A] dark:border-[#C9A15A] dark:bg-[#C9A15A]/10'
                      : 'border-[#E5DFD4] dark:border-[#2E2729] text-[#5C554F] dark:text-[#A39991]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSel}
                    disabled={!isBlank && isSel === false && !o.includeNearBlank && !blanks.includes(p) && !near.includes(p)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...selected, p].sort((a, b) => a - b)
                        : selected.filter((x) => x !== p);
                      set(onChange, o, { selectedPages: next });
                    }}
                    className="w-3.5 h-3.5 rounded accent-[#6D1F35]"
                  />
                  {p} {isBlank ? '(blank)' : '(near-blank)'}
                </label>
              );
            })}
          </div>
        )}
      </div>
      <p className="text-[11px] text-[#5C554F] dark:text-[#A39991] italic">Preview Changes: use Dry Run before running to see the exact effect.</p>
    </>
  );
};

// ============ ROTATE ============
const RotateSettings: React.FC<SettingsProps> = ({ step, analysis, onChange }) => {
  const o = step.options;
  const rotated = analysis.rotatedPages;
  return (
    <>
      <div>
        <label className={labelCls}>Mode</label>
        <select
          value={o.mode}
          onChange={(e) => set(onChange, o, { mode: e.target.value })}
          className={inputCls}
        >
          <option value="auto-fix">Auto-fix — normalize {rotated.length} rotated page(s) to upright</option>
          <option value="all">Rotate all pages</option>
          <option value="range">Rotate selected pages</option>
        </select>
      </div>

      {o.mode !== 'auto-fix' && (
        <>
          <div>
            <label className={labelCls}>Direction</label>
            <div className="grid grid-cols-3 gap-2">
              {[{ v: -90, l: '90° CCW' }, { v: 90, l: '90° CW' }, { v: 180, l: '180°' }].map((d) => (
                <button
                  key={d.v}
                  onClick={() => set(onChange, o, { angle: d.v })}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    o.angle === d.v
                      ? 'border-[#6D1F35] bg-[#6D1F35]/10 text-[#6D1F35] dark:text-[#C9A15A] dark:border-[#C9A15B]'
                      : 'border-[#E5DFD4] dark:border-[#2E2729] text-[#5C554F] dark:text-[#A39991]'
                  }`}
                >
                  {d.l}
                </button>
              ))}
            </div>
          </div>
          {o.mode === 'range' && (
            <div>
              <label className={labelCls}>Pages (e.g. 1-3,5,9)</label>
              <input
                type="text"
                value={o.pages}
                onChange={(e) => set(onChange, o, { pages: e.target.value })}
                placeholder="1-3,5,9"
                className={inputCls}
              />
            </div>
          )}
        </>
      )}

      {o.mode === 'auto-fix' && (
        <p className="text-[11px] text-[#5C554F] dark:text-[#A39991] bg-[#F7F3EC] dark:bg-[#141213] border border-[#E5DFD4] dark:border-[#2E2729] rounded-xl px-3 py-2.5">
          {rotated.length > 0
            ? `Pages with rotation metadata: ${rotated.map((r) => `${r.page} (${r.angle}°)`).join(', ')}. They will be set upright.`
            : 'No rotated pages detected — this step will be a no-op.'}
        </p>
      )}
    </>
  );
};

// ============ ORGANIZE ============
interface OrgItem {
  id: string;
  originalIndex: number;
  rotation: number;
  label: string;
  thumbnail?: string;
}

const OrganizeSettings: React.FC<SettingsProps> = ({ step, analysis, onChange }) => {
  const initialItems: OrgItem[] = useMemo(() => {
    const existing = step.options.items as any[] | null;
    if (existing && existing.length) {
      return existing.map((it) => ({
        id: it.id,
        originalIndex: it.originalIndex,
        rotation: it.rotation,
        label: `Page ${it.originalIndex + 1}`,
        thumbnail: analysis.pages[it.originalIndex]?.thumbnail,
      }));
    }
    return analysis.pages.map((p) => ({
      id: `org-${p.pageNumber}`,
      originalIndex: p.pageNumber - 1,
      rotation: 0,
      label: `Page ${p.pageNumber}`,
      thumbnail: p.thumbnail,
    }));
  }, [step.options.items, analysis.pages]);

  const [items, setItems] = useState<OrgItem[]>(initialItems);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const commit = (next: OrgItem[]) => {
    setItems(next);
    onChange({
      items: next.map((it) => ({ id: it.id, originalIndex: it.originalIndex, rotation: it.rotation, isBlank: false })),
    });
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const copy = [...items];
    const [m] = copy.splice(from, 1);
    copy.splice(to, 0, m);
    commit(copy);
  };

  const rotate = (idx: number) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], rotation: (copy[idx].rotation + 90) % 360 };
    commit(copy);
  };

  const duplicate = (idx: number) => {
    const copy = [...items];
    const src = copy[idx];
    copy.splice(idx + 1, 0, { ...src, id: `${src.id}-d${Math.random().toString(36).slice(2, 5)}` });
    commit(copy);
  };

  const remove = (idx: number) => {
    if (items.length <= 1) return;
    commit(items.filter((_, i) => i !== idx));
  };

  const reverse = () => commit([...items].reverse());

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5C554F] dark:text-[#A39991]">
          {items.length} page(s)
        </p>
        <button
          onClick={reverse}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] text-[11px] font-bold text-[#141213] dark:text-[#F5F0EB] hover:bg-black/5 dark:hover:bg-white/5"
        >
          <FlipHorizontal2 className="w-3.5 h-3.5" />
          Reverse order
        </button>
      </div>

      <ol className="space-y-2">
        {items.map((it, idx) => (
          <li
            key={it.id}
            draggable
            onDragStart={() => setDragIdx(idx)}
            onDragEnd={() => {
              setDragIdx(null);
              setOverIdx(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOverIdx(idx);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIdx !== null) move(dragIdx, idx);
              setDragIdx(null);
              setOverIdx(null);
            }}
            className={`flex items-center gap-2.5 p-2.5 rounded-xl border touch-none transition-all ${
              overIdx === idx && dragIdx !== null && dragIdx !== idx
                ? 'border-[#C9A15A] scale-[1.01]'
                : 'border-[#E5DFD4] dark:border-[#2E2729]'
            } ${dragIdx === idx ? 'opacity-40' : ''} bg-white dark:bg-[#1E1A1B]`}
          >
            <span className="p-1 rounded-lg text-[#A79B90] cursor-grab active:cursor-grabbing" title="Drag to reorder page">
              ⠿
            </span>
            <span className="w-6 h-6 shrink-0 rounded-full bg-[#6D1F35]/10 dark:bg-[#C9A15A]/10 text-[#6D1F35] dark:text-[#C9A15A] text-[11px] font-bold flex items-center justify-center">
              {idx + 1}
            </span>
            {it.thumbnail ? (
              <img
                src={it.thumbnail}
                alt=""
                className="w-10 h-12 object-cover rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] shrink-0"
                style={{ transform: `rotate(${it.rotation}deg)` }}
              />
            ) : (
              <span className="w-10 h-12 rounded-lg bg-[#F7F3EC] dark:bg-[#141213] shrink-0" />
            )}
            <span className="flex-1 text-[11px] font-semibold text-[#141213] dark:text-[#F5F0EB] truncate">
              {it.label}
              {it.rotation > 0 && <span className="text-[#5C554F] dark:text-[#A39991]"> · {it.rotation}°</span>}
            </span>
            <span className="flex items-center gap-0.5">
              <button onClick={() => rotate(idx)} aria-label="Rotate page" title="Rotate 90°" className="p-1.5 rounded-lg text-[#5C554F] dark:text-[#A39991] hover:text-[#141213] dark:hover:text-[#F5F0EB]">
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => duplicate(idx)} aria-label="Duplicate page" title="Duplicate page" className="p-1.5 rounded-lg text-[#5C554F] dark:text-[#A39991] hover:text-[#141213] dark:hover:text-[#F5F0EB]">
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => remove(idx)} aria-label="Delete page" title="Delete page" className="p-1.5 rounded-lg text-[#C94A4A] hover:bg-[#C94A4A]/10">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => move(idx, idx - 1)} disabled={idx === 0} aria-label="Move page up" className="p-1.5 rounded-lg text-[#5C554F] dark:text-[#A39991] disabled:opacity-20">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => move(idx, idx + 1)} disabled={idx === items.length - 1} aria-label="Move page down" className="p-1.5 rounded-lg text-[#5C554F] dark:text-[#A39991] disabled:opacity-20">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </span>
          </li>
        ))}
      </ol>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-[#C9A15A]/10 border border-[#C9A15A]/30">
        <ArrowDownToLine className="w-3.5 h-3.5 text-[#8A6D2F] dark:text-[#C9A15A] mt-0.5" />
        <p className="text-[11px] text-[#8A6D2F] dark:text-[#C9A15A]">
          Reorder, rotate, duplicate or delete pages above. To extract pages, delete everything you do not want.
        </p>
      </div>
    </>
  );
};

// ============ OCR ============
const OcrSettings: React.FC<SettingsProps> = ({ step, analysis, onChange }) => {
  const o = step.options;
  return (
    <>
      <div className="flex items-start gap-2 p-3 rounded-xl bg-[#35C98A]/10 border border-[#35C98A]/25 mb-1">
        <p className="text-[11px] text-[#258B5C] dark:text-[#35C98A]">
          OCR runs locally (Tesseract in-browser engine). An invisible text layer is embedded over the original pages, keeping visuals unchanged while making text selectable.
        </p>
      </div>
      <div>
        <label className={labelCls}>Language</label>
        <select value={o.language} onChange={(e) => set(onChange, o, { language: e.target.value })} className={inputCls}>
          <option value="eng">English (eng)</option>
          <option value="hin">Hindi (हिन्दी - hin)</option>
          <option value="ben">Bengali (বাংলা - ben)</option>
          <option value="asm">Assamese (অসমীয়া - asm)</option>
        </select>
      </div>
      <div>
        <label className={labelCls}>Pages</label>
        <select value={o.mode} onChange={(e) => set(onChange, o, { mode: e.target.value })} className={inputCls}>
          <option value="all">All pages ({analysis.pageCount})</option>
          <option value="range">Custom range</option>
        </select>
      </div>
      {o.mode === 'range' && (
        <div>
          <label className={labelCls}>Page range (e.g. 1-10,12)</label>
          <input
            type="text"
            value={o.range}
            onChange={(e) => set(onChange, o, { range: e.target.value })}
            placeholder="1-10,12"
            className={inputCls}
          />
        </div>
      )}
      <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
        {analysis.scannedPages > 0
          ? `${analysis.scannedPages} scanned page(s) detected. OCR is ${analysis.ocrRecommended ? 'recommended' : 'optional'} for this document.`
          : 'This document appears to already contain selectable text. OCR may still help scanned images inside it.'}
      </p>
    </>
  );
};

// ============ COMPRESS ============
const CompressSettings: React.FC<SettingsProps> = ({ step, analysis, onChange }) => {
  const o = step.options;
  const est = analysis.compressionEstimate;
  return (
    <>
      <div>
        <label className={labelCls}>Mode</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: 'low', l: 'Fast', d: 'Structure only' },
            { v: 'balanced', l: 'Balanced', d: 'Recommended' },
            { v: 'extreme', l: 'Maximum', d: 'Smallest file' },
          ].map((m) => (
            <button
              key={m.v}
              onClick={() => set(onChange, o, { level: m.v })}
              className={`p-3 rounded-xl text-left border transition-all ${
                o.level === m.v
                  ? 'border-[#6D1F35] bg-[#6D1F35]/10 ring-1 ring-[#6D1F35]'
                  : 'border-[#E5DFD4] dark:border-[#2E2729] hover:border-[#6D1F35]/50'
              }`}
            >
              <p className="text-xs font-bold text-[#141213] dark:text-[#F5F0EB]">{m.l}</p>
              <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">{m.d}</p>
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-xs font-medium text-[#141213] dark:text-[#F5F0EB]">
        <input
          type="checkbox"
          checked={!!o.removeMetadata}
          onChange={(e) => set(onChange, o, { removeMetadata: e.target.checked })}
          className="w-4 h-4 rounded accent-[#6D1F35]"
        />
        Also strip metadata during compression
      </label>

      <div className="p-3.5 rounded-xl bg-[#F7F3EC] dark:bg-[#141213] border border-[#E5DFD4] dark:border-[#2E2729]">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5C554F] dark:text-[#A39991] mb-1">Estimated result</p>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-[#5C554F] dark:text-[#A39991] line-through">
            {(analysis.fileSize / 1024 / 1024).toFixed(1)} MB
          </span>
          <span>→</span>
          <span className="font-bold text-[#258B5C]">
            {est ? `~${(est.estimatedBytes / 1024 / 1024).toFixed(1)} MB` : 'not reliably estimable'}
          </span>
        </div>
        <p className="text-[11px] text-[#5C554F] dark:text-[#A39991] mt-1">
          {est
            ? `Measured from ${est.sampledPages} sampled page(s) — actual result may vary.`
            : 'No estimate shown because this document does not appear to be image-dominant; the real savings are measured after execution.'}
        </p>
      </div>
    </>
  );
};

// ============ WATERMARK ============
const WatermarkSettings: React.FC<StepSettingsSheetProps> = ({ step, analysis, file, onChange }) => {
  const o = step.options;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Render page-1 preview via pdf.js
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!file) return;
      try {
        const { getPdfDocumentFromFile } = await import('@/lib/pdfjs-init');
        const doc = await getPdfDocumentFromFile(file);
        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: 0.55 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!cancelled) setPreviewUrl(canvas.toDataURL('image/jpeg', 0.7));
        canvas.width = 0;
        canvas.height = 0;
      } catch {
        /* preview best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  const isImage = o.type === 'image';
  const wmLeft = (o.customX ?? 0.5) * 100;
  const wmTop = (o.customY ?? 0.5) * 100;

  const handleDrag = (clientX: number, clientY: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    set(onChange, o, { position: 'custom', customX: x, customY: y });
  };

  return (
    <>
      <div>
        <label className={labelCls}>Type</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => set(onChange, o, { type: 'text' })}
            className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${!isImage ? 'border-[#6D1F35] bg-[#6D1F35]/10 text-[#6D1F35] dark:text-[#C9A15A]' : 'border-[#E5DFD4] dark:border-[#2E2729] text-[#5C554F] dark:text-[#A39991]'}`}
          >
            Text
          </button>
          <button
            onClick={() => set(onChange, o, { type: 'image' })}
            className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${isImage ? 'border-[#6D1F35] bg-[#6D1F35]/10 text-[#6D1F35] dark:text-[#C9A15A]' : 'border-[#E5DFD4] dark:border-[#2E2729] text-[#5C554F] dark:text-[#A39991]'}`}
          >
            Image / Logo
          </button>
        </div>
      </div>

      {!isImage ? (
        <>
          <div>
            <label className={labelCls}>Text</label>
            <input
              type="text"
              value={o.text}
              onChange={(e) => set(onChange, o, { text: e.target.value })}
              className={inputCls}
              placeholder="CONFIDENTIAL"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Size</label>
              <input
                type="number"
                min={8}
                max={120}
                value={o.fontSize}
                onChange={(e) => set(onChange, o, { fontSize: parseInt(e.target.value) || 48 })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Color</label>
              <input
                type="color"
                value={o.color}
                onChange={(e) => set(onChange, o, { color: e.target.value })}
                className="w-full h-[38px] rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] px-1"
              />
            </div>
          </div>
        </>
      ) : (
        <div>
          <label className={labelCls}>Watermark image (PNG/JPG)</label>
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const buf = await f.arrayBuffer();
              set(onChange, o, { imageBuffer: buf, imageType: f.type.includes('png') ? 'png' : 'jpeg' });
            }}
            className="w-full text-xs text-[#5C554F] dark:text-[#A39991] file:mr-3 file:px-3 file:py-2 file:rounded-xl file:border-0 file:bg-[#6D1F35] file:text-white file:text-xs file:font-bold"
          />
          {o.imageBuffer && <p className="text-[11px] text-[#258B5C] mt-1.5">✓ Image loaded locally</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Opacity {(Math.round((o.opacity ?? 0.35) * 100))}%</label>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={o.opacity}
            onChange={(e) => set(onChange, o, { opacity: parseFloat(e.target.value) })}
            className="w-full accent-[#6D1F35]"
          />
        </div>
        <div>
          <label className={labelCls}>Rotation {o.rotation ?? 0}°</label>
          <input
            type="range"
            min={-90}
            max={90}
            step={5}
            value={o.rotation}
            onChange={(e) => set(onChange, o, { rotation: parseInt(e.target.value) })}
            className="w-full accent-[#6D1F35]"
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Position</label>
        <div className="grid grid-cols-3 gap-1.5">
          {['top-left', 'top', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom', 'bottom-right', 'diagonal'].map((pos) => {
            const normPos = pos === 'center-left' ? 'center' : pos === 'center-right' ? 'center' : pos;
            return (
              <button
                key={pos}
                onClick={() =>
                  set(onChange, o, {
                    position: normPos,
                    ...(normPos === 'diagonal' ? { rotation: 45 } : {}),
                  })
                }
                className={`px-2 py-2 rounded-lg text-[11px] font-bold border transition-all ${
                  o.position === normPos
                    ? 'border-[#6D1F35] bg-[#6D1F35]/10 text-[#6D1F35] dark:text-[#C9A15A]'
                    : 'border-[#E5DFD4] dark:border-[#2E2729] text-[#5C554F] dark:text-[#A39991] hover:border-[#6D1F35]/40'
                }`}
              >
                {pos.replace('-', ' ')}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className={labelCls}>Pages</label>
        <select
          value={o.pageMode}
          onChange={(e) => set(onChange, o, { pageMode: e.target.value })}
          className={inputCls}
        >
          <option value="all">All pages</option>
          <option value="first">First page only</option>
          <option value="last">Last page only</option>
          <option value="odd">Odd pages</option>
          <option value="even">Even pages</option>
          <option value="range">Custom range</option>
        </select>
        {o.pageMode === 'range' && (
          <input
            type="text"
            value={o.pageRange}
            onChange={(e) => set(onChange, o, { pageRange: e.target.value })}
            placeholder="e.g. 1-3,5"
            className={`${inputCls} mt-2`}
          />
        )}
      </div>

      {/* Visual preview with drag positioning */}
      <div>
        <label className={labelCls}>Live preview — drag to position</label>
        <div
          ref={wrapRef}
          className="relative mx-auto max-w-[280px] rounded-xl overflow-hidden border border-[#E5DFD4] dark:border-[#2E2729] select-none touch-none cursor-crosshair bg-[#F7F3EC] dark:bg-[#141213]"
          onMouseDown={(e) => {
            e.preventDefault();
            handleDrag(e.clientX, e.clientY);
            const mm = (ev: MouseEvent) => handleDrag(ev.clientX, ev.clientY);
            const mu = () => {
              window.removeEventListener('mousemove', mm);
              window.removeEventListener('mouseup', mu);
            };
            window.addEventListener('mousemove', mm);
            window.addEventListener('mouseup', mu);
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            const t = e.touches[0];
            handleDrag(t.clientX, t.clientY);
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            const t = e.touches[0];
            handleDrag(t.clientX, t.clientY);
          }}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="Page 1 preview" className="w-full block pointer-events-none" draggable={false} />
          ) : (
            <div className="w-full aspect-[210/297] flex items-center justify-center text-[11px] text-[#A79B90]">
              Rendering page preview…
            </div>
          )}

          {!isImage && (
            <span
              className="absolute pointer-events-none whitespace-nowrap font-bold"
              style={{
                left: `${wmLeft}%`,
                top: `${wmTop}%`,
                transform: `translate(-50%, -50%) rotate(${o.position === 'diagonal' ? 45 : o.rotation ?? 0}deg)`,
                fontSize: `${Math.max(10, (o.fontSize ?? 48) / 4)}px`,
                color: o.color,
                opacity: o.opacity,
              }}
            >
              {o.text || 'CONFIDENTIAL'}
            </span>
          )}
          {isImage && o.imageBuffer && (
            <span
              className="absolute pointer-events-none rounded"
              style={{
                left: `${wmLeft}%`,
                top: `${wmTop}%`,
                transform: 'translate(-50%, -50%)',
                width: '30%',
                height: '18%',
                background: `center / contain no-repeat url(${URL.createObjectURL(new Blob([o.imageBuffer], { type: o.imageType === 'png' ? 'image/png' : 'image/jpeg' }))})`,
                opacity: o.opacity,
              }}
            />
          )}
        </div>
        <p className="text-[11px] text-[#5C554F] dark:text-[#A39991] mt-1.5 text-center">
          Preview renders page 1 of your actual document locally. Drag the watermark or use the position presets.
        </p>
      </div>
    </>
  );
};

// ============ PAGE NUMBERS ============
const PageNumbersSettings: React.FC<SettingsProps> = ({ step, analysis, onChange }) => {
  const o = step.options;
  return (
    <>
      <div>
        <label className={labelCls}>Format</label>
        <select value={o.format} onChange={(e) => set(onChange, o, { format: e.target.value })} className={inputCls}>
          <option value="1">1</option>
          <option value="Page 1">Page 1</option>
          <option value="1 / N">1 / 20</option>
          <option value="Page 1 of N">Page 1 of 20</option>
        </select>
      </div>
      <div>
        <label className={labelCls}>Position</label>
        <div className="grid grid-cols-3 gap-1.5">
          {['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'].map((pos) => (
            <button
              key={pos}
              onClick={() => set(onChange, o, { position: pos })}
              className={`px-2 py-2.5 rounded-lg text-[11px] font-bold border transition-all ${
                o.position === pos
                  ? 'border-[#6D1F35] bg-[#6D1F35]/10 text-[#6D1F35] dark:text-[#C9A15A]'
                  : 'border-[#E5DFD4] dark:border-[#2E2729] text-[#5C554F] dark:text-[#A39991] hover:border-[#6D1F35]/40'
              }`}
            >
              {pos.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Start number</label>
          <input
            type="number"
            min={1}
            value={o.startNumber}
            onChange={(e) => set(onChange, o, { startNumber: parseInt(e.target.value) || 1 })}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Font size</label>
          <input
            type="number"
            min={6}
            max={24}
            value={o.fontSize}
            onChange={(e) => set(onChange, o, { fontSize: parseInt(e.target.value) || 10 })}
            className={inputCls}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Color</label>
          <input
            type="color"
            value={o.color}
            onChange={(e) => set(onChange, o, { color: e.target.value })}
            className="w-full h-[38px] rounded-xl border border-[#E5DFD4] dark:border-[#383033] bg-white dark:bg-[#141213] px-1"
          />
        </div>
        <div>
          <label className={labelCls}>Margin (pt)</label>
          <input
            type="number"
            min={5}
            max={80}
            value={o.margin}
            onChange={(e) => set(onChange, o, { margin: parseInt(e.target.value) || 25 })}
            className={inputCls}
          />
        </div>
      </div>

      {/* Mini preview */}
      <div>
        <label className={labelCls}>Preview</label>
        <div className="relative mx-auto w-[180px] h-[240px] rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B]">
          <span className="absolute text-[11px] font-semibold text-[#141213] dark:text-[#F5F0EB]" style={numStyle(o.position, o.margin)}>
            {renderNumPreview(o.format, o.startNumber || 1, analysis.pageCount)}
          </span>
          <span className="absolute inset-x-0 top-1/2 text-center text-[9px] text-[#A79B90]">Page 1</span>
        </div>
      </div>
    </>
  );
};

function numStyle(position: string, margin: number): React.CSSProperties {
  const m = Math.min(60, Math.max(6, margin)) * 0.6;
  const style: React.CSSProperties = {};
  if (position.includes('center')) style.left = '50%', (style as any).transform = 'translateX(-50%)';
  if (position.includes('left')) style.left = `${m}px`;
  if (position.includes('right')) style.right = `${m}px`;
  if (position.startsWith('top')) style.top = `${m}px`;
  else style.bottom = `${m}px`;
  return style;
}

function renderNumPreview(format: string, start: number, total: number): string {
  switch (format) {
    case 'Page 1':
      return `Page ${start}`;
    case '1 / N':
      return `${start} / ${total}`;
    case 'Page 1 of N':
      return `Page ${start} of ${total}`;
    default:
      return `${start}`;
  }
}

// ============ SANITIZE ============
const METADATA_FIELDS: { key: string; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'author', label: 'Author' },
  { key: 'subject', label: 'Subject' },
  { key: 'keywords', label: 'Keywords' },
  { key: 'creator', label: 'Creator' },
  { key: 'producer', label: 'Producer' },
  { key: 'creationDate', label: 'Creation date' },
  { key: 'modificationDate', label: 'Modification date' },
];

const SanitizeSettings: React.FC<SettingsProps> = ({ step, analysis, onChange }) => {
  const o = step.options;
  const [after, setAfter] = useState(false);

  return (
    <>
      <div>
        <p className={labelCls}>Current metadata (before)</p>
        <div className="rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] divide-y divide-[#E5DFD4] dark:divide-[#2E2729]">
          {METADATA_FIELDS.map((f) => {
            const value = (analysis.metadata as any)[f.key];
            const present = value && String(value).trim().length > 0;
            return (
              <div key={f.key} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-[11px] font-semibold text-[#141213] dark:text-[#F5F0EB]">{f.label}</span>
                <span className={`text-[11px] truncate max-w-[55%] ${after && o[f.key] ? 'text-[#C94A4A] line-through' : 'text-[#5C554F] dark:text-[#A39991]'}`}>
                  {present ? (after && o[f.key] ? String(value).slice(0, 24) : String(value).slice(0, 34)) : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className={labelCls}>Fields to remove</p>
        <div className="grid grid-cols-2 gap-2">
          {METADATA_FIELDS.map((f) => (
            <label
              key={f.key}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                o[f.key]
                  ? 'border-[#C94A4A] bg-[#C94A4A]/5 text-[#C94A4A]'
                  : 'border-[#E5DFD4] dark:border-[#2E2729] text-[#5C554F] dark:text-[#A39991]'
              }`}
            >
              <input
                type="checkbox"
                checked={!!o[f.key]}
                onChange={(e) => set(onChange, o, { [f.key]: e.target.checked })}
                className="w-3.5 h-3.5 rounded accent-[#C94A4A]"
              />
              {f.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            const all: Record<string, boolean> = {};
            METADATA_FIELDS.forEach((f) => (all[f.key] = true));
            set(onChange, o, all);
            setAfter(true);
          }}
          className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7A1635] to-[#4A0D20] text-[#F7F1E8] text-xs font-bold border border-[#C9A15A]/40"
        >
          Sanitize All
        </button>
        <button
          onClick={() => setAfter((a) => !a)}
          className="px-4 py-2.5 rounded-xl border border-[#E8DFD3] dark:border-[#2E2629] bg-white dark:bg-[#1B1719] text-xs font-bold text-[#1A1416] dark:text-[#F7F1E8]"
        >
          {after ? 'Show before' : 'Preview after'}
        </button>
      </div>
    </>
  );
};
