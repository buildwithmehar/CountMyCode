import type { OmniApi } from "../renderer/src/global";
import type { AppSettings, ScanProgress, ScanPhase } from "../shared/types";
import { computeStats } from "../shared/analytics";
import { createCsvReport } from "../shared/export";
import {
  createIgnoreRules,
  createIgnoreMatcher,
  parseIgnoreFile,
} from "../shared/ignore";
import { DEFAULT_IGNORE } from "../shared/constants";
import { crawlHandle } from "./crawler";
import { traverseDroppedItems } from "./drop";
import { WebWorkerPool } from "./worker-pool";
import type { WebFileMetadata } from "./types";
import type { SourceFile } from "./sources";
import { createProgressGate } from "./progress";
import { chooseWorkerCount } from "./scheduling";

const DEFAULT_SETTINGS: AppSettings = {
  workerCount: 0,
  customIgnore: [],
  maxFileSizeKB: 10240,
};
let directory: FileSystemDirectoryHandle | null = null,
  selected: SourceFile[] = [],
  name = "",
  source: "local" | "zip" | "github" | "demo" = "local";
let sourceMap = new Map<string, File>(),
  pool: WebWorkerPool | null = null,
  poolSize = 0,
  run = 0,
  started = 0;
let selectionIgnored = 0;
const allowProgress = createProgressGate();
const listeners = new Set<(p: ScanProgress) => void>();
function emit(
  phase: ScanPhase,
  message: string | (() => string),
  extra: Partial<ScanProgress> = {},
) {
  if (!allowProgress(phase)) return;
  const text = typeof message === "function" ? message() : message;
  listeners.forEach((cb) =>
    cb({
      phase,
      message: text,
      crawledFiles: 0,
      crawledFolders: 0,
      analyzedFiles: 0,
      totalFiles: 0,
      elapsedMs: Date.now() - started,
      ...extra,
    }),
  );
}
function settings(): AppSettings {
  try {
    return {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(localStorage.getItem("omnicount-settings") || "{}"),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
function meta(item: SourceFile): WebFileMetadata {
  const filename = item.path.split("/").pop()!;
  return {
    name: filename,
    extension: filename.includes(".")
      ? "." + filename.split(".").pop()!.toLowerCase()
      : "",
    absolutePath: item.path,
    relativePath: item.path,
    size: item.file.size,
    created: item.file.lastModified,
    modified: item.file.lastModified,
    type: item.file.type,
    file: item.file,
  };
}
const api: OmniApi = {
  setSource: (nextName, files, nextSource) => {
    directory = null;
    selected = files;
    name = nextName;
    source = nextSource;
    sourceMap.clear();
    selectionIgnored = 0;
  },
  clearSource: () => {
    directory = null;
    selected = [];
    sourceMap.clear();
    name = "";
    selectionIgnored = 0;
  },
  readSource: async (path) => {
    const file = sourceMap.get(path);
    if (!file) return null;
    if (file.size > 1024 * 1024)
      throw new Error("Preview is limited to files smaller than 1 MB");
    return file.text();
  },
  openDirectory: async () => {
    const picker = (
      window as unknown as {
        showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
      }
    ).showDirectoryPicker;
    if (picker) {
      try {
        directory = await picker.call(window);
        selected = [];
        name = directory.name;
        source = "local";
        selectionIgnored = 0;
        return name;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return null;
      }
    }
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.setAttribute("webkitdirectory", "");
      input.multiple = true;
      input.onchange = () => {
        const files = Array.from(input.files ?? []);
        if (!files.length) {
          resolve(null);
          return;
        }
        directory = null;
        source = "local";
        selectionIgnored = 0;
        name = files[0].webkitRelativePath.split("/")[0];
        selected = files.map((file) => ({
          path:
            file.webkitRelativePath.split("/").slice(1).join("/") || file.name,
          file,
        }));
        resolve(name);
        input.remove();
      };
      input.addEventListener(
        "cancel",
        () => {
          resolve(null);
          input.remove();
        },
        { once: true },
      );
      input.hidden = true;
      document.body.append(input);
      input.click();
    });
  },
  openDroppedDataTransfer: async (data) => {
    const id = ++run;
    started = Date.now();
    emit("crawling", "Reading dropped project");
    const result = await traverseDroppedItems(
      data,
      (count, folders) =>
        emit("crawling", () => `Found ${count.toLocaleString()} files`, {
          crawledFiles: count,
          crawledFolders: folders,
        }),
      { customIgnore: settings().customIgnore, shouldCancel: () => id !== run },
    );
    if (!result || id !== run) return null;
    selectionIgnored = result.ignoredEntries;
    directory = null;
    source = "local";
    name = result.name;
    selected = result.files.map((f) => ({
      path: f.relativePath,
      file: f.file,
    }));
    return name;
  },
  onScanProgress: (cb) => {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
  startScan: async (options) => {
    const id = ++run;
    started = Date.now();
    emit("crawling", "Reading project structure");
    try {
      const patterns = [...DEFAULT_IGNORE, ...options.customIgnore];
      for (const ignore of [".gitignore", ".omnicountignore"]) {
        try {
          const file = directory
            ? await (await directory.getFileHandle(ignore)).getFile()
            : selected.find((f) => f.path === ignore)?.file;
          if (file) patterns.push(...parseIgnoreFile(await file.text()));
        } catch {}
      }
      const matcher = createIgnoreMatcher(createIgnoreRules(patterns));
      let ignored = selectionIgnored;
      let files: WebFileMetadata[] = [];
      let folders = 0;
      if (directory) {
        const result = await crawlHandle(directory, matcher, {
          shouldCancel: () => id !== run,
          onProgress: (count, dirs) =>
            emit("crawling", () => `Found ${count.toLocaleString()} files`, {
              crawledFiles: count,
              crawledFolders: dirs,
            }),
        });
        files = result.files;
        folders = result.folderCount;
        ignored = result.ignoredEntries ?? 0;
      } else {
        const dirs = new Set<string>();
        for (const item of selected) {
          const parts = item.path.split("/");
          const skip =
            matcher.shouldIgnore(parts.at(-1)!, item.path, false) ||
            parts
              .slice(0, -1)
              .some((part, i) =>
                matcher.shouldIgnore(
                  part,
                  parts.slice(0, i + 1).join("/"),
                  true,
                ),
              );
          if (skip) {
            ignored++;
            continue;
          }
          files.push(meta(item));
          parts
            .slice(0, -1)
            .forEach((_, i) => dirs.add(parts.slice(0, i + 1).join("/")));
        }
        folders = dirs.size;
      }
      if (id !== run) return null;
      if (!files.length)
        throw new Error(
          "No matching files found. Check your folder and ignore settings.",
        );
      sourceMap = new Map(files.map((f) => [f.relativePath, f.file]));
      const size = Math.max(
        1,
        Math.min(
          8,
          options.workerCount ||
            chooseWorkerCount(files, navigator.hardwareConcurrency),
        ),
      );
      if (!pool || poolSize !== size) {
        await pool?.terminate();
        pool = new WebWorkerPool(size);
        poolSize = size;
      }
      const current = pool;
      emit("analyzing", "Counting lines and checking content", {
        totalFiles: files.length,
        crawledFolders: folders,
      });
      const analyzed = await current.process(
        files,
        24,
        settings().maxFileSizeKB,
        (count) => {
          if (id === run)
            emit(
              "analyzing",
              () =>
                `Analyzed ${count.toLocaleString()} of ${files.length.toLocaleString()} files`,
              {
                totalFiles: files.length,
                analyzedFiles: count,
                crawledFolders: folders,
              },
            );
        },
      );
      if (id !== run) return null;
      const stats = {
        ...computeStats(
          analyzed,
          folders,
          Date.now() - started,
          name || options.path,
        ),
        ignoredEntries: ignored,
        scannedAt: Date.now(),
        source,
      };
      emit("complete", "Analysis complete", {
        analyzedFiles: files.length,
        totalFiles: files.length,
      });
      return stats;
    } catch (error) {
      if (id === run) {
        emit(
          "error",
          error instanceof Error ? error.message : "Analysis failed",
        );
        await pool?.terminate();
        pool = null;
      }
      return null;
    }
  },
  cancelScan: () => {
    run++;
    pool?.cancel();
    pool = null;
    emit("idle", "Scan cancelled");
  },
  exportReport: async (stats, format) => {
    const content =
      format === "json"
        ? JSON.stringify(stats, null, 2)
        : createCsvReport(stats.files);
    const url = URL.createObjectURL(
      new Blob([content], {
        type: format === "json" ? "application/json" : "text/csv;charset=utf-8",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `countmycode-${stats.scannedPath.replace(/[^a-z0-9-]/gi, "-")}.${format}`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return anchor.download;
  },
  loadSettings: async () => settings(),
  saveSettings: async (next) => {
    localStorage.setItem("omnicount-settings", JSON.stringify(next));
  },
};
window.omni = api;
