'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { extractTextFromPdf, formatBytes, triggerDownload } from '@/lib/pdf-engine';
import { withBasePath } from '@/lib/base-path';
import {
  GraduationCap,
  FileText,
  HelpCircle,
  Layers,
  Award,
  Download,
  Copy,
  Check,
  RotateCw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Flashcard {
  front: string;
  back: string;
}

interface MCQ {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}


const STUDY_STOP_WORDS = new Set([
  'about', 'above', 'across', 'after', 'again', 'against', 'along', 'although', 'always',
  'among', 'another', 'because', 'before', 'being', 'below', 'between', 'beyond', 'both',
  'cannot', 'could', 'should', 'would', 'their', 'there', 'these', 'those', 'through',
  'under', 'until', 'where', 'which', 'while', 'would', 'your', 'shall', 'these', 'other',
  'which', 'whose', 'every', 'after', 'before', 'during', 'without', 'within', 'however',
  'therefore', 'moreover', 'further', 'either', 'neither', 'whether', 'toward', 'towards',
]);

/** Sentences long enough to be informative but not overwhelming. */
function extractStudySentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/[.!?]+\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 60 && s.length <= 320);
}

/** Content-bearing words in a sentence (candidates for cloze blanks). */
function significantWords(sentence: string): string[] {
  return sentence
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter((w) => w.length >= 5 && !STUDY_STOP_WORDS.has(w.toLowerCase()));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Deterministic cloze question from one real document sentence: a
 * significant word is blanked out and distractors are drawn from other
 * significant words elsewhere in the same document.
 */
function buildClozeMcq(sentence: string, wordPool: string[], salt: number): MCQ | null {
  const words = significantWords(sentence);
  if (words.length === 0) return null;
  const target = words[salt % words.length];
  const blanked = sentence.replace(new RegExp(escapeRegExp(target)), '_______');
  if (blanked === sentence) return null;

  const others = wordPool.filter((w) => w.toLowerCase() !== target.toLowerCase());
  const distractors: string[] = [];
  for (let d = 0; d < others.length && distractors.length < 3; d++) {
    const cand = others[(salt * 3 + d * 7 + d * d) % others.length];
    if (
      cand.toLowerCase() !== target.toLowerCase() &&
      !distractors.some((x) => x.toLowerCase() === cand.toLowerCase())
    ) {
      distractors.push(cand);
    }
  }
  if (distractors.length < 3) return null;

  const correctSlot = salt % 4;
  const options: string[] = [];
  let di = 0;
  for (let i = 0; i < 4; i++) {
    options.push(i === correctSlot ? target : distractors[di++]);
  }

  return {
    question: `Fill in the blank: ${blanked}`,
    options,
    correctAnswer: correctSlot,
    explanation: `Straight from the document: "${sentence}"`,
  };
}

/**
 * Best-effort parse of the cloud MCQ format
 * (Q1. ... / A) ... / Correct Answer: B / Explanation: ...).
 * Returns [] when the response cannot be parsed — callers fall back to
 * local generation.
 */
function parseCloudMcqs(raw: string): MCQ[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  const blocks = raw.split(/\n?\s*Q\d+[.)]/i).slice(1);
  const out: MCQ[] = [];
  for (const block of blocks) {
    const qMatch = block.match(/^\s*([\s\S]*?)\n\s*A\)/i);
    const a = block.match(/\n\s*A\)\s*([^\n]*?)\s*(?=\n\s*B\))/i);
    const b = block.match(/\n\s*B\)\s*([^\n]*?)\s*(?=\n\s*C\))/i);
    const c = block.match(/\n\s*C\)\s*([^\n]*?)\s*(?=\n\s*D\))/i);
    const d = block.match(/\n\s*D\)\s*([^\n]*?)\s*(?=\n)/i);
    const correct = block.match(/Correct\s*Answer\s*[:=]?\s*([A-Da-d])/i);
    const expl = block.match(/Explanation\s*[:=]?\s*([\s\S]*?)(?:\n\s*Q\d|$)/i);
    if (!qMatch || !a || !b || !c || !d || !correct) continue;
    const options = [a[1], b[1], c[1], d[1]].map((o) => o.trim()).filter(Boolean);
    if (options.length !== 4) continue;
    const correctIdx = 'ABCD'.indexOf(correct[1].toUpperCase());
    if (correctIdx < 0 || correctIdx > 3) continue;
    out.push({
      question: qMatch[1].trim(),
      options,
      correctAnswer: correctIdx,
      explanation: (expl?.[1] || '').trim(),
    });
  }
  return out;
}

