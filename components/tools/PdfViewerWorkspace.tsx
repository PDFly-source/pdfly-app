'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { getPdfDocumentFromFile, renderPageToCanvas } from '@/lib/pdfjs-init';
import { triggerDownload, formatBytes, splitPdf } from '@/lib/pdf-engine';
import {
  getDocumentBookmarks,
  addDocumentBookmark,
  deleteDocumentBookmark,
  getDocumentNotes,
  addOrUpdateDocumentNote,
  deleteDocumentNote,
} from '@/lib/document-annotations';
import { DocumentBookmark, DocumentNote } from '@/types/pdf';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCw,
  Printer,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Columns,
  X,
  FileText,
  HelpCircle,
  RefreshCw,
  Eye,
  Bookmark,
  BookmarkPlus,
  StickyNote,
  BookOpen,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  FastForward,
  Rewind,
  Sliders,
  Sparkles,
  List,
  CheckSquare,
  Trash2,
  Share2,
  Layers,
  Clock,
  Compass,
} from 'lucide-react';

export const PdfViewerWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Layout & Panes
  const [leftTab, setLeftTab] = useState<'thumbnails' | 'outline' | 'bookmarks' | 'notes'>('thumbnails');
  const [showLeftSidebar, setShowLeftSidebar] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'single' | 'two-page'>('single');
  const [readingBackground, setReadingBackground] = useState<'normal' | 'sepia' | 'dark'>('normal');
  const [brightness, setBrightness] = useState<number>(100);
  const [readingWidth, setReadingWidth] = useState<'compact' | 'normal' | 'full'>('normal');
  const [studyMode, setStudyMode] = useState<boolean>(false);

  // Document Outline / Table of Contents
  const [outline, setOutline] = useState<any[]>([]);

  // Search state
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [caseSensitive, setCaseSensitive] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<{ page: number; count: number }[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
  const [searching, setSearching] = useState<boolean>(false);

  // Page Manager Multi-Select
  const [selectedPages, setSelectedPages] = useState<number[]>([]);

  // Local Bookmarks & Notes
  const [bookmarks, setBookmarks] = useState<DocumentBookmark[]>([]);
  const [notes, setNotes] = useState<DocumentNote[]>([]);
  const [newBookmarkTitle, setNewBookmarkTitle] = useState<string>('');
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});

  const activeSavedNote = notes.find((n) => n.pageNumber === currentPage);
  const currentNoteText = noteDrafts[currentPage] !== undefined ? noteDrafts[currentPage] : (activeSavedNote?.content || '');

  // Speech / Read Aloud 2.0
  const [speechActive, setSpeechActive] = useState<boolean>(false);
  const [speechPaused, setSpeechPaused] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [currentSpokenText, setCurrentSpokenText] = useState<string>('');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Estimated stats
  const [totalWordCount, setTotalWordCount] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const secondCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load PDF file
  const handleFilesSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setLoading(true);
    setCurrentPage(1);
    setZoom(1.0);
    setRotation(0);
    setThumbnails([]);
    setSearchResults([]);
    setSelectedPages([]);
    stopSpeech();

    try {
      const doc = await getPdfDocumentFromFile(selected);
      setPdfDoc(doc);
      setNumPages(doc.numPages);

      // Load Document Outline
      try {
        const docOutline = await doc.getOutline();
        setOutline(Array.isArray(docOutline) ? docOutline : []);
      } catch (e) {
        setOutline([]);
      }

      // Load local bookmarks & notes
      setBookmarks(getDocumentBookmarks(selected.name));
      const docNotes = getDocumentNotes(selected.name);
      setNotes(docNotes);
      const activeNote = docNotes.find((n) => n.pageNumber === 1);
      if (activeNote) {
        setNoteDrafts({ 1: activeNote.content });
      }

      // Estimate total word count for study progress
      let wordsCounted = 0;
      const pagesToSample = Math.min(doc.numPages, 10);
      for (let i = 1; i <= pagesToSample; i++) {
        const p = await doc.getPage(i);
        const textContent = await p.getTextContent();
        wordsCounted += textContent.items.map((it: any) => it.str || '').join(' ').split(/\s+/).filter(Boolean).length;
      }
      const avgWordsPerPage = Math.round(wordsCounted / pagesToSample) || 250;
      setTotalWordCount(avgWordsPerPage * doc.numPages);

      // Render thumbnails in background
      const thumbUrls: string[] = [];
      const totalThumbs = Math.min(doc.numPages, 30);
      for (let i = 1; i <= totalThumbs; i++) {
        try {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 0.22 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            thumbUrls.push(canvas.toDataURL('image/jpeg', 0.6));
          }
        } catch (e) {
          console.warn('Thumbnail generation note for page', i, e);
        }
      }
      setThumbnails(thumbUrls);
    } catch (err: any) {
      console.error('Failed to load PDF in viewer:', err);
      alert('Could not open this PDF document. The file may be damaged or password protected.');
    } finally {
      setLoading(false);
    }
  };

  // Render current page (and second page if two-page view mode)
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || currentPage < 1 || currentPage > numPages) return;

    let cancelled = false;
    const renderActivePage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled) return;

        const effectiveRotation = (page.rotate + rotation) % 360;
        const viewport = page.getViewport({ scale: zoom, rotation: effectiveRotation });
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Render second page if in two-page mode
        if (viewMode === 'two-page' && secondCanvasRef.current && currentPage + 1 <= numPages) {
          const secondPage = await pdfDoc.getPage(currentPage + 1);
          const secondViewport = secondPage.getViewport({ scale: zoom, rotation: effectiveRotation });
          const secondCanvas = secondCanvasRef.current;
          secondCanvas.width = secondViewport.width;
          secondCanvas.height = secondViewport.height;
          const secondCtx = secondCanvas.getContext('2d');
          if (secondCtx) {
            secondCtx.clearRect(0, 0, secondCanvas.width, secondCanvas.height);
            await secondPage.render({ canvasContext: secondCtx, viewport: secondViewport }).promise;
          }
        }
      } catch (e) {
        console.error('Page render failed:', e);
      }
    };

    renderActivePage();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, currentPage, zoom, rotation, viewMode, numPages]);

  // Handle text search
  const handleSearch = async () => {
    if (!pdfDoc || !searchQuery.trim()) return;
    setSearching(true);
    const q = caseSensitive ? searchQuery.trim() : searchQuery.toLowerCase().trim();
    const results: { page: number; count: number }[] = [];

    try {
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        let text = textContent.items.map((it: any) => it.str || '').join(' ');
        if (!caseSensitive) text = text.toLowerCase();

        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const count = (text.match(new RegExp(escaped, 'g')) || []).length;
        if (count > 0) {
          results.push({ page: i, count });
        }
      }
      setSearchResults(results);
      setCurrentMatchIndex(0);
      if (results.length > 0) {
        setCurrentPage(results[0].page);
      }
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setSearching(false);
    }
  };

  const nextSearchResult = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % searchResults.length;
    setCurrentMatchIndex(nextIdx);
    setCurrentPage(searchResults[nextIdx].page);
  };

  const prevSearchResult = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentMatchIndex(prevIdx);
    setCurrentPage(searchResults[prevIdx].page);
  };

  // Bookmarks
  const handleAddBookmark = () => {
    if (!file) return;
    const title = newBookmarkTitle.trim() || `Page ${currentPage} Bookmark`;
    const newBm = addDocumentBookmark({
      docName: file.name,
      pageNumber: currentPage,
      title,
    });
    setBookmarks(getDocumentBookmarks(file.name));
    setNewBookmarkTitle('');
  };

  const handleDeleteBookmark = (id: string) => {
    deleteDocumentBookmark(id);
    if (file) setBookmarks(getDocumentBookmarks(file.name));
  };

  // Notes
  const handleSaveCurrentNote = () => {
    if (!file) return;
    addOrUpdateDocumentNote(file.name, currentPage, currentNoteText);
    setNotes(getDocumentNotes(file.name));
  };

  const handleDeleteCurrentNote = () => {
    if (!file) return;
    const active = notes.find((n) => n.pageNumber === currentPage);
    if (active) {
      deleteDocumentNote(active.id);
      setNotes(getDocumentNotes(file.name));
      setNoteDrafts((prev) => ({ ...prev, [currentPage]: '' }));
    }
  };

  // Read Aloud (Web Speech API)
  const startSpeech = async () => {
    if (!pdfDoc || !('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this browser.');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const page = await pdfDoc.getPage(currentPage);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((it: any) => it.str || '').join(' ').trim();

      if (!pageText) {
        alert(`Page ${currentPage} contains no readable text.`);
        return;
      }

      setCurrentSpokenText(pageText.slice(0, 150) + '...');
      const utterance = new SpeechSynthesisUtterance(pageText);
      utterance.rate = speechRate;
      utterance.onend = () => {
        setSpeechActive(false);
        setSpeechPaused(false);
      };
      utterance.onerror = () => {
        setSpeechActive(false);
        setSpeechPaused(false);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setSpeechActive(true);
      setSpeechPaused(false);
    } catch (e) {
      console.error('Speech error:', e);
    }
  };

  const pauseSpeech = () => {
    if ('speechSynthesis' in window) {
      if (speechPaused) {
        window.speechSynthesis.resume();
        setSpeechPaused(false);
      } else {
        window.speechSynthesis.pause();
        setSpeechPaused(true);
      }
    }
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeechActive(false);
    setSpeechPaused(false);
    setCurrentSpokenText('');
  };

  // Page Manager Selection
  const togglePageSelection = (pNum: number) => {
    setSelectedPages((prev) =>
      prev.includes(pNum) ? prev.filter((p) => p !== pNum) : [...prev, pNum].sort((a, b) => a - b)
    );
  };

  const handleSelectAllPages = () => {
    if (selectedPages.length === numPages) {
      setSelectedPages([]);
    } else {
      setSelectedPages(Array.from({ length: numPages }, (_, i) => i + 1));
    }
  };

  const handleExtractSelectedPages = async () => {
    if (!file || selectedPages.length === 0) {
      alert('Select at least one page to extract.');
      return;
    }
    try {
      const res = await splitPdf(file, {
        mode: 'selected',
        selectedPages,
      });
      triggerDownload(res.blob, res.filename);
    } catch (e) {
      console.error('Extract error:', e);
      alert('Failed to extract selected pages.');
    }
  };

  // Fullscreen & Sizing
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const fitWidth = () => {
    if (!containerRef.current) return;
    const sideWidth = showLeftSidebar ? 220 : 40;
    const containerWidth = containerRef.current.clientWidth - sideWidth;
    const newZoom = Math.max(0.5, Math.min(2.8, (containerWidth / 612) * (viewMode === 'two-page' ? 0.48 : 0.95)));
    setZoom(Number(newZoom.toFixed(2)));
  };

  const fitPage = () => {
    setZoom(viewMode === 'two-page' ? 0.65 : 0.85);
  };

  // Estimated progress
  const progressPercent = Math.round((currentPage / (numPages || 1)) * 100);
  const remainingPages = Math.max(0, numPages - currentPage);
  const remainingMinutes = Math.max(1, Math.ceil((remainingPages * 250) / 200));

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] overflow-hidden shadow-sm transition-colors ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
    >
      {!file ? (
        <div className="p-8 sm:p-12 text-center">
          <div className="max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center mx-auto mb-4">
              <Eye className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5F0EB] mb-2">
              PDFMiniFly Reader
            </h2>
            <p className="text-xs sm:text-sm text-[#5C554F] dark:text-[#A39991] mb-6 leading-relaxed">
              Read, search with match jumping, study with notes & bookmarks, listen with Read Aloud speech, and navigate table of contents with complete local privacy.
            </p>
            <FileDropzone
              accept=".pdf,application/pdf"
              maxFiles={1}
              onFilesSelected={handleFilesSelected}
              label={loading ? 'Opening document...' : 'Drop PDF here or click to open'}
              sublabel="100% In-Browser Reader • Zero Uploads"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-[780px] sm:h-[840px]">
          {/* Top Main Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#FAF7F2] dark:bg-[#141213] border-b border-[#E5DFD4] dark:border-[#2E2729] text-xs">
            {/* Left Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLeftSidebar(!showLeftSidebar)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  showLeftSidebar
                    ? 'bg-[#6D1F35] text-white border-[#6D1F35]'
                    : 'bg-white dark:bg-[#1E1A1B] text-[#5C554F] dark:text-[#A39991] border-[#E5DFD4] dark:border-[#2E2729]'
                }`}
                title="Toggle Sidebar"
              >
                <Columns className="w-4 h-4" />
              </button>

              <span className="font-semibold text-[#141213] dark:text-[#F5F0EB] truncate max-w-[130px] sm:max-w-[180px]">
                {file.name}
              </span>
              <span className="text-[11px] text-[#5C554F] dark:text-[#A39991] hidden sm:inline">
                ({formatBytes(file.size)})
              </span>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - (viewMode === 'two-page' ? 2 : 1)))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] disabled:opacity-30 hover:bg-[#F7F3EC]"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={numPages || 1}
                  value={currentPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setCurrentPage(Math.max(1, Math.min(numPages, val)));
                  }}
                  className="w-12 text-center py-1 rounded-md border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#6D1F35]"
                />
                <span className="text-[#5C554F] dark:text-[#A39991]">/ {numPages}</span>
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(numPages, p + (viewMode === 'two-page' ? 2 : 1)))}
                disabled={currentPage >= numPages}
                className="p-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] disabled:opacity-30 hover:bg-[#F7F3EC]"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* View Mode & Zoom */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMode(viewMode === 'single' ? 'two-page' : 'single')}
                className={`hidden md:inline-flex px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
                  viewMode === 'two-page'
                    ? 'bg-[#6D1F35] text-white border-[#6D1F35]'
                    : 'border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B]'
                }`}
                title="Toggle Two-Page View"
              >
                {viewMode === 'two-page' ? '2-Page' : '1-Page'}
              </button>

              <button
                onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
                className="p-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B]"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono px-1 w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(3.0, Number((z + 0.15).toFixed(2))))}
                className="p-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B]"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={fitWidth}
                className="hidden lg:inline-flex px-2 py-1 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-[11px] font-medium"
              >
                Fit Width
              </button>

              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B]"
                title="Rotate 90°"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              {/* Search Toggle */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  searchOpen
                    ? 'bg-[#6D1F35] text-white border-[#6D1F35]'
                    : 'border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B]'
                }`}
                title="Search text"
              >
                <Search className="w-3.5 h-3.5" />
              </button>

              {/* Study Mode Toggle */}
              <button
                onClick={() => setStudyMode(!studyMode)}
                className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                  studyMode
                    ? 'bg-[#C6A15B] text-black border-[#C6A15B]'
                    : 'border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-[#5C554F] dark:text-[#A39991]'
                }`}
                title="Toggle Study Mode"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Study</span>
              </button>

              {/* Read Aloud Button */}
              <button
                onClick={speechActive ? pauseSpeech : startSpeech}
                className={`p-1.5 rounded-lg border transition-colors ${
                  speechActive
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B]'
                }`}
                title="Read Aloud Current Page"
              >
                {speechActive ? (speechPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />) : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              {/* Reading Atmosphere (Normal / Sepia / Dark) */}
              <button
                onClick={() => {
                  if (readingBackground === 'normal') setReadingBackground('sepia');
                  else if (readingBackground === 'sepia') setReadingBackground('dark');
                  else setReadingBackground('normal');
                }}
                className="p-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B]"
                title={`Reading Mode: ${readingBackground}`}
              >
                {readingBackground === 'sepia' ? (
                  <span className="w-3.5 h-3.5 block rounded-full bg-[#EADCC8] border border-black/20" />
                ) : readingBackground === 'dark' ? (
                  <Moon className="w-3.5 h-3.5 text-[#C6A15B]" />
                ) : (
                  <Sun className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                onClick={() => triggerDownload(file, file.name)}
                className="p-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B]"
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B]"
                title="Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => {
                  stopSpeech();
                  setFile(null);
                  setPdfDoc(null);
                }}
                className="p-1.5 rounded-lg border border-red-200 text-red-600 bg-white dark:bg-[#1E1A1B] hover:bg-red-50"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search Bar Secondary Panel */}
          {searchOpen && (
            <div className="px-4 py-2.5 bg-[#F2ECE3] dark:bg-[#1B1718] border-b border-[#E5DFD4] dark:border-[#2E2729] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <Search className="w-4 h-4 text-[#5C554F]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search inside this document..."
                  className="flex-1 px-3 py-1 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#141213] text-xs focus:outline-none focus:ring-1 focus:ring-[#6D1F35]"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="px-3 py-1 rounded-lg bg-[#6D1F35] text-white font-medium hover:bg-[#58182a]"
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
                <label className="flex items-center gap-1 text-[11px] text-[#5C554F] dark:text-[#A39991] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={caseSensitive}
                    onChange={(e) => setCaseSensitive(e.target.checked)}
                    className="rounded text-[#6D1F35]"
                  />
                  <span>Aa</span>
                </label>
              </div>

              {searchResults.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#141213] dark:text-[#F5F0EB]">
                    {searchResults.reduce((acc, curr) => acc + curr.count, 0)} matches ({currentMatchIndex + 1}/{searchResults.length})
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={prevSearchResult}
                      className="p-1 rounded bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729]"
                      title="Previous match"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={nextSearchResult}
                      className="p-1 rounded bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729]"
                      title="Next match"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Read Aloud Audio Player Strip */}
          {speechActive && (
            <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-300">
              <div className="flex items-center gap-2 truncate">
                <Volume2 className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span className="font-medium">Reading Page {currentPage}:</span>
                <span className="truncate italic max-w-md">{currentSpokenText}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={pauseSpeech} className="p-1 hover:bg-emerald-100 rounded">
                  {speechPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
                <button onClick={stopSpeech} className="p-1 hover:bg-emerald-100 rounded">
                  <Square className="w-3.5 h-3.5" />
                </button>
                <select
                  value={speechRate}
                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                  className="bg-white dark:bg-[#1E1A1B] border border-emerald-300 rounded px-1.5 py-0.5 text-[11px]"
                >
                  <option value={0.75}>0.75x</option>
                  <option value={1.0}>1.0x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                </select>
              </div>
            </div>
          )}

          {/* Viewer Main Body */}
          <div className="flex-1 flex overflow-hidden bg-[#ECE6DC] dark:bg-[#0E0C0D]">
            {/* Left Sidebar (Tabs: Thumbnails | Outline | Bookmarks | Notes) */}
            {showLeftSidebar && (
              <div className="w-48 sm:w-60 border-r border-[#E5DFD4] dark:border-[#2E2729] bg-[#F7F3EC] dark:bg-[#141213] flex flex-col shrink-0">
                {/* Tab Header */}
                <div className="flex items-center border-b border-[#E5DFD4] dark:border-[#2E2729] text-[11px] font-semibold">
                  <button
                    onClick={() => setLeftTab('thumbnails')}
                    className={`flex-1 py-2 text-center transition-colors ${
                      leftTab === 'thumbnails'
                        ? 'text-[#6D1F35] dark:text-[#C6A15B] border-b-2 border-[#6D1F35] dark:border-[#C6A15B] bg-white dark:bg-[#1E1A1B]'
                        : 'text-[#5C554F] dark:text-[#A39991]'
                    }`}
                  >
                    Pages
                  </button>
                  <button
                    onClick={() => setLeftTab('outline')}
                    className={`flex-1 py-2 text-center transition-colors ${
                      leftTab === 'outline'
                        ? 'text-[#6D1F35] dark:text-[#C6A15B] border-b-2 border-[#6D1F35] dark:border-[#C6A15B] bg-white dark:bg-[#1E1A1B]'
                        : 'text-[#5C554F] dark:text-[#A39991]'
                    }`}
                  >
                    Outline
                  </button>
                  <button
                    onClick={() => setLeftTab('bookmarks')}
                    className={`flex-1 py-2 text-center transition-colors ${
                      leftTab === 'bookmarks'
                        ? 'text-[#6D1F35] dark:text-[#C6A15B] border-b-2 border-[#6D1F35] dark:border-[#C6A15B] bg-white dark:bg-[#1E1A1B]'
                        : 'text-[#5C554F] dark:text-[#A39991]'
                    }`}
                  >
                    Marks
                  </button>
                  <button
                    onClick={() => setLeftTab('notes')}
                    className={`flex-1 py-2 text-center transition-colors ${
                      leftTab === 'notes'
                        ? 'text-[#6D1F35] dark:text-[#C6A15B] border-b-2 border-[#6D1F35] dark:border-[#C6A15B] bg-white dark:bg-[#1E1A1B]'
                        : 'text-[#5C554F] dark:text-[#A39991]'
                    }`}
                  >
                    Notes
                  </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-3">
                  {/* 1. Thumbnails & Page Manager */}
                  {leftTab === 'thumbnails' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[11px] text-[#5C554F] dark:text-[#A39991]">
                        <button onClick={handleSelectAllPages} className="hover:underline">
                          {selectedPages.length === numPages ? 'Deselect All' : 'Select All'}
                        </button>
                        {selectedPages.length > 0 && (
                          <button
                            onClick={handleExtractSelectedPages}
                            className="text-[#6D1F35] dark:text-[#C6A15B] font-bold hover:underline"
                          >
                            Extract ({selectedPages.length})
                          </button>
                        )}
                      </div>

                      {Array.from({ length: numPages }).map((_, idx) => {
                        const pNum = idx + 1;
                        const thumb = thumbnails[idx];
                        const isActive = currentPage === pNum;
                        const isSelected = selectedPages.includes(pNum);

                        return (
                          <div
                            key={pNum}
                            className={`p-1.5 rounded-xl border transition-all relative group ${
                              isActive
                                ? 'border-[#6D1F35] dark:border-[#C6A15B] ring-2 ring-[#6D1F35]/20 bg-white dark:bg-[#1E1A1B]'
                                : 'border-[#E5DFD4] dark:border-[#2E2729] bg-white/50 dark:bg-[#1E1A1B]/50'
                            }`}
                          >
                            {/* Checkbox for page selection */}
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => togglePageSelection(pNum)}
                              className="absolute top-2 left-2 z-10 w-3.5 h-3.5 rounded text-[#6D1F35]"
                            />

                            <button
                              onClick={() => setCurrentPage(pNum)}
                              className="w-full text-left"
                            >
                              <div className="aspect-[3/4] bg-white flex items-center justify-center overflow-hidden rounded-md border border-black/5">
                                {thumb ? (
                                  <img src={thumb} alt={`Page ${pNum}`} className="w-full h-full object-contain" />
                                ) : (
                                  <span className="text-[11px] text-gray-400 font-mono">P.{pNum}</span>
                                )}
                              </div>
                              <div className="text-center mt-1 text-[11px] font-medium text-[#5C554F] dark:text-[#A39991]">
                                Page {pNum}
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. Document Outline */}
                  {leftTab === 'outline' && (
                    <div>
                      {outline.length === 0 ? (
                        <div className="text-center py-8 text-xs text-[#5C554F] dark:text-[#A39991]">
                          <Compass className="w-6 h-6 mx-auto mb-2 opacity-40" />
                          <p>No document outline available in this PDF.</p>
                        </div>
                      ) : (
                        <div className="space-y-1 text-xs">
                          {outline.map((item, idx) => (
                            <button
                              key={idx}
                              onClick={async () => {
                                if (item.dest) {
                                  try {
                                    const pageIndex = await pdfDoc.getPageIndex(item.dest[0]);
                                    setCurrentPage(pageIndex + 1);
                                  } catch (e) {}
                                }
                              }}
                              className="w-full text-left p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 truncate font-medium text-[#141213] dark:text-[#F5F0EB]"
                              title={item.title}
                            >
                              {item.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. Bookmarks */}
                  {leftTab === 'bookmarks' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newBookmarkTitle}
                          onChange={(e) => setNewBookmarkTitle(e.target.value)}
                          placeholder={`Bookmark P.${currentPage}...`}
                          className="flex-1 px-2 py-1 text-xs rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B]"
                        />
                        <button
                          onClick={handleAddBookmark}
                          className="p-1.5 rounded-lg bg-[#6D1F35] text-white"
                          title="Save Bookmark"
                        >
                          <BookmarkPlus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {bookmarks.length === 0 ? (
                          <p className="text-[11px] text-center text-[#5C554F] dark:text-[#A39991] py-4">
                            No bookmarks yet.
                          </p>
                        ) : (
                          bookmarks.map((bm) => (
                            <div
                              key={bm.id}
                              className="p-2 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] flex items-center justify-between text-xs"
                            >
                              <button
                                onClick={() => setCurrentPage(bm.pageNumber)}
                                className="text-left truncate flex-1 hover:underline mr-2"
                              >
                                <span className="font-bold text-[#6D1F35] dark:text-[#C6A15B] mr-1">
                                  P.{bm.pageNumber}:
                                </span>
                                <span>{bm.title}</span>
                              </button>
                              <button
                                onClick={() => handleDeleteBookmark(bm.id)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* 4. Notes */}
                  {leftTab === 'notes' && (
                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-[#141213] dark:text-[#F5F0EB]">
                        Page {currentPage} Note:
                      </div>
                      <textarea
                        value={currentNoteText}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNoteDrafts((prev) => ({ ...prev, [currentPage]: val }));
                        }}
                        placeholder="Type local notes for this page..."
                        rows={6}
                        className="w-full p-2 text-xs rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] focus:outline-none focus:ring-1 focus:ring-[#6D1F35]"
                      />
                      <div className="flex items-center justify-between">
                        <button
                          onClick={handleSaveCurrentNote}
                          className="px-3 py-1 bg-[#6D1F35] text-white text-xs font-semibold rounded-lg"
                        >
                          Save Note
                        </button>
                        {currentNoteText && (
                          <button
                            onClick={handleDeleteCurrentNote}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Center Canvas Area */}
            <div
              className={`flex-1 overflow-auto p-4 sm:p-8 flex flex-col items-center justify-center transition-colors ${
                readingBackground === 'sepia'
                  ? 'bg-[#F2E8DC] text-[#3D3226]'
                  : readingBackground === 'dark'
                  ? 'bg-[#141213] text-[#F5F0EB]'
                  : 'bg-[#ECE6DC] dark:bg-[#0E0C0D]'
              }`}
              style={{ filter: `brightness(${brightness}%)` }}
            >
              {/* Study Mode Progress Header */}
              {studyMode && (
                <div className="w-full max-w-2xl mb-4 p-3 rounded-xl bg-white/90 dark:bg-[#1E1A1B]/90 backdrop-blur border border-[#E5DFD4] dark:border-[#2E2729] shadow-xs flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#6D1F35] dark:text-[#C6A15B]">
                      Study Progress: {progressPercent}%
                    </span>
                    <span className="text-[#5C554F] dark:text-[#A39991]">
                      Page {currentPage} of {numPages}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#7A7067]">
                    ~{remainingMinutes} min remaining
                  </span>
                </div>
              )}

              {/* Rendered Canvas (Single or Two-page) */}
              <div
                className={`flex items-center justify-center gap-4 transition-all ${
                  readingBackground === 'dark' ? 'invert contrast-125 hue-rotate-180 brightness-95' : ''
                }`}
              >
                <div className="shadow-2xl bg-white rounded-xs overflow-hidden">
                  <canvas ref={canvasRef} className="block max-w-none" />
                </div>

                {viewMode === 'two-page' && currentPage + 1 <= numPages && (
                  <div className="shadow-2xl bg-white rounded-xs overflow-hidden hidden md:block">
                    <canvas ref={secondCanvasRef} className="block max-w-none" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
