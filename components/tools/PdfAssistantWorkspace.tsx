'use client';

import React, { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { extractTextFromPdf, formatBytes } from '@/lib/pdf-engine';
import { withBasePath } from '@/lib/base-path';
import {
  Sparkles,
  Cpu,
  Cloud,
  FileText,
  Send,
  HelpCircle,
  Clock,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  Download,
} from 'lucide-react';

export const PdfAssistantWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [documentText, setDocumentText] = useState<string>('');
  const [mode, setMode] = useState<'local' | 'cloud'>('local');

  // Privacy disclosure state for Cloud AI mode
  const [cloudConsentGiven, setCloudConsentGiven] = useState<boolean>(false);
  const [showConsentModal, setShowConsentModal] = useState<boolean>(false);

  // Selected language
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');

  // Actions & Queries
  const [query, setQuery] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [assistantOutput, setAssistantOutput] = useState<string>('');
  const [lastAction, setLastAction] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelected = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setIsProcessing(true);
    setErrorMessage(null);
    setAssistantOutput('');

    try {
      const extracted = await extractTextFromPdf(selected);
      const fullText = extracted.fullText;
      setDocumentText(fullText);

      // Auto run local summary preview
      runLocalAnalysis('summary', fullText);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Could not extract text from document: ' + (err?.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  // Mode 1: Local Heuristic Analysis (100% In-Browser)
  const runLocalAnalysis = (action: string, textToUse?: string) => {
    const text = textToUse || documentText;
    if (!text) return;

    setLastAction(action);
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 10);

    let output = '';

    switch (action) {
      case 'summary': {
        const topSentences = sentences.slice(0, 5);
        output = `### Local In-Browser Summary\n\n` +
          `- **Document Length**: ${words.length.toLocaleString()} words across ${sentences.length} sentences.\n` +
          `- **Core Overview**:\n` +
          topSentences.map((s) => `  * ${s}.`).join('\n') +
          `\n\n*(Generated locally in your browser using semantic heuristic extraction)*`;
        break;
      }
      case 'explain': {
        output = `### Local Concept Explanation\n\n` +
          `This document comprises ${words.length} words with an average sentence complexity of ` +
          `${(words.length / Math.max(1, sentences.length)).toFixed(1)} words per sentence.\n\n` +
          `**Key Foundational Statements**:\n` +
          sentences.slice(0, 4).map((s, i) => `${i + 1}. "${s}"`).join('\n\n');
        break;
      }
      case 'key_points': {
        // Find sentences with numbers, percentages, or strong modal words
        const keyItems = sentences
          .filter((s) => /\b(must|shall|require|important|total|percent|%|\d+)\b/i.test(s))
          .slice(0, 8);

        output = `### Extracted Key Points (Local Analysis)\n\n` +
          (keyItems.length > 0
            ? keyItems.map((k) => `• ${k}`).join('\n\n')
            : sentences.slice(0, 6).map((k) => `• ${k}`).join('\n\n'));
        break;
      }
      case 'dates_names': {
        const dateMatches = text.match(/\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b/g) || [];
        const uniqueDates = Array.from(new Set(dateMatches)).slice(0, 10);

        // Simple capitalized entity regex
        const entityMatches = text.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g) || [];
        const uniqueEntities = Array.from(new Set(entityMatches)).slice(0, 10);

        output = `### Identified Dates & Entities (Local Regex Scan)\n\n` +
          `**Dates & Deadlines Found (${uniqueDates.length})**:\n` +
          (uniqueDates.length > 0 ? uniqueDates.map((d) => `- ${d}`).join('\n') : 'No standard dates matched.') +
          `\n\n**Possible Names & Entities Found (${uniqueEntities.length})**:\n` +
          (uniqueEntities.length > 0 ? uniqueEntities.map((e) => `- ${e}`).join('\n') : 'No prominent entities matched.');
        break;
      }
      case 'qa': {
        const qWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
        const matchingSentences = sentences
          .filter((s) => qWords.some((qw) => s.toLowerCase().includes(qw)))
          .slice(0, 4);

        output = `### Local Search Match for "${query}"\n\n` +
          (matchingSentences.length > 0
            ? `Found matching passages:\n\n` + matchingSentences.map((s) => `> "...${s}..."`).join('\n\n')
            : `No direct keyword matches found in document for query words.`);
        break;
      }
    }

    setAssistantOutput(output);
  };

  // Mode 2: Optional Cloud AI via Gemini API
  const runCloudAI = async (action: string) => {
    if (!cloudConsentGiven) {
      setShowConsentModal(true);
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setLastAction(action);

    try {
      // Deployment-aware endpoint: resolves under the base path on GitHub
      // Pages-style deployments. The route only exists where a Node server
      // is actually running; static hosts return their 404 page, handled
      // below with a clear local-first message instead of a JSON parse crash.
      const res = await fetch(withBasePath('/api/gemini/assistant'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          text: documentText,
          query,
          language: selectedLanguage,
        }),
      });

      let data: { result?: string; error?: string } | null = null;
      try {
        data = await res.json();
      } catch {
        // Static hosting (e.g. GitHub Pages) has no server runtime.
        data = null;
      }
      if (!res.ok || !data?.result) {
        throw new Error(
          data?.error ||
            'Cloud AI is unavailable in this deployment. PDFMiniFly is fully local — switch to Local mode for on-device analysis.'
        );
      }

      setAssistantOutput(data.result);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Failed to communicate with AI Assistant.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTriggerAction = (action: string) => {
    if (mode === 'local') {
      runLocalAnalysis(action);
    } else {
      runCloudAI(action);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(assistantOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1A1718] p-6 sm:p-8 shadow-sm">
      <div className="space-y-6">
        <div className="max-w-xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#6D1F35]/10 dark:bg-[#C6A15B]/10 text-[#6D1F35] dark:text-[#C6A15B] flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#141213] dark:text-[#F5F0EB] mb-2">
            Ask Your PDF (AI Assistant)
          </h2>
          <p className="text-xs sm:text-sm text-[#5C554F] dark:text-[#A39991] mb-4">
            Extract summaries, explanations, key points, dates, and answers with transparent privacy controls.
          </p>

          {/* Mode Switcher: Local vs Cloud */}
          <div className="inline-flex p-1 rounded-xl bg-[#FAF7F2] dark:bg-[#141213] border border-[#E5DFD4] dark:border-[#2E2729]">
            <button
              onClick={() => setMode('local')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
                mode === 'local'
                  ? 'bg-white dark:bg-[#1E1A1B] text-[#6D1F35] dark:text-[#C6A15B] shadow-xs'
                  : 'text-[#5C554F] dark:text-[#A39991]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Mode 1: Local In-Browser</span>
            </button>

            <button
              onClick={() => {
                setMode('cloud');
                if (!cloudConsentGiven) setShowConsentModal(true);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
                mode === 'cloud'
                  ? 'bg-white dark:bg-[#1E1A1B] text-[#6D1F35] dark:text-[#C6A15B] shadow-xs'
                  : 'text-[#5C554F] dark:text-[#A39991]'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Mode 2: Cloud AI (Gemini)</span>
            </button>
          </div>
        </div>

        {!file ? (
          <div className="max-w-xl mx-auto">
            <FileDropzone
              accept=".pdf,application/pdf"
              maxFiles={1}
              onFilesSelected={handleFileSelected}
              label="Drop PDF here to analyze"
              sublabel="Processed locally in your browser for supported tools"
            />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">
            {/* Document and Mode Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2] dark:bg-[#141213] text-xs">
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-4 h-4 text-[#6D1F35] dark:text-[#C6A15B] shrink-0" />
                <span className="font-semibold text-[#141213] dark:text-[#F5F0EB] truncate">
                  {file.name}
                </span>
                <span className="text-[#5C554F] dark:text-[#A39991]">
                  ({formatBytes(file.size)})
                </span>
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[#5C554F] dark:text-[#A39991] font-medium">Language:</span>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs font-semibold"
                >
                  <option value="English">English</option>
                  <option value="Assamese">Assamese (অসমীয়া)</option>
                  <option value="Hindi">Hindi (हिन्दी)</option>
                  <option value="Bengali">Bengali (বাংলা)</option>
                </select>
                <button
                  onClick={() => {
                    setFile(null);
                    setDocumentText('');
                    setAssistantOutput('');
                  }}
                  className="text-red-500 hover:underline ml-2"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Quick Prompt Action Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleTriggerAction('summary')}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs font-medium hover:bg-[#F7F3EC] dark:hover:bg-[#252021] text-[#141213] dark:text-[#F5F0EB]"
              >
                Summarize
              </button>
              <button
                onClick={() => handleTriggerAction('explain')}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs font-medium hover:bg-[#F7F3EC] dark:hover:bg-[#252021] text-[#141213] dark:text-[#F5F0EB]"
              >
                Explain Content
              </button>
              <button
                onClick={() => handleTriggerAction('key_points')}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs font-medium hover:bg-[#F7F3EC] dark:hover:bg-[#252021] text-[#141213] dark:text-[#F5F0EB]"
              >
                Key Points
              </button>
              <button
                onClick={() => handleTriggerAction('dates_names')}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-lg border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs font-medium hover:bg-[#F7F3EC] dark:hover:bg-[#252021] text-[#141213] dark:text-[#F5F0EB]"
              >
                Dates & Names
              </button>
            </div>

            {/* Custom Question Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && query.trim() && handleTriggerAction('qa')}
                placeholder="Ask any question about your document..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] bg-white dark:bg-[#1E1A1B] text-xs focus:outline-none focus:ring-1 focus:ring-[#6D1F35]"
              />
              <button
                onClick={() => query.trim() && handleTriggerAction('qa')}
                disabled={isProcessing || !query.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#6D1F35] text-white text-xs font-semibold hover:bg-[#58182a] disabled:opacity-40 inline-flex items-center gap-1.5 shadow-xs"
              >
                <span>Ask</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
                {errorMessage}
              </div>
            )}

            {/* Output Card */}
            <div className="p-5 rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] bg-[#FAF7F2]/50 dark:bg-[#141213]/50 text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#E5DFD4] dark:border-[#2E2729] pb-2">
                <span className="font-bold text-[#141213] dark:text-[#F5F0EB] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#6D1F35] dark:text-[#C6A15B]" />
                  <span>Assistant Response</span>
                  {mode === 'cloud' && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-normal">
                      Gemini 3.8 Flash
                    </span>
                  )}
                </span>
                {assistantOutput && (
                  <button
                    onClick={handleCopy}
                    className="text-[#5C554F] hover:text-black dark:hover:text-white inline-flex items-center gap-1 text-[11px]"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>

              {isProcessing ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-[#6D1F35] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-gray-500">
                    {mode === 'cloud' ? 'Querying Gemini intelligence...' : 'Analyzing text locally...'}
                  </p>
                </div>
              ) : assistantOutput ? (
                <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap font-sans text-[#141213] dark:text-[#F5F0EB]">
                  {assistantOutput}
                </div>
              ) : (
                <p className="text-gray-400 italic text-center py-6">
                  Select a prompt above or type a question to inspect your document.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cloud Consent Disclosure Modal */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1E1A1B] rounded-2xl border border-[#E5DFD4] dark:border-[#2E2729] p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#141213] dark:text-[#F5F0EB]">
                Privacy & Data Disclosure
              </h3>
            </div>

            <p className="text-xs text-[#5C554F] dark:text-[#A39991] leading-relaxed">
              <strong>This action sends document text to AI for processing.</strong>
              <br /><br />
              Mode 1 performs heuristic analysis 100% locally in your browser. Switching to Mode 2 transmits the extracted text to the server-side Gemini AI model to perform deep semantic synthesis.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowConsentModal(false);
                  setMode('local');
                }}
                className="px-4 py-2 rounded-xl border border-[#E5DFD4] dark:border-[#2E2729] text-xs font-semibold hover:bg-gray-50"
              >
                Stay Local
              </button>
              <button
                onClick={() => {
                  setCloudConsentGiven(true);
                  setShowConsentModal(false);
                  setMode('cloud');
                }}
                className="px-4 py-2 rounded-xl bg-[#6D1F35] text-white text-xs font-semibold hover:bg-[#58182a]"
              >
                I Understand & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
