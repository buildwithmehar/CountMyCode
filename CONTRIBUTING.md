# Contributing

Use Node.js 24 and npm. Install with `npm ci`, then start the app with `npm run dev`.

Before opening a pull request, run:

```sh
npm run format
npm run check
npm audit
```

Keep parsing and report logic in `src/shared`, file access and worker orchestration in `src/web`, and the interface in `src/renderer/src`. Add a focused regression test for behavior changes. Keep demo fixtures small and deliberate.

Local folder and ZIP analysis must continue to work without sending source code to a server. Do not add telemetry or upload behavior without a clear product decision and updated privacy documentation.

Describe the concrete problem, the resulting behavior, and how you verified it. Contributions are distributed under the repository's MIT license; third-party assets retain their own licenses.
