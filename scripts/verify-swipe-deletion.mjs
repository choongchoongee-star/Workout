// Synthetic browser regression; never opens the user's browser profile or records.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    if (localStorage.getItem('wl_workout_data_v1')) return
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    localStorage.setItem('wl_rest_seconds', '0')
    localStorage.setItem('wl_workout_data_v1', JSON.stringify({ version: 1, exercises: [], sessions: [
      { id: today, date: today, exercises: [{ exerciseId: 'bench-press', equipment: 'barbell', sets:
        Array.from({ length: 5 }, (_, i) => ({ weight: 60 + i * 5, reps: 10, done: i === 4 })) }] },
      { id: '2020-01-02', date: '2020-01-02', exercises: [{ exerciseId: 'bench-press', sets: [{ weight: 40, reps: 8, done: true }] }] },
    ] }))
  })
  const base = process.env.WORKOUT_URL || 'http://127.0.0.1:5174/Workout/'
  await page.goto(`${base}session`)
  const rows = page.locator('.swipe-delete')
  await rows.first().waitFor()
  const today = await page.getByLabel('Workout date').inputValue()
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('wl_workout_data_v1')).sessions)
  const cdp = await page.context().newCDPSession(page)
  async function swipe(row, dx = -120, dy = 0, cancel = false) {
    await row.scrollIntoViewIfNeeded()
    const b = await row.boundingBox()
    const x = b.x + b.width * 0.7
    const y = b.y + b.height / 2
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / 8, y: y + dy * i / 8 }] })
    }
    await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(200)
  }
  const deleteButton = row => row.getByRole('button', { name: /^Delete / })
  assert.equal(await deleteButton(rows.first()).isVisible(), false)
  const original = (await stored()).find(s => s.id === today)
  await swipe(rows.first(), -24)
  assert.equal(await deleteButton(rows.first()).isVisible(), false, 'Short gesture stays closed')
  await swipe(rows.first())
  assert.equal(await deleteButton(rows.first()).isVisible(), true)
  assert.deepEqual((await stored()).find(s => s.id === today).exercises, original.exercises, 'Swipe cannot edit numbers or complete/delete sets')
  await swipe(rows.nth(1))
  assert.equal(await deleteButton(rows.first()).isVisible(), false, 'One row open at a time')
  await swipe(rows.nth(1), 120)
  assert.equal(await deleteButton(rows.nth(1)).isVisible(), false)
  await swipe(rows.first(), -120, 0, true)
  assert.equal(await deleteButton(rows.first()).isVisible(), false, 'Cancelled gesture resets')
  await swipe(rows.first(), 0, -70)
  assert.equal(await deleteButton(rows.first()).isVisible(), false, 'Vertical scrolling cannot reveal Delete')
  await swipe(rows.last())
  await deleteButton(rows.last()).click()
  assert.equal(await rows.count(), 4)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  assert.equal(await rows.count(), 5)
  await page.waitForTimeout(500)
  assert.deepEqual((await stored()).find(s => s.id === today).exercises, original.exercises)
  await swipe(rows.first())
  await deleteButton(rows.first()).click()
  await page.getByRole('link', { name: 'History', exact: true }).click()
  await page.getByRole('heading', { name: 'Workout history' }).waitFor()
  await page.getByRole('link', { name: 'Workout', exact: true }).click()
  await page.getByRole('heading', { name: 'Workout', exact: true }).waitFor()
  assert.equal(await rows.count(), 4)
  await page.waitForTimeout(800)
  await page.reload()
  await rows.first().waitFor()
  assert.equal(await rows.count(), 4)
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    await swipe(rows.first())
    if (width === 390 && process.env.SWIPE_SCREENSHOT) await page.screenshot({ path: process.env.SWIPE_SCREENSHOT })
    const b = await deleteButton(rows.first()).boundingBox()
    assert(b.width >= 44 && b.height >= 44)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.getByRole('heading', { name: 'Workout', exact: true }).click()
    const plus = rows.first().getByRole('button', { name: 'Increase kg by 2.5' })
    const target = await plus.boundingBox()
    assert(target.width >= 43.99 && target.height >= 43.99, JSON.stringify({ width, target }))
    await plus.click()
  }
  // Keyboard users can reveal the same action without a swipe.
  await rows.first().locator('[data-swipe-content]').focus()
  await page.keyboard.press('Delete')
  assert.equal(await deleteButton(rows.first()).isVisible(), true)
  await page.keyboard.press('Escape')
  assert.equal(await deleteButton(rows.first()).isVisible(), false)
  await page.getByRole('link', { name: 'History', exact: true }).click()
  await page.getByRole('heading', { name: 'Workout history' }).waitFor()
  await swipe(rows.first())
  assert.equal(new URL(page.url()).pathname, '/Workout/history', 'Swipe must not navigate to detail')
  await deleteButton(rows.first()).click()
  assert.equal(await rows.count(), 1)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  assert.equal(await rows.count(), 2)
  await swipe(rows.first())
  await deleteButton(rows.first()).click()
  await page.getByRole('link', { name: 'Workout', exact: true }).click()
  await page.getByRole('heading', { name: 'Workout', exact: true }).waitFor()
  await page.getByText('Tap below to add an exercise.').waitFor()
  await page.getByRole('link', { name: 'History', exact: true }).click()
  await page.waitForTimeout(800)
  await page.reload()
  await rows.first().waitFor()
  assert.equal(await rows.count(), 1)
  assert(!(await stored()).some(s => s.id === today))
  // Ordinary taps still open the remaining historical workout.
  await rows.first().getByRole('button', { name: /^Thu, January 2, 2020/ }).click()
  await page.getByRole('button', { name: 'Edit', exact: true }).waitFor()
  assert(new URL(page.url()).pathname.endsWith('/history/2020-01-02'))
  assert.deepEqual(errors, [])
  console.log('PASS: real touch swipe, short/cancel/vertical gestures, single open row, no accidental edits, completed set Undo, persistence, History deletion/navigation, keyboard and 4 widths')
} finally {
  await browser.close()
}
