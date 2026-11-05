import { useState, useEffect, useRef, useCallback } from "react";
import {
  Code2,
  LayoutDashboard,
  BarChart3,
  FolderTree,
  ScanSearch,
  History,
  FileText,
  Settings2,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Sun,
  Moon,
  Menu,
  X,
  ChevronRight,
  FolderOpen,
  RefreshCw,
  Download,
  Check,
  AlertCircle,
  Github,
  FileArchive,
} from "lucide-react";
import type {
  FileAnalysis,
  RepositoryStats,
  ScanProgress,
  AppSettings,
} from "@shared/types";
import { demoFiles, readZip, readGithub } from "../../web/sources";
import {
  loadHistory,
  saveSnapshot,
  deleteSnapshot,
  type Snapshot,
} from "./lib/history";
import { downloadPdf } from "./lib/pdf";
import { number } from "./lib/presentation";
import {
  WorkbenchOverview,
  WorkbenchAnalytics,
  Empty,
} from "./components/WorkbenchOverview";
import { WorkbenchWelcome } from "./components/WorkbenchWelcome";
import { WorkbenchFiles, SourceDrawer } from "./components/WorkbenchFiles";
import { WorkbenchInsights } from "./components/WorkbenchInsights";
import { WorkbenchHistory } from "./components/WorkbenchHistory";
import {
  WorkbenchSettings,
  WorkbenchReports,
} from "./components/WorkbenchSettings";

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "files", label: "File explorer", icon: FolderTree },
  { id: "insights", label: "Insights", icon: ScanSearch },
  { id: "history", label: "History & compare", icon: History },
  { id: "reports", label: "Reports", icon: FileText },
];
const validViews = [...NAV.map((n) => n.id), "settings", "privacy", "terms"];
function initialView() {
  const path = window.location.pathname.slice(1);
  return !path || path === "index.html"
    ? "overview"
    : validViews.includes(path)
      ? path
      : "404";
}
const defaults: AppSettings = {
  workerCount: 0,
  customIgnore: [],
  maxFileSizeKB: 10240,
};

