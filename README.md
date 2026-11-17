# Trebuchet Dynamics Simulation

A browser-based trebuchet dynamics simulator: a TypeScript application rendered with three.js and
bundled by Vite. This repository currently contains the scaffold — an empty three.js scene on a
full-window canvas — and the later issues add the physics, the trebuchet model and the controls.

The earlier Godot 4 / GDScript 2D prototype was removed from this branch; that 2D version is still
available in Git history at commit `088c2e958f4231d5ef4b398c3e479c72f9b529d5`.

## Requirements

- Node.js `^22.12.0`, `^24.0.0` or `>=26.0.0` (supported by both Vite and Vitest)
- npm (the committed `package-lock.json` is what `npm ci` installs)

## Commands

```
npm ci               # install dependencies from package-lock.json
npm run dev          # Vite dev server with hot reload at http://localhost:5173/
npm run typecheck    # tsc --noEmit (strict TypeScript)
npm test             # vitest run over src/**/*.test.ts
npm run build        # production bundle into dist/
npm run preview      # serve the built dist/ bundle locally
```

Opening the dev server in a browser shows the empty three.js canvas; `npm run build` writes
`dist/index.html` plus hashed assets that can be served by any static file host.

## Deployment

Deployments use [Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).
After `npm ci`, the owner completes this one-time setup:

1. Run `npx wrangler login` and authorize the Cloudflare account in the browser.
2. Run `npx wrangler pages project create`. When prompted, name the project
   `trebuchet-simulator` and set its production branch to `main`.
3. In the Cloudflare dashboard, open **Workers & Pages > trebuchet-simulator > Custom domains**
   and add `simulator.trebuchetdynamics.com`. Complete the DNS instructions and wait for activation.
   See [Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).

Then build and upload to the production project with one command:

```sh
npm run deploy
```

This runs `npm run build` and uploads `dist/` using the locally installed Wrangler.
Keep credentials out of the repository; login, project creation, DNS setup and deployment are owner actions.

Vite uses `base: './'` so the same build has relative asset URLs for the Android app.
`public/_headers` is copied to `dist/_headers`; Pages applies its security headers to all paths
and immutable caching to `/assets/*`. The CSP allows framing by this site and
`https://trebuchetdynamics.com` / `https://www.trebuchetdynamics.com` without `X-Frame-Options`.
Vite's local preview does not apply Pages headers.

After the first deployment, check the live headers:

```sh
curl -sI https://simulator.trebuchetdynamics.com
```

Expect `Content-Security-Policy: frame-ancestors 'self' https://trebuchetdynamics.com https://www.trebuchetdynamics.com`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and no `X-Frame-Options`.
Confirm the simulator loads in an iframe on the landing page. If the custom hostname returns
Cloudflare error **522**, ensure it has been added to the project's **Custom domains** and complete
its DNS validation; a CNAME alone without the Pages association is insufficient.

## Layout

```
index.html        # Vite entry document, full-window <canvas id="scene">
src/main.ts       # mounts the three.js renderer, scene and camera on the canvas
public/           # static assets copied as-is (trebuchet.svg page icon)
vite.config.ts    # Vite + Vitest config (tests live in src/**/*.test.ts)
```

## License

MIT — see [LICENSE](LICENSE). Contact: `info@trebuchetdynamics.com`.
