import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const lock = JSON.parse(
  await readFile(resolve(root, "package-lock.json"), "utf8"),
);
const notices = [
  "Third-party licenses for CountMyCode",
  "Generated from package-lock.json; do not edit by hand.",
];

for (const [location, entry] of Object.entries(lock.packages).sort()) {
  if (!location || entry.dev) continue;
  const directory = resolve(root, location);
  let filenames;
  try {
    filenames = await readdir(directory);
  } catch (error) {
    if (entry.optional && error.code === "ENOENT") continue;
    throw error;
  }
  const licenses = filenames
    .filter((name) => /^licen[cs]e(?:[.-]|$)/i.test(name))
    .sort();
  if (!licenses.length) throw new Error(`Missing license for ${location}`);
  notices.push(
    `\n${"=".repeat(72)}\n${location} ${entry.version} (${entry.license ?? "see license"})`,
  );
  for (const filename of licenses)
    notices.push(
      `\n${filename}\n${await readFile(resolve(directory, filename), "utf8")}`,
    );
}

const output = resolve(root, "public/licenses");
await mkdir(output, { recursive: true });
await writeFile(
  resolve(output, "THIRD-PARTY-LICENSES.txt"),
  notices.join("\n").replace(/[\t ]+$/gm, "") + "\n",
);
await writeFile(
  resolve(output, "CountMyCode-MIT.txt"),
  await readFile(resolve(root, "LICENSE")),
);
