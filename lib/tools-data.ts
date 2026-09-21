import { ToolDefinition, ToolCategory } from '@/types/pdf';

export const ALL_TOOLS: ToolDefinition[] = [
  // Organize PDF
  {
    id: 'merge-pdf',
    slug: 'merge-pdf',
    name: 'Merge PDF',
    description: 'Combine multiple PDF documents into one continuous file.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    iconName: 'Layers',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 50,
    outputExt: '.pdf',
    keywords: ['merge', 'combine', 'join', 'append', 'bind'],
    seoTitle: 'Merge PDF Online – Free & Private Local Tool | PDFMiniFly',
    seoDescription: 'Merge and combine multiple PDF files locally on your device. Fast, local-first processing, and with no mandatory file uploads.'
  },
  {
    id: 'split-pdf',
    slug: 'split-pdf',
    name: 'Split PDF',
    description: 'Separate individual pages or extract custom page ranges into new PDFs.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    iconName: 'Scissors',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.zip',
    keywords: ['split', 'cut', 'separate', 'extract pages', 'divide'],
    seoTitle: 'Split PDF Pages – Fast & Private In-Browser Tool | PDFMiniFly',
    seoDescription: 'Split PDF documents by page ranges or extract individual pages safely in your browser. Local-first processing.'
  },
  {
    id: 'organize-pdf',
    slug: 'organize-pdf',
    name: 'Organize & Rotate Pages',
    description: 'Reorder, rotate, duplicate, reverse, delete, or import pages across documents.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    iconName: 'Grid',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    supportsBatch: true,
    keywords: ['organize', 'rotate', 'reorder', 'duplicate', 'reverse', 'sort', 'pages'],
    seoTitle: 'Organize & Rotate PDF Pages Online | PDFMiniFly',
    seoDescription: 'Drag, reorder, rotate 90/180 degrees, duplicate, and delete pages from PDF files visually with local-first processing.'
  },
  {
    id: 'remove-blank-pages',
    slug: 'remove-blank-pages',
    name: 'Remove Blank Pages',
    description: 'Automatically detect and clean out blank or empty scanned pages.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    iconName: 'FileX',
    badge: 'Smart',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    keywords: ['remove blank', 'clean pages', 'empty pages', 'detect blank'],
    seoTitle: 'Remove Blank Pages from PDF – Local Detection | PDFMiniFly',
    seoDescription: 'Automatically detect and remove blank pages from scanned PDFs locally in your browser before exporting.'
  },
  {
    id: 'extract-pages',
    slug: 'extract-pages',
    name: 'Extract Pages',
    description: 'Extract specific pages or custom ranges into standalone documents.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    iconName: 'FilePlus2',
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    keywords: ['extract', 'pages', 'select pages', 'pull pages'],
    seoTitle: 'Extract PDF Pages Online – Fast & Private | PDFMiniFly',
    seoDescription: 'Extract selected page subsets or individual leaves into clean new PDF files locally.'
  },
  {
    id: 'booklet-maker',
    slug: 'booklet-maker',
    name: 'Booklet Maker',
    description: 'Transform multi-page documents into 2-up printable fold-and-staple booklets.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    iconName: 'BookOpen',
    badge: 'Print',
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    keywords: ['booklet', 'imposition', 'print booklet', '2-up', 'duplex', 'binding'],
    seoTitle: 'PDF Booklet Maker – Printable 2-Up Imposition | PDFMiniFly',
    seoDescription: 'Create duplex printable booklets in A4, A5, and Letter sizes with left or right binding options.'
  },

  // View & Read
  {
    id: 'pdf-viewer',
    slug: 'pdf-viewer',
    name: 'PDF Viewer & Reader',
    description: 'Read PDFs with thumbnails, zoom, text search, page jump, print, and dark mode.',
    category: 'edit',
    categoryLabel: 'View & Edit',
    iconName: 'Eye',
    badge: 'Viewer',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    keywords: ['viewer', 'reader', 'view pdf', 'open pdf', 'search pdf', 'read'],
    seoTitle: 'Online PDF Viewer & Reader – Private & Local | PDFMiniFly',
    seoDescription: 'Read and inspect PDF documents in your browser with text search, thumbnails, dark reading mode, and zero uploads.'
  },
  {
    id: 'read-aloud',
    slug: 'read-aloud',
    name: 'Listen to PDF (Read Aloud)',
    description: 'Listen to your PDF spoken aloud with natural speech synthesis controls.',
    category: 'edit',
    categoryLabel: 'View & Edit',
    iconName: 'Volume2',
    badge: 'Audio',
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.txt',
    keywords: ['read aloud', 'tts', 'text to speech', 'listen to pdf', 'voice'],
    seoTitle: 'Read Aloud PDF – In-Browser Audio Player | PDFMiniFly',
    seoDescription: 'Listen to any PDF document using in-browser text-to-speech synthesis with variable speed and paragraph jumping.'
  },

  // Compress & Optimize
  {
    id: 'compress-pdf',
    slug: 'compress-pdf',
    name: 'Compress PDF',
    description: 'Reduce PDF file size locally while preserving document clarity.',
    category: 'compress',
    categoryLabel: 'Compress & Optimize',
    iconName: 'Minimize2',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    supportsBatch: true,
    keywords: ['compress', 'reduce size', 'shrink', 'optimize', 'small pdf'],
    seoTitle: 'Compress PDF Locally – Fast, Secure Size Reducer | PDFMiniFly',
    seoDescription: 'Shrink PDF file sizes directly on your device with customizable compression ratios and local-first processing.'
  },
  {
    id: 'pdf-metadata',
    slug: 'pdf-metadata',
    name: 'PDF Metadata & Info',
    description: 'Inspect document properties, edit metadata, or sanitize sensitive tags.',
    category: 'compress',
    categoryLabel: 'Compress & Optimize',
    iconName: 'FileText',
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    supportsBatch: true,
    keywords: ['metadata', 'sanitize', 'properties', 'author', 'title'],
    seoTitle: 'PDF Metadata Viewer & Sanitizer | PDFMiniFly',
    seoDescription: 'View author, title, dates and remove privacy-sensitive metadata from your PDF files.'
  },

  // Edit PDF
  {
    id: 'edit-pdf',
    slug: 'edit-pdf',
    name: 'PDF Editor',
    description: 'Add text annotations, shapes, freehand drawing, highlights, and stamps.',
    category: 'edit',
    categoryLabel: 'Edit PDF',
    iconName: 'Edit3',
    badge: 'Editor',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    keywords: ['edit', 'annotate', 'draw', 'highlight', 'stamps', 'shapes', 'markup'],
    seoTitle: 'Online PDF Editor – Annotate, Draw & Stamp | PDFMiniFly',
    seoDescription: 'Lightweight, client-side PDF visual editor. Add text, highlights, shapes, stamps, and drawings directly in your browser.'
  },
  {
    id: 'sign-pdf',
    slug: 'sign-pdf',
    name: 'Sign PDF',
    description: 'Draw, type, or upload your signature and place it anywhere with local privacy.',
    category: 'edit',
    categoryLabel: 'Edit PDF',
    iconName: 'PenTool',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    keywords: ['sign', 'signature', 'draw signature', 'fill and sign', 'e-sign'],
    seoTitle: 'Sign PDF Online Free – Private Document Signature Tool | PDFMiniFly',
    seoDescription: 'Sign PDF files by drawing, typing, or uploading your signature. Never uploads your sensitive documents.'
  },
  {
    id: 'fill-form',
    slug: 'fill-form',
    name: 'Fill PDF Forms',
    description: 'Fill interactive text fields, checkboxes, radios, dropdowns, and flatten forms.',
    category: 'edit',
    categoryLabel: 'Edit PDF',
    iconName: 'CheckSquare',
    badge: 'Forms',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    keywords: ['fill form', 'interactive form', 'flatten form', 'pdf form', 'checkbox'],
    seoTitle: 'Fill PDF Forms Online – Interactive Form Filler | PDFMiniFly',
    seoDescription: 'Fill out interactive PDF forms locally in your browser. Edit text fields, check boxes, and flatten permanently.'
  },
  {
    id: 'redact-pdf',
    slug: 'redact-pdf',
    name: 'Smart Redaction',
    description: 'Detect and permanently blackout sensitive emails, phone numbers, IDs, and dates.',
    category: 'security',
    categoryLabel: 'Security',
    iconName: 'EyeOff',
    badge: 'Privacy',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    keywords: ['redact', 'blackout', 'sensitive data', 'sanitize', 'censor', 'pii'],
    seoTitle: 'Smart PDF Redaction Tool – Permanent & Local | PDFMiniFly',
    seoDescription: 'Permanently redact sensitive PII, emails, phones, and custom boxes. Strips underlying text in the exported PDF.'
  },
  {
    id: 'pdf-health',
    slug: 'pdf-health',
    name: 'PDF Health Check',
    description: 'Inspect structure, metadata, encryption, font assets, and get actionable recommendations.',
    category: 'security',
    categoryLabel: 'Security',
    iconName: 'Activity',
    badge: 'Health',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.json',
    keywords: ['health', 'inspect', 'diagnose', 'analyze', 'security check', 'audit'],
    seoTitle: 'PDF Health Check & Diagnostic Tool – In-Depth Audit | PDFMiniFly',
    seoDescription: 'Diagnose PDF file health, inspect hidden metadata, analyze security status, and optimize performance.'
  },
  {
    id: 'pdf-sanitizer',
    slug: 'pdf-sanitizer',
    name: 'Document Sanitizer',
    description: 'Purge hidden metadata, author information, comments, and JavaScript attachments.',
    category: 'security',
    categoryLabel: 'Security',
    iconName: 'ShieldAlert',
    badge: 'Sanitize',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    keywords: ['sanitize', 'purge metadata', 'strip info', 'clean pdf', 'remove javascript'],
    seoTitle: 'Document Sanitizer – Strip Metadata & Private Traces | PDFMiniFly',
    seoDescription: 'Sanitize confidential PDFs before distribution by removing embedded metadata, annotations, and tracking tags.'
  },

  // Security & Watermark
  {
    id: 'protect-pdf',
    slug: 'protect-pdf',
    name: 'Protect & Unlock PDF',
    description: 'Encrypt documents with a strong password or unlock protected files.',
    category: 'security',
    categoryLabel: 'Security',
    iconName: 'ShieldCheck',
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    keywords: ['protect', 'password', 'encrypt', 'unlock', 'decrypt'],
    seoTitle: 'Protect & Unlock PDF Files Privately | PDFMiniFly',
    seoDescription: 'Add password protection to secure sensitive PDFs or decrypt your protected files without server upload.'
  },
  {
    id: 'watermark-pdf',
    slug: 'watermark-pdf',
    name: 'Add Watermark',
    description: 'Overlay custom text or image watermarks with precise opacity and angle.',
    category: 'security',
    categoryLabel: 'Security',
    iconName: 'Stamp',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    supportsBatch: true,
    keywords: ['watermark', 'stamp', 'confidential', 'draft', 'overlay'],
    seoTitle: 'Watermark PDF Online – Add Text & Image Watermarks | PDFMiniFly',
    seoDescription: 'Protect confidential documents with diagonal or center text/image watermarks.'
  },
  {
    id: 'page-numbers',
    slug: 'page-numbers',
    name: 'Add Page Numbers',
    description: 'Stamp page numbering at header or footer positions with customizable formats.',
    category: 'security',
    categoryLabel: 'Security',
    iconName: 'Hash',
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    supportsBatch: true,
    keywords: ['page numbers', 'numbering', 'header footer', 'pagination', 'bates'],
    seoTitle: 'Add Page Numbers to PDF Files Online | PDFMiniFly',
    seoDescription: 'Insert clean page numbers (Page 1 of N, etc.) in multiple positions across your PDF documents.'
  },

  // Convert & Extract
  {
    id: 'pdf-to-image',
    slug: 'pdf-to-image',
    name: 'PDF to Image',
    description: 'Convert PDF pages into high-resolution JPG, PNG, or WebP images.',
    category: 'convert_from',
    categoryLabel: 'Convert from PDF',
    iconName: 'Image',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.zip',
    keywords: ['pdf to image', 'pdf to jpg', 'pdf to png', 'render pages'],
    seoTitle: 'PDF to Image Converter (JPG, PNG, WebP) | PDFMiniFly',
    seoDescription: 'Render and extract high quality images from PDF pages with selectable DPI and ZIP packaging.'
  },
  {
    id: 'image-to-pdf',
    slug: 'image-to-pdf',
    name: 'Image to PDF',
    description: 'Convert JPG, PNG, WebP, or BMP photos into a consolidated PDF document.',
    category: 'convert_to',
    categoryLabel: 'Convert to PDF',
    iconName: 'FileImage',
    popular: true,
    accepts: ['.jpg', '.jpeg', '.png', '.webp', '.bmp', 'image/*'],
    maxFiles: 50,
    outputExt: '.pdf',
    keywords: ['image to pdf', 'jpg to pdf', 'png to pdf', 'photos to pdf'],
    seoTitle: 'Convert Images to PDF Online (JPG, PNG, WebP) | PDFMiniFly',
    seoDescription: 'Turn your photos and scans into a clean PDF with custom page sizes, margins, and reordering.'
  },
  {
    id: 'extract-text',
    slug: 'extract-text',
    name: 'Extract Text',
    description: 'Extract raw text, copy page-by-page content, or download as TXT file.',
    category: 'convert_from',
    categoryLabel: 'Convert from PDF',
    iconName: 'FileText',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.txt',
    keywords: ['extract text', 'pdf to text', 'copy text', 'txt export'],
    seoTitle: 'Extract Text from PDF Online – Fast & Local | PDFMiniFly',
    seoDescription: 'Extract text contents page-by-page or export full document to clean TXT file locally on your device.'
  },
  {
    id: 'extract-images',
    slug: 'extract-images',
    name: 'Extract Images',
    description: 'Detect, preview, and download embedded and page images as ZIP.',
    category: 'convert_from',
    categoryLabel: 'Convert from PDF',
    iconName: 'Images',
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.zip',
    keywords: ['extract images', 'download images', 'pdf pictures', 'photos from pdf'],
    seoTitle: 'Extract Images from PDF Online | PDFMiniFly',
    seoDescription: 'Extract embedded images and high-resolution page renders from PDFs into single images or a ZIP archive.'
  },
  {
    id: 'pdf-to-markdown',
    slug: 'pdf-to-markdown',
    name: 'PDF to Markdown',
    description: 'Extract readable text and document hierarchy into clean, structured Markdown (.md).',
    category: 'convert_from',
    categoryLabel: 'Convert from PDF',
    iconName: 'FileCode2',
    badge: 'Markdown',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.md',
    keywords: ['pdf to markdown', 'markdown export', 'convert md', 'extract markdown'],
    seoTitle: 'Convert PDF to Markdown (.md) Online – Local & Private | PDFMiniFly',
    seoDescription: 'Turn PDF articles, manuals, and documents into clean Markdown files with headers and bullet lists locally.'
  },
  {
    id: 'pdf-to-html',
    slug: 'pdf-to-html',
    name: 'PDF to HTML',
    description: 'Convert PDF pages into semantic, responsive HTML code ready for the web.',
    category: 'convert_from',
    categoryLabel: 'Convert from PDF',
    iconName: 'Code',
    badge: 'HTML',
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.html',
    keywords: ['pdf to html', 'web page', 'html convert', 'responsive html'],
    seoTitle: 'Convert PDF to Responsive HTML Online | PDFMiniFly',
    seoDescription: 'Convert PDF documents into clean, responsive HTML web pages with local browser processing.'
  },

  // Advanced & Automation
  {
    id: 'ocr-pdf',
    slug: 'ocr-pdf',
    name: 'OCR PDF Center',
    description: 'Recognize text from scans in English, Assamese, Hindi, and Bengali.',
    category: 'advanced',
    categoryLabel: 'Advanced & Automation',
    iconName: 'ScanText',
    badge: 'OCR',
    popular: true,
    accepts: ['.pdf', '.jpg', '.jpeg', '.png', '.webp', 'application/pdf', 'image/*'],
    maxFiles: 1,
    outputExt: '.txt',
    keywords: ['ocr', 'scan to text', 'searchable pdf', 'hindi ocr', 'assamese ocr', 'bengali ocr'],
    seoTitle: 'Free OCR PDF Online – English, Hindi, Bengali, Assamese | PDFMiniFly',
    seoDescription: 'Recognize scanned document text in your browser using local optical character recognition.'
  },
  {
    id: 'compare-pdf',
    slug: 'compare-pdf',
    name: 'Compare PDFs',
    description: 'Inspect side-by-side visual differences and text changes between two document revisions.',
    category: 'advanced',
    categoryLabel: 'Advanced & Automation',
    iconName: 'GitCompare',
    badge: 'Diff',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 2,
    outputExt: '.pdf',
    keywords: ['compare', 'diff', 'side by side', 'revisions', 'document changes'],
    seoTitle: 'Compare PDFs Side-by-Side Online | PDFMiniFly',
    seoDescription: 'Compare two versions of a PDF side-by-side with visual pixel diff overlay and text difference inspection.'
  },
  {
    id: 'batch-process',
    slug: 'batch-process',
    name: 'Batch Processing',
    description: 'Process multiple PDF files together for compression, watermarking, or cleanup.',
    category: 'advanced',
    categoryLabel: 'Advanced & Automation',
    iconName: 'Copy',
    badge: 'Batch',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 30,
    outputExt: '.zip',
    keywords: ['batch', 'bulk', 'multi-file', 'batch compress', 'batch watermark'],
    seoTitle: 'Batch PDF Processing – Multi-File Operations | PDFMiniFly',
    seoDescription: 'Compress, watermark, number, or sanitize dozens of PDFs at once and download as a combined ZIP.'
  },
  {
    id: 'workflow-builder',
    slug: 'workflow-builder',
    name: 'PDF Workflow Builder',
    description: 'Chain multiple actions (Remove Blanks → Organize → Compress → Watermark → Export).',
    category: 'advanced',
    categoryLabel: 'Advanced & Automation',
    iconName: 'Workflow',
    badge: 'Workflow',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    keywords: ['workflow', 'automation', 'chain', 'pipeline', 'recipes', 'multi-step'],
    seoTitle: 'PDF Workflow Builder – Chain Multiple PDF Operations | PDFMiniFly',
    seoDescription: 'Build automated multi-step PDF transformation pipelines running locally in your browser.'
  },
  {
    id: 'pdf-assistant',
    slug: 'pdf-assistant',
    name: 'Ask your PDF (AI Assistant)',
    description: 'Summarize, explain, extract key points, dates, names, or ask questions with strict privacy options.',
    category: 'advanced',
    categoryLabel: 'Advanced & Automation',
    iconName: 'Sparkles',
    badge: 'AI Assistant',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.txt',
    keywords: ['ai assistant', 'ask pdf', 'summarize', 'key points', 'explain', 'chat pdf'],
    seoTitle: 'Ask Your PDF – Privacy-First Document Assistant | PDFMiniFly',
    seoDescription: 'Analyze documents with Mode 1 Local Heuristics or Mode 2 Cloud AI with transparent disclosure before processing.'
  },
  {
    id: 'pdf-to-study',
    slug: 'pdf-to-study',
    name: 'PDF to Study Tools',
    description: 'Transform lecture notes and textbooks into summaries, MCQs, flashcards, and quizzes.',
    category: 'advanced',
    categoryLabel: 'Advanced & Automation',
    iconName: 'GraduationCap',
    badge: 'Study',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.json',
    keywords: ['study', 'flashcards', 'quiz', 'mcq', 'revision', 'notes'],
    seoTitle: 'PDF to Study Tools – Notes, MCQs & Flashcards | PDFMiniFly',
    seoDescription: 'Convert PDF slides and chapters into revision notes, interactive multiple-choice questions, and flip cards.'
  },
  // ===== ADVANCED DOCUMENT SUITE (all local, no new dependencies) =====
  {
    id: 'pdf-to-excel',
    slug: 'pdf-to-excel',
    name: 'PDF to Excel / CSV',
    description: 'Detect tables inside PDFs and export them as editable Excel or CSV files.',
    category: 'extract',
    categoryLabel: 'Extract',
    iconName: 'FileSpreadsheet',
    badge: 'New',
    popular: false,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.xlsx',
    keywords: ['pdf to excel', 'pdf to csv', 'table extraction', 'bank statement', 'invoice', 'marksheet', 'data extraction'],
    seoTitle: 'PDF to Excel / CSV – Local Table Extraction | PDFMiniFly',
    seoDescription: 'Detect and export tables from bank statements, invoices and marksheets to Excel or CSV. 100% local browser processing.'
  },
  {
    id: 'docx-to-pdf',
    slug: 'docx-to-pdf',
    name: 'Word to PDF',
    description: 'Convert Word (DOCX) documents to PDF with text, headings, lists and tables.',
    category: 'convert',
    categoryLabel: 'Convert',
    iconName: 'FileType',
    badge: 'New',
    popular: false,
    accepts: ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxFiles: 1,
    outputExt: '.pdf',
    keywords: ['word to pdf', 'docx to pdf', 'doc to pdf', 'word converter'],
    seoTitle: 'Word to PDF – Private Local DOCX Converter | PDFMiniFly',
    seoDescription: 'Convert DOCX Word documents to PDF entirely in your browser. No uploads, no cloud, no conversion servers.'
  },
  {
    id: 'pdf-to-docx',
    slug: 'pdf-to-docx',
    name: 'PDF to Word',
    description: 'Reconstruct PDF text into an editable Word (DOCX) document with headings.',
    category: 'convert',
    categoryLabel: 'Convert',
    iconName: 'FileDown',
    badge: 'New',
    popular: false,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.docx',
    keywords: ['pdf to word', 'pdf to docx', 'editable word', 'pdf converter'],
    seoTitle: 'PDF to Word – Local DOCX Reconstruction | PDFMiniFly',
    seoDescription: 'Turn PDFs into editable Word documents locally. Paragraphs, page breaks and headings are rebuilt on your device.'
  },
  {
    id: 'compress-to-target-size',
    slug: 'compress-to-target-size',
    name: 'Compress to Target Size',
    description: 'Hit an exact file size — 100 KB, 200 KB, 5 MB — with an intelligent local search.',
    category: 'compress',
    categoryLabel: 'Compress',
    iconName: 'Target',
    badge: 'New',
    popular: false,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    keywords: ['compress to size', 'target size', 'reduce pdf size', '100 kb pdf', '200 kb pdf', 'portal upload'],
    seoTitle: 'Compress PDF to Target Size (100KB–5MB) | PDFMiniFly',
    seoDescription: 'Compress a PDF to an exact target size for portals and exams. Real iterative search, honest results, fully local.'
  },
  {
    id: 'split-by-size',
    slug: 'split-by-size',
    name: 'Split by File Size',
    description: 'Split a large PDF into size-accurate parts measured for real, never mid-page.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    iconName: 'Package',
    badge: 'New',
    popular: false,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.zip',
    keywords: ['split by size', 'split pdf size', 'divide pdf', 'email size limit', 'part size'],
    seoTitle: 'Split PDF by File Size – Real Measured Parts | PDFMiniFly',
    seoDescription: 'Split large PDFs into parts that fit real size limits. Sizes are measured after building, and pages are never cut.'
  },
  {
    id: 'crop-trim-pdf',
    slug: 'crop-trim-pdf',
    name: 'Crop & Auto-Trim PDF',
    description: 'Crop pages visually with drag handles, or auto-remove white margins and scanner borders.',
    category: 'edit',
    categoryLabel: 'Edit',
    iconName: 'Crop',
    badge: 'New',
    popular: false,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    keywords: ['crop pdf', 'trim pdf', 'remove white margins', 'auto crop', 'scanner border'],
    seoTitle: 'Crop & Auto-Trim PDF Pages – Visual Editor | PDFMiniFly',
    seoDescription: 'Visually crop PDF pages or auto-trim white margins and black scanner borders. Before/after preview, fully local.'
  },
  {
    id: 'nup-pdf',
    slug: 'nup-pdf',
    name: 'N-Up PDF',
    description: 'Place 2, 4, 6 or 9 pages per sheet to cut printing costs for notes and handouts.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    iconName: 'LayoutGrid',
    badge: 'New',
    popular: false,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    keywords: ['n-up', 'multiple pages per sheet', '2 up', '4 up', 'print handout', 'notes printing'],
    seoTitle: 'N-Up PDF – Multiple Pages Per Sheet (2/4/6/9) | PDFMiniFly',
    seoDescription: 'Impose PDF pages 2-up, 4-up, 6-up or 9-up with margins, gutters and borders. Live preview, all local.'
  },
  {
    id: 'grayscale-ink-saver',
    slug: 'grayscale-ink-saver',
    name: 'Grayscale / Ink Saver',
    description: 'Convert PDFs to grayscale, pure black & white, or ink-saving output with live preview.',
    category: 'edit',
    categoryLabel: 'Edit',
    iconName: 'Droplets',
    badge: 'New',
    popular: false,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    supportsBatch: true,
    keywords: ['grayscale pdf', 'black and white pdf', 'ink saver', 'print cheaper', 'bw pdf'],
    seoTitle: 'Grayscale & Ink Saver PDF Converter | PDFMiniFly',
    seoDescription: 'Convert PDFs to grayscale, pure black & white, or ink-saving profiles with DPI control and live preview. 100% local.'
  },
  // Phase 2: Legal & Formal Document Features
  {
    id: 'bates-stamping',
    slug: 'bates-stamping',
    name: 'Bates Stamping',
    description: 'Apply sequential legal Bates numbering with custom prefixes, suffixes, digit padding, font size, and live interactive alignment preview.',
    category: 'edit',
    categoryLabel: 'Edit',
    iconName: 'Hash',
    badge: 'Legal',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    keywords: ['bates stamping', 'bates numbering', 'legal numbering', 'discovery numbering', 'litigation pdf', 'court filing stamp'],
    seoTitle: 'Bates Stamping Tool – Legal PDF Numbering | PDFMiniFly',
    seoDescription: 'Add sequential legal Bates stamps to litigation bundles and legal documents. Zero uploads, live preview, 100% client-side privacy.'
  },
  {
    id: 'flatten-pdf',
    slug: 'flatten-pdf',
    name: 'Flatten PDF',
    description: 'Permanently bake interactive form fields, checkboxes, and markup annotations into static page graphics for legal archiving and finalization.',
    category: 'security',
    categoryLabel: 'Security',
    iconName: 'Layers',
    badge: 'Formal',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    keywords: ['flatten pdf', 'lock form fields', 'flatten annotations', 'pdf form lock', 'legal archiving', 'read-only pdf'],
    seoTitle: 'Flatten PDF – Lock Form Fields & Annotations | PDFMiniFly',
    seoDescription: 'Lock and flatten fillable PDF forms and annotations into immutable background page layers. Complete in-browser privacy.'
  },
  {
    id: 'sign-pdf-cert',
    slug: 'sign-pdf-cert',
    name: 'Digital Certificate Signature',
    description: 'Cryptographically sign PDF documents using PKCS#12 (.p12 / .pfx) digital certificates and inspect/validate existing CMS signatures in the browser.',
    category: 'security',
    categoryLabel: 'Security',
    iconName: 'ShieldCheck',
    badge: 'PKCS#7',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    keywords: ['digital certificate signature', 'p12 pdf sign', 'pfx digital signature', 'pkcs7 pdf', 'validate pdf signature', 'cryptographic pdf signature'],
    seoTitle: 'Digital Certificate PDF Signer & Validator | PDFMiniFly',
    seoDescription: 'Apply real cryptographic PKCS#7 digital signatures using your .p12/.pfx certificates directly in your browser. No private keys uploaded.'
  },
  // Phase 2: PDF Utility & Recovery Features
  {
    id: 'repair-pdf',
    slug: 'repair-pdf',
    name: 'Repair & Salvage PDF',
    description: 'Multi-pass recovery pipeline to diagnose corrupted byte streams, reconstruct damaged XREF tables, fix broken trailers, and salvage pages.',
    category: 'productivity',
    categoryLabel: 'Productivity',
    iconName: 'Wrench',
    badge: 'Recovery',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    keywords: ['repair pdf', 'salvage corrupt pdf', 'fix damaged pdf', 'recover pdf pages', 'xref recovery', 'broken pdf repair'],
    seoTitle: 'Repair Corrupted PDF – Salvage Damaged Documents | PDFMiniFly',
    seoDescription: 'Diagnose and repair broken PDF cross-reference tables, missing trailers, and malformed catalogs. 100% private local recovery.'
  },
  {
    id: 'invert-colors',
    slug: 'invert-colors',
    name: 'Invert Colors',
    description: 'Invert PDF colors for eye-friendly dark reading, high-contrast accessibility, dark slide conversion, and ink-efficient inverted printing.',
    category: 'edit',
    categoryLabel: 'Edit',
    iconName: 'Contrast',
    badge: 'Dark Mode',
    popular: true,
    accepts: ['.pdf', 'application/pdf'],
    maxFiles: 1,
    outputExt: '.pdf',
    keywords: ['invert pdf colors', 'dark mode pdf', 'high contrast pdf', 'negative pdf', 'inverted print pdf', 'read pdf in dark'],
    seoTitle: 'Invert PDF Colors – Dark Reader & High Contrast | PDFMiniFly',
    seoDescription: 'Convert PDFs to gentle dark mode, high-contrast black & white, or inverted print for scanned books and night reading. Live split preview.'
  }
];

