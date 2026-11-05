import { test } from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import { safePath, readZip } from "../src/web/sources.ts";
import {
  createIgnoreMatcher,
  createIgnoreRules,
} from "../src/shared/ignore.ts";
test("unsafe archive paths are rejected", () => {
  for (const path of ["../secret", "/secret", "C:\\secret", "a/../../secret"])
    assert.throws(() => safePath(path));
  assert.equal(safePath("src\\a.ts"), "src/a.ts");
});
test("ZIP import strips only one shared root and retains content", async () => {
  const zipped = zipSync({
    "project/src/a.ts": strToU8("const a = 1"),
    "project/README.md": strToU8("# Read me"),
  });
  const files = await readZip(new File([zipped], "project.zip"));
  assert.deepEqual(files.map((f) => f.path).sort(), ["README.md", "src/a.ts"]);
  assert.equal(
    await files.find((f) => f.path === "src/a.ts")!.file.text(),
    "const a = 1",
  );
});
test("ignore rules support anchored patterns, negation and default exclusions", () => {
  const matcher = createIgnoreMatcher(
    createIgnoreRules(["/build.txt", "*.log", "!keep.log", "!node_modules/"]),
  );
  assert.equal(matcher.shouldIgnore("build.txt", "build.txt", false), true);
  assert.equal(
    matcher.shouldIgnore("build.txt", "src/build.txt", false),
    false,
  );
  assert.equal(matcher.shouldIgnore("debug.log", "debug.log", false), true);
  assert.equal(matcher.shouldIgnore("keep.log", "keep.log", false), false);
  assert.equal(
    matcher.shouldIgnore("node_modules", "node_modules", true),
    true,
  );
});
