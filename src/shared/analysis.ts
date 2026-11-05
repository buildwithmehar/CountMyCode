import { getLanguageByFilename } from "./lang-config";
import type { FileAnalysis } from "./types";

const syntaxCache = new Map<
  string,
  { block?: [string, string]; prefixes: Set<string>; tokens: RegExp | null }
>();
const markerPattern = /\b(TODO|FIXME|HACK|XXX)\b\s*:?\s*([^\n]*)/gi;
function syntaxFor(filename: string) {
  const lang = getLanguageByFilename(filename),
    key = lang?.name ?? "Other";
  let syntax = syntaxCache.get(key);
  if (!syntax) {
    const prefixes = new Set(
      [lang?.lineComment, ...(lang?.lineComments ?? [])].filter(
        (value): value is string => !!value,
      ),
    );
    const quotes =
      lang?.name === "Markdown" || lang?.name === "Text" ? [] : ['"', "'", "`"];
    const delimiters = [
      ...(lang?.blockComment ? [lang.blockComment[0]] : []),
      ...prefixes,
      ...quotes,
    ];
    syntax = {
      block: lang?.blockComment,
      prefixes,
      tokens: delimiters.length
        ? new RegExp(
            delimiters
              .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              .join("|"),
            "g",
          )
        : null,
    };
    syntaxCache.set(key, syntax);
  }
  return syntax;
}
export function analyzeText(content: string, filename: string) {
  const { block, prefixes, tokens } = syntaxFor(filename);
  const lines = content
    ? content.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n")
    : [];
  let blankLines = 0,
    commentLines = 0,
    codeLines = 0,
    inBlock = false;
  let quote = "";
  const markers: NonNullable<FileAnalysis["markers"]> = [];
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n];
    let hasCode = false,
      hasComment = inBlock,
      comment = "";
    for (let i = 0; i < line.length;) {
      if (inBlock) {
        const end = block![1],
          position = line.indexOf(end, i);
        if (position < 0) {
          comment += line.slice(i);
          i = line.length;
        } else {
          comment += line.slice(i, position);
          i = position + end.length;
          inBlock = false;
        }
      } else if (quote) {
        hasCode = true;
        let position = line.indexOf(quote, i);
        while (position >= 0) {
          let backslashes = 0;
          for (let j = position - 1; j >= i && line[j] === "\\"; j--)
            backslashes++;
          if (backslashes % 2 === 0) break;
          position = line.indexOf(quote, position + 1);
        }
        if (position < 0) i = line.length;
        else {
          i = position + 1;
          quote = "";
        }
      } else {
        if (tokens) tokens.lastIndex = i;
        const next = tokens?.exec(line);
        if (!next) {
          if (!hasCode && line.slice(i).trim()) hasCode = true;
          break;
        }
        if (!hasCode && line.slice(i, next.index).trim()) hasCode = true;
        const token = next[0];
        i = next.index + token.length;
        if (block && token === block[0]) {
          inBlock = true;
          hasComment = true;
        } else if (prefixes.has(token)) {
          comment += line.slice(i);
          hasComment = true;
          break;
        } else {
          quote = token;
          hasCode = true;
        }
      }
    }
    if (quote !== "`") quote = "";
    if (hasCode) codeLines++;
    else if (hasComment) commentLines++;
    else blankLines++;
    if (!comment) continue;
    markerPattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = markerPattern.exec(comment)))
      markers.push({
        kind: match[1].toUpperCase(),
        line: n + 1,
        text: match[2].trim().replace(/\*\/$/, "").trim(),
      });
  }
  return {
    totalLines: lines.length,
    blankLines,
    commentLines,
    codeLines,
    markers,
  };
}
export function groupDuplicates(files: FileAnalysis[]) {
  const groups = new Map<string, FileAnalysis[]>();
  for (const file of files) {
    if (!file.hash || !file.size || (file.status && file.status !== "analyzed"))
      continue;
    const group = groups.get(file.hash) ?? [];
    group.push(file);
    groups.set(file.hash, group);
  }
  return [...groups.values()]
    .filter((g) => g.length > 1)
    .map((files) => ({
      files,
      wastedBytes: files[0].size * (files.length - 1),
    }))
    .sort((a, b) => b.wastedBytes - a.wastedBytes);
}
export function folderBreakdown(files: FileAnalysis[]) {
  const map = new Map<
    string,
    { path: string; files: number; lines: number; size: number }
  >();
  for (const file of files) {
    const path = file.relativePath.includes("/")
      ? file.relativePath.split("/")[0]
      : "(root)";
    const group = map.get(path) ?? { path, files: 0, lines: 0, size: 0 };
    group.files++;
    group.lines += file.codeLines;
    group.size += file.size;
    map.set(path, group);
  }
  return [...map.values()].sort((a, b) => b.lines - a.lines);
}
export function compareFiles(before: FileAnalysis[], after: FileAnalysis[]) {
  const old = new Map(before.map((f) => [f.relativePath, f])),
    next = new Map(after.map((f) => [f.relativePath, f]));
  return {
    added: after.filter((f) => !old.has(f.relativePath)),
    removed: before.filter((f) => !next.has(f.relativePath)),
    changed: after.filter((f) => {
      const prev = old.get(f.relativePath);
      return (
        prev &&
        (prev.hash && f.hash
          ? prev.hash !== f.hash
          : prev.size !== f.size || prev.codeLines !== f.codeLines)
      );
    }),
  };
}
