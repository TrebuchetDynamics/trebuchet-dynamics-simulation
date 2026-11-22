import { expect, test } from '@playwright/test'

const mainFields = ['counterweightMass', 'projectileMass', 'longArmLength', 'shortArmLength', 'slingLength', 'pinAngleDeg']

test('design, prediction, launch, telemetry and repair work without browser errors', async ({ page }, testInfo) => {
  const errors: string[] = []
  const externalRequests: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => {
    if (!request.url().startsWith('http://127.0.0.1:4173/')) externalRequests.push(request.url())
  })
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  await expect(page.getByRole('heading', { name: 'Trebuchet Dynamics', exact: true })).toBeVisible()
  const canvas = page.getByLabel('3D trebuchet simulation. Drag to orbit; pinch or scroll to zoom.')
  await expect(canvas).toBeVisible()
  await expect(page.locator('details')).not.toHaveAttribute('open')

  const canvasBox = (await canvas.boundingBox())!
  const panelBox = (await page.getByRole('region', { name: 'Design controls' }).boundingBox())!
  if (testInfo.project.name === 'desktop') expect(panelBox.x).toBeGreaterThan(canvasBox.x + canvasBox.width - 1)
  else expect(panelBox.y).toBeGreaterThanOrEqual(canvasBox.y + canvasBox.height)

  await page.getByRole('button', { name: 'Small', exact: true }).click()
  const predicted = Number(await page.getByTestId('predictedRange').textContent())
  expect(predicted).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Launch', exact: true }).click()
  if (testInfo.project.name === 'phone') await expect(canvas).toBeInViewport()
  await expect(page.getByText('Shot complete', { exact: true })).toBeVisible()
  if (testInfo.project.name === 'phone') await expect(page.getByRole('heading', { name: 'Telemetry', exact: true })).toBeInViewport()
  const actual = Number(await page.getByTestId('range').textContent())
  expect(Number.isFinite(actual)).toBe(true)
  expect(actual).toBeGreaterThan(0)
  expect(actual).toBe(predicted)
  for (const metric of ['releaseSpeed', 'releaseAngleDeg', 'lateralDrift', 'flightTime', 'maxHeight', 'counterweightIn', 'projectileOut', 'axleLoss', 'troughLoss', 'remaining', 'efficiency']) {
    expect(Number.isFinite(Number(await page.getByTestId(metric).textContent())), metric).toBe(true)
  }
  await expect(page.locator('.energy-bar > span')).toHaveCount(4)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `.orbi/${testInfo.project.name}-shot.png`, fullPage: true })
  await page.getByRole('button', { name: 'Slow-motion replay' }).click()
  await expect(page.getByText('Shot in progress…', { exact: true })).toBeVisible()
  await expect(page.getByText('Shot complete', { exact: true })).toBeVisible()

  // Changing design cancels stale measured values, reports the field, and is repairable.
  await page.getByRole('button', { name: 'Medium', exact: true }).click()
  await page.locator('#longArmLength').fill('0.1')
  await expect(page.locator('#longArmLength')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('The arm must reach the ground and the counterweight must clear it.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Launch', exact: true })).toBeDisabled()
  await expect(page.getByTestId('range')).toHaveText('—')
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `.orbi/${testInfo.project.name}-invalid.png`, fullPage: true })
  await page.getByRole('button', { name: 'Medium', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Launch', exact: true })).toBeEnabled()
  await expect(page.locator('#longArmLength')).toHaveAttribute('aria-invalid', 'false')

  for (const field of mainFields) {
    for (const endpoint of ['min', 'max']) {
      await page.getByRole('button', { name: 'Medium', exact: true }).click()
      const input = page.locator(`#${field}`)
      await input.fill((await input.getAttribute(endpoint))!)
    }
  }
  await page.getByRole('button', { name: 'Small', exact: true }).click()
  await page.locator('#windSpeed').fill('10')
  await page.locator('#windDirectionDeg').fill('90')
  expect(Number(await page.getByTestId('predictedRange').textContent())).not.toBe(predicted)
  await page.getByText('Advanced', { exact: true }).click()
  await expect(page.getByLabel('Air density', { exact: true })).toBeVisible()
  const airDensity = page.getByLabel('Air density', { exact: true })
  const densityBefore = Number(await airDensity.inputValue())
  await airDensity.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(airDensity).toBeFocused()
  expect(Number(await airDensity.inputValue())).toBeLessThan(densityBefore)

  if (testInfo.project.name === 'desktop') {
    await page.setViewportSize({ width: 1024, height: 800 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(1000)
    const narrowCanvas = (await canvas.boundingBox())!
    const narrowPanel = (await page.getByRole('region', { name: 'Design controls' }).boundingBox())!
    expect(narrowPanel.x).toBeGreaterThanOrEqual(narrowCanvas.x + narrowCanvas.width)
    await page.screenshot({ path: '.orbi/desktop-1024.png', fullPage: true })
  }
  await page.setViewportSize({ width: 320, height: 844 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(1000)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await page.screenshot({ path: `.orbi/${testInfo.project.name}-320.png`, fullPage: true })
  expect(errors).toEqual([])
  expect(externalRequests).toEqual([])
})
