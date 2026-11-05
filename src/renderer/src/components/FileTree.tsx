import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  Folder,
  FolderOpen,
  FolderTree,
  FileCode2,
  FileJson,
  FileText,
} from "lucide-react";
import {
  matchingTreeIds,
  visibleTreeRows,
  createTreeWindow,
  type FileIndex,
  type ExplorerNode,
} from "../lib/file-tree";
import type { FileAnalysis } from "@shared/types";
import { number } from "../lib/presentation";
import { FileTypeIcon } from "./FileTypeIcon";

const ROW_HEIGHT = 32;
export function FileTree({
  index,
  query,
  selectedFolder,
  selectedFile,
  onFolder,
  onFile,
}: {
  index: FileIndex;
  query: string;
  selectedFolder: string;
  selectedFile: string | null;
  onFolder: (path: string) => void;
  onFile: (file: FileAnalysis) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set()),
    [focused, setFocused] = useState(""),
    [scrollTop, setScrollTop] = useState(0),
    [height, setHeight] = useState(448),
    [hasFocus, setHasFocus] = useState(false),
    [open, setOpen] = useState(() => !matchMedia("(max-width:900px)").matches);
  const viewport = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<string | null>(null);
  const matching = useMemo(() => matchingTreeIds(index, query), [index, query]);
  const rows = useMemo(
    () => visibleTreeRows(index, expanded, matching),
    [index, expanded, matching],
  );
  const rowPositions = useMemo(
    () => new Map(rows.map((row, i) => [row.node.id, i])),
    [rows],
  );
  useEffect(() => {
    if (!selectedFile) return;
    const parents: string[] = [];
    let node = index.byId.get("file:" + selectedFile);
    while (node?.parentId) {
      parents.push(node.parentId);
      node = index.byId.get(node.parentId);
    }
    if (parents.length)
      setExpanded((previous) => new Set([...previous, ...parents]));
  }, [index, selectedFile]);
  useEffect(() => {
    if (!rowPositions.has(focused)) setFocused(rows[0]?.node.id ?? "");
  }, [rows, focused, rowPositions]);
  useEffect(() => {
    setScrollTop(0);
    if (viewport.current) viewport.current.scrollTop = 0;
  }, [matching]);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setHeight(element.clientHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, [open]);
  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 8),
    end = Math.min(rows.length, start + Math.ceil(height / ROW_HEIGHT) + 16);
  const treeWindow = createTreeWindow(
    rows,
    start,
    end,
    rowPositions.get(focused) ?? -1,
    hasFocus,
    {
      start: Math.floor(scrollTop / ROW_HEIGHT),
      end: Math.ceil((scrollTop + height) / ROW_HEIGHT),
    },
  );
  useLayoutEffect(() => {
    if (!pendingFocus.current) return;
    const element = viewport.current?.querySelector<HTMLButtonElement>(
      `[data-node-id="${CSS.escape(pendingFocus.current)}"]`,
    );
    if (element) {
      element.focus({ preventScroll: true });
      pendingFocus.current = null;
    }
  }, [focused, start, end, rows]);
  function toggle(id: string) {
    setExpanded((previous) => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function focusRow(id: string) {
    const position = rowPositions.get(id);
    if (position === undefined) return;
    pendingFocus.current = id;
    setFocused(id);
    const element = viewport.current;
    if (element) {
      const top = position * ROW_HEIGHT;
      if (top < element.scrollTop) element.scrollTop = top;
      else if (top + ROW_HEIGHT > element.scrollTop + element.clientHeight)
        element.scrollTop = top + ROW_HEIGHT - element.clientHeight;
      setScrollTop(element.scrollTop);
    }
  }
  function keyDown(event: React.KeyboardEvent, node: ExplorerNode) {
    const position = rowPositions.get(node.id);
    if (position === undefined) return;
    if (
      [
        "ArrowDown",
        "ArrowUp",
        "Home",
        "End",
        "ArrowRight",
        "ArrowLeft",
      ].includes(event.key)
    )
      event.preventDefault();
    if (event.key === "ArrowDown")
      focusRow(rows[Math.min(rows.length - 1, position + 1)].node.id);
    else if (event.key === "ArrowUp")
      focusRow(rows[Math.max(0, position - 1)].node.id);
    else if (event.key === "Home") focusRow(rows[0].node.id);
    else if (event.key === "End") focusRow(rows[rows.length - 1].node.id);
    else if (event.key === "ArrowRight" && node.kind === "folder") {
      if (!expanded.has(node.id))
        setExpanded((previous) => new Set([...previous, node.id]));
      else if (rows[position + 1]?.depth > rows[position].depth)
        focusRow(rows[position + 1].node.id);
    } else if (event.key === "ArrowLeft") {
      if (node.kind === "folder" && expanded.has(node.id)) toggle(node.id);
      else if (node.parentId) focusRow(node.parentId);
    }
  }
  return (
    <aside className="project-tree">
      <header>
        <button
          className="tree-panel-toggle"
          aria-expanded={open}
          aria-controls="project-file-tree"
          onClick={() => setOpen(!open)}
        >
          <FolderTree size={16} />
          <span>Project files</span>
          <ChevronDown size={14} className={open ? "" : "tree-panel-closed"} />
        </button>
        {open && (
          <div className="tree-actions">
            <button
              className="icon-button"
              title="Expand all folders"
              aria-label="Expand all folders"
              onClick={() => setExpanded(new Set(index.directoryIds))}
            >
              <ChevronsDown size={15} />
            </button>
            <button
              className="icon-button"
              title="Collapse all folders"
              aria-label="Collapse all folders"
              onClick={() => {
                setExpanded(new Set());
                setScrollTop(0);
                if (viewport.current) viewport.current.scrollTop = 0;
              }}
            >
              <ChevronsUp size={15} />
            </button>
          </div>
        )}
      </header>
      {open && (
        <>
          <button
            className={`tree-all-files ${!selectedFolder && !selectedFile ? "selected" : ""}`}
            onClick={() => onFolder("")}
          >
            <FolderTree size={15} />
            <span>All files</span>
            <span>{number(index.fileCount)}</span>
          </button>
          <div
            id="project-file-tree"
            className="file-tree-viewport"
            ref={viewport}
            role="tree"
            aria-label="Project folders and files"
            style={{
              height: Math.max(128, Math.min(14, rows.length) * ROW_HEIGHT),
            }}
            onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
            onFocusCapture={() => setHasFocus(true)}
            onBlurCapture={(event) => {
              if (
                !event.currentTarget.contains(
                  event.relatedTarget as Node | null,
                )
              )
                setHasFocus(false);
            }}
          >
            <div
              className="file-tree-rows"
              role="presentation"
              style={{ height: rows.length * ROW_HEIGHT }}
            >
              {treeWindow.items.map(
                ({ row: { node, depth, position, size }, index: rowIndex }) => {
                  const folder = node.kind === "folder",
                    isExpanded = !!matching || expanded.has(node.id),
                    selected = folder
                      ? selectedFolder === node.path && !selectedFile
                      : selectedFile === node.path;
                  const Icon = folder
                    ? isExpanded
                      ? FolderOpen
                      : Folder
                    : node.file?.extension === ".json"
                      ? FileJson
                      : /\.(md|txt|log)$/.test(node.name)
                        ? FileText
                        : FileCode2;
                  return (
                    <button
                      key={node.id}
                      role="treeitem"
                      data-node-id={node.id}
                      aria-expanded={folder ? isExpanded : undefined}
                      aria-selected={selected}
                      aria-level={depth + 1}
                      aria-posinset={position}
                      aria-setsize={size}
                      tabIndex={treeWindow.tabStopId === node.id ? 0 : -1}
                      title={node.path}
                      className={`file-tree-row ${selected ? "selected" : ""}`}
                      style={{
                        transform: `translateY(${rowIndex * ROW_HEIGHT}px)`,
                        paddingInlineStart: 8 + Math.min(depth, 5) * 16,
                      }}
                      onFocus={() => setFocused(node.id)}
                      onKeyDown={(event) => keyDown(event, node)}
                      onClick={() => {
                        setFocused(node.id);
                        if (folder) {
                          toggle(node.id);
                          onFolder(node.path);
                        } else onFile(node.file!);
                      }}
                    >
                      <span className="tree-chevron">
                        {folder ? (
                          isExpanded ? (
                            <ChevronDown size={13} />
                          ) : (
                            <ChevronRight size={13} />
                          )
                        ) : null}
                      </span>
                      {folder ? (
                        <Icon size={15} />
                      ) : (
                        <FileTypeIcon file={node.file!} size={15} />
                      )}
                      <span className="tree-node-name">{node.name}</span>
                      {folder && (
                        <span className="tree-node-count">
                          {number(node.count)}
                        </span>
                      )}
                    </button>
                  );
                },
              )}
              {!rows.length && (
                <p className="tree-no-matches">No matching files</p>
              )}
            </div>
          </div>
          <footer>
            {number(index.directoryIds.length)} folders /{" "}
            {number(index.fileCount)} files
          </footer>
        </>
      )}
    </aside>
  );
}
