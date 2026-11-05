import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildFileIndex,
  visibleTreeRows,
  matchingTreeIds,
} from "../src/renderer/src/lib/file-tree.ts";
import { languageLineBreakdown } from "../src/shared/analytics.ts";
import type { FileAnalysis } from "../src/shared/types.ts";
const file = (path: string, code = 10): FileAnalysis => ({
  path,
  relativePath: path,
  name: path.split("/").pop()!,
  extension: ".ts",
  language: "TypeScript",
  size: 100,
  totalLines: code + 2,
  codeLines: code,
  commentLines: 2,
  blankLines: 0,
});
test("tree counts descendants once and keeps identically named folders distinct", () => {
  const index = buildFileIndex([
    file("src/lib/a.ts"),
    file("tests/lib/a.ts"),
    file("README.md"),
  ]);
  assert.equal(index.byId.get("dir:src")?.count, 1);
  assert.equal(index.byId.get("dir:src/lib")?.count, 1);
  assert.equal(index.byId.get("dir:tests/lib")?.count, 1);
  const collapsed = visibleTreeRows(index, new Set());
  assert.deepEqual(
    collapsed.map((row) => row.node.name),
    ["src", "tests", "README.md"],
  );
  const expanded = visibleTreeRows(index, new Set(["dir:src", "dir:src/lib"]));
  assert.ok(
    expanded.some(
      (row) => row.node.id === "file:src/lib/a.ts" && row.depth === 2,
    ),
  );
  assert.ok(!expanded.some((row) => row.node.id === "file:tests/lib/a.ts"));
});
test("tree search retains matching files and their ancestors without unrelated branches", () => {
  const index = buildFileIndex([
    file("src/ui/button.ts"),
    file("src/data/query.ts"),
    file("README.md"),
  ]);
  const matches = matchingTreeIds(index, "button");
  const rows = visibleTreeRows(index, new Set(), matches);
  assert.deepEqual(
    rows.map((row) => row.node.id),
    ["dir:src", "dir:src/ui", "file:src/ui/button.ts"],
  );
});
test("language line aggregation preserves zero segments and counts each file exactly once", () => {
  const rows = languageLineBreakdown([
    file("a.ts", 10),
    file("b.ts", 5),
    { ...file("index.html", 3), language: "HTML" },
  ]);
  assert.deepEqual(rows.get("TypeScript"), {
    code: 15,
    comments: 4,
    blank: 0,
    total: 19,
  });
  assert.deepEqual(rows.get("HTML"), {
    code: 3,
    comments: 2,
    blank: 0,
    total: 5,
  });
});
