export interface FileMetadata {
  name: string;
  extension: string;
  absolutePath: string;
  relativePath: string;
  size: number;
  created: number;
  modified: number;
  type: string;
}

export interface FileAnalysis {
  path: string;
  relativePath: string;
  name: string;
  extension: string;
  size: number;
  language: string;
  totalLines: number;
  blankLines: number;
  commentLines: number;
  codeLines: number;
  hash?: string;
  status?: "analyzed" | "binary" | "oversized" | "unreadable";
  markers?: { kind: string; line: number; text: string }[];
  cached?: boolean;
}

export interface ExtensionStat {
  extension: string;
  count: number;
  lines: number;
}

export interface LanguageStat {
  language: string;
  count: number;
  lines: number;
  percentage: number;
}

export interface RepositoryStats {
  totalFiles: number;
  totalFolders: number;
  totalLines: number;
  blankLines: number;
  commentLines: number;
  codeLines: number;
  averageFileSize: number;
  averageLinesPerFile: number;
  largestFiles: FileAnalysis[];
  extensionDistribution: ExtensionStat[];
  languageDistribution: LanguageStat[];
  codeToCommentRatio: number;
  commentCoverage: number;
  repositoryDensityScore: number;
  files: FileAnalysis[];
  scanDurationMs: number;
  scannedPath: string;
  ignoredEntries?: number;
  scannedAt?: number;
  source?: "local" | "zip" | "github" | "demo";
}

export type ScanPhase =
  "crawling" | "analyzing" | "complete" | "error" | "idle";

export interface ScanProgress {
  phase: ScanPhase;
  crawledFiles: number;
  crawledFolders: number;
  analyzedFiles: number;
  totalFiles: number;
  message: string;
  elapsedMs: number;
}

export interface ScanOptions {
  path: string;
  customIgnore: string[];
  workerCount: number;
}

export interface AppSettings {
  workerCount: number;
  customIgnore: string[];
  maxFileSizeKB: number;
}
