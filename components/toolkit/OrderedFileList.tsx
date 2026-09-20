'use client';

import React, { useState } from 'react';
import {
  GripVertical,
  ArrowUp,
  ArrowDown,
  Trash2,
  Eye,
  FileText,
} from 'lucide-react';

export interface OrderedListItem {
  id: string;
  file: File;
  /** Optional preview URL (images). If absent, a file icon is shown. */
  previewUrl?: string;
  /** Optional custom subtitle, e.g. page count info. Defaults to file size. */
  subtitle?: string;
}

interface OrderedFileListProps {
  items: OrderedListItem[];
  onReorder: (newItems: OrderedListItem[]) => void;
  onRemove: (id: string) => void;
  /** Opens a preview (e.g. ImagePreviewLightbox) for the item at this index. */
  onPreview?: (index: number) => void;
  /** Word for each row's position label, e.g. "Page" or "File". */
  positionLabel?: string;
}

/**
 * Reusable vertical, mobile-first ordered file list.
 * - Numbered rows (1, 2, 3, ...)
 * - Drag-and-drop reorder via native HTML5 DnD (touch fallback: Move Up/Down buttons)
 * - Thumbnail (image previews) or file icon
 * - Preview / Move Up / Move Down / Delete per row
 */
export const OrderedFileList: React.FC<OrderedFileListProps> = ({
  items,
  onReorder,
  onRemove,
  onPreview,
  positionLabel = 'Page',
}) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const copy = [...items];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    onReorder(copy);
  };

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null) return;
    move(dragIndex, targetIndex);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <ol className="space-y-2.5" aria-label="Ordered file list">
      {items.map((it, idx) => (
        <li
          key={it.id}
          draggable
          onDragStart={(e) => {
            setDragIndex(idx);
            e.dataTransfer.effectAllowed = 'move';
            try {
              e.dataTransfer.setData('text/plain', it.id);
            } catch {
              /* some browsers require data for DnD */
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDragOverIndex(idx);
          }}
          onDragLeave={() => setDragOverIndex((prev) => (prev === idx ? null : prev))}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(idx);
          }}
          onDragEnd={() => {
            setDragIndex(null);
            setDragOverIndex(null);
          }}
          className={`flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-[#1E1A1B] border transition-all touch-none ${
            dragOverIndex === idx && dragIndex !== null && dragIndex !== idx
              ? 'border-[#C9A15A] shadow-md scale-[1.01]'
              : 'border-[#E5DFD4] dark:border-[#2E2729]'
          } ${dragIndex === idx ? 'opacity-40' : ''}`}
        >
          {/* Drag handle */}
          <span
            className="p-1.5 rounded-lg text-[#A79B90] hover:text-[#141213] dark:hover:text-[#F5F0EB] hover:bg-black/5 dark:hover:bg-white/5 cursor-grab active:cursor-grabbing shrink-0"
            aria-label={`Drag to reorder ${it.file.name}`}
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </span>

          {/* Order number */}
          <span className="w-7 h-7 shrink-0 rounded-full bg-[#6D1F35]/10 dark:bg-[#C9A15A]/10 text-[#6D1F35] dark:text-[#C9A15A] text-[11px] font-bold flex items-center justify-center">
            {idx + 1}
          </span>

          {/* Thumbnail / icon */}
          {it.previewUrl ? (
            <button
              type="button"
              onClick={() => onPreview?.(idx)}
              className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-xl overflow-hidden bg-[#F7F3EC] dark:bg-[#141213] border border-[#E5DFD4] dark:border-[#2E2729] relative group/tile"
              aria-label={`Preview ${it.file.name}`}
            >
              <img
                src={it.previewUrl}
                alt={it.file.name}
                className="w-full h-full object-cover"
                draggable={false}
              />
              <span className="absolute inset-0 bg-black/0 group-hover/tile:bg-black/25 transition-colors flex items-center justify-center">
                <Eye className="w-4 h-4 text-white opacity-0 group-hover/tile:opacity-100 transition-opacity" />
              </span>
            </button>
          ) : (
            <span className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-xl bg-[#F7F3EC] dark:bg-[#141213] border border-[#E5DFD4] dark:border-[#2E2729] flex items-center justify-center text-[#6D1F35] dark:text-[#C9A15A]">
              <FileText className="w-5 h-5" />
            </span>
          )}

          {/* Name + size */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#141213] dark:text-[#F5F0EB] truncate">
              {it.file.name}
            </p>
            <p className="text-[11px] text-[#5C554F] dark:text-[#A39991]">
              {it.subtitle ??
                (positionLabel +
                  ' ' +
                  (idx + 1) +
                  ' · ' +
                  ((it.file.size / 1024 / 1024) < 1
                    ? `${Math.max(1, Math.round(it.file.size / 1024))} KB`
                    : `${(it.file.size / 1024 / 1024).toFixed(1)} MB`))}
            </p>
          </div>

          {/* Row actions */}
          <div className="flex items-center gap-1 shrink-0">
            {onPreview && (
              <button
                type="button"
                onClick={() => onPreview(idx)}
                aria-label={`Preview ${it.file.name}`}
                title="Preview"
                className="p-2 rounded-xl text-[#5C554F] dark:text-[#A39991] hover:text-[#6D1F35] dark:hover:text-[#C9A15A] hover:bg-[#6D1F35]/5 dark:hover:bg-[#C9A15A]/10 transition-colors"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => move(idx, idx - 1)}
              disabled={idx === 0}
              aria-label={`Move ${it.file.name} up`}
              title="Move up"
              className="p-2 rounded-xl text-[#5C554F] dark:text-[#A39991] hover:text-[#141213] dark:hover:text-[#F5F0EB] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => move(idx, idx + 1)}
              disabled={idx === items.length - 1}
              aria-label={`Move ${it.file.name} down`}
              title="Move down"
              className="p-2 rounded-xl text-[#5C554F] dark:text-[#A39991] hover:text-[#141213] dark:hover:text-[#F5F0EB] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onRemove(it.id)}
              aria-label={`Remove ${it.file.name}`}
              title="Remove"
              className="p-2 rounded-xl text-[#C94A4A] hover:bg-[#C94A4A]/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
};
