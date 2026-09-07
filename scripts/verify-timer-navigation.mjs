import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => {
    if (localStorage.getItem('wl_workout_data_v1')) return
    localStorage.setItem('wl_rest_seconds', '60')
    localStorage.setItem('wl_workout_data_v1', JSON.stringify({ version: 1, exercises: [], sessions: Array.from({ length: 20 }, (_, i) => {
      const date = `2020-01-${String(i + 1).padStart(2, '0')}`
      return { id: date, date, exercises: [{ exerciseId: 'bench-press', equipment: 'barbell', sets: Array.from({ length: 10 }, () => ({ weight: 40, reps: 10, done: false })) }] }
    }) }))
  })
  await page.goto(`${process.env.WORKOUT_URL || 'http://127.0.0.1:5174/Workout/'}session`)
  await page.getByLabel('Workout date').fill('2020-01-20')
  await page.getByRole('button', { name: 'Mark set as complete', exact: true }).first().click()
  const timer = page.getByRole('region', { name: 'Rest timer', exact: true })
  await timer.waitFor()
  for (const tab of ['History', 'Progress', 'Settings', 'Workout']) {
    await page.getByRole('link', { name: tab, exact: true }).click()
    assert(await timer.isVisible())
  }
  await page.waitForTimeout(1200)
  const text = await timer.innerText()
  assert(!text.includes('1:00'), 'Countdown must continue rather than restart on navigation')
  await timer.getByRole('button', { name: 'Skip' }).click()
  assert.equal(await timer.count(), 0)
  for (const tab of ['History', 'Workout']) {
    await page.getByRole('link', { name: tab, exact: true }).click()
    if (tab === 'Workout') await page.getByLabel('Workout date').fill('2020-01-20')
    await page.locator('.swipe-delete').first().waitFor()
    await page.locator('main').evaluate(el => el.scrollTo(0, 400))
    const nav = await page.locator('nav').boundingBox()
    for (const fraction of [0.2, 0.5, 0.8]) {
      assert(await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('nav'), { x: nav.width * fraction, y: nav.y + 24 }), 'Scrolled/swiped rows cannot cover navigation')
    }
  }
  await page.getByRole('link', { name: 'Progress', exact: true }).click()
  await page.getByPlaceholder('Search exercises...').fill('Dips')
  assert.equal(await page.getByRole('button', { name: 'Dips Chest', exact: true }).count(), 1)
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  const seconds = page.getByLabel('Rest timer seconds')
  await seconds.click()
  assert.equal(await seconds.inputValue(), '')
  await seconds.fill('3')
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click()
  await page.getByRole('link', { name: 'Workout', exact: true }).click()
  await page.getByLabel('Workout date').fill('2020-01-20')
  await page.getByRole('button', { name: 'Mark set as complete', exact: true }).first().click()
  await timer.waitFor()
  await page.getByRole('link', { name: 'History', exact: true }).click()
  await timer.waitFor({ state: 'detached', timeout: 6000 })
  // Simulate the native ActivityKit bridge returning a running activity after a WebView restart.
  await page.evaluate(async () => {
    const { restLiveActivity } = await import('/Workout/src/lib/restLiveActivity.js')
    const { restoreRestTimer } = await import('/Workout/src/lib/activeRestTimer.js')
    const original = restLiveActivity.getState
    restLiveActivity.getState = async () => ({ status: 'active', timerID: 'restored', startedAt: Date.now() - 5000, endsAt: Date.now() + 15000 })
    await restoreRestTimer()
    restLiveActivity.getState = original
  })
  await timer.waitFor()
  await timer.getByRole('button', { name: 'Skip' }).click()
  // A delayed restore must never resurrect a timer after the user skips.
  await page.evaluate(async () => {
    const { restLiveActivity } = await import('/Workout/src/lib/restLiveActivity.js')
    const { restoreRestTimer, skipRestTimer } = await import('/Workout/src/lib/activeRestTimer.js')
    const original = restLiveActivity.getState
    let resolve
    restLiveActivity.getState = () => new Promise(done => { resolve = done })
    const restoration = restoreRestTimer()
    skipRestTimer()
    resolve({ status: 'active', timerID: 'late', startedAt: Date.now(), endsAt: Date.now() + 15000 })
    await restoration
    restLiveActivity.getState = original
  })
  assert.equal(await timer.count(), 0)
  assert.deepEqual(errors, [])
  // Exercise the app store against delayed/malformed native responses, not just the bridge queue.
  const lifecycle = await page.evaluate(async () => {
    const { restLiveActivity } = await import('/Workout/src/lib/restLiveActivity.js')
    const { restoreRestTimer, startRestTimer, skipRestTimer } = await import('/Workout/src/lib/activeRestTimer.js')
    const original = { ...restLiveActivity }
    const calls = []
    const rendered = () => !!document.querySelector('[aria-label="Rest timer"]')
    const render = () => new Promise(resolve => setTimeout(resolve, 30))
    try {
      restLiveActivity.start = async state => { calls.push(['start', state]); return { status: 'disabled' } }
      restLiveActivity.end = async id => { calls.push(['end', id]); return { status: 'ended' } }
      for (const state of [
        { status: 'disabled' }, { status: 'unsupported' }, { status: 'unavailable' },
        { status: 'active', timerID: 'expired', startedAt: Date.now() - 60000, endsAt: Date.now() - 1 },
        { status: 'active', timerID: 'invalid', startedAt: NaN, endsAt: Date.now() + 60000 },
        { status: 'active', timerID: 'invalid', startedAt: Date.now(), endsAt: Infinity },
      ]) {
        restLiveActivity.getState = async () => state
        await restoreRestTimer()
        await render()
        if (rendered()) throw Error('Invalid or unavailable native state created a timer')
      }
      let resolve
      restLiveActivity.getState = () => new Promise(done => { resolve = done })
      const restoration = restoreRestTimer()
      localStorage.setItem('wl_rest_seconds', '60')
      startRestTimer()
      resolve({ status: 'active', timerID: 'obsolete', startedAt: Date.now(), endsAt: Date.now() + 15000 })
      await restoration
      await render()
      if (!rendered()) throw Error('Disabled Live Activities must preserve the app timer')
      skipRestTimer()
      for (let i = 0; i < 20; i++) { startRestTimer(); skipRestTimer() }
      await render()
      if (rendered()) throw Error('Rapid Skip left the app timer visible')
      return calls
    } finally { Object.assign(restLiveActivity, original) }
  })
  assert.equal(lifecycle.length, 42)
  const ids = new Set()
  for (let i = 0; i < lifecycle.length; i += 2) {
    assert.equal(lifecycle[i][0], 'start')
    const state = lifecycle[i][1]
    assert.equal(state.endsAt - state.startedAt, 60000)
    assert.equal(lifecycle[i + 1][1], state.timerID, 'Skip must target the new timer, never a late restored timer')
    ids.add(state.timerID)
  }
  assert.equal(ids.size, 21)
  // Simulate suspension: no interval callbacks run while wall time moves beyond the deadline.
  await page.clock.install()
  await page.evaluate(async () => {
    const { startRestTimer } = await import('/Workout/src/lib/activeRestTimer.js')
    startRestTimer()
  })
  await timer.waitFor()
  await page.clock.setSystemTime(new Date(Date.now() + 120000))
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')))
  await timer.waitFor({ state: 'detached' })
  assert.deepEqual(errors, [])
  console.log('PASS: unavailable/invalid/expired restore, delayed restore versus new start, 21 start/Skip identities, suspended deadline expiry')
  console.log('PASS: timer tab continuity/expiry/Skip, navigation stacking, one Dips, rest input clear/save')
} finally { await browser.close() }
