'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getLocalLibrary,
  addDocumentToLibrary,
  removeDocumentFromLibrary,
  togglePinDocument,
  toggleFavoriteDocument,
  clearLocalLibrary,
  formatBytes,
} from '@/lib/local-library';
import { DocumentLibraryItem } from '@/types/pdf';
import { ALL_TOOLS } from '@/lib/tools-data';
import {
  FolderKanban,
  FileText,
  Star,
  Pin,
  Upload,
  Search,
  Plus,
  Trash2,
  Share2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Layers,
  Activity,
  Workflow,
  GraduationCap,
  Eye,
  Sliders,
  CheckCircle2,
  MoreVertical,
  X,
  FileImage,
  RefreshCw,
  Clock,
  ArrowRight,
} from 'lucide-react';

export default function WorkspacePage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentLibraryItem[]>(() => {
    if (typeof window === 'undefined') return [];
    return getLocalLibrary();
  });
  const [activeFilter, setActiveFilter] = useState<'all' | 'pinned' | 'pdf' | 'images'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedProcessDoc, setSelectedProcessDoc] = useState<DocumentLibraryItem | null>(null);

  const loadDocs = () => {
    const list = getLocalLibrary();
    setDocuments(list);
  };

  // Upload or import file locally into workspace
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const docType: 'pdf' | 'image' | 'doc' = file.type.startsWith('image/')
        ? 'image'
        : file.name.endsWith('.pdf') || file.type === 'application/pdf'
        ? 'pdf'
        : 'doc';
      addDocumentToLibrary({
        name: file.name,
        size: file.size,
        type: docType,
        tags: [docType],
      });
    }
    loadDocs();
    e.target.value = '';
  };

  // Toggle Pinned
  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    togglePinDocument(id);
    loadDocs();
  };

  // Toggle Favorite
  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavoriteDocument(id);
    loadDocs();
  };

  // Remove document
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeDocumentFromLibrary(id);
    loadDocs();
  };

  // Share document
  const handleShare = async (doc: DocumentLibraryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: doc.name,
          text: `Document: ${doc.name} (${formatBytes(doc.size)})`,
          url: window.location.origin + '/tools/pdf-viewer',
        });
      } catch (err) {
        // Ignored or cancelled
      }
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/tools/pdf-viewer`);
      alert(`Link copied to clipboard for: ${doc.name}`);
    }
  };

  // Filtered documents
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeFilter === 'pinned') return doc.pinned || doc.favorite;
    if (activeFilter === 'pdf') return doc.name.toLowerCase().endsWith('.pdf');
    if (activeFilter === 'images') {
      const ext = doc.name.toLowerCase();
      return ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.webp');
    }
    return true;
  });

  const pinnedDocs = documents.filter((d) => d.pinned || d.favorite);

  const quickLaunchTools = [
    { slug: 'pdf-viewer', name: 'Reader 2.0', icon: Eye, desc: 'Read, listen & study' },
    { slug: 'pdf-health', name: 'Health Check', icon: Activity, desc: 'Audit & diagnostics' },
    { slug: 'pdf-assistant', name: 'Ask this PDF', icon: Sparkles, desc: 'Summaries & chat' },
    { slug: 'pdf-to-study', name: 'Study Center', icon: GraduationCap, desc: 'Flashcards & quiz' },
    { slug: 'workflow-builder', name: 'Workflows', icon: Workflow, desc: 'Automate pipelines' },
    { slug: 'compare-pdf', name: 'PDF Compare', icon: Layers, desc: 'Visual diff & changes' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F3EC] dark:bg-[#141213] text-[#141213] dark:text-[#F5F0EB] transition-colors pb-24 md:pb-16">
      {/* Workspace Top Header */}
      <div className="border-b border-[#E5DFD4] dark:border-[#2E2729] bg-white/70 dark:bg-[#1A1718]/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#7A1635]/10 dark:bg-[#C9A15A]/10 text-[#7A1635] dark:text-[#C9A15A]">
                  <FolderKanban className="w-3.5 h-3.5" />
                  <span>PDFly Workspace</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>100% Local Storage</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#141213] dark:text-[#F5F0EB]">
                Document Workspace
              </h1>
              <p className="text-sm text-[#5C554F] dark:text-[#A39991] mt-1">
                Everything you need to read, analyze, organize, and automate your documents securely.
              </p>
            </div>

            {/* Top Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6D1F35] hover:bg-[#58182a] text-white text-xs font-semibold cursor-pointer transition-all shadow-sm">
                <Plus className="w-4 h-4" />
                <span>Open File</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <Link
                href="/tools/edit-pdf"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs font-semibold hover:border-[#6D1F35] transition-colors"
              >
                <FileText className="w-4 h-4 text-[#6D1F35] dark:text-[#C6A15B]" />
                <span>New PDF</span>
              </Link>

              {documents.length > 0 && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="p-2.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs font-semibold text-[#5C554F] hover:text-red-600 transition-colors"
                  title="Clear Local Library"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Privacy & Zero-Cloud Notice */}
        <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                Zero Cloud Storage • Strictly Local On Device
              </h2>
              <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                Your documents, notes, bookmarks, and analysis remain in your browser session or device memory.
              </p>
            </div>
          </div>
          <Link
            href="/privacy"
            className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:underline shrink-0"
          >
            Privacy Architecture →
          </Link>
        </div>

        {/* Quick Launch Tools Strip */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#5C554F] dark:text-[#A39991]">
              Document Intelligence & Quick Tools
            </h2>
            <Link href="/#tools" className="text-xs text-[#6D1F35] dark:text-[#C6A15B] font-semibold hover:underline">
              All 35+ Tools →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickLaunchTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="p-3.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] hover:border-[#6D1F35] dark:hover:border-[#C6A15B] transition-all group flex flex-col justify-between"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#141213] dark:text-[#F5F0EB] group-hover:text-[#6D1F35] dark:group-hover:text-[#C6A15B] transition-colors truncate">
                      {tool.name}
                    </h3>
                    <p className="text-[11px] text-[#7A7067] dark:text-[#A39991] mt-0.5 truncate">
                      {tool.desc}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Pinned Documents Strip (If Any) */}
        {pinnedDocs.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#5C554F] dark:text-[#A39991]">
                Pinned & Favorites ({pinnedDocs.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pinnedDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => router.push('/tools/pdf-viewer')}
                  className="p-4 rounded-xl border border-amber-300 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10 hover:border-amber-500 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-[#141213] dark:text-[#F5F0EB] truncate group-hover:text-[#6D1F35] dark:group-hover:text-[#C6A15B]">
                        {doc.name}
                      </h4>
                      <p className="text-[11px] text-[#7A7067]">{formatBytes(doc.size)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleTogglePin(doc.id, e)}
                      className="p-1.5 text-amber-600 hover:text-amber-800"
                      title="Unpin"
                    >
                      <Pin className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={(e) => handleShare(doc, e)}
                      className="p-1.5 text-[#7A7067] hover:text-[#141213]"
                      title="Share / Export"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Local Library Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#E5DFD4] dark:border-[#2E2729]">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                activeFilter === 'all'
                  ? 'bg-[#6D1F35] text-white'
                  : 'text-[#5C554F] dark:text-[#A39991] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              All Documents ({documents.length})
            </button>
            <button
              onClick={() => setActiveFilter('pinned')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                activeFilter === 'pinned'
                  ? 'bg-[#6D1F35] text-white'
                  : 'text-[#5C554F] dark:text-[#A39991] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              Pinned ({pinnedDocs.length})
            </button>
            <button
              onClick={() => setActiveFilter('pdf')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                activeFilter === 'pdf'
                  ? 'bg-[#6D1F35] text-white'
                  : 'text-[#5C554F] dark:text-[#A39991] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              PDFs
            </button>
            <button
              onClick={() => setActiveFilter('images')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                activeFilter === 'images'
                  ? 'bg-[#6D1F35] text-white'
                  : 'text-[#5C554F] dark:text-[#A39991] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              Images
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7067]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search library documents..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] focus:outline-none focus:ring-1 focus:ring-[#6D1F35]"
            />
          </div>
        </div>

        {/* Document Cards Grid */}
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-[#E5DFD4] dark:border-[#2E2729] bg-white/40 dark:bg-[#1A1718]/40">
            <div className="w-12 h-12 rounded-2xl bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center mx-auto mb-3">
              <FolderKanban className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#141213] dark:text-[#F5F0EB] mb-1">
              {searchQuery ? 'No documents matched your search' : 'Your Document Workspace is empty'}
            </h3>
            <p className="text-xs text-[#5C554F] dark:text-[#A39991] max-w-sm mx-auto mb-5">
              Open files to build your local document library. Everything stays private on this device.
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6D1F35] text-white text-xs font-semibold cursor-pointer hover:bg-[#58182a] transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Import Files</span>
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-5 rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] hover:border-[#6D1F35] dark:hover:border-[#C6A15B] transition-all shadow-xs flex flex-col justify-between"
              >
                {/* Card Top */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center shrink-0">
                      {doc.name.endsWith('.pdf') ? (
                        <FileText className="w-5 h-5" />
                      ) : (
                        <FileImage className="w-5 h-5" />
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleTogglePin(doc.id, e)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          doc.pinned
                            ? 'text-amber-500'
                            : 'text-[#7A7067] hover:text-[#141213] dark:hover:text-white'
                        }`}
                        title={doc.pinned ? 'Unpin' : 'Pin to top'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => handleToggleFavorite(doc.id, e)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          doc.favorite
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-[#7A7067] hover:text-[#141213] dark:hover:text-white'
                        }`}
                        title={doc.favorite ? 'Remove Favorite' : 'Add to Favorites'}
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => handleDelete(doc.id, e)}
                        className="p-1.5 text-[#7A7067] hover:text-red-600 rounded-lg transition-colors"
                        title="Delete from workspace"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3
                    onClick={() => router.push('/tools/pdf-viewer')}
                    className="text-sm font-bold text-[#141213] dark:text-[#F5F0EB] hover:text-[#6D1F35] dark:hover:text-[#C6A15B] cursor-pointer transition-colors truncate"
                    title={doc.name}
                  >
                    {doc.name}
                  </h3>

                  <p className="text-xs text-[#7A7067] mt-1">
                    {formatBytes(doc.size)} • Added {new Date(doc.addedAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Card Bottom Actions */}
                <div className="pt-4 mt-4 border-t border-[#E5DFD4] dark:border-[#2E2729] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push('/tools/pdf-viewer')}
                      className="px-3 py-1.5 rounded-lg bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] text-xs font-semibold hover:bg-[#6D1F35] hover:text-white transition-all flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Read</span>
                    </button>

                    <button
                      onClick={() => setSelectedProcessDoc(doc)}
                      className="px-3 py-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-xs font-semibold hover:border-[#6D1F35] transition-colors"
                    >
                      Process With...
                    </button>
                  </div>

                  <button
                    onClick={(e) => handleShare(doc, e)}
                    className="p-1.5 text-[#7A7067] hover:text-[#141213] dark:hover:text-white"
                    title="Share document"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Process With Tool Modal */}
      {selectedProcessDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1718] border border-[#E5DFD4] dark:border-[#2E2729] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#141213] dark:text-[#F5F0EB]">
                Process: {selectedProcessDoc.name}
              </h3>
              <button
                onClick={() => setSelectedProcessDoc(null)}
                className="p-1 rounded-lg text-[#5C554F] hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#5C554F] dark:text-[#A39991]">
              Select a tool to process this document:
            </p>

            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {ALL_TOOLS.slice(0, 16).map((t) => (
                <Link
                  key={t.id}
                  href={`/tools/${t.slug}`}
                  onClick={() => setSelectedProcessDoc(null)}
                  className="p-2.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] hover:border-[#6D1F35] dark:hover:border-[#C6A15B] transition-colors text-left"
                >
                  <div className="text-xs font-bold text-[#141213] dark:text-[#F5F0EB] truncate">
                    {t.name}
                  </div>
                  <div className="text-[10px] text-[#7A7067] truncate">{t.categoryLabel}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1718] border border-[#E5DFD4] dark:border-[#2E2729] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-red-600 dark:text-red-400">
              Clear Local Document Workspace?
            </h3>
            <p className="text-xs text-[#5C554F] dark:text-[#A39991] leading-relaxed">
              This will remove all saved document references and metadata from this device&apos;s browser memory. Your original disk files will remain intact.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearLocalLibrary();
                  loadDocs();
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
              >
                Yes, Clear Library
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