/** Fully local, deterministic study set derived from the actual document text. */
function buildLocalStudySet(text: string): { notes: string; mcqs: MCQ[]; flashcards: Flashcard[] } {
  const sentences = extractStudySentences(text);
  const wordPool = Array.from(new Set(sentences.flatMap(significantWords)));

  const mcqs: MCQ[] = [];
  for (let i = 0; i < sentences.length && mcqs.length < 5; i++) {
    const mcq = buildClozeMcq(sentences[i], wordPool, i);
    if (mcq) mcqs.push(mcq);
  }

  const flashcards: Flashcard[] = [];
  for (let i = 0; i < sentences.length && flashcards.length < 6; i++) {
    const words = significantWords(sentences[i]);
    if (words.length === 0) continue;
    const target = words[(i + 3) % words.length];
    const blanked = sentences[i].replace(new RegExp(escapeRegExp(target)), '_______');
    if (blanked === sentences[i]) continue;
    flashcards.push({ front: blanked, back: `"${target}" — full sentence: ${sentences[i]}` });
  }

  const topTerms = wordPool
    .map((w) => ({ w, n: text.toLowerCase().split(w.toLowerCase()).length - 1 }))
    .sort((x, y) => y.n - x.n)
    .slice(0, 8)
    .map((x) => x.w);

  const notes =
    '### Document Study Notes\n\n' +
    '**Key passages from the document**:\n\n' +
    sentences.slice(0, 6).map((s) => `• ${s}`).join('\n\n') +
    (topTerms.length ? `\n\n**Frequently used terms**: ${topTerms.join(', ')}` : '');

  return { notes, mcqs, flashcards };
}

