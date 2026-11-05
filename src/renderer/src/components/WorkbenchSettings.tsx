import { useState } from "react";
import {
  Save,
  Check,
  Sun,
  Moon,
  Monitor,
  Download,
  FileJson,
  FileSpreadsheet,
  ShieldCheck,
} from "lucide-react";
import type { AppSettings, RepositoryStats } from "@shared/types";
import { DEFAULT_IGNORE } from "@shared/constants";
import { bytes, number, time } from "../lib/presentation";
import { PageTitle, Panel } from "./WorkbenchOverview";
export function WorkbenchSettings({
  settings,
  onSave,
  theme,
  onTheme,
}: {
  settings: AppSettings;
  onSave: (s: AppSettings) => Promise<void>;
  theme: string;
  onTheme: (theme: string) => void;
}) {
  const [workers, setWorkers] = useState(settings.workerCount),
    [max, setMax] = useState(settings.maxFileSizeKB),
    [ignore, setIgnore] = useState(settings.customIgnore.join("\n")),
    [saved, setSaved] = useState(false),
    [error, setError] = useState("");
  async function save() {
    try {
      setError("");
      await onSave({
        workerCount: Math.max(0, Math.min(8, workers || 0)),
        maxFileSizeKB: Math.max(100, Math.min(51200, max || 10240)),
        customIgnore: ignore
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s && !s.startsWith("#")),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError(
        "Settings could not be saved. Browser storage may be unavailable.",
      );
    }
  }
  return (
    <>
      <PageTitle
        title="Make yourself at home."
        description="A few preferences for the way you work."
      />
      <div className="settings-layout">
        <Panel title="Appearance" detail="Choose a comfortable workspace.">
          <div className="theme-choices">
            {[
              { id: "light", title: "Light", icon: Sun },
              { id: "dark", title: "Dark", icon: Moon },
              { id: "system", title: "System", icon: Monitor },
            ].map(({ id, title, icon: Icon }) => (
              <button
                key={id}
                className={theme === id ? "selected" : ""}
                onClick={() => onTheme(id)}
              >
                <Icon size={21} />
                <span>{title}</span>
                {theme === id && <Check size={14} />}
              </button>
            ))}
          </div>
        </Panel>
        <Panel
          title="Analysis engine"
          detail="Changes apply on your next scan."
        >
          <div className="setting-row">
            <div>
              <label htmlFor="workers">Parallel workers</label>
              <p>0 chooses automatically, up to 8 workers.</p>
            </div>
            <input
              id="workers"
              type="number"
              min={0}
              max={8}
              value={workers}
              onChange={(e) => setWorkers(Number(e.target.value))}
            />
          </div>
          <div className="setting-row">
            <div>
              <label htmlFor="max-size">Maximum file size (KB)</label>
              <p>Larger files keep byte totals but skip line counting.</p>
            </div>
            <input
              id="max-size"
              type="number"
              min={100}
              max={51200}
              value={max}
              onChange={(e) => setMax(Number(e.target.value))}
            />
          </div>
        </Panel>
        <Panel
          title="Leave a few things out"
          detail="One custom ignore pattern per line. Supports globs and negation."
        >
          <label className="sr-only" htmlFor="ignore">
            Custom ignore patterns
          </label>
          <textarea
            id="ignore"
            rows={6}
            value={ignore}
            onChange={(e) => setIgnore(e.target.value)}
            placeholder={"*.log\ntemp/\n*.generated.ts"}
          />
          <p className="quiet-note">
            Root .gitignore and .omnicountignore files are also read. Default
            exclusions stay active.
          </p>
          <details className="default-exclusions">
            <summary>View default exclusions</summary>
            <div>
              {DEFAULT_IGNORE.map((item) => (
                <span className="language-tag" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </details>
        </Panel>
        {error && (
          <div className="inline-error" role="alert">
            {error}
          </div>
        )}
        <div className="settings-save">
          <button className="button primary" onClick={save}>
            {saved ? <Check size={16} /> : <Save size={16} />}{" "}
            {saved ? "Preferences saved" : "Save preferences"}
          </button>
        </div>
      </div>
    </>
  );
}
export function WorkbenchReports({
  stats,
  onExport,
}: {
  stats: RepositoryStats;
  onExport: (format: "pdf" | "csv" | "json") => void;
}) {
  return (
    <>
      <PageTitle
        title="Take the numbers with you."
        description="Useful formats, ready for your next conversation."
      />
      <div className="report-options">
        {[
          {
            format: "pdf",
            title: "The full picture",
            description:
              "A readable summary with language charts and the largest files.",
            label: "Download PDF",
            icon: Download,
          },
          {
            format: "csv",
            title: "Every file, in a row",
            description:
              "Detailed file statistics for spreadsheets and custom analysis.",
            label: "Download CSV",
            icon: FileSpreadsheet,
          },
          {
            format: "json",
            title: "All the raw details",
            description:
              "A complete metadata snapshot for your own tools and workflows.",
            label: "Download JSON",
            icon: FileJson,
          },
        ].map(({ format, title, description, label, icon: Icon }) => (
          <section className="report-option" key={format}>
            <Icon size={25} />
            <h2>{title}</h2>
            <p>{description}</p>
            <button
              className="button secondary"
              onClick={() => onExport(format as "pdf" | "csv" | "json")}
            >
              {label}
              <Download size={15} />
            </button>
          </section>
        ))}
      </div>
      <Panel title="Inside this report" detail={stats.scannedPath}>
        <dl className="report-summary">
          <div>
            <dt>Analyzed</dt>
            <dd>{time(stats.scannedAt ?? Date.now())}</dd>
          </div>
          <div>
            <dt>Files</dt>
            <dd>{number(stats.totalFiles)}</dd>
          </div>
          <div>
            <dt>Code lines</dt>
            <dd>{number(stats.codeLines)}</dd>
          </div>
          <div>
            <dt>Total size</dt>
            <dd>{bytes(stats.files.reduce((s, f) => s + f.size, 0))}</dd>
          </div>
          <div>
            <dt>Languages</dt>
            <dd>{stats.languageDistribution.length}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{stats.source ?? "Local folder"}</dd>
          </div>
        </dl>
      </Panel>
      <p className="report-privacy">
        <ShieldCheck size={16} /> Reports are generated on your device. No
        upload is needed.
      </p>
    </>
  );
}
