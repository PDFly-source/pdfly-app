'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Accessible name of the sheet. */
  label: string;
  /** Optional visible title shown next to the drag handle. */
  title?: string;
  /** Optional close ("X") button in the header. Default true. */
  showClose?: boolean;
  /** Max width on desktop, where the sheet renders as a centered dialog. */
  desktopMaxWidth?: string;
  children: React.ReactNode;
}

/**
 * Native-style bottom sheet on mobile, centered dialog on desktop.
 *
 * - Slides up from the bottom with rounded top corners and a drag handle
 * - Backdrop click and Escape close it; swipe down on the handle dismisses
 * - Focus is trapped inside while open and restored to the trigger on close
 * - Respects env(safe-area-inset-bottom) on notched phones
 * - Animations respect prefers-reduced-motion (global CSS policy + guards)
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  label,
  title,
  showClose = true,
  desktopMaxWidth = 'sm:max-w-xl',
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const [closing, setClosing] = useState(false);

  // Focus management: trap while open, restore on close
  useEffect(() => {
    if (isOpen) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      const panel = panelRef.current;
      const firstFocusable = panel?.querySelector<HTMLElement>(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
      return () => {
        restoreFocusRef.current?.focus?.();
        restoreFocusRef.current = null;
      };
    }
  }, [isOpen]);

  // Keyboard: Escape + Tab trap
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [isOpen, onClose]);

  // Swipe-down-to-dismiss on the handle area (touch only)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    setDragOffset(dy > 0 ? dy : 0); // only follow downward drags
  };
  const onTouchEnd = () => {
    const dy = dragOffset;
    touchStartY.current = null;
    setDragOffset(0);
    if (dy > 80) {
      setClosing(true);
      window.setTimeout(() => {
        setClosing(false);
        onClose();
      }, 120);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 motion-reduce:animate-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={dragOffset > 0 ? { transform: `translateY(${dragOffset}px)`, transition: 'none' } : undefined}
        className={`w-full ${desktopMaxWidth} bg-[#FFFDF9] dark:bg-[#1E1A1B] rounded-t-3xl sm:rounded-3xl border border-[#E8DFD3] dark:border-[#2E2629] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 motion-reduce:animate-none ${
          closing ? 'translate-y-full transition-transform duration-100 motion-reduce:transition-none' : ''
        }`}
      >
        {/* Drag handle + title */}
        <div
          className="shrink-0 pt-3 pb-1 px-5 cursor-grab touch-none sm:cursor-default"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="mx-auto w-10 h-1.5 rounded-full bg-[#E8DFD3] dark:bg-[#3D3035] sm:hidden"
            aria-hidden="true"
          />
        </div>
        {(title || showClose) && (
          <div className="shrink-0 flex items-center justify-between px-5 pt-2 pb-3 border-b border-[#E8DFD3] dark:border-[#2E2629]">
            {title ? (
              <h2 className="text-sm font-black uppercase tracking-wide text-[#1A1416] dark:text-[#F7F1E8]">
                {title}
              </h2>
            ) : (
              <span />
            )}
            {showClose && (
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-xl text-[#5C5256] dark:text-[#AFA6A8] hover:text-[#1A1416] dark:hover:text-[#F7F1E8] hover:bg-black/5 dark:hover:bg-white/5 min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div
          className="overflow-y-auto px-5 py-4"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
