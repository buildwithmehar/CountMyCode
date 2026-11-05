import type { IgnoreMatcher } from "../shared/ignore";
import type { WebFileMetadata } from "./types";

export interface CrawlResult {
  files: WebFileMetadata[];
  folderCount: number;
  ignoredEntries?: number;
}

export interface CrawlCallbacks {
  onProgress?: (filesFound: number, foldersFound: number) => void;
  shouldCancel?: () => boolean;
}

type IterableDirHandle = FileSystemDirectoryHandle & {
  values(): AsyncIterableIterator<FileSystemHandle>;
};

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function typeOf(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "unknown";
}

function toMeta(rel: string, file: File): WebFileMetadata {
  const name = file.name;
  return {
    name,
    extension: extOf(name),
    absolutePath: rel,
    relativePath: rel,
    size: file.size,
    created: file.lastModified,
    modified: file.lastModified,
    type: typeOf(name),
    file,
  };
}

export async function crawlHandle(
  handle: FileSystemDirectoryHandle,
  ignoreMatcher: IgnoreMatcher,
  callbacks: CrawlCallbacks = {},
): Promise<CrawlResult> {
  const files: WebFileMetadata[] = [];
  let folderCount = 0;
  let ignoredEntries = 0;
  const pending = new Set<Promise<void>>();
  const limit = 16;

  async function walk(
    dir: FileSystemDirectoryHandle,
    prefix: string,
  ): Promise<void> {
    const iterable = dir as IterableDirHandle;
    for await (const entry of iterable.values()) {
      if (callbacks.shouldCancel?.()) return;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.kind === "directory") {
        if (ignoreMatcher.shouldIgnore(entry.name, rel, true)) {
          ignoredEntries++;
          continue;
        }
        folderCount++;
        await walk(entry as FileSystemDirectoryHandle, rel);
      } else {
        if (ignoreMatcher.shouldIgnore(entry.name, rel, false)) {
          ignoredEntries++;
          continue;
        }
        if (pending.size >= limit) await Promise.race(pending);
        if (callbacks.shouldCancel?.()) return;
        const task = (async () => {
          try {
            const file = await (entry as FileSystemFileHandle).getFile();
            if (callbacks.shouldCancel?.()) return;
            files.push(toMeta(rel, file));
            callbacks.onProgress?.(files.length, folderCount);
          } catch {}
        })();
        pending.add(task);
        void task.then(() => pending.delete(task));
      }
    }
  }

  await walk(handle, "");
  await Promise.all(pending);
  return { files, folderCount, ignoredEntries };
}
