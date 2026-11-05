import { useMemo, useState, useEffect, useRef, useDeferredValue } from "react";
import { Search, X, FileCode2, ArrowDown, Copy, Check } from "lucide-react";
import Prism from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-json";
import "prismjs/components/prism-python";
import "prismjs/components/prism-bash";
import type { FileAnalysis, RepositoryStats } from "@shared/types";
import { bytes, number } from "../lib/presentation";
import { PageTitle, Empty, FileTable } from "./WorkbenchOverview";
import { FileTree } from "./FileTree";
import { buildFileIndex } from "../lib/file-tree";

export function WorkbenchFiles({
  stats,
  onPreview,
}: {
  stats: RepositoryStats;
  onPreview: (file: FileAnalysis) => void;
}) {
  const [query, setQuery] = useState(""),
    [language, setLanguage] = useState("all"),
    [sort, setSort] = useState("lines"),
    [folder, setFolder] = useState(""),
    [selectedFile, setSelectedFile] = useState<string | null>(null),
    [limit, setLimit] = useState(100);
  const index = useMemo(() => buildFileIndex(stats.files), [stats.files]);
  const deferredQuery = useDeferredValue(query),
    term = deferredQuery.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      stats.files
        .filter(
          (f) =>
            f.relativePath.toLowerCase().includes(term) &&
            (language === "all" || f.language === language) &&
            (!folder || f.relativePath.startsWith(folder + "/")),
        )
        .sort((a, b) =>
          sort === "name"
            ? a.relativePath.localeCompare(b.relativePath)
            : sort === "size"
              ? b.size - a.size
              : b.codeLines - a.codeLines,
        ),
    [stats, term, language, sort, folder],
  );
  useEffect(() => setLimit(100), [query, language, sort, folder]);
  return (
    <>
      <PageTitle
        title="Find your way around."
        description="Search, filter and open a file for a closer look."
      />
      <div className="explorer-layout">
        <FileTree
          index={index}
          query={deferredQuery}
          selectedFolder={folder}
          selectedFile={selectedFile}
          onFolder={(path) => {
            setFolder(path);
            setSelectedFile(null);
          }}
          onFile={(file) => {
            setSelectedFile(file.relativePath);
            onPreview(file);
          }}
        />
        <section className="panel explorer-panel">
          <div className="file-toolbar">
            <label className="search-field">
              <Search size={16} />
              <input
                aria-label="Search files"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setFolder("");
                  setSelectedFile(null);
                }}
                placeholder="Search files"
              />
              {query && (
                <button
                  className="icon-button"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                >
                  <X size={14} />
                </button>
              )}
            </label>
            <select
              aria-label="Filter by language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="all">All languages</option>
              {stats.languageDistribution.map((l) => (
                <option key={l.language}>{l.language}</option>
              ))}
            </select>
            <select
              aria-label="Sort files"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="lines">Most code lines</option>
              <option value="size">Largest size</option>
              <option value="name">Name A to Z</option>
            </select>
          </div>
          {folder && (
            <div className="explorer-context">
              <span title={folder}>{folder}</span>
              <button
                className="text-button"
                onClick={() => {
                  setFolder("");
                  setSelectedFile(null);
                }}
              >
                Show all files
              </button>
            </div>
          )}
          {filtered.length ? (
            <FileTable
              files={filtered.slice(0, limit)}
              selectedPath={selectedFile}
              onPreview={(file) => {
                setSelectedFile(file.relativePath);
                onPreview(file);
              }}
            />
          ) : (
            <Empty
              title="No files match"
              description="Try a different filename, folder or language."
            />
          )}
          <div className="table-footer">
            <span>
              {number(Math.min(limit, filtered.length))} of{" "}
              {number(filtered.length)} files
            </span>
            {filtered.length > limit && (
              <button
                className="text-button"
                onClick={() => setLimit((x) => x + 100)}
              >
                Show 100 more <ArrowDown size={14} />
              </button>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

export function SourceDrawer({
  file,
  onClose,
}: {
  file: FileAnalysis;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    [text, setText] = useState<string | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [copied, setCopied] = useState(false),
    [closing, setClosing] = useState(false);
  const close = () => {
    setClosing(true);
    setTimeout(onClose, 140);
  };
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    let active = true;
    window.omni
      .readSource(file.relativePath)
      .then((content) => {
        if (active) {
          setText(content);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
      dialog?.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, [file]);
  const grammar = (
    {
      TypeScript: file.extension === ".tsx" ? "tsx" : "typescript",
      JavaScript: file.extension === ".jsx" ? "jsx" : "javascript",
      HTML: "markup",
      CSS: "css",
      JSON: "json",
      Python: "python",
      Shell: "bash",
    } as Record<string, string>
  )[file.language];
  const highlighted = useMemo(
    () =>
      text !== null
        ? Prism.highlight(
            text,
            Prism.languages[grammar] ?? Prism.languages.plaintext,
            grammar ?? "plaintext",
          )
        : "",
    [text, grammar],
  );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(
        "Clipboard access is unavailable. Select and copy the code instead.",
      );
    }
  };
  return (
    <dialog
      ref={ref}
      className={`source-drawer ${closing ? "closing" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="drawer-inner">
        <header>
          <div>
            <FileCode2 size={19} />
            <strong>{file.name}</strong>
            <span className="language-tag">{file.language}</span>
          </div>
          <button
            className="icon-button"
            aria-label="Close source preview"
            onClick={close}
          >
            <X size={20} />
          </button>
        </header>
        <div className="source-meta">
          <span title={file.relativePath}>{file.relativePath}</span>
          <span>
            {number(file.totalLines)} lines / {bytes(file.size)}
          </span>
          {text !== null && (
            <button className="text-button" onClick={copy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}{" "}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
        {loading ? (
          <div className="empty-message">Reading source…</div>
        ) : error ? (
          <div className="inline-error" role="alert">
            {error}
          </div>
        ) : text === null ? (
          <Empty
            title="Source is not stored in history"
            description="Open the original project again to preview this file. Scan snapshots retain statistics, not source code."
          />
        ) : file.status && file.status !== "analyzed" ? (
          <Empty
            title="Preview unavailable"
            description={`This file was skipped: ${file.status}.`}
          />
        ) : (
          <div className="code-view">
            <pre className="line-numbers" aria-hidden="true">
              {Array.from(
                {
                  length: text ? text.replace(/\n$/, "").split("\n").length : 0,
                },
                (_, i) => i + 1,
              ).join("\n")}
            </pre>
            <pre tabIndex={0} aria-label={`${file.relativePath} source`}>
              <code dangerouslySetInnerHTML={{ __html: highlighted }} />
            </pre>
          </div>
        )}
        <footer>
          <span>Read-only preview</span>
          <span>Files stay on your device</span>
        </footer>
      </div>
    </dialog>
  );
}
