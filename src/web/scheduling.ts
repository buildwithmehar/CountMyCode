export function createAnalysisBatches<T extends { size: number }>(
  files: T[],
  maxFiles = 24,
  maxBytes = 2 * 1024 * 1024,
): T[][] {
  const sorted = [...files].sort((a, b) => b.size - a.size),
    batches: T[][] = [];
  let batch: T[] = [],
    bytes = 0;
  for (const file of sorted) {
    if (
      batch.length &&
      (batch.length >= maxFiles || bytes + file.size > maxBytes)
    ) {
      batches.push(batch);
      batch = [];
      bytes = 0;
    }
    batch.push(file);
    bytes += file.size;
  }
  if (batch.length) batches.push(batch);
  return batches;
}
export function chooseWorkerCount(
  files: { size: number }[],
  hardwareConcurrency: number,
) {
  const cores = Math.max(1, Math.min(8, (hardwareConcurrency || 4) - 1));
  if (
    files.length <= 32 &&
    files.reduce((total, file) => total + file.size, 0) < 512 * 1024
  )
    return 1;
  return Math.max(1, Math.min(cores, files.length));
}
