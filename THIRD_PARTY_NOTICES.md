# Third-party notices

The MIT license in this repository applies to the project's own code. Dependencies remain covered by their upstream licenses. `package-lock.json` records the versions used by the build.

- **Inter** — Copyright 2020 The Inter Project Authors. Bundled through `@fontsource/inter` under the SIL Open Font License 1.1. The complete license is included in [`public/licenses/Inter-OFL.txt`](public/licenses/Inter-OFL.txt) and copied into the deployed app at `/licenses/Inter-OFL.txt`.
- **React / React DOM, fflate, ignore, jsPDF, and PrismJS** — MIT licensed. Consult each upstream package's license for full terms.
- **Lucide icons** — ISC licensed. See the installed `lucide-react` package license.
- **Unslop design guidance** — Damir Sokolovsky, [heydamir.design/unslop](https://heydamir.design/unslop), CC BY 4.0. Its principles informed interface polish; this attribution does not relicense application code.

The build collects the full installed production dependency licenses into [`public/licenses/THIRD-PARTY-LICENSES.txt`](public/licenses/THIRD-PARTY-LICENSES.txt) and copies them into the deployment. `scripts/generate-notices.mjs` regenerates this file from the lockfile. The application's MIT notice is also copied into deployed assets.

Development tools are listed separately in `package.json` and retain their respective licenses.
