/// <reference types="vite/client" />
import { expect, it } from 'vitest'
import config from '../vite.config'
import headers from '../public/_headers?raw'
import packageJson from '../package.json?raw'

it('allows the landing-page origins to frame Pages without X-Frame-Options', () => {
  const [allPaths, assets] = headers.trim().split(/\n\s*\n/)

  expect(allPaths).toMatch(/^\/\*\n/)
  expect(allPaths).toContain("  Content-Security-Policy: frame-ancestors 'self' https://trebuchetdynamics.com https://www.trebuchetdynamics.com")
  expect(allPaths).toContain('  X-Content-Type-Options: nosniff')
  expect(allPaths).toContain('  Referrer-Policy: strict-origin-when-cross-origin')
  expect(headers).not.toMatch(/X-Frame-Options/i)
  expect(assets).toBe('/assets/*\n  Cache-Control: public, max-age=31536000, immutable')
})

it('uses relative asset URLs for portable builds', () => {
  expect(config.base).toBe('./')
})

it('builds before uploading to the production Pages project using local Wrangler', () => {
  const pkg = JSON.parse(packageJson)
  expect(pkg.scripts.deploy).toBe('npm run build && wrangler pages deploy dist --project-name trebuchet-simulator --branch main')
  expect(pkg.devDependencies.wrangler).toEqual(expect.any(String))
})
