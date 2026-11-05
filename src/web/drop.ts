import type { WebFileMetadata } from "./types";
import {
  createIgnoreMatcher,
  createIgnoreRules,
  parseIgnoreFile,
} from "../shared/ignore";

export interface DroppedResult {
  files: WebFileMetadata[];
  folderCount: number;
  name: string;
  ignoredEntries: number;
}
interface DropOptions {
  customIgnore?: string[];
  shouldCancel?: () => boolean;
}
function toMeta(relativePath: string, file: File): WebFileMetadata {
  const name = file.name,
    index = name.lastIndexOf(".");
  return {
    name,
    extension: index >= 0 ? name.slice(index).toLowerCase() : "",
    absolutePath: relativePath,
    relativePath,
    size: file.size,
    created: file.lastModified,
    modified: file.lastModified,
    type: file.type,
    file,
  };
}
async function entriesIn(
  directory: FileSystemDirectoryEntry,
  cancelled: () => boolean,
) {
  const reader = directory.createReader(),
    entries: FileSystemEntry[] = [];
  while (!cancelled()) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );
    if (!batch.length) break;
    entries.push(...batch);
  }
  return entries;
}
const readFile = (entry: FileSystemFileEntry) =>
  new Promise<File>((resolve, reject) => entry.file(resolve, reject));

export async function traverseDroppedItems(
  data: DataTransfer,
  onProgress?: (files: number, folders: number) => void,
  options: DropOptions = {},
): Promise<DroppedResult | null> {
  const cancelled = options.shouldCancel ?? (() => false),
    items = Array.from(data.items ?? []);
  // Capture entries synchronously: browser drag data is unavailable after the event ends.
  const entries = items
    .filter((item) => item.kind === "file")
    .map((item) => item.webkitGetAsEntry())
    .filter((entry): entry is FileSystemEntry => !!entry);
  const plainFiles = entries.length
    ? []
    : items
        .map((item) => item.getAsFile())
        .filter((file): file is File => !!file);
  const singleRoot = entries.length === 1 && entries[0].isDirectory;
  const rootEntries = singleRoot
    ? await entriesIn(entries[0] as FileSystemDirectoryEntry, cancelled)
    : entries;
  const patterns = [...(options.customIgnore ?? [])],
    prefetched = new Map<FileSystemEntry, File>();
  if (singleRoot) {
    await Promise.all(
      rootEntries
        .filter(
          (entry) =>
            entry.isFile &&
            [".gitignore", ".omnicountignore"].includes(entry.name),
        )
        .map(async (entry) => {
          try {
            const file = await readFile(entry as FileSystemFileEntry);
            prefetched.set(entry, file);
            patterns.push(...parseIgnoreFile(await file.text()));
          } catch {}
        }),
    );
  }
  const matcher = createIgnoreMatcher(createIgnoreRules(patterns)),
    files: WebFileMetadata[] = [],
    pending = new Set<Promise<void>>();
  let folderCount = 0,
    ignoredEntries = 0;
  async function walk(
    children: FileSystemEntry[],
    prefix: string,
  ): Promise<void> {
    for (const entry of children) {
      if (cancelled()) return;
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (matcher.shouldIgnore(entry.name, path, entry.isDirectory)) {
        ignoredEntries++;
        continue;
      }
      if (entry.isDirectory) {
        folderCount++;
        onProgress?.(files.length, folderCount);
        await walk(
          await entriesIn(entry as FileSystemDirectoryEntry, cancelled),
          path,
        );
      } else if (entry.isFile) {
        if (pending.size >= 16) await Promise.race(pending);
        if (cancelled()) return;
        const task = (async () => {
          try {
            const file =
              prefetched.get(entry) ??
              (await readFile(entry as FileSystemFileEntry));
            if (cancelled()) return;
            files.push(toMeta(path, file));
            onProgress?.(files.length, folderCount);
          } catch {}
        })();
        pending.add(task);
        void task.then(() => pending.delete(task));
      }
    }
  }
  await walk(rootEntries, "");
  await Promise.all(pending);
  for (const file of plainFiles) {
    if (cancelled()) break;
    if (matcher.shouldIgnore(file.name, file.name, false)) {
      ignoredEntries++;
      continue;
    }
    files.push(toMeta(file.name, file));
    onProgress?.(files.length, folderCount);
  }
  if (cancelled() || !files.length) return null;
  return {
    files,
    folderCount,
    ignoredEntries,
    name: singleRoot
      ? entries[0].name
      : files.length === 1
        ? files[0].name
        : "Dropped Files",
  };
}
