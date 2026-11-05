import { test } from "node:test";
import assert from "node:assert/strict";
import { csvCell, createCsvReport } from "../src/shared/export.ts";
import type { FileAnalysis } from "../src/shared/types.ts";

test("CSV text stays quoted and cannot become a spreadsheet formula", () => {
  assert.equal(csvCell('src/a,"b".ts'), '"src/a,""b"".ts"');
  assert.equal(csvCell("src/normal.ts"), '"src/normal.ts"');
  for (const path of [
    "=1+1.ts",
    "+cmd.ts",
    "-1.ts",
    "@SUM.ts",
    "\t=1.ts",
    " \r=1.ts",
  ])
    assert.equal(csvCell(path), `"'${path}"`);
});

test("CSV exports exact numeric counts with a safe filename", () => {
  const file: FileAnalysis = {
    path: "=1.ts",
    relativePath: "=1.ts",
    name: "=1.ts",
    extension: ".ts",
    language: "TypeScript",
    size: 12,
    codeLines: 1,
    commentLines: 2,
    blankLines: 3,
    totalLines: 6,
    status: "analyzed",
  };
  assert.equal(
    createCsvReport([file]).split("\r\n")[1],
    '"\'=1.ts","TypeScript",12,1,2,3,6,"analyzed"',
  );
});
