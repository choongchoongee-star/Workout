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
    localStorage.setItem('wl_rest_seconds', '0')
    localStorage.setItem('wl_workout_data_v1', JSON.stringify({ version: 1, exercises: [], sessions: [
      { id: '2020-01-02', date: '2020-01-02', exercises: [
        { exerciseId: 'bench-press', equipment: 'barbell', sets: [{ weight: 60, reps: 10, done: false }] },
        { exerciseId: 'bench-press', equipment: 'smith', sets: [{ weight: 40, reps: 8, done: true }] },
        { exerciseId: 'bench-press', equipment: 'barbell', sets: [{ weight: 65, reps: 10, done: false }] },
        { exerciseId: 'bench-press', sets: [{ weight: 100, reps: 1, done: true }] },
      ] },
    ] }))
  })
  await page.goto(`${process.env.WORKOUT_URL || 'http://127.0.0.1:5174/Workout/'}session`)
  const cards = page.getByRole('group', { name: 'Bench Press', exact: true })
  const picker = card => card.getByRole('combobox', { name: 'Equipment for Bench Press' })
  async function addBench() {
    await page.getByRole('button', { name: '+ Add exercise', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Add exercise', exact: true })
    await dialog.getByPlaceholder('Search exercises...').fill('Bench Press')
    assert.equal(await dialog.getByText('Bench Press', { exact: true }).count(), 1)
    await dialog.getByText('Bench Press', { exact: true }).click()
    await dialog.waitFor({ state: 'detached' })
  }
  await addBench()
  assert.equal(await picker(cards.nth(0)).inputValue(), 'barbell')
  await cards.nth(0).getByRole('button', { name: '+ Add set', exact: true }).click()
  await cards.nth(0).getByRole('button', { name: 'Edit weight: 65 kg', exact: true }).waitFor()
  await addBench()
  assert.equal(await cards.count(), 2)
  await picker(cards.nth(0)).selectOption('smith')
  assert.equal(await cards.count(), 3)
  assert.equal(await picker(cards.nth(0)).inputValue(), 'barbell')
  await cards.nth(0).getByRole('button', { name: 'Edit weight: 65 kg', exact: true }).waitFor()
  await picker(cards.nth(2)).selectOption('dumbbell')
  assert.equal(await cards.count(), 3)
  await picker(cards.nth(2)).selectOption('smith')
  await cards.nth(2).getByRole('button', { name: '+ Add set', exact: true }).click()
  await cards.nth(2).getByRole('button', { name: 'Edit weight: 40 kg', exact: true }).waitFor()
  await addBench()
  assert.equal(await cards.count(), 4)
  assert.equal(await picker(cards.nth(3)).inputValue(), 'smith')
  // Same-day, same-equipment duplicates retain separate sets in Progress.
  await cards.nth(3).getByRole('button', { name: '+ Add set', exact: true }).click()
  await page.waitForTimeout(800)
  await page.reload()
  await picker(cards.nth(3)).waitFor()
  assert.equal(await cards.count(), 4)
  assert.equal(await picker(cards.nth(3)).inputValue(), 'smith')
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    assert(await picker(cards.nth(0)).evaluate(e => e.offsetHeight >= 44))
    assert(await cards.nth(0).evaluate(e => e.getBoundingClientRect().right <= innerWidth))
  }
  await page.getByRole('link', { name: 'Progress', exact: true }).click()
  await page.getByRole('button', { name: 'Bench Press Chest', exact: true }).click()
  const progressEquipment = page.getByRole('combobox', { name: 'Equipment for Bench Press' })
  assert.equal(await progressEquipment.inputValue(), 'smith')
  assert.equal(await page.getByText('40kg × 8 reps', { exact: true }).count(), 3)
  await progressEquipment.selectOption('barbell')
  assert.equal(await page.getByText('65kg × 10 reps', { exact: true }).count(), 2)
  await progressEquipment.selectOption('unspecified')
  assert.equal(await page.getByText('100kg × 1 reps', { exact: true }).count(), 1)
  await page.getByRole('link', { name: 'Workout', exact: true }).click()
  await page.getByRole('button', { name: '+ Add exercise', exact: true }).waitFor()
  await cards.nth(2).getByRole('button', { name: 'Delete exercise', exact: true }).click()
  assert.equal(await cards.count(), 3)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  assert.equal(await cards.count(), 4)
  assert.equal(await picker(cards.nth(2)).inputValue(), 'smith')
  assert.deepEqual(errors, [])
  console.log('PASS equipment switching, defaults, duplicates, previous weights, reload, Progress separation and Undo')
} finally {
  await browser.close()
}
