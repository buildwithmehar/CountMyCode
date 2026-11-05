import type { FileAnalysis } from "../shared/types";
import type { WebFileMetadata } from "./types";
import { createAnalysisBatches } from "./scheduling";
export class WebWorkerPool {
  private workers: Worker[] = [];
  private pending = new Set<(reason: Error) => void>();
  private cancelled = false;
  constructor(size: number) {
    for (let i = 0; i < Math.max(1, Math.min(8, size)); i++)
      this.workers.push(
        new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }),
      );
  }
  async process(
    files: WebFileMetadata[],
    batchSize: number,
    maxFileSizeKB: number,
    onProgress?: (count: number) => void,
  ): Promise<FileAnalysis[]> {
    this.cancelled = false;
    let cursor = 0,
      completed = 0;
    const results: FileAnalysis[] = [];
    const batches = createAnalysisBatches(files, batchSize);
    await Promise.all(
      this.workers.map(async (worker) => {
        while (cursor < batches.length && !this.cancelled) {
          const batch = batches[cursor++];
          const found = await new Promise<FileAnalysis[]>((resolve, reject) => {
            const cleanup = () => {
              worker.removeEventListener("message", onMessage);
              worker.removeEventListener("error", onError);
              this.pending.delete(fail);
            };
            const fail = (error: Error) => {
              cleanup();
              reject(error);
            };
            const onError = (event: ErrorEvent) =>
              fail(new Error(event.message || "Analysis worker failed"));
            const onMessage = (event: MessageEvent) => {
              if (event.data.type === "error")
                return fail(new Error(event.data.message));
              cleanup();
              resolve(event.data.results);
            };
            this.pending.add(fail);
            worker.addEventListener("message", onMessage);
            worker.addEventListener("error", onError);
            worker.postMessage({
              type: "analyze",
              files: batch,
              maxFileSizeKB,
            });
          });
          results.push(...found);
          completed += batch.length;
          onProgress?.(completed);
        }
      }),
    );
    return results;
  }
  cancel() {
    this.cancelled = true;
    for (const reject of [...this.pending]) reject(new Error("Scan cancelled"));
    this.workers.forEach((w) => w.terminate());
    this.workers = [];
  }
  async terminate() {
    this.cancel();
  }
}
