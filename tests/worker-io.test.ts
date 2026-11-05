import { test } from "node:test";
import assert from "node:assert/strict";
import type { WebFileMetadata } from "../src/web/types.ts";
let response: any;
const scope = {
  onmessage: null as ((event: any) => Promise<void>) | null,
  postMessage: (value: any) => {
    response = value;
  },
};
(globalThis as any).self = scope;
await import("../src/web/worker.ts");
function metadata(file: File): WebFileMetadata {
  return {
    name: file.name,
    relativePath: file.name,
    absolutePath: file.name,
    extension: ".ts",
    size: file.size,
    created: 0,
    modified: 0,
    type: "ts",
    file,
  };
}
test("worker pipelines file reads with bounded concurrency and produces complete results", async () => {
  let active = 0,
    peak = 0;
  const files = Array.from({ length: 20 }, (_, i) => {
    const actual = new File([`const value = ${i}\n`], `worker-${i}.ts`);
    const read = actual.arrayBuffer.bind(actual);
    actual.arrayBuffer = async () => {
      active++;
      peak = Math.max(active, peak);
      await new Promise((resolve) => setTimeout(resolve, 1));
      try {
        return await read();
      } finally {
        active--;
      }
    };
    return metadata(actual);
  });
  await scope.onmessage!({
    data: { type: "analyze", files, maxFileSizeKB: 10240 },
  });
  assert.equal(response.type, "result");
  assert.equal(response.results.length, 20);
  assert.ok(peak > 1 && peak <= 4);
  assert.ok(
    response.results.every(
      (file: any) =>
        file.codeLines === 1 && file.status === "analyzed" && file.hash,
    ),
  );
});
test("rescan rehashes changed content even when path, size and timestamps match", async () => {
  const first = metadata(
    new File(["const x = 1"], "same-path.ts", { lastModified: 123 }),
  );
  await scope.onmessage!({
    data: { type: "analyze", files: [first], maxFileSizeKB: 10240 },
  });
  const original = response.results[0];
  const changed = metadata(
    new File(["// TODO abc"], "same-path.ts", { lastModified: 123 }),
  );
  assert.equal(changed.size, first.size);
  await scope.onmessage!({
    data: { type: "analyze", files: [changed], maxFileSizeKB: 10240 },
  });
  assert.notEqual(response.results[0].hash, original.hash);
  assert.equal(response.results[0].codeLines, 0);
  assert.equal(response.results[0].commentLines, 1);
});
