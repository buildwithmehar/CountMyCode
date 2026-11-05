import ignore from "ignore";
import { DEFAULT_IGNORE } from "./constants";
export { DEFAULT_IGNORE };
export interface IgnoreRule {
  raw: string;
}
export function parseIgnoreFile(content: string): string[] {
  return content
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.startsWith("#"));
}
export function createIgnoreRules(patterns: string[]): IgnoreRule[] {
  return patterns.map((raw) => ({ raw }));
}
export interface IgnoreMatcher {
  shouldIgnore(
    name: string,
    relativePath: string,
    isDirectory: boolean,
  ): boolean;
}
export function createIgnoreMatcher(rules: IgnoreRule[]): IgnoreMatcher {
  const defaults = ignore().add(DEFAULT_IGNORE),
    custom = ignore().add(rules.map((rule) => rule.raw));
  return {
    shouldIgnore(_name, path, isDirectory) {
      const normalized =
        path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, "") +
        (isDirectory ? "/" : "");
      if (
        !normalized ||
        normalized.startsWith("/") ||
        normalized.split("/").includes("..")
      )
        return true;
      return defaults.ignores(normalized) || custom.ignores(normalized);
    },
  };
}
