import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeText } from "../src/shared/analysis.ts";
test("Lua block opener wins over its line-comment prefix", () => {
  const result = analyzeText(
    "--[[ TODO: document\nblock contents\n]]\nlocal x = 1\n",
    "script.lua",
  );
  assert.equal(result.commentLines, 3);
  assert.equal(result.codeLines, 1);
  assert.equal(result.markers[0].line, 1);
});
test("INI semicolon and hash comments do not swallow settings", () => {
  const result = analyzeText(
    '; a comment\nkey=value\n# another comment\npath="a;b"\n',
    "config.ini",
  );
  assert.equal(result.commentLines, 2);
  assert.equal(result.codeLines, 2);
});
