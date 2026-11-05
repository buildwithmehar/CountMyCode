export interface LanguageConfig {
  name: string;
  extensions: string[];
  lineComment?: string;
  lineComments?: string[];
  blockComment?: [string, string];
}

export const LANGUAGES: LanguageConfig[] = [
  {
    name: "JavaScript",
    extensions: [".js", ".jsx", ".mjs", ".cjs"],
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  {
    name: "TypeScript",
    extensions: [".ts", ".tsx", ".mts", ".cts"],
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  {
    name: "Python",
    extensions: [".py", ".pyw", ".pyi"],
    lineComment: "#",
    blockComment: ['"""', '"""'],
  },
  {
    name: "Java",
    extensions: [".java"],
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  {
    name: "C",
    extensions: [".c", ".h"],
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  {
    name: "C++",
    extensions: [".cpp", ".cc", ".cxx", ".hpp", ".hh", ".hxx"],
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  {
    name: "C#",
    extensions: [".cs"],
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  {
    name: "Go",
    extensions: [".go"],
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  {
    name: "Rust",
    extensions: [".rs"],
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  { name: "Ruby", extensions: [".rb", ".erb"], lineComment: "#" },
  {
    name: "PHP",
    extensions: [".php"],
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  {
    name: "Swift",
    extensions: [".swift"],
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  {
    name: "Kotlin",
    extensions: [".kt", ".kts"],
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  {
    name: "Scala",
    extensions: [".scala", ".sc"],
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  {
    name: "HTML",
    extensions: [".html", ".htm", ".xhtml"],
    blockComment: ["<!--", "-->"],
  },
  {
    name: "XML",
    extensions: [".xml", ".svg", ".xsl", ".xsd"],
    blockComment: ["<!--", "-->"],
  },
  { name: "CSS", extensions: [".css"], blockComment: ["/*", "*/"] },
  {
    name: "SCSS",
    extensions: [".scss", ".sass"],
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  {
    name: "Less",
    extensions: [".less"],
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  { name: "JSON", extensions: [".json", ".jsonc"] },
  { name: "YAML", extensions: [".yml", ".yaml"], lineComment: "#" },
  { name: "TOML", extensions: [".toml"], lineComment: "#" },
  { name: "Markdown", extensions: [".md", ".markdown", ".mdx"] },
  {
    name: "Shell",
    extensions: [".sh", ".bash", ".zsh", ".fish"],
    lineComment: "#",
  },
  {
    name: "PowerShell",
    extensions: [".ps1", ".psm1"],
    lineComment: "#",
    blockComment: ["<#", "#>"],
  },
  {
    name: "SQL",
    extensions: [".sql"],
    lineComment: "--",
    blockComment: ["/*", "*/"],
  },
  {
    name: "Lua",
    extensions: [".lua"],
    lineComment: "--",
    blockComment: ["--[[", "]]"],
  },
  {
    name: "Vue",
    extensions: [".vue"],
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  {
    name: "Svelte",
    extensions: [".svelte"],
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  {
    name: "Dart",
    extensions: [".dart"],
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  { name: "Elixir", extensions: [".ex", ".exs"], lineComment: "#" },
  {
    name: "Haskell",
    extensions: [".hs"],
    lineComment: "--",
    blockComment: ["{-", "-}"],
  },
  { name: "R", extensions: [".r", ".R"], lineComment: "#" },
  { name: "Perl", extensions: [".pl", ".pm"], lineComment: "#" },
  {
    name: "Objective-C",
    extensions: [".m", ".mm"],
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  { name: "GraphQL", extensions: [".graphql", ".gql"], lineComment: "#" },
  {
    name: "Solidity",
    extensions: [".sol"],
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  {
    name: "Zig",
    extensions: [".zig"],
    lineComment: "//",
    blockComment: ["/*", "*/"],
  },
  { name: "Nim", extensions: [".nim"], lineComment: "#" },
  {
    name: "Clojure",
    extensions: [".clj", ".cljs", ".cljc", ".edn"],
    lineComment: ";",
  },
  { name: "Erlang", extensions: [".erl", ".hrl"], lineComment: "%" },
  {
    name: "F#",
    extensions: [".fs", ".fsx"],
    lineComment: "//",
    blockComment: ["(*", "*)"],
  },
  { name: "Dockerfile", extensions: [".dockerfile", "dockerfile"] },
  { name: "Makefile", extensions: [".mk", ".make", "makefile"] },
  {
    name: "INI",
    extensions: [".ini", ".cfg", ".conf", ".properties"],
    lineComment: "#",
    lineComments: [";"],
  },
  { name: "Batch", extensions: [".bat", ".cmd"], lineComment: "REM" },
  { name: "Assembly", extensions: [".asm", ".s"], lineComment: ";" },
  { name: "Vim", extensions: [".vim"], lineComment: '"' },
  { name: "Text", extensions: [".txt"] },
  { name: "CSV", extensions: [".csv", ".tsv"] },
];

const extensionMap = new Map<string, LanguageConfig>();

for (const lang of LANGUAGES) {
  for (const ext of lang.extensions) {
    extensionMap.set(ext.toLowerCase(), lang);
  }
}

export function getLanguageByExtension(
  ext: string,
): LanguageConfig | undefined {
  return extensionMap.get(ext.toLowerCase());
}

export function getLanguageByFilename(
  filename: string,
): LanguageConfig | undefined {
  const lower = filename.toLowerCase();
  if (lower === "dockerfile") return extensionMap.get("dockerfile");
  if (lower === "makefile" || lower === "gnumakefile")
    return extensionMap.get("makefile");
  const ext = lower.substring(lower.lastIndexOf("."));
  return extensionMap.get(ext);
}
