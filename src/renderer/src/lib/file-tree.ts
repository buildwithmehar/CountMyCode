import type { FileAnalysis } from "@shared/types";
export interface ExplorerNode {
  id: string;
  name: string;
  path: string;
  parentId: string;
  kind: "folder" | "file";
  count: number;
  children: ExplorerNode[];
  file?: FileAnalysis;
  searchText: string;
}
export interface FileIndex {
  roots: ExplorerNode[];
  byId: Map<string, ExplorerNode>;
  directoryIds: string[];
  fileCount: number;
}
export interface TreeRow {
  node: ExplorerNode;
  depth: number;
  position: number;
  size: number;
}
export function createTreeWindow(
  rows: TreeRow[],
  start: number,
  end: number,
  focusedIndex: number,
  hasFocus: boolean,
  viewport = { start, end },
) {
  const items = rows
    .slice(start, end)
    .map((row, i) => ({ row, index: start + i }));
  const focusedRow = rows[focusedIndex],
    focusedVisible =
      focusedIndex >= viewport.start && focusedIndex < viewport.end,
    focusedMounted = focusedIndex >= start && focusedIndex < end;
  if (hasFocus && focusedRow && !focusedMounted) {
    items.push({ row: focusedRow, index: focusedIndex });
    items.sort((a, b) => a.index - b.index);
  }
  const tabStopId =
    focusedRow && (hasFocus || focusedVisible)
      ? focusedRow.node.id
      : (rows[Math.max(start, viewport.start)]?.node.id ?? "");
  return { items, tabStopId };
}
const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});
export function buildFileIndex(files: FileAnalysis[]): FileIndex {
  const roots: ExplorerNode[] = [],
    byId = new Map<string, ExplorerNode>(),
    directoryIds: string[] = [];
  for (const file of files) {
    const parts = file.relativePath.split("/");
    let children = roots,
      parentId = "";
    for (let i = 0; i < parts.length - 1; i++) {
      const path = parts.slice(0, i + 1).join("/"),
        id = "dir:" + path;
      let node = byId.get(id);
      if (!node) {
        node = {
          id,
          name: parts[i],
          path,
          parentId,
          kind: "folder",
          count: 0,
          children: [],
          searchText: path.toLowerCase(),
        };
        children.push(node);
        byId.set(id, node);
        directoryIds.push(id);
      }
      node.count++;
      children = node.children;
      parentId = id;
    }
    const node: ExplorerNode = {
      id: "file:" + file.relativePath,
      name: file.name,
      path: file.relativePath,
      parentId,
      kind: "file",
      count: 1,
      children: [],
      file,
      searchText: file.relativePath.toLowerCase(),
    };
    children.push(node);
    byId.set(node.id, node);
  }
  const sort = (nodes: ExplorerNode[]) => {
    nodes.sort((a, b) =>
      a.kind !== b.kind
        ? a.kind === "folder"
          ? -1
          : 1
        : collator.compare(a.name, b.name),
    );
    for (const node of nodes) if (node.kind === "folder") sort(node.children);
  };
  sort(roots);
  return { roots, byId, directoryIds, fileCount: files.length };
}
export function matchingTreeIds(
  index: FileIndex,
  query: string,
): Set<string> | null {
  const term = query.trim().toLowerCase();
  if (!term) return null;
  const result = new Set<string>();
  for (const node of index.byId.values())
    if (node.searchText.includes(term)) {
      let current: ExplorerNode | undefined = node;
      while (current && !result.has(current.id)) {
        result.add(current.id);
        current = index.byId.get(current.parentId);
      }
    }
  return result;
}
export function visibleTreeRows(
  index: FileIndex,
  expanded: Set<string>,
  matching: Set<string> | null = null,
): TreeRow[] {
  const rows: TreeRow[] = [];
  const append = (nodes: ExplorerNode[], depth: number) => {
    const visible = matching
      ? nodes.filter((node) => matching.has(node.id))
      : nodes;
    visible.forEach((node, i) => {
      rows.push({ node, depth, position: i + 1, size: visible.length });
      if (node.kind === "folder" && (matching || expanded.has(node.id)))
        append(node.children, depth + 1);
    });
  };
  append(index.roots, 0);
  return rows;
}
