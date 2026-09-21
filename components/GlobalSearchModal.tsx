'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ALL_TOOLS, TOOL_CATEGORIES } from '@/lib/tools-data';
import { ToolDefinition } from '@/types/pdf';
import { getRecentToolSlugs, recordRecentTool, clearRecentTools } from '@/lib/recent-tools';
import { clearRecentJobs } from '@/lib/recent-jobs';
import { HighlightedText } from './HighlightedText';
import {
  Search,
  ArrowRight,
  Clock,
  FileText,
  X,
  Home,
  LayoutGrid,
  Settings,
  Download,
  Info,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PaletteItem =
  | { kind: 'tool'; tool: ToolDefinition }
  | {
      kind: 'page';
      label: string;
      description: string;
      href: string;
      icon: React.ElementType;
      keywords: string[];
    }
  | {
      kind: 'action';
      label: string;
      description: string;
      icon: React.ElementType;
      keywords: string[];
      run: () => void;
    };

/** Navigation destinations and common actions surfaced in the palette. */
const QUICK_ITEMS: PaletteItem[] = [
  {
    kind: 'page',
    label: 'Home',
    description: 'PDF toolkit dashboard with quick actions',
    href: '/',
    icon: Home,
    keywords: ['home', 'dashboard', 'start', 'landing'],
  },
  {
    kind: 'page',
    label: 'Workspace',
    description: 'Open the full document workspace',
    href: '/workspace',
    icon: LayoutGrid,
    keywords: ['workspace', 'documents', 'library', 'files'],
  },
  {
    kind: 'page',
    label: 'Settings',
    description: 'Adjust application preferences',
    href: '/settings',
    icon: Settings,
    keywords: ['settings', 'preferences', 'options', 'config'],
  },
  {
    kind: 'page',
    label: 'Install App',
    description: 'Add PDFMiniFly to your desktop or home screen',
    href: '/install',
    icon: Download,
    keywords: ['install', 'pwa', 'app', 'download', 'offline', 'home screen'],
  },
  {
    kind: 'page',
    label: 'About',
    description: 'Learn about PDFMiniFly',
    href: '/about',
    icon: Info,
    keywords: ['about', 'info', 'project', 'credits'],
  },
  {
    kind: 'page',
    label: 'Privacy & Security',
    description: 'How your documents stay on this device',
    href: '/privacy',
    icon: ShieldCheck,
    keywords: ['privacy', 'security', 'local', 'offline', 'data', 'trust'],
  },
];

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

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [recentSlugs, setRecentSlugs] = useState<string[]>(() =>
    getRecentToolSlugs()
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus management: focus input on open, restore focus on close
  useEffect(() => {
    if (isOpen) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else if (restoreFocusRef.current) {
      restoreFocusRef.current.focus?.();
      restoreFocusRef.current = null;
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

    // Fuzzy subsequence match (e.g. 'mg pdf' matches 'Merge PDF')
    const fuzzyMatch = (text: string, q: string): boolean => {
      let ti = 0;
      for (const ch of q) {
        if (ch === ' ') continue;
        ti = text.toLowerCase().indexOf(ch, ti);
        if (ti === -1) return false;
        ti += 1;
      }
      return true;
    };

    const actionKeywords: Record<string, string[]> = {
      'compress-pdf': ['shrink', 'reduce size', 'small', 'optimize'],
      'redact-pdf': ['blackout', 'hide sensitive', 'censor', 'mask'],
      'remove-blank-pages': ['blank', 'empty pages', 'clean up'],
      'pdf-assistant': ['ask', 'ai', 'gemini', 'summarize', 'chat'],
      'pdf-health': ['diagnose', 'audit', 'inspect'],
      'read-aloud': ['listen', 'speech', 'voice', 'audio', 'tts'],
      'booklet-maker': ['booklet', 'print 2-up', 'fold', 'staple', 'duplex'],
      'fill-form': ['form fields', 'interactive form', 'flatten'],
      'batch-process': ['bulk', 'multiple files', 'parallel'],
      'workflow-builder': ['recipe', 'automate', 'pipeline', 'multi-step'],
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

      return (
        matchName ||
        matchDesc ||
        matchCat ||
        matchSlug ||
        matchAlias ||
        fuzzyMatch(tool.name, q)
      );
    })
      .filter((tool) => activeCategory === 'all' || tool.category === activeCategory)
      .slice(0, 8);
  }, [query, recentSlugs, activeCategory]);

  // Pages & actions, filtered by the same query
  const filteredQuickItems = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const all: PaletteItem[] = [
      ...QUICK_ITEMS,
      {
        kind: 'action',
        label: 'Clear Recent Files',
        description: 'Clear recently used tools and recent job history',
        icon: Trash2,
        keywords: ['clear', 'recent', 'history', 'reset', 'delete', 'files', 'tools'],
        run: () => {
          clearRecentTools();
          clearRecentJobs();
          setRecentSlugs([]);
        },
      },
    ];
    if (!q) return all;
    const fuzzyMatch = (text: string, q: string): boolean => {
      let ti = 0;
      for (const ch of q) {
        if (ch === ' ') continue;
        ti = text.toLowerCase().indexOf(ch, ti);
        if (ti === -1) return false;
        ti += 1;
      }
      return true;
    };
    return all.filter((item) => {
      if (item.kind === 'tool') return false;
      const hay = [item.label, item.description, ...item.keywords].join(' ').toLowerCase();
      return hay.includes(q) || fuzzyMatch(item.label, q);
    });
  }, [query]);

  // Flattened selectable list: tools first, then pages/actions
  const items: PaletteItem[] = React.useMemo(
    () => [
      ...filteredTools.map((tool) => ({ kind: 'tool', tool }) as PaletteItem),
      ...filteredQuickItems,
    ],
    [filteredTools, filteredQuickItems]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === 'Tab' && containerRef.current) {
      // Simple focus trap: keep focus inside the palette while open
      const focusables = containerRef.current.querySelectorAll<HTMLElement>(
        'button, input, [tabindex]:not([tabindex="-1"])'
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
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, items.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + items.length) % Math.max(1, items.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[selectedIndex];
      if (item) executeItem(item);
    }
  };

  const executeItem = (item: PaletteItem) => {
    if (item.kind === 'tool') {
      recordRecentTool(item.tool.slug);
      setRecentSlugs(getRecentToolSlugs());
      onClose();
      router.push(`/tools/${item.tool.slug}`);
    } else if (item.kind === 'page') {
      onClose();
      router.push(item.href);
    } else {
      item.run();
      onClose();
    }
  };

  // Keep the highlighted row visible while keyboard navigating
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector(`[data-flat-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  const renderQuickItem = (item: Exclude<PaletteItem, { kind: 'tool' }>, idx: number) => {
    const flatIndex = filteredTools.length + idx;
    const isSelected = flatIndex === selectedIndex;
    const Icon = item.icon;
    return (
      <div
        key={item.label}
        role="option"
        aria-selected={isSelected}
        data-flat-index={flatIndex}
        onClick={() => executeItem(item)}
        onMouseEnter={() => setSelectedIndex(flatIndex)}
        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors text-xs ${
          isSelected
            ? 'bg-[#6D1F35]/10 dark:bg-[#C6A15B]/15 text-[#6D1F35] dark:text-[#C6A15B]'
            : 'hover:bg-[#FAF7F2] dark:hover:bg-[#141213] text-[#141213] dark:text-[#F5F0EB]'
        }`}
      >
        <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#141213] border border-[#E5DFD4] dark:border-[#2E2729] flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-[#6D1F35] dark:text-[#C6A15B]" />
        </div>
        <div className="truncate">
          <div className="font-semibold">
            <HighlightedText text={item.label} query={query} />
          </div>
          <p className="text-[11px] text-[#5C554F] dark:text-[#A39991] truncate max-w-sm">
            {item.description}
          </p>
        </div>
        <div className="flex items-center gap-2 text-gray-400 shrink-0 ml-auto">
          {item.kind === 'action' ? (
            <Trash2 className="w-3.5 h-3.5" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end sm:block sm:pt-16 sm:p-4 sm:pt-24 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 motion-reduce:animate-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search PDFMiniFly tools, pages, and actions"
        className="w-full sm:max-w-xl sm:mx-auto bg-white dark:bg-[#1E1A1B] rounded-t-3xl sm:rounded-2xl border-t sm:border border-[#E5DFD4] dark:border-[#2E2729] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 sm:animate-none"
        onKeyDown={handleKeyDown}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1.5 rounded-full bg-[#E8DFD3] dark:bg-[#3D3035]" aria-hidden="true" />
        </div>

        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E5DFD4] dark:border-[#2E2729]">
          <Search className="w-5 h-5 text-[#5C554F] dark:text-[#A39991] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-results"
            aria-autocomplete="list"
            aria-label="Search tools, pages, and actions"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a tool name or action (e.g., 'merge', 'shrink', 'settings')..."
            className="flex-1 bg-transparent text-sm text-[#141213] dark:text-[#F5F0EB] placeholder:text-[#5C554F]/80 dark:placeholder:text-[#A39991]/80 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-mono bg-[#FAF7F2] dark:bg-[#141213] text-[#5C554F] dark:text-[#A39991] rounded border border-[#E5DFD4] dark:border-[#2E2729]">
            ESC
          </kbd>
        </div>

        {/* Category filter chips */}
        <div
          className="flex gap-1.5 px-4 py-2 border-b border-[#E5DFD4] dark:border-[#2E2729] overflow-x-auto"
          role="tablist"
          aria-label="Filter tools by category"
        >
          {TOOL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              role="tab"
              aria-selected={activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? 'bg-[#6D1F35] text-white dark:bg-[#C6A15B] dark:text-[#141213]'
                  : 'bg-[#FAF7F2] dark:bg-[#141213] text-[#5C554F] dark:text-[#A39991] hover:bg-[#F0E9DD] dark:hover:bg-[#1E1A1B]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          id="command-palette-results"
          role="listbox"
          aria-label="Search results"
          className="max-h-[45vh] sm:max-h-[380px] overflow-y-auto p-2"
        >
          {!query && recentSlugs.length > 0 && filteredTools.length > 0 && (
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#5C554F] dark:text-[#A39991] flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>Recently Used &amp; Suggested</span>
            </div>
          )}

          {items.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#5C554F] dark:text-[#A39991]">
              No matching tools, pages, or actions found for &quot;{query}&quot;.
            </div>
          ) : (
            <>
              {filteredTools.length > 0 && query && (
                <div className="px-3 pt-1.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#5C554F] dark:text-[#A39991]">
                  Tools
                </div>
              )}
              <div className="space-y-1">
                {filteredTools.map((tool, idx) => {
                  const isSelected = idx === selectedIndex;
                  const isRecent = !query && recentSlugs.includes(tool.slug);

                  return (
                    <div
                      key={tool.slug}
                      role="option"
                      aria-selected={isSelected}
                      data-flat-index={idx}
                      onClick={() =>
                        executeItem({ kind: 'tool', tool })
                      }
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
                            <span className="font-semibold">
                              <HighlightedText text={tool.name} query={query} />
                            </span>
                            {isRecent && (
                              <span className="text-[11px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
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
                        <span className="text-[11px] uppercase font-mono px-1.5 py-0.5 rounded border border-[#E5DFD4] dark:border-[#2E2729]">
                          {tool.category}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredQuickItems.length > 0 && (
                <>
                  <div className="px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#5C554F] dark:text-[#A39991]">
                    {query ? 'Pages & Actions' : 'Quick Actions'}
                  </div>
                  <div className="space-y-1">
                    {filteredQuickItems.map((item, idx) => renderQuickItem(item, idx))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#FAF7F2] dark:bg-[#141213] border-t border-[#E5DFD4] dark:border-[#2E2729] text-[11px] text-[#5C554F] dark:text-[#A39991]">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 bg-white dark:bg-[#1E1A1B] border rounded font-mono text-[11px]">
                ↑
              </kbd>{' '}
              <kbd className="px-1 py-0.5 bg-white dark:bg-[#1E1A1B] border rounded font-mono text-[11px]">
                ↓
              </kbd>{' '}
              to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-[#1E1A1B] border rounded font-mono text-[11px]">
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
