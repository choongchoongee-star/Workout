import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { DEFAULT_EXERCISES } from '../src/data/exercises.js'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  for (const locale of ['ko-KR', 'en-US']) {
    const ko = locale === 'ko-KR'
    const context = await browser.newContext({ locale, viewport: { width: 320, height: 568 } })
    const page = await context.newPage()
    const fixture = { version: 1, exercises: [...DEFAULT_EXERCISES, { id: 'custom-confirm', name: 'Confirmation test', category: 'Chest', type: 'weight' }], sessions: [{ id: '2026-01-01', date: '2026-01-01', exercises: [{ exerciseId: 'custom-confirm', sets: [{ weight: 20, reps: 8, done: true }] }] }] }
    await page.addInitScript(data => { if (!localStorage.getItem('wl_workout_data_v1')) localStorage.setItem('wl_workout_data_v1', JSON.stringify(data)) }, fixture)
    await page.goto(process.env.WORKOUT_URL || 'http://127.0.0.1:5176/Workout/library')
    const remove = page.getByRole('button', { name: ko ? 'Confirmation test 삭제' : 'Delete Confirmation test', exact: true })
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('wl_workout_data_v1')))
    await remove.click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor()
    assert.equal(await page.evaluate(() => document.activeElement.textContent), ko ? '아니오' : 'No')
    assert.deepEqual(await saved(), fixture)
    await dialog.getByRole('button', { name: ko ? '아니오' : 'No', exact: true }).click()
    assert.equal(await dialog.count(), 0)
    assert.deepEqual(await saved(), fixture)
    await remove.click()
    await page.keyboard.press('Escape')
    assert.equal(await dialog.count(), 0)
    assert.deepEqual(await saved(), fixture)
    await remove.click()
    await dialog.getByRole('button', { name: ko ? '예' : 'Yes', exact: true }).click()
    await page.waitForFunction(() => !JSON.parse(localStorage.getItem('wl_workout_data_v1')).exercises.some(e => e.id === 'custom-confirm'))
    assert.deepEqual((await saved()).sessions, fixture.sessions)
    await page.reload()
    assert.equal(await remove.count(), 0)
    await context.close()
  }
  console.log('Exercise deletion confirmation: Korean/English, cancel, Escape, confirm and persistence passed.')
} finally { await browser.close() }