export const PdfToStudyWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [documentText, setDocumentText] = useState<string>('');
  const [studyTab, setStudyTab] = useState<'notes' | 'mcq' | 'flashcards' | 'quiz'>('notes');
  const [language, setLanguage] = useState<string>('English');

  const [isGenerating, setIsGenerating] = useState(false);
  const [notesContent, setNotesContent] = useState<string>('');
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);

  // Flashcard flip states
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const extracted = await extractTextFromPdf(selected);
      const fullText = extracted.fullText;
      setDocumentText(fullText);

      // Generate initial study items locally or via AI
      generateStudyMaterials(fullText, language);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Could not extract text from document: ' + (err?.message || ''));
    } finally {
      setIsGenerating(false);
    }
  };

  const generateStudyMaterials = async (text: string, targetLang: string) => {
    setIsGenerating(true);
    setErrorMessage(null);

    let cloudNotes: string | null = null;
    let cloudMcqs: MCQ[] = [];

    try {
      // Server route (only exists where a Node runtime is deployed).
      // On static hosting (GitHub Pages) the request resolves to the
      // host's 404 page — handled below; generation then falls back to
      // the fully local path instead of failing.
      const [resNotes, resMcqs] = await Promise.all([
        fetch(withBasePath('/api/gemini/assistant'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'study_notes', text, language: targetLang }),
        }),
        fetch(withBasePath('/api/gemini/assistant'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mcqs', text, language: targetLang }),
        }),
      ]);
      if (resNotes.ok) {
        try {
          const d = await resNotes.json();
          if (typeof d?.result === 'string' && d.result.trim()) cloudNotes = d.result;
        } catch { /* non-JSON (static host 404 page) — local fallback */ }
      }
      if (resMcqs.ok) {
        try {
          const d = await resMcqs.json();
          cloudMcqs = parseCloudMcqs(d?.result || '');
        } catch { /* non-JSON — local fallback */ }
      }
    } catch (err: any) {
      console.warn('Cloud study generation unavailable; using local generation:', err?.message || err);
    }

    // Everything below is derived from the document's actual text, so the
    // study set is real in every deployment, including fully static hosting.
    const local = buildLocalStudySet(text);
    if (!cloudNotes && local.mcqs.length === 0 && local.flashcards.length === 0 && !local.notes) {
      setErrorMessage('Not enough readable text in this document to build study materials.');
      setIsGenerating(false);
      return;
    }

    setNotesContent(cloudNotes || local.notes);
    setMcqs(cloudMcqs.length >= 1 ? cloudMcqs : local.mcqs);
    setFlashcards(local.flashcards);
    setIsGenerating(false);
  };

  const handleSelectQuizOption = (qIdx: number, optIdx: number) => {
    if (quizSubmitted) return;
    setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const calculateScore = () => {
    let score = 0;
    mcqs.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctAnswer) score++;
    });
    return score;
  };

  return (
    <div className="rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] p-6 sm:p-8 shadow-sm">
      <div className="space-y-6">
        <div className="max-w-xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5F0EB] mb-2">
            PDF to Study Tools
          </h2>
          <p className="text-xs sm:text-sm text-[#5C554F] dark:text-[#A39991] mb-6">
            Transform notes, chapters, and lecture PDFs into revision notes, interactive MCQs, flashcards, and quizzes.
          </p>
        </div>

        {!file ? (
          <div className="max-w-xl mx-auto">
            <FileDropzone
              accept=".pdf,application/pdf"
              maxFiles={1}
              onFilesSelected={handleFileSelected}
              label="Drop textbook or lecture PDF here"
              sublabel="Processed locally in your browser for supported tools"
            />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Document bar & Language selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-xs">
              <span className="font-semibold text-[#141213] dark:text-[#F5F0EB] truncate">
                {file.name} ({formatBytes(file.size)})
              </span>

              <div className="flex items-center gap-2">
                <span className="text-[#5C554F] dark:text-[#A39991]">Language:</span>
                <select
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    generateStudyMaterials(documentText, e.target.value);
                  }}
                  className="px-2 py-1 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs font-semibold"
                >
                  <option value="English">English</option>
                  <option value="Assamese">Assamese (অসমীয়া)</option>
                  <option value="Hindi">Hindi (हिन्दी)</option>
                  <option value="Bengali">Bengali (বাংলা)</option>
                </select>
                <button
                  onClick={() => setFile(null)}
                  className="text-red-500 hover:underline ml-2"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Study Navigation Tabs */}
            <div className="flex justify-center">
              <div className="inline-flex p-1 rounded-xl bg-[#FAF7F2] dark:bg-[#141213] border border-[#E5DFD4] dark:border-[#2E2729]">
                {[
                  { id: 'notes', label: 'Study Notes', icon: FileText },
                  { id: 'mcq', label: 'MCQs', icon: HelpCircle },
                  { id: 'flashcards', label: 'Flashcards', icon: Layers },
                  { id: 'quiz', label: 'Interactive Quiz', icon: Award },
                ].map((t) => {
                  const Icon = t.icon;
                  const active = studyTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setStudyTab(t.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
                        active
                          ? 'bg-white dark:bg-[#1E1A1B] text-[#6D1F35] dark:text-[#C6A15B] shadow-xs'
                          : 'text-[#5C554F] dark:text-[#A39991]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {isGenerating ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-[#6D1F35] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-semibold text-[#141213] dark:text-[#F5F0EB]">
                  Synthesizing study materials...
                </p>
              </div>
            ) : (
              <div>
                {/* 1. Study Notes */}
                {studyTab === 'notes' && (
                  <div className="p-6 rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-[#E5DFD4] dark:border-[#2E2729] pb-3">
                      <span className="font-bold text-sm text-[#141213] dark:text-[#F5F0EB]">
                        Revision Cheat Sheet
                      </span>
                      <button
                        onClick={() => {
                          const blob = new Blob([notesContent], { type: 'text/markdown' });
                          triggerDownload(blob, `${file.name}_study_notes.md`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#6D1F35] text-white font-medium inline-flex items-center gap-1 hover:bg-[#58182a]"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Notes</span>
                      </button>
                    </div>
                    <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap">
                      {notesContent}
                    </div>
                  </div>
                )}

                {/* 2. MCQs with Answer Reveal */}
                {studyTab === 'mcq' && (
                  <div className="space-y-4">
                    {mcqs.length === 0 && (
                    <p className="text-center text-sm text-[#5C554F] dark:text-[#A39991] py-8">
                      No questions could be derived from this document. Try a document with longer passages.
                    </p>
                    )}
                    {mcqs.map((q, qIdx) => (
                      <div
                        key={qIdx}
                        className="p-5 rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs space-y-3"
                      >
                        <p className="font-bold text-[#141213] dark:text-[#F5F0EB] text-sm">
                          {qIdx + 1}. {q.question}
                        </p>

                        <div className="space-y-2">
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className="p-2.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-xs font-medium"
                            >
                              <span className="font-bold mr-2 text-[#6D1F35] dark:text-[#C6A15B]">
                                {String.fromCharCode(65 + oIdx)})
                              </span>
                              {opt}
                            </div>
                          ))}
                        </div>

                        <details className="pt-2 text-xs cursor-pointer">
                          <summary className="font-semibold text-[#238B63] hover:underline">
                            Reveal Correct Answer & Explanation
                          </summary>
                          <div className="mt-2 p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 text-green-800 dark:text-green-300 space-y-1">
                            <p className="font-bold">
                              Answer: Option {String.fromCharCode(65 + q.correctAnswer)} (
                              {q.options[q.correctAnswer]})
                            </p>
                            <p className="text-[11px]">{q.explanation}</p>
                          </div>
                        </details>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Flashcards Flip Cards */}
                {studyTab === 'flashcards' && flashcards.length > 0 && (
                  <div className="max-w-md mx-auto space-y-4 text-center">
                    <div
                      onClick={() => setIsFlipped(!isFlipped)}
                      className="aspect-[4/3] rounded-2xl border-2 border-[#6D1F35]/30 dark:border-[#C6A15B]/30 bg-white dark:bg-[#1E1A1B] p-8 flex flex-col items-center justify-center cursor-pointer shadow-md hover:shadow-lg transition-all select-none"
                    >
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                        {isFlipped ? 'Answer (Click to Flip)' : 'Question / Concept (Click to Flip)'}
                      </span>
                      <p className="text-sm sm:text-base font-bold text-[#141213] dark:text-[#F5F0EB]">
                        {isFlipped ? flashcards[cardIndex].back : flashcards[cardIndex].front}
                      </p>
                    </div>

                    <div className="flex items-center justify-between px-2">
                      <button
                        onClick={() => {
                          setIsFlipped(false);
                          setCardIndex((c) => Math.max(0, c - 1));
                        }}
                        disabled={cardIndex <= 0}
                        className="p-2 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] disabled:opacity-30"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <span className="text-xs font-semibold text-[#5C554F] dark:text-[#A39991]">
                        Card {cardIndex + 1} of {flashcards.length}
                      </span>

                      <button
                        onClick={() => {
                          setIsFlipped(false);
                          setCardIndex((c) => Math.min(flashcards.length - 1, c + 1));
                        }}
                        disabled={cardIndex >= flashcards.length - 1}
                        className="p-2 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] disabled:opacity-30"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Interactive Quiz Mode */}
                {studyTab === 'quiz' && (
                  <div className="space-y-4">
                    {mcqs.length === 0 && (
                    <p className="text-center text-sm text-[#5C554F] dark:text-[#A39991] py-8">
                      No questions could be derived from this document. Try a document with longer passages.
                    </p>
                    )}
                    {quizSubmitted && (
                      <div className="p-4 rounded-xl bg-[#238B63]/10 border border-[#238B63]/30 text-center space-y-1">
                        <h4 className="text-sm font-bold text-[#238B63]">
                          Quiz Score: {calculateScore()} / {mcqs.length} Correct
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          {calculateScore() === mcqs.length
                            ? 'Excellent grasp of the material!'
                            : 'Review the explanations below to improve comprehension.'}
                        </p>
                      </div>
                    )}

                    {mcqs.map((q, qIdx) => (
                      <div
                        key={qIdx}
                        className="p-5 rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs space-y-3"
                      >
                        <p className="font-bold text-[#141213] dark:text-[#F5F0EB] text-sm">
                          {qIdx + 1}. {q.question}
                        </p>

                        <div className="space-y-2">
                          {q.options.map((opt, oIdx) => {
                            const selected = quizAnswers[qIdx] === oIdx;
                            const isCorrect = q.correctAnswer === oIdx;
                            return (
                              <button
                                key={oIdx}
                                onClick={() => handleSelectQuizOption(qIdx, oIdx)}
                                className={`w-full text-left p-3 rounded-xl border transition-all text-xs ${
                                  quizSubmitted
                                    ? isCorrect
                                      ? 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200 font-bold'
                                      : selected
                                      ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200'
                                      : 'border-[#E5DFD4] dark:border-[#2E2729] opacity-60'
                                    : selected
                                    ? 'border-[#6D1F35] dark:border-[#C6A15B] bg-[#6D1F35]/5 dark:bg-[#C6A15B]/10 font-bold ring-1 ring-[#6D1F35]'
                                    : 'border-[#E5DFD4] dark:border-[#2E2729] hover:bg-[#FAF7F2] dark:hover:bg-[#141213]'
                                }`}
                              >
                                <span className="font-bold mr-2 text-[#6D1F35] dark:text-[#C6A15B]">
                                  {String.fromCharCode(65 + oIdx)})
                                </span>
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    <div className="pt-2 flex justify-end">
                      {!quizSubmitted ? (
                        <button
                          onClick={() => setQuizSubmitted(true)}
                          className="px-6 py-2.5 rounded-xl bg-[#6D1F35] text-white text-xs font-semibold hover:bg-[#58182a]"
                        >
                          Submit Answers
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setQuizAnswers({});
                            setQuizSubmitted(false);
                          }}
                          className="px-6 py-2.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] text-xs font-semibold hover:bg-gray-50"
                        >
                          Retake Quiz
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
