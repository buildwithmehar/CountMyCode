import type { AppSettings } from "./types";

function boundedInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, Math.floor(value)))
    : fallback;
}

export function normalizeSettings(value: unknown): AppSettings {
  const input =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    workerCount: boundedInteger(input.workerCount, 0, 0, 8),
    maxFileSizeKB: boundedInteger(input.maxFileSizeKB, 10240, 100, 51200),
    customIgnore: Array.isArray(input.customIgnore)
      ? input.customIgnore
          .filter((pattern): pattern is string => typeof pattern === "string")
          .map((pattern) => pattern.trim())
          .filter((pattern) => pattern && !pattern.startsWith("#"))
      : [],
  };
}
