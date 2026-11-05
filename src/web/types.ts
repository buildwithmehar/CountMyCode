import type { FileMetadata } from "../shared/types";

export interface WebFileMetadata extends FileMetadata {
  file: File;
}

export interface AnalyzeMessage {
  type: "analyze";
  files: WebFileMetadata[];
  maxFileSizeKB: number;
}

export interface ResultMessage {
  type: "result";
  results: import("../shared/types").FileAnalysis[];
}

export interface CancelMessage {
  type: "cancel";
}

export type WorkerMessage = AnalyzeMessage | CancelMessage;
