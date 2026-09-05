// Run against a local Vite server with Playwright installed (or PLAYWRIGHT_MODULE set).
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
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    localStorage.setItem('wl_rest_seconds', '0')
    localStorage.setItem('wl_workout_data_v1', JSON.stringify({ version: 1, exercises: [], sessions: [
      { id: today, date: today, exercises: [
        { exerciseId: 'bench-press', sets: [{ weight: 80, reps: 10, done: true }] },
        { exerciseId: 'pullup', sets: [{ added_weight: 5, reps: 8, done: false }] },
      ] },
      { id: '2020-01-02', date: '2020-01-02', exercises: [
        { exerciseId: 'bench-press', sets: [{ weight: 60, reps: 12, done: false }] },
      ] },
    ] }))
  })
  const base = process.env.WORKOUT_URL || 'http://127.0.0.1:5174/Workout/'
  await page.goto(`${base}session`)
  const deletes = page.getByRole('button', { name: 'Delete exercise', exact: true })
  await deletes.first().waitFor()
  const today = await page.locator('input[type=date]').inputValue()
  const storedSessions = () => page.evaluate(() => JSON.parse(localStorage.getItem('wl_workout_data_v1')).sessions)
  const roundTrip = async () => {
    await page.getByRole('link', { name: 'History', exact: true }).click()
    await page.getByRole('heading', { name: 'Workout history' }).waitFor()
    await page.getByRole('link', { name: 'Workout', exact: true }).click()
    await page.getByRole('button', { name: '+ Add exercise', exact: true }).waitFor()
  }
  // Partial deletion survives immediate navigation.
  await deletes.first().click()
  await roundTrip()
  assert.equal(await deletes.count(), 1)
  assert.equal(await page.getByRole('group', { name: 'Bench Press', exact: true }).count(), 0)
  // Last exercise deletion must remove the stored date, not leave stale data.
  await deletes.click()
  await roundTrip()
  assert.equal(await deletes.count(), 0)
  await page.waitForTimeout(800)
  assert(!(await storedSessions()).some(s => s.id === today))
  await page.reload()
  await page.getByText('Tap below to add an exercise.').waitFor()
  assert.equal(await deletes.count(), 0)
  // Switching to a populated date must not delete it while loading its state.
  await page.locator('input[type=date]').fill('2020-01-02')
  await deletes.waitFor()
  await deletes.click()
  await page.waitForTimeout(800)
  assert(!(await storedSessions()).some(s => s.id === '2020-01-02'))
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await deletes.waitFor()
  await page.waitForTimeout(800)
  const restored = (await storedSessions()).find(s => s.id === '2020-01-02')
  assert.deepEqual(restored.exercises[0].sets, [{ weight: 60, reps: 12, done: false }])
  // Empty-date navigation cannot copy or erase another day's workout.
  await page.locator('input[type=date]').fill('2020-01-01')
  await page.getByText('Tap below to add an exercise.').waitFor()
  await page.locator('input[type=date]').fill('2020-01-02')
  await deletes.waitFor()
  await roundTrip()
  await page.locator('input[type=date]').fill('2020-01-02')
  await deletes.waitFor()
  assert.equal(await deletes.count(), 1)
  assert.deepEqual(errors, [])
  console.log('PASS: partial/last deletion, immediate tab navigation, persisted reload, past dates and Undo')
} finally {
  await browser.close()
}
