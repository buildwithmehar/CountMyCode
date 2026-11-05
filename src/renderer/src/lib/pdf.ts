import type { RepositoryStats } from "@shared/types";
export async function downloadPdf(stats: RepositoryStats) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  let y = 25;
  const line = (text: string, size = 11) => {
    pdf.setFontSize(size);
    for (const row of pdf.splitTextToSize(text, 174)) {
      if (y > 275) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(row, 18, y);
      y += size * 0.5 + 3;
    }
  };
  pdf.setTextColor(180, 63, 22);
  line("CountMyCode", 25);
  pdf.setTextColor(35, 35, 32);
  line("Repository analysis", 17);
  line(stats.scannedPath, 14);
  line(new Date(stats.scannedAt ?? Date.now()).toLocaleString());
  y += 6;
  line(
    `${stats.totalFiles.toLocaleString()} files | ${stats.totalFolders} folders | ${stats.codeLines.toLocaleString()} code lines`,
    13,
  );
  line(
    `${stats.commentLines} comment lines | ${stats.blankLines} blank lines | ${stats.languageDistribution.length} languages`,
  );
  line(
    `Source: ${stats.source ?? "local"} | Analysis time: ${(stats.scanDurationMs / 1000).toFixed(2)}s`,
  );
  y += 8;
  line("Language distribution", 16);
  for (const language of stats.languageDistribution) {
    line(
      `${language.language}: ${language.count} files / ${language.lines.toLocaleString()} lines`,
    );
    pdf.setFillColor(180, 63, 22);
    pdf.rect(
      18,
      y,
      (174 * language.lines) / Math.max(1, stats.totalLines),
      2,
      "F",
    );
    y += 7;
  }
  y += 8;
  line("Largest files by code lines", 16);
  for (const file of stats.largestFiles)
    line(
      `${file.relativePath} - ${file.codeLines.toLocaleString()} code lines`,
    );
  y += 8;
  line("Scan notes", 16);
  line(
    `${stats.files.filter((f) => f.status && f.status !== "analyzed").length} files skipped for line counting. Binary and oversized files are still included in file and byte totals. Comment classification is heuristic, not a semantic code quality assessment.`,
  );
  pdf.save(`countmycode-${stats.scannedPath.replace(/[^a-z0-9-]/gi, "-")}.pdf`);
}
