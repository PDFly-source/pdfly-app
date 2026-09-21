export type ToolCategory =
  | 'organize'
  | 'compress'
  | 'edit'
  | 'security'
  | 'convert_to'
  | 'convert_from'
  | 'convert'
  | 'ocr'
  | 'extract'
  | 'ai'
  | 'productivity'
  | 'advanced';

export interface ToolDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: ToolCategory;
  categoryLabel: string;
  iconName: string;
  badge?: string;
  popular?: boolean;
  accepts: string[];
  maxFiles?: number;
  /** Declares whether this tool's operation is available in the Batch Processing Center. */
  supportsBatch?: boolean;
  outputExt: string;
  keywords?: string[];
  seoTitle: string;
  seoDescription: string;
}

export interface PDFMetadataInfo {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
  pageCount: number;
  fileSize: number;
  fileName: string;
  encrypted: boolean;
  pageDimensions?: { width: number; height: number };
}

export interface PageThumbnail {
  pageIndex: number;
  pageNumber: number;
  dataUrl?: string;
  rotation: number; // 0, 90, 180, 270
  deleted?: boolean;
}

export interface RecentJob {
  id: string;
  toolId: string;
  toolName: string;
  fileName: string;
  fileSize: number;
  timestamp: number;
  status: 'completed' | 'failed';
}

export interface WorkflowStep {
  id: string;
  toolId: string;
  name: string;
  description: string;
  options: Record<string, any>;
  enabled: boolean;
}

export interface FormFieldItem {
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'signature' | 'other';
  value: string | boolean;
  options?: string[];
}

export interface RedactionItem {
  id: string;
  pageNumber: number;
  text?: string;
  type: 'pattern' | 'manual';
  category?: 'email' | 'phone' | 'id' | 'date' | 'custom';
  rect: { x: number; y: number; width: number; height: number };
  confirmed: boolean;
}

export interface StudyMcq {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface StudyFlashcard {
  front: string;
  back: string;
}

export interface StudyQuizItem {
  question: string;
  options: string[];
  answer: number;
}


export interface ProcessingStep {
  name: string;
  progress: number;
}

export type LibraryCategory = 'all' | 'pdf' | 'image' | 'doc' | 'favorites' | 'recent';

export interface DocumentLibraryItem {
  id: string;
  name: string;
  size: number;
  type: 'pdf' | 'image' | 'doc';
  pageCount?: number;
  addedAt: number;
  lastOpenedAt: number;
  pinned: boolean;
  favorite: boolean;
  tags: string[];
  note?: string;
  thumbnail?: string;
}

export interface DocumentBookmark {
  id: string;
  docName: string;
  pageNumber: number;
  title: string;
  note?: string;
  createdAt: number;
}

export interface DocumentNote {
  id: string;
  docName: string;
  pageNumber: number;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentHealthReport {
  fileName: string;
  fileSize: number;
  pageCount: number;
  pdfVersion: string;
  encrypted: boolean;
  hasMetadata: boolean;
  metadataItems: { key: string; value: string }[];
  fontCount: number;
  imageCount: number;
  annotationCount: number;
  formFieldCount: number;
  hasBookmarks: boolean;
  hasJavaScript: boolean;
  healthScore: 'Healthy' | 'Moderate' | 'Action Needed';
  findings: {
    type: 'success' | 'warning' | 'info';
    title: string;
    description: string;
  }[];
  suggestions: {
    title: string;
    actionSlug: string;
    description: string;
  }[];
}

export interface DocumentStatistics {
  pages: number;
  words: number;
  characters: number;
  images: number;
  fonts: number;
  fileSize: number;
  averagePageSize: string;
  estimatedReadingTimeMinutes: number;
}
