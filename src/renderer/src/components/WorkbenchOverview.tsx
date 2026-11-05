import { useMemo } from "react";
import { FileTypeIcon } from "./FileTypeIcon";
import { languageLineBreakdown } from "@shared/analytics";
import {
  ArrowUpRight,
  Files,
  Code2,
  FolderTree,
  MessageSquare,
  CheckCircle2,
  Clock3,
  ArrowRight,
  Folder,
} from "lucide-react";
import type { RepositoryStats, FileAnalysis } from "@shared/types";
import { folderBreakdown } from "@shared/analysis";
import { bytes, number, languageColor } from "../lib/presentation";

export function PageTitle({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Panel({
  title,
  detail,
  action,
  children,
  className = "",
}: {
  title: string;
  detail?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {detail && <p>{detail}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Empty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty-message">
      <FolderTree size={28} />
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
export function StatRow({ stats }: { stats: RepositoryStats }) {
  return (
    <div className="stat-grid">
      {[
        {
          title: "Code lines",
          value: stats.codeLines,
          icon: Code2,
          note: `${number(stats.totalLines)} total lines`,
        },
        {
          title: "Project files",
          value: stats.totalFiles,
          icon: Files,
          note: `${number(stats.totalFolders)} folders`,
        },
        {
          title: "Languages",
          value: stats.languageDistribution.length,
          icon: FolderTree,
          note: stats.languageDistribution[0]?.language + " leads the way",
        },
        {
          title: "Comment lines",
          value: stats.commentLines,
          icon: MessageSquare,
          note: `${stats.commentCoverage.toFixed(1)}% of all lines`,
        },
      ].map(({ title, value, icon: Icon, note }) => (
        <div className="stat" key={title}>
          <div className="stat-label">
            {title}
            <Icon size={16} />
          </div>
          <strong>{number(value)}</strong>
          <span>{note}</span>
        </div>
      ))}
    </div>
  );
}
export function LanguageChart({ stats }: { stats: RepositoryStats }) {
  return (
    <>
      <div
        className="composition-bar"
        role="img"
        aria-label={stats.languageDistribution
          .map((l) => `${l.language}: ${l.lines} lines`)
          .join(", ")}
      >
        {stats.languageDistribution
          .filter((l) => l.lines > 0)
          .map((l) => (
            <span
              key={l.language}
              title={`${l.language}: ${number(l.lines)} lines`}
              style={{ flex: l.lines, background: languageColor(l.language) }}
            />
          ))}
      </div>
      <div className="language-list">
        {stats.languageDistribution.slice(0, 7).map((l) => (
          <div className="language-row" key={l.language}>
            <span
              className="legend-swatch"
              style={{ background: languageColor(l.language) }}
            />
            <span>{l.language}</span>
            <span className="muted">{number(l.count)} files</span>
            <strong>{number(l.lines)}</strong>
            <span className="muted">
              {((l.lines / Math.max(1, stats.totalLines)) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
export function FileTable({
  files,
  onPreview,
  selectedPath,
}: {
  files: FileAnalysis[];
  onPreview: (file: FileAnalysis) => void;
  selectedPath?: string | null;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>File</th>
            <th>Language</th>
            <th className="numeric">Code lines</th>
            <th className="numeric">Size</th>
            <th>
              <span className="sr-only">Preview</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr
              key={file.relativePath}
              className={
                selectedPath === file.relativePath
                  ? "selected-file-row"
                  : undefined
              }
            >
              <td>
                <button className="file-link" onClick={() => onPreview(file)}>
                  <FileTypeIcon file={file} size={16} />
                  <span title={file.relativePath}>{file.relativePath}</span>
                </button>
              </td>
              <td>
                <span className="language-tag">{file.language}</span>
              </td>
              <td className="numeric">{number(file.codeLines)}</td>
              <td className="numeric muted">{bytes(file.size)}</td>
              <td>
                <button
                  className="icon-button"
                  aria-label={`Preview ${file.relativePath}`}
                  onClick={() => onPreview(file)}
                >
                  <ArrowUpRight size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function WorkbenchOverview({
  stats,
  onPreview,
  onNavigate,
}: {
  stats: RepositoryStats;
  onPreview: (file: FileAnalysis) => void;
  onNavigate: (view: string) => void;
}) {
  const folders = folderBreakdown(stats.files),
    skipped = stats.files.filter(
      (f) => f.status && f.status !== "analyzed",
    ).length;
  return (
    <>
      <PageTitle
        title="A clearer view of your code."
        description={`${stats.scannedPath} / the numbers, without the noise.`}
        action={
          <span className="success-label">
            <CheckCircle2 size={15} /> Analysis complete
          </span>
        }
      />
      <StatRow stats={stats} />
      <div className="overview-grid">
        <Panel
          title="Your language mix"
          detail="Share of total lines, by language"
          action={
            <button
              className="text-button"
              onClick={() => onNavigate("analytics")}
            >
              Explore <ArrowUpRight size={15} />
            </button>
          }
        >
          <LanguageChart stats={stats} />
        </Panel>
        <Panel
          title="Every line has a place"
          detail="A breakdown of your source"
        >
          <div className="line-total">
            <strong>{number(stats.totalLines)}</strong>
            <span>total lines</span>
          </div>
          <div
            className="line-stack"
            aria-label="Code, comments and blank lines"
          >
            {[
              { label: "Code", value: stats.codeLines, cls: "code" },
              { label: "Comments", value: stats.commentLines, cls: "comments" },
              { label: "Blank", value: stats.blankLines, cls: "blank" },
            ].map((l) => (
              <span key={l.label} className={l.cls} style={{ flex: l.value }} />
            ))}
          </div>
          <div className="line-legend">
            {[
              { label: "Code", value: stats.codeLines, cls: "code" },
              { label: "Comments", value: stats.commentLines, cls: "comments" },
              { label: "Blank", value: stats.blankLines, cls: "blank" },
            ].map((l) => (
              <div key={l.label}>
                <i className={l.cls} />
                <span>{l.label}</span>
                <strong>{number(l.value)}</strong>
              </div>
            ))}
          </div>
          <div className="quiet-note">
            <Clock3 size={14} /> Scanned in{" "}
            {(stats.scanDurationMs / 1000).toFixed(2)}s
          </div>
        </Panel>
      </div>
      <Panel
        title="Where the code lives"
        detail="Top-level folders, ranked by code lines"
      >
        <div className="folder-grid">
          {folders.slice(0, 6).map((folder) => (
            <div className="folder-summary" key={folder.path}>
              <div>
                <Folder size={16} />
                <strong>{folder.path}</strong>
                <span>{number(folder.files)} files</span>
              </div>
              <div className="track">
                <span
                  style={{
                    transform: `scaleX(${folder.lines / Math.max(1, folders[0]?.lines)})`,
                  }}
                />
              </div>
              <small>
                {number(folder.lines)} code lines{" "}
                <span>{bytes(folder.size)}</span>
              </small>
            </div>
          ))}
        </div>
      </Panel>
      <Panel
        title="Files doing the heavy lifting"
        detail="Largest files by code lines"
        action={
          <button className="text-button" onClick={() => onNavigate("files")}>
            All files <ArrowRight size={15} />
          </button>
        }
      >
        <FileTable
          files={stats.largestFiles.slice(0, 5)}
          onPreview={onPreview}
        />
      </Panel>
      <div className="scan-footnote">
        <span>
          {number(stats.ignoredEntries ?? 0)} ignored entries / {skipped} files
          skipped for line counting /{" "}
          {stats.files.filter((f) => f.cached).length} cached analyses
        </span>
        <button className="text-button" onClick={() => onNavigate("insights")}>
          View scan details <ArrowUpRight size={14} />
        </button>
      </div>
    </>
  );
}
export function WorkbenchAnalytics({ stats }: { stats: RepositoryStats }) {
  const lineData = useMemo(
    () => languageLineBreakdown(stats.files),
    [stats.files],
  );
  const maximum = Math.max(
    1,
    ...stats.languageDistribution.map((language) => language.lines),
  );
  return (
    <>
      <PageTitle
        title="Look a little deeper."
        description="Language, folder and file-size distributions."
      />
      <div className="overview-grid">
        <Panel
          title="Lines by language"
          detail="Code, comments and blank lines"
        >
          <div className="horizontal-chart">
            {stats.languageDistribution.slice(0, 10).map((l) => {
              const counts = lineData.get(l.language) ?? {
                code: 0,
                comments: 0,
                blank: 0,
                total: 0,
              };
              const segments = [
                { key: "code", label: "Code", value: counts.code },
                { key: "comments", label: "Comments", value: counts.comments },
                { key: "blank", label: "Blank", value: counts.blank },
              ].filter((segment) => segment.value > 0);
              return (
                <div key={l.language}>
                  <span>{l.language}</span>
                  <div className="chart-track">
                    <div
                      className="language-stack"
                      data-has-lines={l.lines > 0}
                      role="img"
                      aria-label={`${l.language}: ${counts.code} code, ${counts.comments} comment and ${counts.blank} blank lines`}
                      title={`${number(counts.code)} code / ${number(counts.comments)} comments / ${number(counts.blank)} blank lines`}
                      style={{
                        width: `${(l.lines / maximum) * 100}%`,
                      }}
                    >
                      {segments.map((segment) => (
                        <span
                          key={segment.key}
                          className={segment.key}
                          style={{ flex: `${segment.value} 1 0%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <strong>{number(l.lines)}</strong>
                </div>
              );
            })}
          </div>
          <div className="chart-key">
            <span>
              <i className="code" />
              Code
            </span>
            <span>
              <i className="comments" />
              Comments
            </span>
            <span>
              <i className="blank" />
              Blank
            </span>
          </div>
          <p className="chart-scale-note">
            Small totals use a minimum visible bar. Exact counts are shown on
            the right.
          </p>
        </Panel>
        <Panel title="File sizes" detail="Number of files in each size range">
          <div className="size-chart">
            {[
              { label: "< 1 KB", min: 0, max: 1024 },
              { label: "1–10 KB", min: 1024, max: 10240 },
              { label: "10–100 KB", min: 10240, max: 102400 },
              { label: "100 KB–1 MB", min: 102400, max: 1048576 },
              { label: "> 1 MB", min: 1048576, max: Infinity },
            ].map((range) => {
              const count = stats.files.filter(
                (f) => f.size >= range.min && f.size < range.max,
              ).length;
              return (
                <div key={range.label}>
                  <strong>{number(count)}</strong>
                  <div className="size-bar-area">
                    <span
                      style={{
                        transform: `scaleY(${count / Math.max(1, stats.totalFiles)})`,
                      }}
                    />
                  </div>
                  <small>{range.label}</small>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
      <Panel
        title="Complete language breakdown"
        detail="File share and line share are measured separately"
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Language</th>
                <th className="numeric">Files</th>
                <th className="numeric">File share</th>
                <th className="numeric">Lines</th>
                <th className="numeric">Line share</th>
              </tr>
            </thead>
            <tbody>
              {stats.languageDistribution.map((l) => (
                <tr key={l.language}>
                  <td>
                    <span className="inline-label">
                      <i
                        className="legend-swatch"
                        style={{ background: languageColor(l.language) }}
                      />
                      {l.language}
                    </span>
                  </td>
                  <td className="numeric">{number(l.count)}</td>
                  <td className="numeric muted">{l.percentage.toFixed(1)}%</td>
                  <td className="numeric">{number(l.lines)}</td>
                  <td className="numeric muted">
                    {((l.lines / Math.max(1, stats.totalLines)) * 100).toFixed(
                      1,
                    )}
                    %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <p className="muted small">
        Comment counts are descriptive. They are not a test-coverage or
        code-quality score.
      </p>
    </>
  );
}
