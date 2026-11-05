import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeText,
  groupDuplicates,
  folderBreakdown,
  compareFiles,
} from "../src/shared/analysis.ts";

test("empty and terminal newline do not invent lines", () => {
  assert.equal(analyzeText("", "a.ts").totalLines, 0);
  assert.equal(analyzeText("const a = 1\n", "a.ts").totalLines, 1);
});
test("strings, mixed block comments and comment markers are classified", () => {
  const result = analyzeText(
    'const url = "https://example.com";\n/* TODO: explain\n * detail */ const a = 1;\n// FIXME: handle errors\n\n',
    "a.ts",
  );
  assert.equal(result.codeLines, 2);
  assert.equal(result.commentLines, 2);
  assert.equal(result.blankLines, 1);
  assert.deepEqual(
    result.markers.map((x) => [x.kind, x.line]),
    [
      ["TODO", 2],
      ["FIXME", 4],
    ],
  );
  assert.equal(analyzeText('const x = "TODO: text"', "a.ts").markers.length, 0);
});
test("duplicate groups exclude empty and skipped files", () => {
  const files = [
    { relativePath: "a.ts", hash: "abc", size: 12 },
    { relativePath: "b.ts", hash: "abc", size: 12 },
    { relativePath: "empty", hash: "empty", size: 0 },
  ];
  assert.equal(groupDuplicates(files as any)[0].wastedBytes, 12);
});
test("folder rollups and comparison include removed and added paths", () => {
  const before = [
    { relativePath: "src/a.ts", codeLines: 10, size: 100, hash: "a" },
  ];
  const after = [
    { relativePath: "src/a.ts", codeLines: 15, size: 150, hash: "b" },
    { relativePath: "README.md", codeLines: 2, size: 20, hash: "c" },
  ];
  assert.equal(folderBreakdown(after as any)[0].path, "src");
  const diff = compareFiles(before as any, after as any);
  assert.equal(diff.changed.length, 1);
  assert.equal(diff.added.length, 1);
  assert.equal(compareFiles(after as any, before as any).removed.length, 1);
});
