import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createAnalysisBatches,
  chooseWorkerCount,
} from "../src/web/scheduling.ts";
import { createProgressGate } from "../src/web/progress.ts";
test("large files are spread across batches without losing or duplicating files", () => {
  const files = Array.from({ length: 40 }, (_, i) => ({
    size: i < 3 ? 8 * 1024 * 1024 : 1024,
    name: String(i),
  }));
  const batches = createAnalysisBatches(files, 24);
  assert.equal(batches.flat().length, 40);
  assert.equal(new Set(batches.flat()).size, 40);
  assert.ok(batches.slice(0, 3).every((batch) => batch.length === 1));
  assert.ok(batches.every((batch) => batch.length <= 24));
});
test("automatic worker allocation avoids startup overhead on tiny projects", () => {
  assert.equal(chooseWorkerCount([{ size: 100 }, { size: 200 }], 16), 1);
  assert.ok(
    chooseWorkerCount(
      Array.from({ length: 500 }, () => ({ size: 5000 })),
      16,
    ) > 1,
  );
  assert.equal(chooseWorkerCount([{ size: 1024 * 1024 }], 1), 1);
});
test("progress updates are rate-limited but phase changes and terminal events are immediate", () => {
  let time = 0;
  const gate = createProgressGate(80, () => time);
  assert.equal(gate("crawling"), true);
  time = 10;
  assert.equal(gate("crawling"), false);
  assert.equal(gate("analyzing"), true);
  time = 20;
  assert.equal(gate("analyzing"), false);
  assert.equal(gate("complete"), true);
  assert.equal(gate("error"), true);
});
