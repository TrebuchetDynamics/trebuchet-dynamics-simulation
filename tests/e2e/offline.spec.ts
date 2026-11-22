import { expect, test } from '@playwright/test'

test('full simulator launches and repairs a design with external networking blocked', async ({ page }, testInfo) => {
  const errors: string[] = []
  const externalRequests: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  // The local server stands in for Capacitor's bundled-asset origin. No internet is available.
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin === 'http://127.0.0.1:4173') return route.continue()
    externalRequests.push(route.request().url())
    return route.abort('internetdisconnected')
  })
  await page.goto('/')
  expect(new URL(page.url()).search).toBe('')
  await expect(page.getByRole('checkbox', { name: 'Free play' })).toBeVisible()
  await expect(page.getByTestId('high-score')).toHaveText('0.0')
  await page.evaluate(() => document.fonts.ready)
  await page.locator('#longArmLength').fill('0.1')
  await expect(page.getByText('Repair the highlighted design fields to launch.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Launch', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Small', exact: true }).click()
  await page.getByRole('button', { name: 'Launch', exact: true }).click()
  await expect(page.getByText('Shot complete', { exact: true })).toBeVisible()
  expect(Number(await page.getByTestId('range').textContent())).toBeGreaterThan(0)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `.orbi/android-offline-${testInfo.project.name}.png`, fullPage: true })
  await page.reload()
  await expect(page.getByRole('checkbox', { name: 'Free play' })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  expect(errors).toEqual([])
  expect(externalRequests).toEqual([])
})
