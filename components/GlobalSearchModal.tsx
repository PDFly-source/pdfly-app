'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ALL_TOOLS } from '@/lib/tools-data';
import { ToolDefinition } from '@/types/pdf';
import {
  Search,
  Command,
  ArrowRight,
  Clock,
  Sparkles,
  FileText,
  X,
} from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setSelectedIndex(0);
  }

  const [recentSlugs, setRecentSlugs] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('pdfly_recent_tools');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Filter tools based on query (name, description, category, aliases)
  const filteredTools = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Show recent tools first, or popular tools
      if (recentSlugs.length > 0) {
        const recent = recentSlugs
          .map((s) => ALL_TOOLS.find((t) => t.slug === s))
          .filter(Boolean) as ToolDefinition[];
        const remaining = ALL_TOOLS.filter((t) => !recentSlugs.includes(t.slug));
        return [...recent, ...remaining].slice(0, 8);
      }
      return ALL_TOOLS.slice(0, 8);
    }

    // Action keyword mapping
    const actionKeywords: Record<string, string[]> = {
      'merge-pdf': ['combine', 'join', 'append', 'unite'],
      'split-pdf': ['cut', 'separate', 'divide', 'extract pages'],
      'compress-pdf': ['shrink', 'reduce size', 'small', 'optimize'],
      'ocr-pdf': ['scanned', 'extract text', 'tesseract', 'recognize', 'read image'],
      'sign-pdf': ['signature', 'autograph', 'initials', 'sign document'],
      'redact-pdf': ['blackout', 'hide sensitive', 'censor', 'mask'],
      'remove-blank-pages': ['blank', 'empty pages', 'clean up'],
      'pdf-assistant': ['ask', 'ai', 'gemini', 'summarize', 'chat'],
      'compare-pdf': ['diff', 'difference', 'compare revisions', 'version check'],
      'pdf-to-study': ['quiz', 'mcq', 'flashcard', 'revision', 'exam', 'notes'],
      'read-aloud': ['listen', 'speech', 'voice', 'audio', 'tts'],
      'booklet-maker': ['booklet', 'print 2-up', 'fold', 'staple', 'duplex'],
      'fill-form': ['form fields', 'interactive form', 'flatten'],
      'batch-process': ['bulk', 'multiple files', 'parallel'],
      'workflow-builder': ['recipe', 'automate', 'pipeline', 'multi-step'],
      'pdf-health': ['health', 'diagnose', 'audit', 'inspect', 'structure', 'scripts'],
      'pdf-sanitizer': ['sanitize', 'clean', 'purge metadata', 'strip tracking', 'privacy clean'],
      'pdf-to-markdown': ['markdown', 'convert md', 'notes to md'],
      'pdf-to-html': ['html', 'convert html', 'web page'],
    };

    return ALL_TOOLS.filter((tool) => {
      const matchName = tool.name.toLowerCase().includes(q);
      const matchDesc = tool.description.toLowerCase().includes(q);
      const matchCat = tool.category.toLowerCase().includes(q);
      const matchSlug = tool.slug.toLowerCase().includes(q);

      const aliases = actionKeywords[tool.slug] || [];
      const matchAlias = aliases.some((a) => a.includes(q) || q.includes(a));

      return matchName || matchDesc || matchCat || matchSlug || matchAlias;
    }).slice(0, 8);
  }, [query, recentSlugs]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredTools.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredTools.length) % Math.max(1, filteredTools.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTools[selectedIndex]) {
        handleSelectTool(filteredTools[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelectTool = (tool: ToolDefinition) => {
    // Save to recent tools in localStorage
    try {
      const stored = localStorage.getItem('pdfly_recent_tools');
      let recents: string[] = stored ? JSON.parse(stored) : [];
      recents = [tool.slug, ...recents.filter((s) => s !== tool.slug)].slice(0, 5);
      localStorage.setItem('pdfly_recent_tools', JSON.stringify(recents));
    } catch (e) {
      // ignore
    }

    onClose();
    router.push(`/tools/${tool.slug}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-white dark:bg-[#1E1A1B] rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] shadow-2xl overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E5DFD4] dark:border-[#2E2729]">
          <Search className="w-5 h-5 text-[#5C554F] dark:text-[#A39991] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a tool name or action (e.g., 'merge', 'shrink', 'scanned', 'quiz')..."
            className="flex-1 bg-transparent text-sm text-[#141213] dark:text-[#F5F0EB] placeholder:text-[#5C554F]/60 dark:placeholder:text-[#A39991]/60 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono bg-[#FAF7F2] dark:bg-[#141213] text-[#5C554F] dark:text-[#A39991] rounded border border-[#E5DFD4] dark:border-[#2E2729]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2">
          {!query && recentSlugs.length > 0 && (
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#5C554F] dark:text-[#A39991] flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>Recently Used & Suggested</span>
            </div>
          )}

          {filteredTools.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#5C554F] dark:text-[#A39991]">
              No matching tools found for &quot;{query}&quot;.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTools.map((tool, idx) => {
                const isSelected = idx === selectedIndex;
                const isRecent = !query && recentSlugs.includes(tool.slug);

                return (
                  <div
                    key={tool.slug}
                    onClick={() => handleSelectTool(tool)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors text-xs ${
                      isSelected
                        ? 'bg-[#6D1F35]/10 dark:bg-[#C6A15B]/15 text-[#6D1F35] dark:text-[#C6A15B]'
                        : 'hover:bg-[#FAF7F2] dark:hover:bg-[#141213] text-[#141213] dark:text-[#F5F0EB]'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#141213] border border-[#E5DFD4] dark:border-[#2E2729] flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-[#6D1F35] dark:text-[#C6A15B]" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{tool.name}</span>
                          {isRecent && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              Recent
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#5C554F] dark:text-[#A39991] truncate max-w-sm">
                          {tool.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-gray-400 shrink-0">
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border border-[#E5DFD4] dark:border-[#2E2729]">
                        {tool.category}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#FAF7F2] dark:bg-[#141213] border-t border-[#E5DFD4] dark:border-[#2E2729] text-[11px] text-[#5C554F] dark:text-[#A39991]">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 bg-white dark:bg-[#1E1A1B] border rounded font-mono text-[10px]">
                ↑
              </kbd>{' '}
              <kbd className="px-1 py-0.5 bg-white dark:bg-[#1E1A1B] border rounded font-mono text-[10px]">
                ↓
              </kbd>{' '}
              to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-[#1E1A1B] border rounded font-mono text-[10px]">
                ↵
              </kbd>{' '}
              to open
            </span>
          </div>
          <span>Local-First Processing</span>
        </div>
      </div>
    </div>
  );
};
