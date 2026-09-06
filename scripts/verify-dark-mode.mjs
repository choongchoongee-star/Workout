import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    if (localStorage.getItem('wl_workout_data_v1')) return
    localStorage.setItem('wl_workout_data_v1', JSON.stringify({ version: 1, exercises: [], sessions: [
      { id: '2020-01-02', date: '2020-01-02', exercises: [
        { exerciseId: 'dumbbell-fly', sets: [{ weight: 15, reps: 10, done: false }] },
        { exerciseId: 'pec-deck-fly', sets: [{ weight: 45, reps: 10, done: true }] },
        { exerciseId: 'one-arm-row', sets: [{ weight: 20, reps: 10, done: false }] },
      ] },
    ] }))
  })
  const base = process.env.WORKOUT_URL || 'http://127.0.0.1:5174/Workout/'
  await page.goto(`${base}settings`)
  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark')
  assert.equal(await page.locator('html').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(27, 38, 44)')
  await page.reload()
  await page.getByRole('heading', { name: 'Settings', exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Dark', exact: true }).getAttribute('aria-pressed'), 'true')
  await page.getByRole('link', { name: 'Workout', exact: true }).click()
  await page.getByLabel('Workout date').fill('2020-01-02')
  const flies = page.getByRole('group', { name: 'Fly', exact: true })
  await flies.first().waitFor()
  assert.equal(await flies.count(), 2)
  assert.equal(await flies.nth(0).getByLabel('Equipment for Fly').inputValue(), 'dumbbell')
  assert.equal(await flies.nth(1).getByLabel('Equipment for Fly').inputValue(), 'machine')
  assert.equal(await page.getByLabel('Equipment for One-arm Row').inputValue(), 'dumbbell')
  // Changing a populated card preserves it and adds a new equipment card.
  await flies.nth(0).getByLabel('Equipment for Fly').selectOption('cable')
  assert.equal(await flies.count(), 3)
  assert.equal(await flies.nth(0).getByLabel('Equipment for Fly').inputValue(), 'dumbbell')
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('main').evaluate(el => el.scrollTo(0, 0))
  if (process.env.DARK_SCREENSHOT) await page.screenshot({ path: process.env.DARK_SCREENSHOT })
  await page.getByRole('button', { name: '+ Add exercise', exact: true }).click()
  await page.getByPlaceholder('Search exercises...').fill('Fly')
  assert.equal(await page.getByRole('dialog').getByText('Fly', { exact: true }).count(), 1)
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  for (const tab of ['History', 'Progress', 'Settings']) {
    await page.getByRole('link', { name: tab, exact: true }).click()
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark')
  }
  await page.getByRole('button', { name: 'Light', exact: true }).click()
  assert.equal(await page.locator('html').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(247, 234, 224)')
  await page.reload()
  await page.getByRole('heading', { name: 'Settings', exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Light', exact: true }).getAttribute('aria-pressed'), 'true')
  assert.deepEqual(errors, [])
  console.log('PASS: theme persistence/tab navigation, both palettes, historical names/equipment, duplicate preservation, one search result and four widths')
} finally { await browser.close() }
