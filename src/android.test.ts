import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import config from '../capacitor.config'
import pkg from '../package.json'

const androidFile = (path: string) => readFileSync(new URL(`../android/${path}`, import.meta.url), 'utf8')

it('bundles dist locally under the Android app identity without a remote server', () => {
  expect(config).toEqual({
    appId: 'com.trebuchetdynamics.simulation',
    appName: 'Trebuchet Simulation',
    webDir: 'dist',
  })
  expect(pkg.scripts['android:sync']).toBe('npm run build && npx cap sync android')
  const gradle = androidFile('app/build.gradle')
  expect(gradle).toContain('applicationId "com.trebuchetdynamics.simulation"')
  expect(gradle).toContain('namespace = "com.trebuchetdynamics.simulation"')
})

it('keeps only the default INTERNET permission and allows rotation', () => {
  const manifest = androidFile('app/src/main/AndroidManifest.xml')
  expect([...manifest.matchAll(/<uses-permission android:name="([^"]+)"/g)].map(match => match[1]))
    .toEqual(['android.permission.INTERNET'])
  expect(manifest).not.toContain('screenOrientation')
  expect(androidFile('app/src/main/java/com/trebuchetdynamics/simulation/MainActivity.java'))
    .toContain('extends BridgeActivity')
})

it('uses the dark background for the launcher and native splash', () => {
  expect(androidFile('app/src/main/res/values/ic_launcher_background.xml')).toContain('#0a0a0f')
  const styles = androidFile('app/src/main/res/values/styles.xml')
  expect(styles).toContain('<item name="windowSplashScreenBackground">@color/ic_launcher_background</item>')
  expect(styles).toContain('<item name="windowSplashScreenAnimatedIcon">@mipmap/ic_launcher</item>')
})
