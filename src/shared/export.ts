import type { FileAnalysis } from "./types";

export function csvCell(value: string): string {
  // Quoting alone does not prevent spreadsheet applications from evaluating formulas.
  const text = /^[\s\u0000-\u001f]*[=+@-]|^[\t\r\n]/.test(value)
    ? `'${value}`
    : value;
  return `"${text.replace(/"/g, '""')}"`;
}

export function createCsvReport(files: FileAnalysis[]): string {
  return [
    "File,Language,Size (bytes),Code,Comments,Blank,Total,Status",
    ...files.map((file) =>
      [
        csvCell(file.relativePath),
        csvCell(file.language),
        file.size,
        file.codeLines,
        file.commentLines,
        file.blankLines,
        file.totalLines,
        csvCell(file.status ?? "analyzed"),
      ].join(","),
    ),
  ].join("\r\n");
}
