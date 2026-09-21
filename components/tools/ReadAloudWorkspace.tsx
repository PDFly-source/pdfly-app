'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { extractTextFromPdf, formatBytes } from '@/lib/pdf-engine';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  FileText,
  Clock,
  Settings,
} from 'lucide-react';

export const ReadAloudWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeRef = useRef<HTMLDivElement | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setIsLoading(true);
    setCurrentIdx(0);
    setIsPlaying(false);
    setErrorMessage(null);

    try {
      const extracted = await extractTextFromPdf(selected);
      const allText = extracted.fullText;
      // Split by double newline or sentence groups
      const paras = allText
        .split(/\n\s*\n/)
        .map((p) => p.replace(/\s+/g, ' ').trim())
        .filter((p) => p.length > 20);

      setParagraphs(paras);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Could not extract audio-ready text from document: ' + (err?.message || ''));
    } finally {
      setIsLoading(false);
    }
  };

  // Speech synthesis controller
  useEffect(() => {
    if (!isPlaying || paragraphs.length === 0 || currentIdx >= paragraphs.length) {
      window.speechSynthesis?.cancel();
      return;
    }

    window.speechSynthesis?.cancel();

    const utterance = new SpeechSynthesisUtterance(paragraphs[currentIdx]);
    utterance.rate = speed;

    utterance.onend = () => {
      if (currentIdx < paragraphs.length - 1) {
        setCurrentIdx((prev) => prev + 1);
      } else {
        setIsPlaying(false);
      }
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    window.speechSynthesis?.speak(utterance);

    // Scroll paragraph into view
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    return () => {
      window.speechSynthesis?.cancel();
    };
  }, [isPlaying, currentIdx, speed, paragraphs]);

  const handlePlayPause = () => {
    if (!isPlaying) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
      window.speechSynthesis?.pause();
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentIdx(0);
    window.speechSynthesis?.cancel();
  };

  const handlePrev = () => {
    window.speechSynthesis?.cancel();
    setCurrentIdx((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    window.speechSynthesis?.cancel();
    setCurrentIdx((prev) => Math.min(paragraphs.length - 1, prev + 1));
  };

  return (
    <div className="rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] p-6 sm:p-8 shadow-sm">
      <div className="space-y-6">
        <div className="max-w-xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center mx-auto mb-4">
            <Volume2 className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5F0EB] mb-2">
            Listen to PDF (Read Aloud)
          </h2>
          <p className="text-xs sm:text-sm text-[#5C554F] dark:text-[#A39991] mb-6">
            Listen to your PDF spoken aloud using in-browser speech synthesis. Variable speed, paragraph tracking, and zero cloud latency.
          </p>
        </div>

        {errorMessage && (
          <div className="max-w-xl mx-auto mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs">
            {errorMessage}
          </div>
        )}

        {!file ? (
          <div className="max-w-xl mx-auto">
            <FileDropzone
              accept=".pdf,application/pdf"
              maxFiles={1}
              onFilesSelected={handleFileSelected}
              label="Drop PDF here to listen"
              sublabel="Processed locally in your browser for supported tools"
            />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-5">
            {/* Audio Controls Bar */}
            <div className="p-4 rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  disabled={currentIdx === 0}
                  className="p-2 rounded-xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729] disabled:opacity-30"
                  title="Previous Paragraph"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={handlePlayPause}
                  className="p-3 rounded-xl bg-[#6D1F35] text-white hover:bg-[#58182a] shadow-xs"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                </button>

                <button
                  onClick={handleStop}
                  className="p-2 rounded-xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729]"
                  title="Stop"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>

                <button
                  onClick={handleNext}
                  disabled={currentIdx >= paragraphs.length - 1}
                  className="p-2 rounded-xl bg-white dark:bg-[#1E1A1B] border border-[#E5DFD4] dark:border-[#2E2729] disabled:opacity-30"
                  title="Next Paragraph"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Speed Pills */}
              <div className="flex items-center gap-1 bg-white dark:bg-[#1E1A1B] p-1 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] text-xs">
                {[0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`px-2 py-1 rounded-lg font-mono text-[11px] font-semibold transition-colors ${
                      speed === s
                        ? 'bg-[#6D1F35] text-white'
                        : 'text-[#5C554F] hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              <button
                onClick={() => setFile(null)}
                className="text-xs text-red-500 hover:underline"
              >
                Change PDF
              </button>
            </div>

            {/* Paragraph stream with live highlight */}
            <div className="max-h-[500px] overflow-y-auto space-y-3 p-1">
              {paragraphs.map((para, i) => {
                const isActive = i === currentIdx;
                return (
                  <div
                    key={i}
                    ref={isActive ? activeRef : null}
                    onClick={() => {
                      setCurrentIdx(i);
                      setIsPlaying(true);
                    }}
                    className={`p-4 rounded-xl border text-xs sm:text-sm leading-relaxed transition-all cursor-pointer ${
                      isActive
                        ? 'border-[#6D1F35] dark:border-[#C6A15B] bg-[#6D1F35]/5 dark:bg-[#C6A15B]/10 font-medium ring-2 ring-[#6D1F35]/30'
                        : 'border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] hover:border-[#6D1F35]/40 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono mb-1">
                      <span>Paragraph {i + 1}</span>
                      {isActive && isPlaying && (
                        <span className="text-[#6D1F35] dark:text-[#C6A15B] font-bold uppercase animate-pulse">
                          Speaking now...
                        </span>
                      )}
                    </div>
                    {para}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
