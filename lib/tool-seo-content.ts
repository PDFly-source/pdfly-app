/**
 * Unique, factual SEO support content per tool.
 * Each entry provides a tool-specific introduction and FAQs that reflect
 * the tool's ACTUAL implemented behavior. No fake claims, no keyword
 * stuffing. The shared privacy FAQ is intentionally only the single
 * question every user genuinely needs answered on every tool page.
 */

export interface ToolSeoFaq {
  q: string;
  a: string;
}

export interface ToolSeoContent {
  /** 2-3 sentence unique intro placed under the tool's H1 area. */
  intro: string;
  /** 2 unique, tool-specific FAQs. */
  faqs: ToolSeoFaq[];
}

export const TOOL_SEO_CONTENT: Record<string, ToolSeoContent> = {
  'merge-pdf': {
    intro:
      'Combine multiple PDF documents into a single continuous file in the order you choose. Every merge runs entirely inside your browser, so contracts, invoices, and reports never leave your device.',
    faqs: [
      {
        q: 'How many PDF files can I merge at once?',
        a: 'You can merge up to 50 PDF files in a single pass and reorder them before combining.',
      },
      {
        q: 'Will merging change the quality of my PDF pages?',
        a: 'No. Pages are copied into the combined document without re-encoding, so text stays selectable and images keep their original quality.',
      },
    ],
  },
  'split-pdf': {
    intro:
      'Split a PDF into individual documents by page, custom ranges, or fixed intervals. Great for extracting chapters, separating scanned batches, or trimming a file down to the pages you need.',
    faqs: [
      {
        q: 'Can I split a PDF by custom page ranges?',
        a: 'Yes. You can split every page into its own file, or enter custom ranges such as 1-5, 8, 12-20 to produce exactly the documents you want.',
      },
      {
        q: 'What happens to bookmarks and links after splitting?',
        a: 'Each output file is rebuilt from the selected pages, so page-level content and quality are preserved. Interactive links that pointed across removed pages will not carry over.',
      },
    ],
  },
  'organize-pdf': {
    intro:
      'Reorder, rotate, duplicate, and delete pages to restructure any PDF visually. Drag pages into place, preview the result, and export a clean rebuilt document without uploading a thing.',
    faqs: [
      {
        q: 'Can I reorder pages by dragging them?',
        a: 'Yes. The organizer shows your pages as an interactive list you can drag to reorder, plus rotate, duplicate, or remove before saving.',
      },
      {
        q: 'Does organizing reduce the quality of my document?',
        a: 'No. Pages are rearranged without re-encoding content, so text, fonts, and images are untouched.',
      },
    ],
  },
  'remove-blank-pages': {
    intro:
      'Automatically detect and delete blank or near-blank pages from scanned documents. Adjust the detection sensitivity to keep faint content while clearing out empty filler pages.',
    faqs: [
      {
        q: 'How does blank page detection work?',
        a: 'Each page is rendered and analyzed locally for ink coverage. You can tune the sensitivity and include or exclude near-blank pages before anything is removed.',
      },
      {
        q: 'Will it accidentally delete pages that have very little content?',
        a: 'Only if you choose to include near-blank pages. Detected pages are listed for review first, so you can confirm exactly what gets removed.',
      },
    ],
  },
  'extract-pages': {
    intro:
      'Pull specific pages out of a PDF into a new, separate document. Select pages individually or by range, preview your selection, and save the extract locally.',
    faqs: [
      {
        q: 'Can I extract non-contiguous pages, like pages 2, 7, and 15?',
        a: 'Yes. You can select any combination of individual pages and ranges; they are compiled into one new PDF in your chosen order.',
      },
      {
        q: 'Does the original PDF get modified?',
        a: 'No. The original file on your device is untouched. The extracted pages are written to a brand-new PDF that you download.',
      },
    ],
  },
  'booklet-maker': {
    intro:
      'Turn any PDF into a print-ready booklet with correct imposition ordering for duplex printing. Fold, staple, and get a professionally paginated booklet from an ordinary document.',
    faqs: [
      {
        q: 'Do I need a duplex printer to make a booklet?',
        a: 'A duplex (double-sided) printer produces the finished booklet in one pass. The tool arranges the pages for standard booklet imposition so the pages read in order once folded.',
      },
      {
        q: 'Can I control the booklet page size?',
        a: 'Yes. You can choose the output paper size before generating the imposed booklet layout.',
      },
    ],
  },
  'pdf-viewer': {
    intro:
      'Open and read PDFs directly in your browser with a fast, private viewer. Zoom, search, jump between pages, and keep reading offline once the app is installed.',
    faqs: [
      {
        q: 'Can I use the viewer without an internet connection?',
        a: 'Yes. Once PDFMiniFly is installed as a PWA, the viewer works fully offline because rendering happens on your device.',
      },
      {
        q: 'Does the viewer track what I read?',
        a: 'No. The viewer is entirely local: documents are rendered in your browser and no reading activity is sent anywhere.',
      },
    ],
  },
  'read-aloud': {
    intro:
      'Listen to any PDF with built-in text-to-speech. The reader highlights text as it goes, using your device\u2019s voices so documents are spoken without any cloud audio service.',
    faqs: [
      {
        q: 'Which voices can I use for reading aloud?',
        a: 'The tool uses the speech voices installed on your device or browser, so you can pick from whatever languages and voices your system provides.',
      },
      {
        q: 'Can it read scanned PDFs that are just images?',
        a: 'Scanned pages need a text layer first. Run the OCR tool to add searchable text, then read aloud will speak the recognized content.',
      },
    ],
  },
  'compress-pdf': {
    intro:
      'Reduce PDF file size by recompressing embedded images and optimizing the document structure. Choose a compression level, see the size difference, and keep a private, smaller copy.',
    faqs: [
      {
        q: 'How much smaller will my PDF get?',
        a: 'It depends entirely on the document: image-heavy scans usually shrink the most, while text-only PDFs may change little because they are already compact.',
      },
      {
        q: 'Will compression make my text blurry?',
        a: 'Compression targets embedded images, not text. Selectable text is preserved as-is; only image quality is reduced according to the level you choose.',
      },
    ],
  },
  'pdf-metadata': {
    intro:
      'View and edit a PDF\u2019s metadata fields, including title, author, subject, and keywords. Fix mislabeled documents or fill in correct catalog information before sharing.',
    faqs: [
      {
        q: 'Which metadata fields can I edit?',
        a: 'Title, author, subject, and keywords can be edited directly. The tool also shows creation and modification dates and producer information for full transparency.',
      },
      {
        q: 'Why would I want to edit PDF metadata?',
        a: 'Correct metadata makes documents easier to organize and search, and removes confusing or incorrect author information before you share a file.',
      },
    ],
  },
  'edit-pdf': {
    intro:
      'Annotate and mark up PDFs with highlights, freehand drawing, shapes, and notes. All editing happens on a local copy in your browser, keeping the review loop fully private.',
    faqs: [
      {
        q: 'Can I edit the actual text inside a PDF?',
        a: 'The editor focuses on annotation: highlighting, drawing, shapes, and comments layered over the document. Restructuring original text is handled by other tools such as redaction.',
      },
      {
        q: 'Are my annotations saved into the file?',
        a: 'Yes. Annotations are stored locally and can be flattened into the PDF so they appear in any standard PDF reader.',
      },
    ],
  },
  'sign-pdf': {
    intro:
      'Sign PDFs by drawing your signature, using a saved signature, or placing typed text on the page. Documents stay on your device from signature to download.',
    faqs: [
      {
        q: 'Can I reuse my signature on future documents?',
        a: 'Yes. You can save a signature locally in your browser and place it on any document afterwards. It is stored only on your device.',
      },
      {
        q: 'Does signing change the rest of the document?',
        a: 'No. Your signature is added as an overlay on the pages you choose; the underlying content is untouched.',
      },
    ],
  },
  'fill-form': {
    intro:
      'Fill out PDF form fields directly in your browser. Type into form boxes, review your entries, and save a completed copy without printing or uploading the form.',
    faqs: [
      {
        q: 'Does it work with any PDF form?',
        a: 'It works with PDFs that contain interactive form fields. Flattened, image-only forms can be filled using the editor\u2019s text tools instead.',
      },
      {
        q: 'Can I save a partially completed form and finish later?',
        a: 'Yes. Your working copy can be saved locally and reopened in the workspace to continue where you left off.',
      },
    ],
  },
  'redact-pdf': {
    intro:
      'Black out sensitive text and regions in a PDF so private information cannot be recovered from the file. Redactions are applied to the document itself, not just painted on top.',
    faqs: [
      {
        q: 'Is a drawn black box a real redaction?',
        a: 'No. Simply drawing a rectangle leaves the text recoverable underneath. This tool removes the underlying content in the redacted area of the exported document.',
      },
      {
        q: 'What should I do after redacting a document?',
        a: 'Download the new redacted file and share that copy. Keep the original only if you need the unredacted version, since the redacted export is the safe one to distribute.',
      },
    ],
  },
  'pdf-health': {
    intro:
      'Diagnose damaged or slow PDFs with a local health check. The tool inspects structure, fonts, and objects, and reports issues together with the exact page ranges affected.',
    faqs: [
      {
        q: 'What kinds of problems can the health check find?',
        a: 'It detects structural issues, missing or broken objects, font problems, and corrupted page ranges, and reports where each issue occurs.',
      },
      {
        q: 'Can it repair a broken PDF?',
        a: 'The health check diagnoses problems and identifies affected pages so you can rebuild or extract the healthy parts with the other PDFMiniFly tools.',
      },
    ],
  },
  'pdf-sanitizer': {
    intro:
      'Strip metadata, hidden content, and tracking fields from a PDF before sharing. Choose exactly which fields to clear and export a clean, minimal document.',
    faqs: [
      {
        q: 'What can the sanitizer remove?',
        a: 'Author, creator, and producer names, creation and modification dates, keywords, and other identifying metadata fields you select.',
      },
      {
        q: 'Why remove metadata before sharing a PDF?',
        a: 'Metadata can reveal your name, your software, and when a document was made. Sanitizing removes those details before the file leaves your hands.',
      },
    ],
  },
  'protect-pdf': {
    intro:
      'Encrypt a PDF with a password so only people who know the password can open it. Encryption and unlocking both run locally in your browser.',
    faqs: [
      {
        q: 'What encryption does PDFMiniFly apply?',
        a: 'The tool applies standard PDF password encryption locally. Choose a strong password: anyone opening the file will need it, and it is never transmitted anywhere.',
      },
      {
        q: 'Can I remove the password later?',
        a: 'Yes, if you know the password. Run the same tool to decrypt the document locally and save an unrestricted copy.',
      },
    ],
  },
  'watermark-pdf': {
    intro:
      'Add text or image watermarks across selected pages to label drafts, mark documents as confidential, or brand shared files. Control opacity, position, rotation, and page range.',
    faqs: [
      {
        q: 'Can I watermark only certain pages?',
        a: 'Yes. Apply the watermark to all pages, alternating pages, or a custom page range you specify.',
      },
      {
        q: 'Can I use an image as a watermark?',
        a: 'Yes. You can place a PNG or JPG watermark or use styled text, with adjustable opacity and rotation for both.',
      },
    ],
  },
  'page-numbers': {
    intro:
      'Insert page numbers into a PDF with control over position, format, and starting number. Number the whole document or just an appendix or section.',
    faqs: [
      {
        q: 'Which numbering positions and formats are supported?',
        a: 'Numbers can be placed at the top or bottom in several alignments, with plain, dashed, or "Page X of Y" style formats.',
      },
      {
        q: 'Can I skip the cover page when numbering?',
        a: 'Yes. Set a custom start page or number only a page range so front matter stays clean.',
      },
    ],
  },
  'pdf-to-image': {
    intro:
      'Convert PDF pages into images you can use in slides, messages, and documents. Choose the resolution and format, then download pages as separate image files.',
    faqs: [
      {
        q: 'Which image formats can I export to?',
        a: 'PDF pages can be rendered to standard web image formats such as PNG and JPG at the resolution you choose.',
      },
      {
        q: 'What resolution should I pick?',
        a: 'Higher settings produce sharper images but larger files. For on-screen use a moderate scale is usually enough; for printing choose a higher one.',
      },
    ],
  },
  'image-to-pdf': {
    intro:
      'Convert JPG, PNG, and WebP images into a single PDF, reordering and adjusting them before export. Photos and scans are combined locally into one polished document.',
    faqs: [
      {
        q: 'Which image formats are supported?',
        a: 'JPG, PNG, and WebP images can be combined into one PDF, in any order you arrange.',
      },
      {
        q: 'Can multiple images go into a single PDF?',
        a: 'Yes. Add as many images as you like, drag them into the order you want, and export them as one continuous PDF document.',
      },
    ],
  },
  'extract-text': {
    intro:
      'Copy the text out of a PDF into a plain, reusable form. Extract the full document or selected pages for notes, quotes, and further editing.',
    faqs: [
      {
        q: 'Does text extraction keep the original formatting?',
        a: 'The tool extracts the raw text content. Layout-based formatting is simplified because the goal is clean, portable text.',
      },
      {
        q: 'Can it extract text from image-only scanned pages?',
        a: 'Scanned pages have no embedded text to extract. Run OCR first to recognize the text, then extract it.',
      },
    ],
  },
  'extract-images': {
    intro:
      'Pull the embedded images out of a PDF as separate files. Recover photos, diagrams, and logos from documents without screenshots or cropping.',
    faqs: [
      {
        q: 'In what quality are the extracted images saved?',
        a: 'Images are exported exactly as they are stored inside the PDF, without recompression, so the original quality is preserved.',
      },
      {
        q: 'Can I extract images from specific pages?',
        a: 'Yes. You can review the embedded images found in the document and save the ones you want.',
      },
    ],
  },
  'pdf-to-markdown': {
    intro:
      'Convert a PDF into clean Markdown, keeping headings, paragraphs, and structure in a format ready for notes, docs, and AI workflows.',
    faqs: [
      {
        q: 'What structure does the Markdown output keep?',
        a: 'Headings, paragraphs, and basic list structure are converted to their Markdown equivalents for easy reuse in notes and documentation tools.',
      },
      {
        q: 'Is the conversion done locally?',
        a: 'Yes. Parsing and conversion run in your browser; the document is not uploaded to any conversion service.',
      },
    ],
  },
  'pdf-to-html': {
    intro:
      'Turn a PDF into an HTML page you can open, edit, or publish in any web workflow. Text and structure are converted locally into web-ready markup.',
    faqs: [
      {
        q: 'Will the HTML look exactly like the PDF?',
        a: 'The conversion prioritizes clean, semantic markup rather than pixel-perfect reproduction, so text and structure carry over in a web-friendly form.',
      },
      {
        q: 'Can I edit the exported HTML afterwards?',
        a: 'Yes. The output is standard HTML you can open in any editor or browser and modify freely.',
      },
    ],
  },
  'ocr-pdf': {
    intro:
      'Add a searchable text layer to scanned PDFs with local OCR. The recognized text becomes selectable and searchable while the original page images stay untouched.',
    faqs: [
      {
        q: 'Does OCR change the appearance of my scanned pages?',
        a: 'No. The page images remain exactly as they are. OCR embeds an invisible text layer behind them so text can be selected and searched.',
      },
      {
        q: 'How accurate is the OCR?',
        a: 'Accuracy depends on scan quality and language. Clean, high-contrast scans give the best results; you can choose the recognition language before running it.',
      },
    ],
  },
  'compare-pdf': {
    intro:
      'See exactly what changed between two versions of a PDF. The comparison highlights differing pages and text so revisions, edits, and regressions are easy to spot.',
    faqs: [
      {
        q: 'What differences does the comparison show?',
        a: 'It identifies pages that differ between the two documents and surfaces the text changes on them so you can review each revision.',
      },
      {
        q: 'Are the compared documents uploaded anywhere?',
        a: 'No. Both files are analyzed locally in your browser and never transmitted.',
      },
    ],
  },
  'batch-process': {
    intro:
      'Run one tool across many files at once. Drop in a folder\u2019s worth of PDFs, apply the same operation to every file, and download the results together.',
    faqs: [
      {
        q: 'Which tools can run in batch mode?',
        a: 'You can apply the standard PDF operations to every file in the queue and receive one processed output per input document.',
      },
      {
        q: 'How are the results delivered?',
        a: 'Each processed file is produced separately and can be downloaded individually or together, so nothing gets mixed up.',
      },
    ],
  },
  'workflow-builder': {
    intro:
      'Chain multiple PDF operations into one repeatable, local workflow. Build a sequence like blank-page removal, OCR, and compression, dry-run it, save it as a recipe, and reuse it anytime.',
    faqs: [
      {
        q: 'What operations can I combine in a workflow?',
        a: 'Blank-page removal, rotation, page organizing, OCR, compression, watermarking, page numbering, and metadata sanitization can be chained in any order, with conditions applied per file.',
      },
      {
        q: 'Can I save a workflow and reuse it?',
        a: 'Yes. Workflows are saved as recipes in your browser and can be reloaded, renamed, and run on new files at any time, fully offline.',
      },
    ],
  },
  'pdf-assistant': {
    intro:
      'Ask questions about your PDF and get answers with references to the relevant pages. The assistant helps you find information inside long documents faster.',
    faqs: [
      {
        q: 'How does the PDF assistant work?',
        a: 'The assistant analyzes your document and answers questions about its content, pointing you to the pages that contain the answer.',
      },
      {
        q: 'Which documents work best with the assistant?',
        a: 'Documents with a searchable text layer give the best results. Scanned documents should be run through OCR first.',
      },
    ],
  },
  'pdf-to-study': {
    intro:
      'Turn PDFs into study material with summaries, key points, and review aids generated from the document\u2019s own content. Built for textbooks, papers, and course notes.',
    faqs: [
      {
        q: 'What study outputs can I generate?',
        a: 'The tool converts a document\u2019s content into study-friendly summaries and key points you can review alongside the original PDF.',
      },
      {
        q: 'Does it work on any PDF?',
        a: 'Documents with selectable text work best. Scanned pages should be run through OCR so their content can be recognized first.',
      },
    ],
  },
  'bates-stamping': {
    intro:
      'Apply sequential legal Bates numbering across PDF documents for litigation discovery, trial exhibits, and court filings. Configure custom prefixes, zero-padded digits, suffixes, and font sizes with live interactive alignment preview.',
    faqs: [
      {
        q: 'What is Bates stamping used for?',
        a: 'Bates stamping is standard in legal proceedings to uniquely identify and index each page of documentary evidence, discovery disclosures, and trial exhibits.',
      },
      {
        q: 'Are my confidential litigation documents uploaded anywhere?',
        a: 'No. Stamping is calculated and embedded directly inside your browser’s local PDF rendering engine. No files are ever sent across a network.',
      },
    ],
  },
  'flatten-pdf': {
    intro:
      'Permanently lock and flatten interactive AcroForm fields, checkboxes, and markup annotations into the document’s base graphical layer. Essential for court submissions, final contract execution, and tamper-resistant archiving.',
    faqs: [
      {
        q: 'What is the difference between flattening and signing?',
        a: 'Flattening bakes interactive fields into the static page image so they cannot be edited in form readers. Digital signing uses cryptographic certificates to guarantee non-repudiation and byte-level tamper detection.',
      },
      {
        q: 'Can a flattened PDF be unflattened later?',
        a: 'No. Flattening is a permanent conversion that merges form widgets and annotation streams into the background page contents.',
      },
    ],
  },
  'sign-pdf-cert': {
    intro:
      'Apply genuine cryptographic PKCS#7 / CMS digital signatures using your PKCS#12 (.p12 / .pfx) certificate directly in the browser. You can also inspect and validate existing digital signatures for byte-level document integrity and tamper evidence.',
    faqs: [
      {
        q: 'How does in-browser cryptographic signing work without uploading my private key?',
        a: 'PDFMiniFly runs WebAssembly and local cryptographic engines (node-forge and Web Crypto) inside your browser tab to decrypt your .p12 bundle and compute the SHA-256 ByteRange signature in memory. Your private key and password never leave your device.',
      },
      {
        q: 'Can I test digital signing if I do not have a .p12 certificate file?',
        a: 'Yes. The tool features a built-in test certificate generator that generates an authentic 2048-bit RSA self-signed X.509 certificate in browser memory in seconds.',
      },
    ],
  },
  'repair-pdf': {
    intro:
      'Diagnose and salvage corrupted, broken, or malformed PDF files using an automated multi-pass recovery pipeline. Reconstructs missing cross-reference tables, repairs damaged trailers, and salvages readable page streams.',
    faqs: [
      {
        q: 'What types of PDF damage can be repaired?',
        a: 'The engine handles corrupted XREF tables, incorrect byte offsets, missing trailer dictionaries, malformed root catalogs, and salvageable page object streams.',
      },
      {
        q: 'What if parts of the PDF are completely scrambled or missing?',
        a: 'The recovery pipeline extracts every readable page and object into a fresh, standards-compliant ISO 32000 PDF document, providing a detailed diagnostic recovery report.',
      },
    ],
  },
  'invert-colors': {
    intro:
      'Invert PDF colors for comfortable night reading, high-contrast visual accessibility, dark slide conversion, and ink-efficient printing. Features an interactive before-and-after split comparison and custom resolution controls.',
    faqs: [
      {
        q: 'Which inversion modes are supported?',
        a: 'You can choose between gentle Dark Reader (OLED-friendly dark slate with warm off-white text), Black ↔ White High Contrast, Full Color Negative, and Inverted Print for dark slides.',
      },
      {
        q: 'Does color inversion preserve page clarity?',
        a: 'Yes. Pages are rendered at resolutions up to 300 DPI with anti-aliasing to guarantee crisp, legible text and sharp diagram readability.',
      },
    ],
  },
};
