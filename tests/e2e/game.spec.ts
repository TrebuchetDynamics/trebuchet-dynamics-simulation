import { expect, test, type Page } from '@playwright/test'

const browserErrors = new WeakMap<Page, string[]>()
const key = 'trebuchet-sim:v1'

test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('request', request => {
    if (!request.url().startsWith('http://127.0.0.1:4173/')) errors.push(`External request: ${request.url()}`)
  })
  browserErrors.set(page, errors)
})

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page)).toEqual([])
})

test('embed is the compact showcase with a working full-page link', async ({ page }, testInfo) => {
  await page.goto('/?embed=1&example=yes')
  await expect(page.locator('details')).toHaveCount(0)
  await expect(page.getByText('High score', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('checkbox', { name: 'Free play' })).toHaveCount(0)
  await expect(page.getByText('Target: 100 m', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Launch', exact: true })).toBeEnabled()
  for (const name of ['Wind speed', 'Counterweight mass']) await expect(page.getByLabel(name, { exact: true })).toBeVisible()
  const link = page.getByRole('link', { name: 'Open the full simulator' })
  await expect(link).toHaveAttribute('target', '_blank')
  const popupPromise = page.waitForEvent('popup')
  await link.click()
  const popup = await popupPromise
  await expect(popup.getByRole('checkbox', { name: 'Free play' })).toBeVisible()
  expect(new URL(popup.url()).searchParams.has('embed')).toBe(false)
  expect(new URL(popup.url()).searchParams.get('example')).toBe('yes')
  await popup.close()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `.orbi/embed-${testInfo.project.name}.png`, fullPage: true })
})

test('real launches score, replay does not, next target and free play work, and best/design survive reload', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await expect(page.getByTestId('high-score')).toHaveText('0.0')
  await page.getByRole('button', { name: 'Small', exact: true }).click()
  await page.getByRole('button', { name: 'Launch', exact: true }).click()
  await expect(page.locator('#challenge-result')).toContainText('Miss:')
  await expect(page.locator('#challenge-result')).toContainText('short')
  await expect(page.getByTestId('attempts')).toHaveText('1')
  await expect(page.getByTestId('score')).toHaveText('0.0')

  // Aim using the real prediction controls, not a mocked ShotResult.
  async function aimAt(distance: number) {
    let low = 100, high = 10000
    for (let i = 0; i < 14; i++) {
      const mass = Math.round((low + high) / 2)
      await page.locator('#counterweightMass').fill(String(mass))
      const range = Number(await page.getByTestId('predictedRange').textContent())
      if (range < distance) low = mass
      else high = mass
    }
    expect(Number(await page.getByTestId('predictedRange').textContent())).toBeCloseTo(distance, 0)
  }
  await page.getByRole('button', { name: 'Medium', exact: true }).click()
  await aimAt(100)
  await page.getByRole('button', { name: 'Launch', exact: true }).click()
  await expect(page.locator('#challenge-result')).toContainText('Hit!')
  await expect(page.getByTestId('attempts')).toHaveText('2')
  const best = await page.getByTestId('high-score').textContent()
  expect(Number(best)).toBeGreaterThan(130)
  await expect(page.getByRole('button', { name: 'Launch', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Slow-motion replay' }).click()
  await expect(page.getByText('Shot in progress…', { exact: true })).toBeVisible()
  // 100 m flight plus mechanism playback at quarter speed takes over 30 s.
  await expect(page.getByText('Shot complete', { exact: true })).toBeVisible({ timeout: 60_000 })
  await expect(page.getByTestId('attempts')).toHaveText('2')
  await expect(page.getByTestId('high-score')).toHaveText(best!)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `.orbi/challenge-hit-${testInfo.project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: 'Next target', exact: true }).click()
  await expect(page.locator('#target-label')).toContainText('120 m')
  await expect(page.getByTestId('attempts')).toHaveText('0')
  for (const distance of [120, 140]) {
    await aimAt(distance)
    await page.getByRole('button', { name: 'Launch', exact: true }).click()
    await expect(page.locator('#challenge-result')).toContainText('Hit!')
    await page.getByRole('button', { name: 'Next target', exact: true }).click()
  }
  await expect(page.locator('#target-label')).toContainText('160 m')
  await expect(page.getByText('Wind is set for this target.')).toBeVisible()
  await expect(page.locator('#windSpeed')).toHaveValue('5')
  await expect(page.locator('#windDirectionDeg')).toHaveValue('270')
  await expect(page.locator('#windSpeed')).toBeDisabled()
  const cumulativeBest = await page.getByTestId('high-score').textContent()
  expect(Number(cumulativeBest)).toBeGreaterThan(Number(best) + 200)
  await page.getByRole('checkbox', { name: 'Free play' }).check()
  await expect(page.locator('#challenge-progress')).toBeHidden()
  await expect(page.locator('#windSpeed')).toBeEnabled()
  await page.getByRole('button', { name: 'Small', exact: true }).click()
  await page.getByRole('button', { name: 'Launch', exact: true }).click()
  await expect(page.getByText('Shot complete', { exact: true })).toBeVisible()
  await expect(page.getByTestId('high-score')).toHaveText(cumulativeBest!)
  await page.getByRole('checkbox', { name: 'Free play' }).uncheck()
  await expect(page.getByTestId('attempts')).toHaveText('0')
  await expect(page.locator('#target-label')).toContainText('160 m')
  await expect(page.locator('#windSpeed')).toBeDisabled()
  // An actual slider edit, rather than a preset's intentionally unquantized value.
  await page.locator('#counterweightMass').fill('800')
  const mass = await page.locator('#counterweightMass').inputValue()
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  expect(stored.highScore).toBeGreaterThan(130)
  expect(stored.design.counterweightMass).toBe(Number(mass))
  await page.reload()
  await expect(page.getByTestId('high-score')).toHaveText(cumulativeBest!)
  await expect(page.locator('#counterweightMass')).toHaveValue(mass)
})

test('blocked storage does not prevent playing or repairing a design', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage denied', 'SecurityError') } }))
  await page.goto('/?embed=0')
  await expect(page.getByTestId('high-score')).toHaveText('0.0')
  await page.locator('#longArmLength').fill('0.1')
  await expect(page.getByText('Repair the highlighted design fields to launch.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Launch', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Small', exact: true }).click()
  await page.getByRole('button', { name: 'Launch', exact: true }).click()
  await expect(page.locator('#challenge-result')).toContainText('Miss:')
  await expect(page.getByTestId('attempts')).toHaveText('1')
})
