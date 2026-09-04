import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_EXERCISES, LEGACY_CATEGORIES, LEGACY_EXERCISE_NAMES } from '../data/exercises.js'
import { mergeDefaultExercises, normalizeExercise } from './exerciseLibrary.js'
import { parseWorkoutMarkdown, planWorkoutImport } from './importUtils.js'
import { buildMarkdown } from './exportUtils.js'
import { formatDate } from './dateUtils.js'

const korean = `# 운동 기록
- 내보낸 날짜: 2026년 9월 3일
- 총 세션 수: 1

## 2026년 9월 2일 수요일
_총 45분 · 4종목_

### 숄더프레스 _(어깨)_
1. 42.5kg × 8회

### 풀업 _(등)_
1. 체중+5kg × 12회

### 러닝머신 _(유산소)_
- 15.5분 · 5.2km · 20km/h · 경사 0% · 125kcal

### 백 익스텐션 _(복근)_
- _세트 없음_
`

test('old Korean Markdown resolves to English defaults without losing sets or creating duplicates', () => {
  const data = parseWorkoutMarkdown(korean)
  assert.deepEqual(data.exercises.map(ex => ex.name), ['Shoulder Press', 'Pull-up', 'Treadmill', 'Back Extension'])
  assert.deepEqual(data.exercises.map(ex => ex.category), ['Shoulders', 'Back', 'Cardio', 'Core'])
  assert.deepEqual(data.sessions[0], {
    id: '2026-09-02', date: '2026-09-02', duration_min: 45,
    exercises: [
      { exerciseId: 'shoulder-press', sets: [{ weight: 42.5, reps: 8, done: false }] },
      { exerciseId: 'pullup', sets: [{ added_weight: 5, reps: 12, done: false }] },
      { exerciseId: 'treadmill', sets: [{ duration_min: 15.5, distance_km: 5.2, speed_kmh: 20, incline_pct: 0, calories: 125 }] },
      { exerciseId: 'back-extension', sets: [] },
    ],
  })
  assert.equal(planWorkoutImport({ exercises: DEFAULT_EXERCISES, sessions: [] }, data).exerciseCount, 0)
  const markdown = buildMarkdown(data.sessions, data.exercises)
  assert.equal(/[가-힣]/.test(markdown), false)
  assert.deepEqual(parseWorkoutMarkdown(markdown).sessions, data.sessions)
  assert.deepEqual(parseWorkoutMarkdown(markdown.replace(/<!-- workout-backup:v1\n[^]*?\n-->\n/, '')).sessions, data.sessions)
  assert.equal(/[가-힣]/.test(data.warnings.join('')), false)
})

test('every historical default and promoted custom ID survives English conversion', () => {
  const old = DEFAULT_EXERCISES.map((base, index) => ({
    ...base, id: index % 2 ? `custom-old-${index}` : base.id,
    name: LEGACY_EXERCISE_NAMES[base.id],
    category: Object.keys(LEGACY_CATEGORIES).find(key => LEGACY_CATEGORIES[key] === base.category),
  }))
  const before = structuredClone(old)
  const merged = mergeDefaultExercises(old)
  assert.equal(merged.length, DEFAULT_EXERCISES.length)
  assert.deepEqual(merged.map(ex => ex.id), old.map(ex => ex.id))
  assert.deepEqual(merged.map(ex => ex.name), DEFAULT_EXERCISES.map(ex => ex.name))
  assert.deepEqual(old, before)
  const data = parseWorkoutMarkdown(korean, merged)
  assert.ok(data.sessions[0].exercises.every(ex => merged.some(saved => saved.id === ex.exerciseId)))
  assert.deepEqual(mergeDefaultExercises(merged), merged)
})

test('Korean structured backups retain done state, IDs and numeric metadata', () => {
  const ex = { id: 'custom-old', name: '숄더프레스', category: '어깨', type: 'weight', met: null }
  const session = { id: '2026-09-02', date: '2026-09-02', duration_min: 45, exercises: [{ exerciseId: ex.id, sets: [{ weight: 50, reps: 12, done: true }] }] }
  const markdown = `# 운동 기록\n<!-- workout-backup:v1\n${JSON.stringify({ version: 1, exercises: [ex], sessions: [session] })}\n-->`
  const data = parseWorkoutMarkdown(markdown)
  assert.deepEqual(data.sessions, [session])
  assert.deepEqual(data.exercises, [{ ...ex, name: 'Shoulder Press', category: 'Shoulders' }])
})

test('unknown user names are preserved and dates use an English locale', () => {
  const custom = { id: 'bench-press', name: 'My variation', category: '가슴', type: 'weight' }
  assert.deepEqual(normalizeExercise(custom), { ...custom, category: 'Chest' })
  assert.equal(formatDate('2026-09-03', { month: 'long', day: 'numeric', year: 'numeric' }), 'September 3, 2026')
  assert.throws(() => parseWorkoutMarkdown(korean.replace('9월 2일', '2월 30일')), /Invalid date/)
})
