import { test } from "node:test";
import assert from "node:assert/strict";
import { traverseDroppedItems } from "../src/web/drop.ts";

function fixture() {
  const reads: string[] = [],
    directories: string[] = [];
  const file = (name: string, text = "export const a = 1") => ({
    name,
    isFile: true,
    isDirectory: false,
    file(resolve: (file: File) => void) {
      reads.push(name);
      resolve(new File([text], name));
    },
  });
  const directory = (name: string, children: any[]) => ({
    name,
    isDirectory: true,
    isFile: false,
    createReader() {
      directories.push(name);
      let done = false;
      return {
        readEntries(resolve: (entries: any[]) => void) {
          resolve(done ? [] : children);
          done = true;
        },
      };
    },
  });
  const root = directory("project", [
    file(".gitignore", "generated/"),
    directory("node_modules", [file("dependency.ts")]),
    directory("generated", [file("generated.ts")]),
    directory("private", [file("private.ts")]),
    directory("src", [file("main.ts")]),
  ]);
  const transfer = {
    items: [{ kind: "file", webkitGetAsEntry: () => root }],
  } as unknown as DataTransfer;
  return { transfer, reads, directories };
}
test("drop traversal skips excluded subtrees before fetching their files", async () => {
  const { transfer, reads, directories } = fixture();
  const result = await traverseDroppedItems(transfer, undefined, {
    customIgnore: ["private/"],
  });
  assert.deepEqual(result?.files.map((f) => f.relativePath).sort(), [
    ".gitignore",
    "src/main.ts",
  ]);
  assert.ok(
    !reads.includes("dependency.ts") &&
      !reads.includes("generated.ts") &&
      !reads.includes("private.ts"),
  );
  assert.ok(
    !directories.includes("node_modules") && !directories.includes("generated"),
  );
});
