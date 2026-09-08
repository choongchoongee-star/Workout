import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { DEFAULT_EXERCISES } from '../src/data/exercises.js'
import { parseWorkoutMarkdown } from '../src/lib/importUtils.js'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const url = process.env.WORKOUT_URL || 'http://127.0.0.1:5176/Workout/'
const artifacts = join(tmpdir(), 'steady-sets-language-tests')
await mkdir(artifacts, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' })
const fixture = { version: 1, exercises: DEFAULT_EXERCISES, sessions: [{
  id: '2020-01-20', date: '2020-01-20', duration_min: 40, exercises: [
    { exerciseId: 'bench-press', equipment: 'barbell', sets: Array.from({ length: 5 }, () => ({ weight: 40, reps: 10, done: false })) },
    { exerciseId: 'bench-press', equipment: 'smith', sets: [{ weight: 30, reps: 8, done: false }] },
  ],
}] }
let persistedChecks = 0
try {
  for (const locale of ['ko-KR', 'en-US']) {
    const ko = locale.startsWith('ko')
    const word = (en, kr) => ko ? kr : en
    const context = await browser.newContext({ locale, viewport: { width: 390, height: 844 }, acceptDownloads: true })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.setDefaultTimeout(6000)
    await page.addInitScript(data => {
      if (!localStorage.getItem('wl_workout_data_v1')) {
        localStorage.setItem('wl_workout_data_v1', JSON.stringify(data))
        localStorage.setItem('wl_rest_seconds', '60')
      }
    }, fixture)
    const tab = async (en, kr) => page.getByRole('link', { name: word(en, kr), exact: true }).click()
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('wl_workout_data_v1')))
    async function checkStored(predicate) {
      for (let i = 0; i < 30; i++) {
        if (predicate(await saved())) { persistedChecks++; return }
        await page.waitForTimeout(50)
      }
      assert.fail('Persisted data did not reach expected state')
    }
    await page.goto(url + 'session')
    await page.getByLabel(word('Workout date', '운동 날짜')).fill('2020-01-20')
    assert.equal(await page.locator('html').getAttribute('lang'), ko ? 'ko' : 'en')
    const bench = word('Bench Press', '벤치프레스')
    const equipment = page.getByLabel(word('Equipment for Bench Press', '벤치프레스 기구'))
    assert.equal(await equipment.first().inputValue(), 'barbell')
    await page.getByRole('button', { name: word('Increase reps by 1', '회 1 늘리기'), exact: true }).first().click()
    await checkStored(data => data.sessions[0].exercises[0].sets[0].reps === 11)
    await page.getByRole('button', { name: word('Edit reps: 11 reps', '횟수 수정: 11 회'), exact: true }).click()
    await page.getByRole('dialog').getByRole('spinbutton').fill('12')
    await page.getByRole('button', { name: word('Apply', '적용'), exact: true }).click()
    await checkStored(data => data.sessions[0].exercises[0].sets[0].reps === 12)
    await page.getByRole('button', { name: word('Increase kg by 2.5', 'kg 2.5 늘리기'), exact: true }).first().click()
    await checkStored(data => data.sessions[0].exercises[0].sets[0].weight === 42.5)
    await page.getByRole('button', { name: word('Mark set as complete', '세트 완료'), exact: true }).first().click()
    const timer = page.getByRole('region', { name: word('Rest timer', '휴식 타이머'), exact: true })
    await timer.waitFor()
    for (const [en, kr] of [['History', '기록'], ['Progress', '운동별 기록'], ['Settings', '설정'], ['Workout', '운동']]) {
      await tab(en, kr)
      assert(await timer.isVisible())
    }
    await timer.getByRole('button', { name: word('Skip', '건너뛰기') }).click()
    await page.getByLabel(word('Workout date', '운동 날짜')).fill('2020-01-20')
    await equipment.first().selectOption('dumbbell')
    await checkStored(data => data.sessions[0].exercises.length === 3 && data.sessions[0].exercises[0].equipment === 'barbell' && data.sessions[0].exercises[2].equipment === 'dumbbell')
    await page.reload()
    await page.getByLabel(word('Workout date', '운동 날짜')).fill('2020-01-20')
    assert.equal(await equipment.count(), 3)
    assert.equal((await saved()).sessions[0].exercises[0].sets[0].reps, 12)
    await tab('Progress', '운동별 기록')
    await page.getByPlaceholder(word('Search exercises...', '운동 검색...')).fill(bench)
    assert.equal(await page.getByRole('button', { name: `${bench} ${word('Chest', '가슴')}`, exact: true }).count(), 1)
    await page.getByRole('button', { name: `${bench} ${word('Chest', '가슴')}`, exact: true }).click()
    await equipment.selectOption('barbell')
    assert((await page.locator('main').innerText()).includes('42.5kg × 12'))
    await equipment.selectOption('smith')
    assert((await page.locator('main').innerText()).includes('30kg × 8'))
    assert(!(await page.locator('main').innerText()).includes('42.5kg'))
    await tab('Progress', '운동별 기록')
    await page.getByLabel(word('Choose another exercise', '다른 운동 선택')).click()
    await page.getByRole('link', { name: word('Manage exercises', '운동 관리') }).click()
    await page.getByRole('button', { name: word('+ Add', '+ 추가'), exact: true }).click()
    await page.getByRole('textbox', { name: word('Exercise name', '운동 이름') }).fill('내 운동 Alpha')
    await page.getByLabel(word('Category', '분류'), { exact: true }).selectOption('Legs')
    await page.getByRole('button', { name: word('Add', '추가'), exact: true }).click()
    await checkStored(data => data.exercises.some(e => e.name === '내 운동 Alpha' && e.category === 'Legs' && e.type === 'weight'))
    await tab('Settings', '설정')
    const seconds = page.getByLabel(word('Rest timer seconds', '휴식 시간 (초)'), { exact: true })
    await seconds.click()
    assert.equal(await seconds.inputValue(), '')
    await seconds.fill('45')
    await page.getByRole('button', { name: 'lbs', exact: true }).click()
    await page.getByRole('button', { name: word('Save preferences', '설정 저장'), exact: true }).click()
    assert.equal(await page.evaluate(() => localStorage.getItem('wl_rest_seconds')), '45')
    await page.reload()
    assert.equal(await seconds.inputValue(), '45')
    assert.equal(await page.getByRole('button', { name: 'lbs', exact: true }).getAttribute('aria-pressed'), 'true')
    const beforeExport = await saved()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: word('Export workouts (.md)', '운동 기록 내보내기 (.md)'), exact: true }).click()
    const download = await downloadPromise
    const backup = await readFile(await download.path(), 'utf8')
    assert.deepEqual(parseWorkoutMarkdown(backup).sessions, beforeExport.sessions)
    assert(backup.includes('Barbell') && backup.includes('Smith'))
    await page.locator('input[type=file]').setInputFiles({ name: 'backup.md', mimeType: 'text/markdown', buffer: Buffer.from(backup) })
    await page.getByText(word('Every date already has a workout. There is nothing to add.', '모든 날짜에 이미 기록이 있어 추가할 내용이 없습니다.'), { exact: true }).waitFor()
    await page.getByRole('button', { name: word('Cancel', '취소'), exact: true }).click()
    await tab('History', '기록')
    const row = page.locator('[data-swipe-content]').first()
    await row.focus()
    await row.press('ArrowLeft')
    await page.getByRole('button', { name: word('Delete workout on 2020-01-20', '2020-01-20 운동 기록 삭제'), exact: true }).click()
    await checkStored(data => data.sessions.length === 0)
    await page.getByRole('button', { name: word('Undo', '되돌리기'), exact: true }).click()
    await checkStored(data => data.sessions.length === 1)
    await row.focus()
    await row.press('ArrowLeft')
    await page.getByRole('button', { name: word('Delete workout on 2020-01-20', '2020-01-20 운동 기록 삭제'), exact: true }).click()
    await checkStored(data => data.sessions.length === 0)
    await tab('Settings', '설정')
    await page.locator('input[type=file]').setInputFiles({ name: 'backup.md', mimeType: 'text/markdown', buffer: Buffer.from(backup) })
    await page.getByRole('button', { name: word('Import', '가져오기'), exact: true }).click()
    await checkStored(data => isDeepStrictEqual(data.sessions, beforeExport.sessions))
    await page.locator('input[type=file]').setInputFiles({ name: 'broken.md', mimeType: 'text/markdown', buffer: Buffer.from('broken backup') })
    await page.getByRole('alert').waitFor()
    if (ko) assert.match(await page.getByRole('alert').innerText(), /백업|파일/)
    assert.deepEqual((await saved()).sessions, beforeExport.sessions)
    for (const theme of ['light', 'dark']) {
      await page.getByRole('button', { name: word(theme === 'dark' ? 'Dark' : 'Light', theme === 'dark' ? '다크' : '라이트'), exact: true }).click()
      for (const width of [320, 375, 390, 430]) {
        await page.setViewportSize({ width, height: 844 })
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${locale} ${width}: horizontal overflow`)
        assert(await page.locator('nav').evaluate(nav => {
          const rect = nav.getBoundingClientRect()
          return [0.15, 0.4, 0.65, 0.9].every(f => document.elementFromPoint(rect.width * f, rect.y + 20)?.closest('nav'))
        }))
      }
      await page.screenshot({ path: join(artifacts, `${locale}-${theme}-settings.png`) })
    }
    await tab('Workout', '운동')
    await page.getByLabel(word('Workout date', '운동 날짜')).fill('2020-01-20')
    for (const width of [320, 375, 390, 430]) {
      await page.setViewportSize({ width, height: 844 })
      await page.locator('main').evaluate(main => main.scrollTo(0, 0))
      const buttons = page.locator('.workout-set-row').first().locator('button')
      for (const button of await buttons.all()) {
        assert(await button.evaluate(el => {
          const r = el.getBoundingClientRect()
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
          return r.x >= 0 && r.right <= innerWidth && (hit === el || el.contains(hit))
        }), `${locale} ${width}: set controls must remain visible and unobstructed`)
      }
      await page.screenshot({ path: join(artifacts, `${locale}-${width}-workout.png`) })
    }
    // Real pointer gesture, in addition to the keyboard-accessible delete path.
    const firstRow = page.locator('[data-swipe-content]').first()
    const box = await firstRow.boundingBox()
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.5, { steps: 12 })
    await page.mouse.up()
    await page.getByRole('button', { name: word('Delete Set 1', '1세트 삭제'), exact: true }).click()
    await checkStored(data => data.sessions[0].exercises[0].sets.length === 4)
    await page.getByRole('button', { name: word('Undo', '되돌리기'), exact: true }).click()
    await checkStored(data => data.sessions[0].exercises[0].sets.length === 5)

    for (const [english, korean, category, translatedCategory] of [
      ['Pull-up', '풀업', 'Back', '등'], ['Treadmill', '러닝머신', 'Cardio', '유산소'],
    ]) {
      await page.getByRole('button', { name: word('+ Add exercise', '+ 운동 추가'), exact: true }).click()
      const modal = page.getByRole('dialog')
      await modal.getByRole('button', { name: word('All', '전체'), exact: true }).click()
      // English queries must also work while the UI displays Korean names.
      await modal.getByRole('textbox').fill(english)
      await modal.getByRole('button', { name: `${word(english, korean)} ${word(category, translatedCategory)}`, exact: true }).click()
      const card = page.getByRole('group', { name: word(english, korean), exact: true })
      if (english === 'Pull-up') {
        await card.getByRole('button', { name: word('+ Add set', '+ 세트 추가'), exact: true }).click()
        await card.getByRole('button', { name: word('Increase reps by 1', '회 1 늘리기'), exact: true }).click()
        await checkStored(data => data.sessions[0].exercises.some(e => e.exerciseId === 'pullup' && e.sets[0]?.reps === 11 && e.sets[0]?.added_weight === 0 && !('weight' in e.sets[0])))
      } else {
        await card.getByPlaceholder('35', { exact: true }).fill('15')
        await card.getByPlaceholder('5.2', { exact: true }).fill('2.5')
        await checkStored(data => data.sessions[0].exercises.some(e => e.exerciseId === 'treadmill' && e.sets[0]?.duration_min === 15 && e.sets[0]?.distance_km === 2.5 && e.sets[0]?.calories > 0))
      }
    }

    // Re-open the same persisted data with the other OS/browser language.
    const storedBeforeSwitch = await saved()
    const switched = await browser.newContext({
      locale: ko ? 'en-US' : 'ko-KR', storageState: await context.storageState(),
      viewport: { width: 390, height: 844 },
    })
    const switchedPage = await switched.newPage()
    await switchedPage.goto(url + 'settings')
    await switchedPage.getByRole('button', { name: ko ? 'Save preferences' : '설정 저장', exact: true }).waitFor()
    assert.deepEqual(await switchedPage.evaluate(() => JSON.parse(localStorage.getItem('wl_workout_data_v1'))), storedBeforeSwitch)
    assert.equal(await switchedPage.getByLabel(ko ? 'Rest timer seconds' : '휴식 시간 (초)').inputValue(), '45')
    await switched.close()
    assert.deepEqual(errors, [])
    console.log(`PASS ${locale}: entry/edit, timer navigation, equipment separation, reload, custom category, settings, export/import, delete/undo, responsive themes`)
    await context.close()
  }
  const fallback = await browser.newContext({ locale: 'fr-FR' })
  const fallbackPage = await fallback.newPage()
  await fallbackPage.goto(url + 'settings')
  await fallbackPage.getByRole('button', { name: 'Save preferences', exact: true }).waitFor()
  assert.equal(await fallbackPage.locator('html').getAttribute('lang'), 'en')
  await fallback.close()
  console.log(`PASS: ${persistedChecks} persisted-state checkpoints, language-switch preservation and unsupported-language fallback; screenshots: ${artifacts}`)
} finally { await browser.close() }
