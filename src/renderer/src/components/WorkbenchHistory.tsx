import { useState, useEffect } from "react";
import {
  History,
  ArrowRight,
  Trash2,
  GitCompareArrows,
  ArrowUpRight,
} from "lucide-react";
import type { Snapshot } from "../lib/history";
import { compareFiles } from "@shared/analysis";
import { number, time } from "../lib/presentation";
import { PageTitle, Panel, Empty } from "./WorkbenchOverview";
export function WorkbenchHistory({
  snapshots,
  onRestore,
  onDelete,
}: {
  snapshots: Snapshot[];
  onRestore: (snapshot: Snapshot) => void;
  onDelete: (id: string) => void;
}) {
  const [before, setBefore] = useState(""),
    [after, setAfter] = useState(""),
    [remove, setRemove] = useState("");
  useEffect(() => {
    if (!snapshots.some((s) => s.id === before))
      setBefore(snapshots[1]?.id ?? "");
    if (!snapshots.some((s) => s.id === after))
      setAfter(snapshots[0]?.id ?? "");
  }, [snapshots, before, after]);
  const a = snapshots.find((s) => s.id === before),
    b = snapshots.find((s) => s.id === after),
    diff = a && b ? compareFiles(a.stats.files, b.stats.files) : null;
  return (
    <>
      <PageTitle
        title="See how your code moves."
        description="Up to 20 snapshots, saved only in this browser. Full source files are not stored."
      />
      <Panel
        title="Compare two snapshots"
        detail="Choose scans of the same project, or compare two different projects."
        action={<GitCompareArrows size={20} />}
      >
        {snapshots.length < 2 ? (
          <Empty
            title="A comparison needs two scans"
            description="Scan a project, change a file, then rescan. Or open another project."
          />
        ) : (
          <>
            <div className="compare-picker">
              <label>
                Before
                <select
                  value={before}
                  onChange={(e) => setBefore(e.target.value)}
                >
                  {snapshots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.stats.scannedPath} / {time(s.createdAt)}
                    </option>
                  ))}
                </select>
              </label>
              <ArrowRight size={20} />
              <label>
                After
                <select
                  value={after}
                  onChange={(e) => setAfter(e.target.value)}
                >
                  {snapshots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.stats.scannedPath} / {time(s.createdAt)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {a && b && before === after ? (
              <p className="quiet-note">
                Choose two different snapshots to see changes.
              </p>
            ) : (
              a &&
              b &&
              diff && (
                <>
                  <div className="comparison-stats">
                    {[
                      {
                        label: "Code lines",
                        value: b.stats.codeLines - a.stats.codeLines,
                      },
                      {
                        label: "Files",
                        value: b.stats.totalFiles - a.stats.totalFiles,
                      },
                      {
                        label: "Comment lines",
                        value: b.stats.commentLines - a.stats.commentLines,
                      },
                    ].map((item) => (
                      <div key={item.label}>
                        <span>{item.label}</span>
                        <strong>
                          {item.value > 0 ? "+" : ""}
                          {number(item.value)}
                        </strong>
                        <small>vs selected before scan</small>
                      </div>
                    ))}
                  </div>
                  <div className="diff-columns">
                    {[
                      { title: "Added", files: diff.added },
                      { title: "Changed", files: diff.changed },
                      { title: "Removed", files: diff.removed },
                    ].map((group) => (
                      <div key={group.title}>
                        <h3>
                          {group.title}
                          <span>{group.files.length}</span>
                        </h3>
                        {group.files.length ? (
                          group.files.slice(0, 30).map((f) => (
                            <p key={f.relativePath} title={f.relativePath}>
                              {f.relativePath}
                            </p>
                          ))
                        ) : (
                          <p className="muted">No files</p>
                        )}
                        {group.files.length > 30 && (
                          <small>+ {group.files.length - 30} more</small>
                        )}
                      </div>
                    ))}
                  </div>
                  {a.stats.scannedPath !== b.stats.scannedPath && (
                    <p className="quiet-note">
                      Different projects: file changes are matched by relative
                      path.
                    </p>
                  )}
                </>
              )
            )}
          </>
        )}
      </Panel>
      <Panel
        title="Your scan history"
        detail="Snapshots contain paths, counts, content hashes and comment markers."
      >
        {snapshots.length ? (
          <div className="history-list">
            {snapshots.map((snapshot) => (
              <div className="history-row" key={snapshot.id}>
                <div className="history-symbol">
                  <History size={18} />
                </div>
                <div className="history-description">
                  <strong>
                    {snapshot.stats.scannedPath}
                    {snapshot.stats.source === "demo" && (
                      <span className="language-tag">Demo</span>
                    )}
                  </strong>
                  <span>
                    {time(snapshot.createdAt)} /{" "}
                    {number(snapshot.stats.totalFiles)} files /{" "}
                    {number(snapshot.stats.codeLines)} code lines
                  </span>
                </div>
                {remove === snapshot.id ? (
                  <div className="delete-confirm">
                    <span>Remove snapshot?</span>
                    <button
                      className="text-button danger-text"
                      onClick={() => {
                        onDelete(snapshot.id);
                        setRemove("");
                      }}
                    >
                      Remove
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setRemove("")}
                    >
                      Keep
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      className="text-button"
                      onClick={() => onRestore(snapshot)}
                    >
                      Open <ArrowUpRight size={15} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Remove snapshot of ${snapshot.stats.scannedPath}`}
                      onClick={() => setRemove(snapshot.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="Your first scan starts the story"
            description="Analyze a folder or try the demo to save a snapshot here."
          />
        )}
      </Panel>
    </>
  );
}
