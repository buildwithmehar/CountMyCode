import type {
  FileAnalysis,
  RepositoryStats,
  ExtensionStat,
  LanguageStat,
} from "./types";

export function computeStats(
  files: FileAnalysis[],
  folderCount: number,
  scanDurationMs: number,
  scannedPath: string,
): RepositoryStats {
  const totalFiles = files.length;
  const totalLines = files.reduce((s, f) => s + f.totalLines, 0);
  const blankLines = files.reduce((s, f) => s + f.blankLines, 0);
  const commentLines = files.reduce((s, f) => s + f.commentLines, 0);
  const codeLines = files.reduce((s, f) => s + f.codeLines, 0);

  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const averageFileSize = totalFiles > 0 ? totalSize / totalFiles : 0;
  const averageLinesPerFile = totalFiles > 0 ? totalLines / totalFiles : 0;

  const largestFiles = [...files]
    .filter((f) => f.codeLines > 0)
    .sort((a, b) => b.codeLines - a.codeLines)
    .slice(0, 20);

  const extMap = new Map<string, { count: number; lines: number }>();
  for (const f of files) {
    const ext = f.extension || "(no ext)";
    const entry = extMap.get(ext) || { count: 0, lines: 0 };
    entry.count++;
    entry.lines += f.totalLines;
    extMap.set(ext, entry);
  }
  const extensionDistribution: ExtensionStat[] = [...extMap.entries()]
    .map(([extension, v]) => ({ extension, ...v }))
    .sort((a, b) => b.count - a.count);

  const langMap = new Map<string, { count: number; lines: number }>();
  for (const f of files) {
    const lang = f.language || "Other";
    const entry = langMap.get(lang) || { count: 0, lines: 0 };
    entry.count++;
    entry.lines += f.totalLines;
    langMap.set(lang, entry);
  }
  const languageDistribution: LanguageStat[] = [...langMap.entries()]
    .map(([language, v]) => ({
      language,
      ...v,
      percentage: totalFiles > 0 ? (v.count / totalFiles) * 100 : 0,
    }))
    .sort((a, b) => b.lines - a.lines);

  const codeToCommentRatio = codeLines > 0 ? commentLines / codeLines : 0;
  const commentCoverage =
    totalLines > 0 ? (commentLines / totalLines) * 100 : 0;
  const repositoryDensityScore = totalFiles > 0 ? codeLines / totalFiles : 0;

  return {
    totalFiles,
    totalFolders: folderCount,
    totalLines,
    blankLines,
    commentLines,
    codeLines,
    averageFileSize,
    averageLinesPerFile,
    largestFiles,
    extensionDistribution,
    languageDistribution,
    codeToCommentRatio,
    commentCoverage,
    repositoryDensityScore,
    files,
    scanDurationMs,
    scannedPath,
  };
}

export function languageLineBreakdown(files: FileAnalysis[]) {
  const result = new Map<
    string,
    { code: number; comments: number; blank: number; total: number }
  >();
  for (const file of files) {
    const row = result.get(file.language) ?? {
      code: 0,
      comments: 0,
      blank: 0,
      total: 0,
    };
    row.code += file.codeLines;
    row.comments += file.commentLines;
    row.blank += file.blankLines;
    row.total += file.totalLines;
    result.set(file.language, row);
  }
  return result;
}
