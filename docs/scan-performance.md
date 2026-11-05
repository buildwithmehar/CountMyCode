# Scan performance and explorer update

Measured on the same machine with the deterministic `scripts/benchmark-scan.ts` workload before and after optimization:

| Workload                                          | Before | After |
| ------------------------------------------------- | -----: | ----: |
| 100,000-line parser, median of 5 runs             | 295 ms | 47 ms |
| One worker, 400-file first batch                  | 352 ms | 97 ms |
| One worker, unchanged 400-file batch, median of 3 |  56 ms | 29 ms |

These are Node File/Blob synthetic measurements of the actual parser/worker entry, not disk or complete browser throughput. Browser and disk speed depend on file sizes, storage and available CPU cores. Line totals and markers matched the original parser across 5,000 multilingual differential cases.

Changes:

- Jump between lexical delimiters instead of allocating per-character regex/callback work.
- Pipeline up to 4 file reads/hashes within each worker, bounded by an 8 MB source-buffer estimate per worker.
- Group large files into separate byte-bounded batches, with workers taking the next available batch.
- Avoid multi-worker startup for tiny projects; keep automatic parallelism for larger projects.
- Read up to 16 filesystem metadata entries concurrently, with cancellation checks.
- Drop traversal reads root ignore rules before visiting excluded subtrees, including dependencies/build outputs.
- Progress updates are limited to roughly one every 80 ms; phase changes and terminal results stay immediate.
- Show results before history I/O, update the history list in memory, and prune old snapshots using an IndexedDB key cursor rather than deserializing every saved scan.
- Build explorer counts in one pass, render only the visible tree window plus an active focused row, and use deferred global file search.
- Aggregate language line counts once and omit zero-value chart segments; use a fixed axis and contiguous bar segments. Small positive totals have a disclosed minimum visual width.

Run `npm benchmark`, `npm test`, `npm run typecheck`, and `npm run build` for verification.
