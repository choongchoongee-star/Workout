import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { DEFAULT_EXERCISES } from '../src/data/exercises.js'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.WORKOUT_URL || 'http://127.0.0.1:5176/Workout/'
const fixture = { version: 1, exercises: DEFAULT_EXERCISES, sessions: [3, 2, 1].map(day => ({
  id: `2020-01-0${day}`, date: `2020-01-0${day}`, duration_min: day * 10,
  exercises: [{ exerciseId: 'bench-press', equipment: 'barbell', sets: [{ weight: day * 20, reps: 10, done: true }] }],
})) }
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' })
try {
  for (const locale of ['ko-KR', 'en-US']) {
    const ko = locale === 'ko-KR'
    const text = (en, kr) => ko ? kr : en
    const context = await browser.newContext({ locale, viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    page.setDefaultTimeout(6000)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript(data => {
      if (!localStorage.getItem('wl_workout_data_v1')) localStorage.setItem('wl_workout_data_v1', JSON.stringify(data))
    }, fixture)
    const button = (en, kr) => page.getByRole('button', { name: text(en, kr), exact: true })
    const checkbox = date => page.getByRole('checkbox', { name: text(`Select workout on ${date}`, `${date} 기록 선택`), exact: true })
    const all = () => page.getByRole('checkbox', { name: text('Select all', '전체 선택'), exact: true })
    async function savedCount(count) {
      await page.waitForFunction(count => JSON.parse(localStorage.getItem('wl_workout_data_v1')).sessions.length === count, count)
    }
    await page.goto(base + 'history')
    await button('Edit history', '편집').click()
    assert(await button('Delete selected (0)', '선택 삭제 (0)').isDisabled())
    assert.equal(await page.getByRole('button', { name: text(/^Delete workout on/, /기록 삭제$/) }).count(), 3)
    await checkbox('2020-01-03').check()
    await checkbox('2020-01-01').check()
    assert(await all().evaluate(el => el.indeterminate))
    await button('Delete selected (2)', '선택 삭제 (2)').click()
    await savedCount(1)
    assert(await checkbox('2020-01-02').isVisible())
    await button('Undo', '되돌리기').click()
    await savedCount(3)
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('wl_workout_data_v1')).sessions), fixture.sessions)
    await all().check()
    assert(await checkbox('2020-01-03').isChecked())
    await all().uncheck()
    assert(await button('Delete selected (0)', '선택 삭제 (0)').isDisabled())
    await button('Delete workout on 2020-01-02', '2020-01-02 기록 삭제').click()
    await savedCount(2)
    await button('Undo', '되돌리기').click()
    await savedCount(3)
    for (const width of [320, 375, 390, 430]) {
      await page.setViewportSize({ width, height: 844 })
      assert(await page.locator('main').evaluate(el => el.scrollWidth <= el.clientWidth))
      const edit = await button('Done', '완료').boundingBox()
      const date = await page.getByLabel(text('History date', '기록 날짜')).boundingBox()
      assert(edit.x + edit.width <= date.x)
      assert(date.x + date.width <= width)
    }
    await all().check()
    await button('Done', '완료').click()
    await button('Edit history', '편집').click()
    assert(await button('Delete selected (0)', '선택 삭제 (0)').isDisabled())
    await all().check()
    await button('Delete selected (3)', '선택 삭제 (3)').click()
    await savedCount(0)
    assert(await page.getByText(text('No workouts yet.', '아직 운동 기록이 없습니다.'), { exact: true }).isVisible())
    await button('Undo', '되돌리기').click()
    await savedCount(3)
    await all().check()
    await button('Delete selected (3)', '선택 삭제 (3)').click()
    await savedCount(0)
    await page.reload()
    assert(await page.getByText(text('No workouts yet.', '아직 운동 기록이 없습니다.'), { exact: true }).isVisible())
    assert.deepEqual(errors, [])
    await context.close()
    console.log(`PASS ${locale}: selection, partial/all deletion, per-row deletion, full-data Undo, edit reset, 4 widths, persisted empty history`)
  }
} finally {
  await browser.close()
}