export default function App() {
  const [view, setView] = useState(initialView),
    [stats, setStats] = useState<RepositoryStats | null>(null),
    [settings, setSettings] = useState(defaults),
    [history, setHistory] = useState<Snapshot[]>([]),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState<ScanProgress | null>(null),
    [importMessage, setImportMessage] = useState(""),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [mobile, setMobile] = useState(false),
    [dragging, setDragging] = useState(false),
    [preview, setPreview] = useState<FileAnalysis | null>(null),
    [github, setGithub] = useState(false),
    [historical, setHistorical] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("countmycode-theme") || "light";
    } catch {
      return "light";
    }
  });
  const zipInput = useRef<HTMLInputElement>(null),
    dragCount = useRef(0),
    generation = useRef(0),
    abort = useRef<AbortController | null>(null),
    toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const notify = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  }, []);
  const navigate = useCallback((next: string) => {
    setView(next);
    setMobile(false);
    window.history.pushState(null, "", next === "overview" ? "/" : `/${next}`);
    document.getElementById("workspace-scroll")?.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    const onPop = () => setView(initialView());
    window.addEventListener("popstate", onPop);
    window.omni
      .loadSettings()
      .then(setSettings)
      .catch(() => notify("Could not load saved preferences"));
    loadHistory()
      .then(setHistory)
      .catch(() => notify("History storage is unavailable in this browser"));
    const cleanup = window.omni.onScanProgress(setProgress);
    return () => {
      cleanup();
      window.removeEventListener("popstate", onPop);
      clearTimeout(toastTimer.current);
      window.omni.cancelScan();
      abort.current?.abort();
    };
  }, [notify]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
    };
    update();
    media.addEventListener("change", update);
    try {
      localStorage.setItem("countmycode-theme", theme);
    } catch {}
    return () => media.removeEventListener("change", update);
  }, [theme]);
  async function finishScan(name: string, id: number) {
    const result = await window.omni.startScan({
      path: name,
      customIgnore: settings.customIgnore,
      workerCount: settings.workerCount,
    });
    if (generation.current !== id) return;
    if (result) {
      setStats(result);
      setHistorical(false);
      navigate("overview");
      notify("Analysis complete. Your code is accounted for.");
      setBusy(false);
      try {
        const snapshot = await saveSnapshot(result);
        setHistory((previous) => [snapshot, ...previous].slice(0, 20));
      } catch (e) {
        notify(e instanceof Error ? e.message : "History could not be saved");
      }
    } else
      setError(
        "No result was saved. Check the scan message below and try again.",
      );
  }
  async function chooseFolder() {
    if (busy) return;
    setBusy(true);
    setError("");
    setProgress(null);
    setImportMessage("Choose a local project folder");
    const id = ++generation.current;
    try {
      const name = await window.omni.openDirectory();
      if (name && id === generation.current) {
        setImportMessage("");
        await finishScan(name, id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open folder");
    } finally {
      if (id === generation.current) {
        setBusy(false);
        setImportMessage("");
      }
    }
  }
  async function startSource(
    kind: "demo" | "zip" | "github",
    input?: File | string,
  ) {
    if (busy) return;
    setBusy(true);
    setMobile(false);
    setError("");
    setProgress(null);
    const id = ++generation.current;
    abort.current = new AbortController();
    try {
      let name = "",
        files;
      if (kind === "demo") {
        setImportMessage("Opening the example project");
        name = "studio-notes (demo)";
        files = demoFiles();
      } else if (kind === "zip") {
        setImportMessage("Opening ZIP archive");
        files = await readZip(input as File);
        name = (input as File).name.replace(/\.zip$/i, "");
      } else {
        const controller = abort.current;
        const result = await readGithub(
          input as string,
          controller.signal,
          (message) => {
            if (id === generation.current) setImportMessage(message);
          },
        );
        name = result.name;
        files = result.files;
      }
      if (id !== generation.current) return;
      window.omni.setSource(name, files, kind);
      setImportMessage("");
      await finishScan(name, id);
    } catch (e) {
      abort.current?.abort();
      if (id === generation.current)
        setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      if (id === generation.current) {
        setBusy(false);
        setImportMessage("");
      }
    }
  }
  async function rescan() {
    if (!stats || historical || busy) return;
    setBusy(true);
    setError("");
    setProgress(null);
    const id = ++generation.current;
    try {
      await finishScan(stats.scannedPath, id);
    } finally {
      if (id === generation.current) setBusy(false);
    }
  }
  function cancel() {
    generation.current++;
    abort.current?.abort();
    window.omni.cancelScan();
    setBusy(false);
    setImportMessage("");
    setProgress(null);
    notify("Scan cancelled");
  }
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      document.documentElement.dataset.input = "keyboard";
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "o") {
        event.preventDefault();
        if (!busy) void chooseFolder();
      }
      if (
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        event.key.toLowerCase() === "n" &&
        !(
          event.target instanceof HTMLElement &&
          event.target.closest("input,textarea,select,[contenteditable],dialog")
        ) &&
        !busy
      ) {
        fresh();
      }
      if (event.key === "Escape") setMobile(false);
    };
    const pointer = () => {
      document.documentElement.dataset.input = "pointer";
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("pointerdown", pointer);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("pointerdown", pointer);
    };
  }, [busy, settings]);
  async function dropped(event: React.DragEvent) {
    event.preventDefault();
    dragCount.current = 0;
    setDragging(false);
    if (busy) return;
    const file = event.dataTransfer.files[0];
    if (file?.name.toLowerCase().endsWith(".zip")) {
      await startSource("zip", file);
      return;
    }
    setBusy(true);
    setError("");
    setProgress(null);
    setImportMessage("Reading dropped folder");
    const id = ++generation.current;
    try {
      const name = await window.omni.openDroppedDataTransfer(
        event.dataTransfer,
      );
      if (name && id === generation.current) {
        setImportMessage("");
        await finishScan(name, id);
      } else if (id === generation.current)
        setError("Drop a folder or a ZIP archive to start.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not read dropped folder",
      );
    } finally {
      if (id === generation.current) {
        setBusy(false);
        setImportMessage("");
      }
    }
  }
  async function exportReport(format: "pdf" | "csv" | "json") {
    if (!stats) return;
    try {
      if (format === "pdf") await downloadPdf(stats);
      else await window.omni.exportReport(stats, format);
      notify(`${format.toUpperCase()} report downloaded`);
    } catch {
      notify("Could not create the report. Try another format.");
    }
  }
  function restore(snapshot: Snapshot) {
    window.omni.clearSource();
    setStats(snapshot.stats);
    setHistorical(true);
    setPreview(null);
    navigate("overview");
    notify("Snapshot opened. Reopen the folder for source previews.");
  }
  async function remove(id: string) {
    try {
      await deleteSnapshot(id);
      setHistory(await loadHistory());
      notify("Snapshot removed");
    } catch {
      notify("Could not remove this snapshot");
    }
  }
  async function saveSettings(next: AppSettings) {
    await window.omni.saveSettings(next);
    setSettings(next);
  }
  function fresh() {
    window.omni.clearSource();
    setStats(null);
    setHistorical(false);
    setError("");
    navigate("overview");
  }
  const title =
    NAV.find((n) => n.id === view)?.label ??
    (view === "settings"
      ? "Preferences"
      : view === "404"
        ? "Page not found"
        : view === "privacy"
          ? "Privacy"
          : "Terms");
  const ratio = progress?.totalFiles
    ? progress.analyzedFiles / progress.totalFiles
    : 0;
  return (
    <div
      className="app-shell"
      onDragEnter={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          dragCount.current++;
          setDragging(true);
        }
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        dragCount.current--;
        if (dragCount.current <= 0) setDragging(false);
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) e.preventDefault();
      }}
      onDrop={dropped}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {mobile && (
        <button
          className="mobile-shade"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        className={`app-sidebar ${mobile ? "mobile-open" : ""}`}
        aria-label="Main navigation"
      >
        <button className="brand" onClick={() => navigate("overview")}>
          <span className="brand-mark">
            <Code2 size={23} strokeWidth={2} />
          </span>
          <span>
            CountMyCode<small>Know what you’re building.</small>
          </span>
        </button>
        <button
          className="button primary new-scan"
          onClick={fresh}
          disabled={busy}
        >
          <Plus size={17} /> New analysis <kbd>N</kbd>
        </button>
        <div className="nav-caption">Workspace</div>
        <nav>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={`nav-link ${view === id ? "active" : ""}`}
              aria-current={view === id ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={1.7} />
              <span>{label}</span>
              {id === "history" && history.length > 0 && (
                <span className="nav-count">{history.length}</span>
              )}
              {id === "insights" &&
                !!stats?.files.some((f) => f.markers?.length) && (
                  <span className="nav-count">
                    {stats.files.reduce(
                      (s, f) => s + (f.markers?.length ?? 0),
                      0,
                    )}
                  </span>
                )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <ShieldCheck size={18} />
            <div>
              <strong>Your code stays yours.</strong>
              <p>
                Local analysis. No account.
                <br />
                No source uploads.
              </p>
            </div>
          </div>
          <button
            className={`nav-link ${view === "settings" ? "active" : ""}`}
            onClick={() => navigate("settings")}
          >
            <Settings2 size={18} />
            <span>Preferences</span>
          </button>
          <div className="sidebar-footer">
            <span>CountMyCode</span>
            <button
              className="icon-button"
              aria-label="Toggle light and dark theme"
              onClick={() =>
                setTheme(
                  document.documentElement.dataset.theme === "dark"
                    ? "light"
                    : "dark",
                )
              }
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              aria-expanded={mobile}
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{title}</strong>
          </div>
          <div className="topbar-right">
            {stats && (
              <span className="project-chip">
                <FolderOpen size={14} />
                <span>{stats.scannedPath}</span>
                {stats.source === "demo" && <small>Demo</small>}
                {historical && <small>Snapshot</small>}
              </span>
            )}
            <span className="local-badge">
              <ShieldCheck size={14} />
              <span>On your device</span>
            </span>
          </div>
        </header>
        <div className="workspace-scroll" id="workspace-scroll">
          <main className="workspace-content" id="main-content" tabIndex={-1}>
            {error && (
              <div className="inline-error" role="alert">
                <AlertCircle size={18} />
                <div>
                  <strong>
                    {progress?.phase === "error" ? progress.message : error}
                  </strong>
                  {progress?.phase === "error" && <p>{error}</p>}
                </div>
                <button
                  className="icon-button"
                  aria-label="Dismiss error"
                  onClick={() => {
                    setError("");
                    setProgress(null);
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {busy ? (
              <div className="scan-stage" role="status" aria-live="polite">
                <div className="scan-orbit">
                  <ScanSearch size={36} />
                </div>
                <h1>
                  {importMessage
                    ? "Getting things ready."
                    : "A little counting. A lot of clarity."}
                </h1>
                <p>
                  {importMessage || progress?.message || "Preparing analysis"}
                </p>
                <div
                  className="scan-progress"
                  role="progressbar"
                  aria-label="Analysis progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={
                    progress?.totalFiles ? Math.round(ratio * 100) : undefined
                  }
                >
                  <span
                    className={!progress?.totalFiles ? "indeterminate" : ""}
                    style={
                      progress?.totalFiles
                        ? { transform: `scaleX(${ratio})` }
                        : undefined
                    }
                  />
                </div>
                <div className="scan-numbers">
                  {progress?.totalFiles ? (
                    <>
                      <span>
                        {number(progress.analyzedFiles)} of{" "}
                        {number(progress.totalFiles)} files
                      </span>
                      <strong>{Math.round(ratio * 100)}%</strong>
                    </>
                  ) : (
                    <span>Working locally in your browser</span>
                  )}
                </div>
                <button className="button secondary" onClick={cancel}>
                  <X size={15} /> Cancel analysis
                </button>
              </div>
            ) : (
              <div className="view-content" key={view}>
                {stats &&
                  !["history", "settings", "privacy", "terms", "404"].includes(
                    view,
                  ) && (
                    <div className="project-toolbar">
                      <span>
                        <FolderOpen size={16} />
                        {stats.scannedPath}
                        {historical && (
                          <span className="language-tag">Saved snapshot</span>
                        )}
                      </span>
                      <div>
                        <button
                          className="text-button"
                          onClick={historical ? chooseFolder : rescan}
                        >
                          <RefreshCw size={15} />
                          {historical ? "Reopen project" : "Rescan"}
                        </button>
                        <button
                          className="text-button"
                          onClick={() => exportReport("pdf")}
                        >
                          <Download size={15} /> Export PDF
                        </button>
                      </div>
                    </div>
                  )}
                {view === "overview" &&
                  (stats ? (
                    <WorkbenchOverview
                      stats={stats}
                      onPreview={setPreview}
                      onNavigate={navigate}
                    />
                  ) : (
                    <WorkbenchWelcome
                      onFolder={chooseFolder}
                      onZip={() => zipInput.current?.click()}
                      onGithub={() => setGithub(true)}
                      onDemo={() => startSource("demo")}
                      onHistory={() => navigate("history")}
                      onRestore={restore}
                      snapshots={history}
                      dragging={dragging}
                    />
                  ))}
                {view === "analytics" &&
                  (stats ? (
                    <WorkbenchAnalytics stats={stats} />
                  ) : (
                    <NoProject
                      onFolder={chooseFolder}
                      onDemo={() => startSource("demo")}
                    />
                  ))}
                {view === "files" &&
                  (stats ? (
                    <WorkbenchFiles stats={stats} onPreview={setPreview} />
                  ) : (
                    <NoProject
                      onFolder={chooseFolder}
                      onDemo={() => startSource("demo")}
                    />
                  ))}
                {view === "insights" &&
                  (stats ? (
                    <WorkbenchInsights stats={stats} onPreview={setPreview} />
                  ) : (
                    <NoProject
                      onFolder={chooseFolder}
                      onDemo={() => startSource("demo")}
                    />
                  ))}
                {view === "history" && (
                  <WorkbenchHistory
                    snapshots={history}
                    onRestore={restore}
                    onDelete={remove}
                  />
                )}
                {view === "reports" &&
                  (stats ? (
                    <WorkbenchReports stats={stats} onExport={exportReport} />
                  ) : (
                    <NoProject
                      onFolder={chooseFolder}
                      onDemo={() => startSource("demo")}
                    />
                  ))}
                {view === "settings" && (
                  <WorkbenchSettings
                    settings={settings}
                    onSave={saveSettings}
                    theme={theme}
                    onTheme={setTheme}
                  />
                )}
                {(view === "privacy" || view === "terms") && (
                  <Legal view={view} onBack={() => navigate("overview")} />
                )}
                {view === "404" && (
                  <div className="no-project">
                    <Empty
                      title="This page doesn’t exist"
                      description="Your workspace is one click away."
                    />
                    <button
                      className="button primary"
                      onClick={() => navigate("overview")}
                    >
                      Back to workspace
                    </button>
                  </div>
                )}
              </div>
            )}
            <footer className="workspace-footer">
              <span>Made for the details.</span>
              <div>
                <button onClick={() => navigate("privacy")}>Privacy</button>
                <button onClick={() => navigate("terms")}>Terms</button>
                <span>© {new Date().getFullYear()} CountMyCode</span>
              </div>
            </footer>
          </main>
        </div>
      </div>
      <input
        ref={zipInput}
        type="file"
        accept=".zip,application/zip"
        className="sr-only"
        aria-label="Choose ZIP archive"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void startSource("zip", file);
        }}
      />
      {dragging && stats && !busy && (
        <div className="global-drop">
          <UploadIndicator />
        </div>
      )}
      {preview && (
        <SourceDrawer
          key={preview.relativePath}
          file={preview}
          onClose={() => setPreview(null)}
        />
      )}
      {github && (
        <GithubDialog
          onClose={() => setGithub(false)}
          onImport={(url) => {
            setGithub(false);
            void startSource("github", url);
          }}
        />
      )}
      <div
        className={`toast ${toast ? "visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast && (
          <>
            <Check size={17} />
            <span>{toast}</span>
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setToast("")}
            >
              <X size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
function NoProject({
  onFolder,
  onDemo,
}: {
  onFolder: () => void;
  onDemo: () => void;
}) {
  return (
    <div className="no-project">
      <Empty
        title="First, a project to explore."
        description="Choose a local folder or take a look around with the example project."
      />
      <div>
        <button className="button primary" onClick={onFolder}>
          <FolderOpen size={16} />
          Choose a folder
        </button>
        <button className="button secondary" onClick={onDemo}>
          Explore demo <ArrowUpRight size={15} />
        </button>
      </div>
    </div>
  );
}
function UploadIndicator() {
  return (
    <div>
      <FileArchive size={34} />
      <h2>Drop a project folder or ZIP</h2>
      <p>We’ll take a closer look.</p>
    </div>
  );
}
function GithubDialog({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (url: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    [url, setUrl] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);
  return (
    <dialog
      className="import-dialog"
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const parsed = new URL(url);
            if (
              parsed.hostname !== "github.com" ||
              parsed.pathname.split("/").filter(Boolean).length !== 2
            )
              throw new Error();
            onImport(url);
          } catch {
            setError("Enter a URL such as https://github.com/owner/repository");
          }
        }}
      >
        <div className="dialog-heading">
          <Github size={25} />
          <button
            type="button"
            className="icon-button"
            aria-label="Close GitHub import"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <h2>Bring a public repository.</h2>
        <p>
          Fetch from GitHub, then analyze on this device. Up to 1,500 files and
          50 MB.
        </p>
        <label htmlFor="github-url">Repository URL</label>
        <input
          id="github-url"
          type="url"
          required
          placeholder="https://github.com/owner/repository"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        {error && (
          <p className="danger-text" role="alert">
            {error}
          </p>
        )}
        <button className="button primary" type="submit">
          Import repository <ArrowUpRight size={16} />
        </button>
        <small>Public repositories only. No token or account needed.</small>
      </form>
    </dialog>
  );
}
function Legal({ view, onBack }: { view: string; onBack: () => void }) {
  return (
    <article className="legal-page">
      <button className="text-button" onClick={onBack}>
        Back to workspace
      </button>
      <h1>
        {view === "privacy" ? "Privacy, in plain language." : "Terms of use."}
      </h1>
      {view === "privacy" ? (
        <>
          <h2>Your files stay local</h2>
          <p>
            Local folders and ZIP files are read and analyzed in your browser.
            Their source content is held in memory, not uploaded to a server.
          </p>
          <h2>What this browser remembers</h2>
          <p>
            Preferences and theme are saved in local storage. Up to 20 scan
            snapshots are saved in IndexedDB. Snapshots include project names,
            relative file paths, counts, SHA-256 hashes and comment-marker
            snippets. Source file content is not persisted. Remove snapshots
            from History.
          </p>
          <h2>Optional GitHub import</h2>
          <p>
            When you explicitly import a public repository, the browser contacts
            api.github.com and raw.githubusercontent.com to download its files.
            Local source files are never sent in these requests. No analytics or
            tracking service is used.
          </p>
          <h2>Exports</h2>
          <p>
            PDF, CSV and JSON reports are generated on your device. Review their
            contents before sharing them.
          </p>
        </>
      ) : (
        <>
          <h2>Using CountMyCode</h2>
          <p>
            CountMyCode is a browser-based repository statistics tool. You are
            responsible for selecting files you have permission to analyze and
            for handling any reports you share.
          </p>
          <h2>Statistics and limitations</h2>
          <p>
            Line classification is heuristic and may not fully parse embedded
            languages or complex syntax. Comment percentages are not measures of
            test coverage or code quality. Content hashes are used to identify
            identical files.
          </p>
          <h2>Provided as-is</h2>
          <p>
            The tool is provided without warranties of accuracy, availability or
            fitness for a particular purpose. Browser storage may be cleared by
            you or by your browser; export any results you need to keep.
          </p>
          <h2>Third-party services</h2>
          <p>
            Optional GitHub import depends on GitHub availability and rate
            limits. Local folder and ZIP analysis do not depend on that service.
          </p>
        </>
      )}
    </article>
  );
}
