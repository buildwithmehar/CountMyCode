import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildFileIndex,
  visibleTreeRows,
  createTreeWindow,
} from "../src/renderer/src/lib/file-tree.ts";
import type { FileAnalysis } from "../src/shared/types.ts";
const files = Array.from(
  { length: 100 },
  (_, i) =>
    ({
      relativePath: `file-${i}.ts`,
      name: `file-${i}.ts`,
      size: 1,
    }) as FileAnalysis,
);
const rows = visibleTreeRows(buildFileIndex(files), new Set());
test("wheel-scrolled virtual tree always has a rendered keyboard entry point", () => {
  const window = createTreeWindow(rows, 40, 60, 0, false);
  assert.equal(window.tabStopId, rows[40].node.id);
  assert.ok(window.items.some((item) => item.row.node.id === window.tabStopId));
  assert.equal(window.items.length, 20);
});
test("virtualization keeps an actively focused row mounted outside the visible slice", () => {
  const window = createTreeWindow(rows, 40, 60, 0, true);
  assert.equal(window.tabStopId, rows[0].node.id);
  assert.ok(window.items.some((item) => item.index === 0));
  assert.equal(window.items.length, 21);
  assert.equal(createTreeWindow(rows, 40, 60, 45, true).items.length, 20);
});
