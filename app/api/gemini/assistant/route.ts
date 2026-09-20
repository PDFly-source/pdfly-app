import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { action, text, query, language } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Document text is required for AI processing.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured in environment.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Limit text to avoid excessive tokens while capturing high semantic fidelity
    const truncatedText = text.slice(0, 45000);
    const langNote = language ? `Target response language: ${language}.` : 'Language: English.';

    let systemInstruction = `You are the PDFly Document Intelligence Engine. You analyze provided PDF texts with precision, confidentiality, and high semantic clarity. ${langNote}`;
    let prompt = '';

    switch (action) {
      case 'summarize':
        prompt = `Please provide a structured, executive summary of the following document. Include:
1. Executive Overview (2-3 sentences)
2. Core Takeaways (bullet points)
3. Key Conclusions or Action Items.

Document text:
${truncatedText}`;
        break;

      case 'explain':
        prompt = `Explain the following document content in clear, accessible terms as if explaining to a knowledgeable colleague. Clarify complex terminology or legal/technical concepts.

Document text:
${truncatedText}`;
        break;

      case 'key_points':
        prompt = `Extract all critical key points, obligations, metrics, or essential highlights from this document as bullet points.

Document text:
${truncatedText}`;
        break;

      case 'dates_names':
        prompt = `Analyze the document and list all identified:
1. Dates and Deadlines (with context of what happens on each date)
2. Persons, Organizations, and Entities mentioned (with their role).

Document text:
${truncatedText}`;
        break;

      case 'study_notes':
        prompt = `Create comprehensive, well-structured study notes from this document:
- Key Concepts & Definitions
- Topic Breakdown with explanations
- Summary Cheat Sheet
- Key Terms glossary

Document text:
${truncatedText}`;
        break;

      case 'mcqs':
        prompt = `Generate 5 high-quality Multiple Choice Questions (MCQs) based strictly on this document.
Format each question clearly as:
Q1. [Question]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Correct Answer: [Letter]
Explanation: [Brief explanation]

Document text:
${truncatedText}`;
        break;

      case 'qa':
      default:
        prompt = `Answer the following user question based strictly on the provided document text. If the answer is not mentioned, state that it is not found in the document.

User Question: ${query || 'Provide a general summary of the document'}

Document text:
${truncatedText}`;
        break;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    return NextResponse.json({
      result: response.text || 'No response generated.',
      action,
    });
  } catch (error: any) {
    console.error('Gemini PDF Assistant Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process document with Gemini AI.' },
      { status: 500 }
    );
  }
}
