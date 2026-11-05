import { test } from "node:test";
import assert from "node:assert/strict";

let stored: string | null = null;
Object.assign(globalThis, {
  window: {},
  localStorage: {
    getItem: () => stored,
    setItem: (_key: string, value: string) => {
      stored = value;
    },
  },
});
await import("../src/web/omni.ts");
const defaults = { workerCount: 0, maxFileSizeKB: 10240, customIgnore: [] };

test("missing, malformed and invalid settings retain usable defaults", async () => {
  for (const value of [
    null,
    "not json",
    "null",
    "[]",
    '"unexpected"',
    '{"customIgnore":null,"workerCount":"8","maxFileSizeKB":null}',
  ]) {
    stored = value;
    assert.deepEqual(await window.omni.loadSettings(), defaults);
  }
});

test("stored settings clamp limits and remove invalid ignore entries", async () => {
  stored = JSON.stringify({
    workerCount: 99.8,
    maxFileSizeKB: 999999,
    customIgnore: [" *.log ", null, 123, "", "# note", " !keep.log "],
  });
  assert.deepEqual(await window.omni.loadSettings(), {
    workerCount: 8,
    maxFileSizeKB: 51200,
    customIgnore: ["*.log", "!keep.log"],
  });
  stored = JSON.stringify({ workerCount: -2, maxFileSizeKB: -100 });
  assert.deepEqual(await window.omni.loadSettings(), {
    workerCount: 0,
    maxFileSizeKB: 100,
    customIgnore: [],
  });
});

test("saving settings persists normalized integer worker counts", async () => {
  await window.omni.saveSettings({
    workerCount: 2.7,
    maxFileSizeKB: 1024.9,
    customIgnore: [" tmp/ "],
  });
  assert.deepEqual(JSON.parse(stored!), {
    workerCount: 2,
    maxFileSizeKB: 1024,
    customIgnore: ["tmp/"],
  });
});