export type { ToolCategory } from '@/types/pdf';

export const TOOL_CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'All Tools' },
  { id: 'organize', label: 'Organize' },
  { id: 'compress', label: 'Compress' },
  { id: 'edit', label: 'Edit' },
  { id: 'convert', label: 'Convert' },
  { id: 'security', label: 'Security' },
  { id: 'ocr', label: 'OCR' },
  { id: 'extract', label: 'Extract' },
  { id: 'ai', label: 'AI' },
  { id: 'productivity', label: 'Productivity' },
];

export function toolMatchesCategory(tool: ToolDefinition, catId: string): boolean {
  if (catId === 'all') return true;
  if (catId === 'organize') {
    return ['merge-pdf', 'split-pdf', 'organize-pdf', 'remove-blank-pages', 'booklet-maker', 'split-by-size', 'nup-pdf'].includes(tool.slug);
  }
  if (catId === 'compress') {
    return ['compress-pdf', 'compress-to-target-size'].includes(tool.slug);
  }
  if (catId === 'edit') {
    return ['edit-pdf', 'sign-pdf', 'fill-form', 'watermark-pdf', 'page-numbers', 'pdf-metadata', 'crop-trim-pdf', 'grayscale-ink-saver', 'bates-stamping', 'invert-colors'].includes(tool.slug);
  }
  if (catId === 'convert') {
    return ['pdf-to-image', 'image-to-pdf', 'pdf-to-markdown', 'pdf-to-html', 'docx-to-pdf', 'pdf-to-docx'].includes(tool.slug);
  }
  if (catId === 'security') {
    return ['protect-pdf', 'redact-pdf', 'pdf-sanitizer', 'flatten-pdf', 'sign-pdf-cert'].includes(tool.slug);
  }
  if (catId === 'ocr') {
    return tool.slug === 'ocr-pdf';
  }
  if (catId === 'extract') {
    return ['extract-text', 'extract-images', 'extract-pages', 'pdf-to-excel'].includes(tool.slug);
  }
  if (catId === 'ai') {
    return ['pdf-assistant', 'pdf-to-study'].includes(tool.slug);
  }
  if (catId === 'productivity') {
    return ['pdf-viewer', 'read-aloud', 'compare-pdf', 'batch-process', 'workflow-builder', 'pdf-health', 'repair-pdf'].includes(tool.slug);
  }
  return tool.category === catId;
}

