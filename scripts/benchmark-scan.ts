import { performance } from "node:perf_hooks";
import { writeFile } from "node:fs/promises";
import { analyzeText } from "../src/shared/analysis.ts";
import type { WebFileMetadata } from "../src/web/types.ts";

const text =
  Array.from(
    { length: 100000 },
    (_, i) =>
      [
        `export const item${i} = { id: ${i}, title: "note ${i}", enabled: true };`,
        `// TODO: review item ${i}`,
        `/* detail ${i} */ const value = 'https://example.test/path';`,
        `  return items.filter(item => item.id !== ${i});`,
        "",
      ][i % 5],
  ).join("\n") + "// benchmark end";

function median(values: number[]) {
  return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
}
analyzeText(text, "benchmark.ts");
const parserRuns: number[] = [];
let counts: ReturnType<typeof analyzeText>;
for (let i = 0; i < 5; i++) {
  const start = performance.now();
  counts = analyzeText(text, "benchmark.ts");
  parserRuns.push(performance.now() - start);
}

let response: any;
const scope = {
  onmessage: null as ((event: any) => Promise<void>) | null,
  postMessage: (data: any) => {
    response = data;
  },
};
(globalThis as any).self = scope;
await import("../src/web/worker.ts");
const files: WebFileMetadata[] = Array.from({ length: 400 }, (_, i) => {
  const name = `file-${i}.ts`,
    content = `// TODO: file ${i}\n` + text.slice(i * 7, i * 7 + 12000);
  const file = new File([content], name);
  return {
    name,
    relativePath: name,
    absolutePath: name,
    extension: ".ts",
    size: file.size,
    created: 0,
    modified: 0,
    type: "ts",
    file,
  };
});
const batchRuns: number[] = [];
const start = performance.now();
await scope.onmessage!({
  data: { type: "analyze", files, maxFileSizeKB: 10240 },
});
const firstBatchMs = performance.now() - start;
for (let i = 0; i < 3; i++) {
  const start = performance.now();
  await scope.onmessage!({
    data: { type: "analyze", files, maxFileSizeKB: 10240 },
  });
  batchRuns.push(performance.now() - start);
}
if (response.type !== "result" || response.results.length !== files.length)
  throw new Error("Benchmark scan did not finish");
const report = {
  parser: {
    lines: 100000,
    medianMs: Math.round(median(parserRuns)),
    counts: {
      code: counts!.codeLines,
      comments: counts!.commentLines,
      blank: counts!.blankLines,
      markers: counts!.markers.length,
    },
  },
  oneWorkerBatch: {
    files: files.length,
    firstMs: Math.round(firstBatchMs),
    repeatMedianMs: Math.round(median(batchRuns)),
    totalCodeLines: response.results.reduce(
      (s: number, f: any) => s + f.codeLines,
      0,
    ),
  },
  environment:
    "Node File/Blob synthetic workload; not a disk or whole-browser timing",
};
console.log(JSON.stringify(report, null, 2));
if (process.argv[2])
  await writeFile(process.argv[2], JSON.stringify(report, null, 2));
