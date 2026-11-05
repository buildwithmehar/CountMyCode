import { test } from "node:test";
import assert from "node:assert/strict";
import { crawlHandle } from "../src/web/crawler.ts";
import {
  createIgnoreMatcher,
  createIgnoreRules,
} from "../src/shared/ignore.ts";

test("directory reads overlap with a fixed concurrency limit and preserve all paths", async () => {
  let active = 0,
    peak = 0;
  const entries = Array.from({ length: 24 }, (_, i) => ({
    kind: "file",
    name: `a-${i}.ts`,
    async getFile() {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active--;
      return new File(["const a = 1"], this.name);
    },
  }));
  const handle = {
    async *values() {
      for (const entry of entries) yield entry;
    },
  } as unknown as FileSystemDirectoryHandle;
  const result = await crawlHandle(
    handle,
    createIgnoreMatcher(createIgnoreRules([])),
  );
  assert.equal(result.files.length, 24);
  assert.equal(new Set(result.files.map((f) => f.relativePath)).size, 24);
  assert.ok(peak > 1, "File metadata reads should overlap");
  assert.ok(peak <= 16, "No more than 16 metadata reads may be in flight");
});
test("cancelled directory traversal returns without reading later entries", async () => {
  let cancelled = false,
    reads = 0;
  const handle = {
    async *values() {
      for (let i = 0; i < 100; i++)
        yield {
          kind: "file",
          name: `${i}.ts`,
          async getFile() {
            reads++;
            cancelled = true;
            return new File(["x"], "x.ts");
          },
        };
    },
  } as unknown as FileSystemDirectoryHandle;
  await crawlHandle(handle, createIgnoreMatcher(createIgnoreRules([])), {
    shouldCancel: () => cancelled,
  });
  assert.ok(reads < 100);
});
