import type {
  ScanOptions,
  ScanProgress,
  RepositoryStats,
  AppSettings,
} from "@shared/types";

export interface OmniApi {
  setSource: (
    name: string,
    files: import("../../web/sources").SourceFile[],
    source: "zip" | "github" | "demo",
  ) => void;
  readSource: (path: string) => Promise<string | null>;
  clearSource: () => void;
  openDirectory: () => Promise<string | null>;
  openDroppedDataTransfer: (
    dataTransfer: DataTransfer,
  ) => Promise<string | null>;
  startScan: (options: ScanOptions) => Promise<RepositoryStats | null>;
  cancelScan: () => void;
  onScanProgress: (cb: (progress: ScanProgress) => void) => () => void;
  exportReport: (
    stats: RepositoryStats,
    format: "json" | "csv",
  ) => Promise<string | null>;
  loadSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<void>;
}

declare global {
  interface Window {
    omni: OmniApi;
  }
}

export {};
