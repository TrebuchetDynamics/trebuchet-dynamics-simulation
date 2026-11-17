# Trebuchet Dynamics Simulation

A browser-based trebuchet dynamics simulator: a TypeScript application rendered with three.js and
bundled by Vite. This repository currently contains the scaffold — an empty three.js scene on a
full-window canvas — and the later issues add the physics, the trebuchet model and the controls.

The earlier Godot 4 / GDScript 2D prototype was removed from this branch; that 2D version is still
available in Git history at commit `088c2e958f4231d5ef4b398c3e479c72f9b529d5`.

## Requirements

- Node.js `^20.19.0` or `>=22.12.0` (the range Vite 8 supports)
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

## Layout

```
index.html        # Vite entry document, full-window <canvas id="scene">
src/main.ts       # mounts the three.js renderer, scene and camera on the canvas
public/           # static assets copied as-is (trebuchet.svg page icon)
vite.config.ts    # Vite + Vitest config (tests live in src/**/*.test.ts)
```

## License

MIT — see [LICENSE](LICENSE). Contact: `info@trebuchetdynamics.com`.