export function getToolBySlug(slug: string): ToolDefinition | undefined {
  // Direct match
  const direct = ALL_TOOLS.find((t) => t.slug === slug || t.id === slug);
  if (direct) return direct;

  // Aliases required by SEO & user specification:
  // e.g. /tools/pdf-editor -> edit-pdf
  // /tools/pdf-to-jpg -> pdf-to-image
  // /tools/jpg-to-pdf -> image-to-pdf
  // /tools/pdf-compare -> compare-pdf
  const aliases: Record<string, string> = {
    'pdf-editor': 'edit-pdf',
    'pdf-to-jpg': 'pdf-to-image',
    'jpg-to-pdf': 'image-to-pdf',
    'pdf-compare': 'compare-pdf',
    'diff-pdf': 'compare-pdf',
    'rotate-pdf': 'organize-pdf',
    'reorder-pdf': 'organize-pdf',
    'edit-metadata': 'pdf-metadata',
    'pdf-redactor': 'redact-pdf',
    'blackout-pdf': 'redact-pdf',
    'pdf-search': 'pdf-viewer',
    'pdf-workflow': 'workflow-builder',
    'summarize-pdf': 'pdf-assistant',
    'study-notes': 'pdf-to-study',
    'pdf-to-flashcards': 'pdf-to-study',
    'pdf-to-quiz': 'pdf-to-study',
    'pdf-to-text': 'extract-text',
    'pdf-extract-images': 'extract-images',
    'pdf-stats': 'pdf-health',
    // Phase 2 aliases:
    'bates-numbering': 'bates-stamping',
    'legal-numbering': 'bates-stamping',
    'bates-stamp': 'bates-stamping',
    'flatten-forms': 'flatten-pdf',
    'lock-pdf': 'flatten-pdf',
    'digital-signature': 'sign-pdf-cert',
    'cert-sign-pdf': 'sign-pdf-cert',
    'p12-signature': 'sign-pdf-cert',
    'validate-signatures': 'sign-pdf-cert',
    'fix-pdf': 'repair-pdf',
    'salvage-pdf': 'repair-pdf',
    'recover-pdf': 'repair-pdf',
    'dark-mode-pdf': 'invert-colors',
    'dark-reader-pdf': 'invert-colors',
    'invert-pdf': 'invert-colors',
  };

  const targetId = aliases[slug];
  if (targetId) {
    return ALL_TOOLS.find((t) => t.id === targetId || t.slug === targetId);
  }

  return undefined;
}

export function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
  return ALL_TOOLS.filter((t) => t.category === category);
}
