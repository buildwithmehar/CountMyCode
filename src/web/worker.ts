import { getLanguageByFilename } from "../shared/lang-config";
import { analyzeText } from "../shared/analysis";
import type { FileAnalysis } from "../shared/types";
import type { WebFileMetadata, WorkerMessage } from "./types";

const cache = new Map<string, ReturnType<typeof analyzeText>>();
async function analyze(
  meta: WebFileMetadata,
  limit: number,
): Promise<FileAnalysis> {
  const base: FileAnalysis = {
    path: meta.absolutePath,
    relativePath: meta.relativePath,
    name: meta.name,
    extension: meta.extension,
    size: meta.size,
    language: getLanguageByFilename(meta.name)?.name ?? "Other",
    totalLines: 0,
    blankLines: 0,
    commentLines: 0,
    codeLines: 0,
    markers: [],
  };
  if (meta.size > limit * 1024) return { ...base, status: "oversized" };
  try {
    const bytes = new Uint8Array(await meta.file.arrayBuffer());
    if (bytes.subarray(0, 8192).includes(0))
      return { ...base, status: "binary" };
    const hash = [
      ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    ]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
    const key = `${base.language}:${hash}`;
    const cached = cache.get(key);
    const counts =
      cached ?? analyzeText(new TextDecoder().decode(bytes), meta.name);
    if (cache.size > 4000) cache.clear();
    cache.set(key, counts);
    return { ...base, ...counts, hash, status: "analyzed", cached: !!cached };
  } catch {
    return { ...base, status: "unreadable" };
  }
}
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  if (event.data.type !== "analyze") return;
  const { files, maxFileSizeKB } = event.data;
  try {
    // Pipeline reads and hashes while bounding the amount of source held in memory.
    const results: FileAnalysis[] = new Array(files.length);
    const largest = Math.max(
      1,
      ...files.map((file) => Math.min(file.size, maxFileSizeKB * 1024)),
    );
    const concurrency = Math.min(
      4,
      Math.max(1, Math.floor((8 * 1024 * 1024) / largest)),
      files.length,
    );
    let next = 0;
    await Promise.all(
      Array.from({ length: concurrency }, async () => {
        while (next < files.length) {
          const index = next++;
          results[index] = await analyze(files[index], maxFileSizeKB);
        }
      }),
    );
    self.postMessage({ type: "result", results });
  } catch (error) {
    self.postMessage({ type: "error", message: String(error) });
  }
};
