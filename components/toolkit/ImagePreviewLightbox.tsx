'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export interface LightboxItem {
  id: string;
  src: string;
  label?: string;
}

interface ImagePreviewLightboxProps {
  items: LightboxItem[];
  index: number | null; // null = closed
  onClose: () => void;
  onNavigate?: (newIndex: number) => void;
  onDelete?: (index: number) => void;
}

/**
 * Reusable full-screen image preview with zoom, rotate, prev/next,
 * delete and close. Keyboard: arrows navigate, Esc closes, +/- zooms.
 */
export const ImagePreviewLightbox: React.FC<ImagePreviewLightboxProps> = ({
  items,
  index,
  onClose,
  onNavigate,
  onDelete,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const isOpen = index !== null && index >= 0 && index < items.length;
  const current = isOpen ? items[index as number] : null;

  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [index]);

  const navigate = useCallback(
    (dir: 1 | -1) => {
      if (!isOpen || !onNavigate) return;
      const next = (index as number) + dir;
      if (next >= 0 && next < items.length) {
        onNavigate(next);
      }
    },
    [isOpen, index, items.length, onNavigate]
  );

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') navigate(-1);
      else if (e.key === 'ArrowRight') navigate(1);
      else if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 0.25, 4));
      else if (e.key === '-') setZoom((z) => Math.max(z - 0.25, 0.5));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, navigate, onClose]);

  if (!isOpen || !current) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/92 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 text-white/90 shrink-0">
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate max-w-[50vw]">
            {current.label || `Image ${(index as number) + 1}`}
          </p>
          <p className="text-[11px] text-white/50">
            {(index as number) + 1} / {items.length}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.25, 4))}
            aria-label="Zoom in"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
            aria-label="Zoom out"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="px-2 text-[11px] text-white/50 tabular-nums w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            aria-label="Rotate"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(index as number)}
              aria-label="Delete image"
              className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden select-none">
        {onNavigate && (index as number) > 0 && (
          <button
            onClick={() => navigate(-1)}
            aria-label="Previous image"
            className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <img
          src={current.src}
          alt={current.label || 'Preview'}
          draggable={false}
          className="max-w-full max-h-full object-contain transition-transform duration-150"
          style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
        />

        {onNavigate && (index as number) < items.length - 1 && (
          <button
            onClick={() => navigate(1)}
            aria-label="Next image"
            className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Bottom privacy strip */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 shrink-0">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#35C98A]/15 border border-[#35C98A]/25 text-[#35C98A] text-[10px] font-bold uppercase tracking-wider">
          <ShieldCheck className="w-3 h-3" />
          <span>Preview stays on your device</span>
        </span>
      </div>
    </div>
  );
};
