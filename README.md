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

## Android

The committed `android/` project uses [Capacitor 8](https://capacitorjs.com/docs/android).
Install the Node.js/npm versions above, **JDK 21** (JDK 17 is not sufficient), and the
**Android SDK with Android 16 / API 36 and SDK Build-Tools**. Android Studio
Otter (2025.2.1) or newer can install the SDK through SDK Manager. Set `JAVA_HOME`
to JDK 21 and `ANDROID_HOME` to your SDK directory when building from a terminal.
Capacitor's Android module compiles with Java 21; see also the
[Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup).

```sh
npm ci
npm run android:sync         # builds dist/ and copies it into the Android project
cd android
./gradlew assembleDebug      # on Windows: gradlew.bat assembleDebug
```

The APK is `android/app/build/outputs/apk/debug/app-debug.apk` (from the repository
root). The first build needs internet to download npm/Gradle/Android dependencies;
the installed app does not. After web changes, rerun `npm run android:sync` from the
repository root before building again. To use Android Studio, run `npx cap open android`
from the root after syncing, then select a device/emulator and Run.

If Gradle reports **SDK location not found**, set `ANDROID_HOME` to the installed SDK
(or configure the SDK in Android Studio) and rerun `./gradlew assembleDebug`. For
**invalid source release: 21**, set `JAVA_HOME` / Android Studio's Gradle JDK to JDK 21.
Keep `local.properties`, build outputs and signing keys out of Git; no release signing
is configured.

The app id is `com.trebuchetdynamics.simulation`, named **Trebuchet Simulation**.
It loads bundled assets from `dist/`, with no remote server or `embed` parameter,
so it opens the full simulator, including local fonts, and permits either orientation.
Launcher icons and splash images use the resting-trebuchet image (`image3425`)
embedded in `public/trebuchet.svg`, centered on `#0a0a0f`; Android 12+ uses the
launcher icon on the same splash background. No extra Capacitor plugins are installed.

Manual device check (not covered by browser tests): install the debug APK, enable
airplane mode, cold-start the app and launch a shot. The full controls and shot
telemetry should work without a network connection.

## Layout

```
index.html        # Vite entry document, full-window <canvas id="scene">
src/main.ts       # mounts the three.js renderer, scene and camera on the canvas
public/           # static assets copied as-is (trebuchet.svg page icon)
vite.config.ts    # Vite + Vitest config (tests live in src/**/*.test.ts)
```

## License

MIT — see [LICENSE](LICENSE). Contact: `info@trebuchetdynamics.com`.
