# Cloudflare deployment

CountMyCode is a client-side React/Vite application. Deploy the compiled `dist` directory over HTTPS. Do not upload `src`, `node_modules`, screenshots, or the entire repository as the site's public asset directory.

## Build and preview

```sh
npm ci
npm run check
npm run preview -- --host 127.0.0.1
```

Use Node.js 24. No application secrets or environment variables are required. Files and history remain in each visitor's browser.

## Cloudflare Pages with GitHub

1. Create a **Pages** project in Cloudflare and connect `buildwithmehar/CountMyCode`.
2. Select branch `main`, framework **React (Vite)**, build command **`npm run build`**, and output **`dist`**. Leave the root directory at the repository root.
3. Use Node.js **24**; if the dashboard needs an explicit version, set build variable `NODE_VERSION=24`.
4. Deploy, then open the generated HTTPS URL. Later pushes to `main` trigger Pages builds through the Git integration.

The repository includes `.node-version`. Pages provides a default single-page-app fallback when there is no top-level `404.html`, so direct visits and reloads at `/files`, `/analytics`, and `/history` reach the app. No catch-all redirect is needed.

Official references: [Vite build settings](https://developers.cloudflare.com/pages/configuration/build-configuration/) and [Pages SPA routing](https://developers.cloudflare.com/pages/configuration/serving-pages/).

## Cloudflare Workers Static Assets

Cloudflare recommends Workers Static Assets for new applications. It can serve the same compiled `dist` directory. Configure the static asset directory as `dist` and the missing-asset behavior as **single-page-application** so direct app routes return `index.html`. This application does not need a Worker backend or bindings.

Follow the current [Workers Static Assets guide](https://developers.cloudflare.com/workers/static-assets/get-started/) and [SPA routing documentation](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/) for your dashboard or CLI workflow. The Pages settings above are for Pages rather than a Worker build's deploy-command field.

## After deployment

- Open the home page and run **Explore demo project**.
- Check analytics and expand folders in the file explorer.
- Reload `/files` directly to verify SPA routing.
- Download a CSV/PDF and check a saved history entry.
- Open the URL on a small screen and check navigation.

Use HTTPS in production for secure browser APIs. Browsers without folder picker support can use ZIP import.
