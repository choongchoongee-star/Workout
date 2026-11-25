import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge' })
const base = process.env.WORKOUT_URL || 'http://127.0.0.1:5176/Workout/'
try {
  const page = await browser.newPage({ locale: 'en-US' })
  for (const origin of ['session', 'history', 'settings']) {
    await page.goto(new URL(origin, base).href)
    await page.getByRole('link', { name: 'Progress', exact: true }).click()
    const search = page.getByPlaceholder('Search exercises...')
    await search.fill('Bench')
    const chest = page.getByRole('button', { name: 'Chest', exact: true })
    await chest.click()
    const bench = page.getByRole('button', { name: 'Bench Press Chest', exact: true })
    await bench.click()
    await page.getByLabel('Equipment for Bench Press').selectOption('dumbbell')
    await page.goBack()
    assert.equal(await search.inputValue(), 'Bench')
    assert.equal(await chest.getAttribute('aria-pressed'), 'true')
    await bench.click()
    await page.getByLabel('Choose another exercise').click()
    await bench.waitFor()
    await page.goBack()
    await page.waitForURL(new URL(origin, base).href)
  }
  console.log('Verified exercise detail back navigation from all three tabs.')
} finally {
  await browser.close()
}
