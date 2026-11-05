import { useState } from "react";
import {
  CheckCircle2,
  Copy,
  ListTodo,
  AlertCircle,
  ArrowUpRight,
  Search,
} from "lucide-react";
import type { RepositoryStats, FileAnalysis } from "@shared/types";
import { groupDuplicates } from "@shared/analysis";
import { bytes, number } from "../lib/presentation";
import { PageTitle, Panel, Empty } from "./WorkbenchOverview";
export function WorkbenchInsights({
  stats,
  onPreview,
}: {
  stats: RepositoryStats;
  onPreview: (file: FileAnalysis) => void;
}) {
  const [tab, setTab] = useState("markers"),
    [query, setQuery] = useState("");
  const duplicates = groupDuplicates(stats.files),
    markers = stats.files.flatMap((file) =>
      (file.markers ?? []).map((marker) => ({ ...marker, file })),
    ),
    skipped = stats.files.filter((f) => f.status && f.status !== "analyzed");
  const filtered = markers.filter((m) =>
    `${m.file.relativePath} ${m.kind} ${m.text}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        title="The details worth noticing."
        description="Pending comments, repeated files and a transparent scan log."
      />
      <div className="insight-summary">
        <div>
          <ListTodo size={19} />
          <strong>{number(markers.length)}</strong>
          <span>Comment markers</span>
        </div>
        <div>
          <Copy size={19} />
          <strong>{duplicates.length}</strong>
          <span>Duplicate groups</span>
        </div>
        <div>
          <AlertCircle size={19} />
          <strong>{skipped.length}</strong>
          <span>Skipped files</span>
        </div>
      </div>
      <div
        className="segmented"
        role="tablist"
        aria-label="Insight category"
        onKeyDown={(event) => {
          if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key))
            return;
          event.preventDefault();
          const items = ["markers", "duplicates", "scan"];
          const index =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? 2
                : (items.indexOf(tab) + (event.key === "ArrowRight" ? 1 : 2)) %
                  3;
          setTab(items[index]);
          event.currentTarget
            .querySelectorAll<HTMLButtonElement>('[role="tab"]')
            [index].focus();
        }}
      >
        {[
          { id: "markers", title: "TODO & FIXME", count: markers.length },
          {
            id: "duplicates",
            title: "Duplicate files",
            count: duplicates.length,
          },
          { id: "scan", title: "Scan details", count: skipped.length },
        ].map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
          >
            {item.title}
            <span>{item.count}</span>
          </button>
        ))}
      </div>
      {tab === "markers" && (
        <Panel
          title="A smaller list of loose ends"
          detail="Markers found in comments. Each includes its original line number."
          action={
            <label className="search-field compact">
              <Search size={15} />
              <input
                aria-label="Search markers"
                placeholder="Search markers"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          }
        >
          {filtered.length ? (
            <div className="marker-list">
              {filtered.slice(0, 200).map((marker, i) => (
                <button
                  key={i}
                  className="marker-row"
                  onClick={() => onPreview(marker.file)}
                >
                  <span
                    className={`marker-kind ${marker.kind === "FIXME" ? "danger-text" : ""}`}
                  >
                    {marker.kind}
                  </span>
                  <div>
                    <strong>{marker.text || "No description"}</strong>
                    <span>
                      {marker.file.relativePath}:{marker.line}
                    </span>
                  </div>
                  <ArrowUpRight size={16} />
                </button>
              ))}
              {filtered.length > 200 && (
                <p className="quiet-note">
                  Showing the first 200 matches. Narrow your search to find
                  more.
                </p>
              )}
            </div>
          ) : (
            <Empty
              title="No comment markers here"
              description="TODO, FIXME, HACK and XXX comments will appear here."
            />
          )}
        </Panel>
      )}
      {tab === "duplicates" && (
        <Panel
          title="Same content, different places"
          detail={`${bytes(duplicates.reduce((s, g) => s + g.wastedBytes, 0))} of repeated content. SHA-256 matches; no files are deleted.`}
        >
          {duplicates.length ? (
            <div className="duplicate-list">
              {duplicates.map((group, i) => (
                <div className="duplicate-group" key={i}>
                  <div>
                    <Copy size={16} />
                    <strong>{group.files.length} identical files</strong>
                    <span>{bytes(group.wastedBytes)} repeated</span>
                  </div>
                  {group.files.map((file) => (
                    <button
                      className="duplicate-path"
                      key={file.relativePath}
                      onClick={() => onPreview(file)}
                    >
                      {file.relativePath}
                      <ArrowUpRight size={14} />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="No duplicate files found"
              description="Non-empty analyzed files are compared by their content hash."
            />
          )}
        </Panel>
      )}
      {tab === "scan" && (
        <Panel
          title="Nothing hidden in the totals"
          detail="Binary, oversized and unreadable files remain in file/byte totals, with zero counted lines."
        >
          <div className="scan-summary">
            <span>
              <CheckCircle2 size={16} />
              {number(stats.totalFiles - skipped.length)} files analyzed
            </span>
            <span>
              {number(stats.ignoredEntries ?? 0)} ignored entries (a directory
              counts as one)
            </span>
            <span>
              {stats.files.filter((f) => f.cached).length} reused content
              analyses
            </span>
          </div>
          {skipped.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Reason</th>
                    <th className="numeric">Size</th>
                  </tr>
                </thead>
                <tbody>
                  {skipped.map((file) => (
                    <tr key={file.relativePath}>
                      <td>{file.relativePath}</td>
                      <td>
                        <span className="language-tag">{file.status}</span>
                      </td>
                      <td className="numeric">{bytes(file.size)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Every selected file was readable"
              description="No files were skipped for line counting."
            />
          )}
          <p className="quiet-note">
            Comment classification is heuristic. Embedded languages and complex
            string syntax may need manual review.
          </p>
        </Panel>
      )}
    </>
  );
}
