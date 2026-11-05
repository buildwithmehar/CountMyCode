import { unzip } from "fflate";
export interface SourceFile {
  path: string;
  file: File;
}
export function safePath(path: string): string {
  const clean = path.replace(/\\/g, "/");
  if (
    clean.startsWith("/") ||
    /^[A-Za-z]:/.test(clean) ||
    clean.split("/").some((s) => s === "..") ||
    clean.includes("\0")
  )
    throw new Error("Archive contains an unsafe file path");
  return clean.replace(/^\.\//, "");
}
export async function readZip(file: File): Promise<SourceFile[]> {
  if (file.size > 50 * 1024 * 1024)
    throw new Error("Choose a ZIP smaller than 50 MB");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let declared = 0,
    count = 0;
  const entries = await new Promise<Record<string, Uint8Array>>(
    (resolve, reject) => {
      unzip(
        bytes,
        {
          filter: (entry) => {
            declared += entry.originalSize;
            count++;
            return declared <= 150 * 1024 * 1024 && count <= 10000;
          },
        },
        (error, data) =>
          error
            ? reject(
                new Error(
                  "Could not open this ZIP. It may be corrupt or encrypted.",
                ),
              )
            : resolve(data),
      );
    },
  );
  if (declared > 150 * 1024 * 1024 || count > 10000)
    throw new Error(
      "ZIP exceeds 150 MB expanded or 10,000 entries; choose a smaller archive",
    );
  const validated = Object.entries(entries)
    .filter(([p]) => !p.endsWith("/"))
    .map(([path, data]) => ({ path: safePath(path), data }));
  const paths = validated.map((item) => item.path);
  if (new Set(paths).size !== paths.length)
    throw new Error("ZIP contains ambiguous duplicate paths");
  const prefix =
    paths.length &&
    paths.every(
      (p) => p.includes("/") && p.split("/")[0] === paths[0].split("/")[0],
    )
      ? paths[0].split("/")[0] + "/"
      : "";
  return validated.map(({ path, data }) => ({
    path: path.slice(prefix.length),
    file: new File([data as Uint8Array<ArrayBuffer>], path.split("/").pop()!),
  }));
}
export async function readGithub(
  url: string,
  signal: AbortSignal,
  onProgress: (text: string) => void,
): Promise<{ name: string; files: SourceFile[] }> {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parsed.hostname !== "github.com" || parts.length !== 2)
    throw new Error(
      "Use a public repository URL: https://github.com/owner/repository",
    );
  const [owner, repo] = parts.map(encodeURIComponent);
  const get = async (path: string) => {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}${path}`,
      { signal },
    );
    if (!response.ok)
      throw new Error(
        response.status === 403
          ? "GitHub rate limit reached. Download the repository ZIP instead."
          : "Repository unavailable. Use a public repository URL.",
      );
    return response.json();
  };
  onProgress("Reading public repository…");
  const info = await get("");
  const tree = await get(
    `/git/trees/${encodeURIComponent(info.default_branch)}?recursive=1`,
  );
  const blobs = tree.tree.filter((x: any) => x.type === "blob") as {
    path: string;
    size: number;
  }[];
  if (
    tree.truncated ||
    blobs.length > 1500 ||
    blobs.reduce((s, b) => s + (b.size || 0), 0) > 50 * 1024 * 1024
  )
    throw new Error(
      "Repository exceeds the browser import limit (1,500 files / 50 MB). Use a local folder with ignore rules.",
    );
  let cursor = 0,
    completed = 0;
  const files: SourceFile[] = [];
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (cursor < blobs.length) {
        const item = blobs[cursor++];
        const response = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(info.default_branch)}/${item.path.split("/").map(encodeURIComponent).join("/")}`,
          { signal },
        );
        if (!response.ok)
          throw new Error(
            `Could not fetch ${item.path}; no partial scan was saved`,
          );
        const blob = await response.blob();
        files.push({
          path: safePath(item.path),
          file: new File([blob], item.path.split("/").pop()!),
        });
        onProgress(`Fetching files ${++completed} / ${blobs.length}`);
      }
    }),
  );
  return { name: `${info.owner.login}/${info.name}`, files };
}
export function demoFiles(): SourceFile[] {
  const sources = import.meta.glob("../demo/**/*", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;
  return Object.entries(sources).map(([path, text]) => ({
    path: path.replace("../demo/", ""),
    file: new File([text], path.split("/").pop()!),
  }));
}
