import { DEFAULT_EXERCISES } from '../data/exercises.js'

export const EQUIPMENT_LABELS = {
  barbell: 'Barbell', dumbbell: 'Dumbbell', smith: 'Smith',
  machine: 'Machine', cable: 'Cable', unspecified: 'Unspecified',
}

export function normalizeEquipment(equipment) {
  return equipment === 'ezbar' ? 'barbell' : equipment
}

export function normalizeSessionEquipment(session) {
  return { ...session, exercises: session.exercises?.map(card =>
    card.equipment === 'ezbar' ? { ...card, equipment: 'barbell' } : card) }
}

// Only known movements receive compatible choices. Custom movements stay unchanged.
const options = {
  'bench-press': ['barbell', 'dumbbell', 'smith'],
  'incline-bench': ['barbell', 'dumbbell', 'smith'],
  'decline-bench': ['barbell', 'dumbbell', 'smith'],
  squat: ['barbell', 'smith', 'dumbbell'],
  'overhead-press': ['barbell', 'dumbbell', 'smith'],
  'romanian-deadlift': ['barbell', 'dumbbell', 'smith'],
  deadlift: ['barbell', 'dumbbell'],
  'lateral-raise': ['dumbbell', 'cable', 'machine'],
  'front-raise': ['dumbbell', 'barbell', 'cable'],
  'barbell-curl': ['barbell', 'dumbbell', 'cable'],
  'overhead-extension': ['barbell', 'dumbbell', 'cable'],
  'preacher-curl': ['barbell', 'dumbbell', 'machine'],
  'skull-crusher': ['barbell', 'dumbbell'],
  'seated-row': ['machine', 'cable'],
  'lat-pulldown': ['cable', 'machine'],
  'dumbbell-fly': ['dumbbell', 'machine', 'cable'],
  'cable-crossover': ['cable'], 'cable-dips': ['cable'],
  'one-arm-row': ['dumbbell', 'machine', 'cable'],
  'reverse-pec-deck-fly': ['dumbbell', 'machine', 'cable'],
  'cable-crunch': ['cable'], rowing: ['machine'],
  'chest-press': ['machine', 'cable'], 'shoulder-press': ['machine'],
}
const aliases = {
  'pec-deck-fly': ['dumbbell-fly', 'machine'],
  'cable-chest-press': ['chest-press', 'cable'],
  'incline-dumbbell-press': ['incline-bench', 'dumbbell'],
  'dumbbell-shoulder-press': ['overhead-press', 'dumbbell'],
  'dumbbell-curl': ['barbell-curl', 'dumbbell'],
  'ez-bar-curl': ['barbell-curl', 'barbell'],
  'cable-row': ['seated-row', 'cable'],
}

// Equipment words are presentation metadata; original IDs/names remain intact for backups.
function namedEquipment(exercise) {
  const name = exercise?.name ?? ''
  const patterns = [['smith', /\bsmith(?:[ -]+machine)?\b/i], ['barbell', /\b(?:barbell|ez[ -]?bar)\b/i], ['dumbbell', /\bdumbbell\b/i], ['cable', /\bcable\b/i], ['machine', /\b(?:machine|pec[ -]+deck)\b/i]]
  for (const [equipment, pattern] of patterns) {
    if (pattern.test(name)) {
      const clean = name.replace(pattern, '').replace(/\(\s*\)/g, '').replace(/\s+/g, ' ').trim()
      if (clean) return { equipment, name: clean }
    }
  }
  return null
}

function definition(exercise) {
  return DEFAULT_EXERCISES.find(base => base.name === exercise?.name &&
    base.category === exercise.category && base.type === exercise.type)
}
export function familyId(exercise) {
  const base = definition(exercise)
  return aliases[base?.id]?.[0] ?? base?.id ?? exercise?.id
}
export function equipmentOptions(exercise) {
  const named = namedEquipment(exercise)
  const allowed = definition(exercise) ? options[familyId(exercise)] ?? (named ? [named.equipment] : []) : named ? [named.equipment] : []
  return Object.keys(EQUIPMENT_LABELS).filter(equipment => allowed.includes(equipment))
}
export function movementName(exercise) {
  if (!definition(exercise)) return namedEquipment(exercise)?.name ?? exercise?.name
  const family = familyId(exercise)
  if (family === 'barbell-curl') return 'Biceps Curl'
  const representative = DEFAULT_EXERCISES.find(ex => ex.id === family) ?? exercise
  return namedEquipment(representative)?.name ?? representative?.name
}
export function recordEquipment(card, exercise) {
  if (card.equipment) return normalizeEquipment(card.equipment)
  const base = definition(exercise)
  if (aliases[base?.id]) return aliases[base.id][1]
  const named = namedEquipment(exercise)
  if (named) return named.equipment
  return equipmentOptions(exercise).length ? 'unspecified' : null
}
export function exerciseChoices(exercises) {
  const choices = new Map()
  for (const ex of exercises) {
    const family = familyId(ex)
    if (!choices.has(family) || definition(ex)?.id === family) choices.set(family, ex)
  }
  return [...choices.values()]
}
export function equipmentRecords(sessions, exercises, exercise, equipment) {
  const byId = new Map(exercises.map(ex => [ex.id, ex]))
  return [...sessions].sort((a, b) => b.date.localeCompare(a.date)).flatMap(session =>
    (session.exercises ?? []).flatMap((card, index) => {
      const source = byId.get(card.exerciseId)
      if (!source || familyId(source) !== familyId(exercise) ||
        recordEquipment(card, source) !== equipment || !card.sets?.length) return []
      return [{ date: session.date, index, sets: card.sets }]
    }))
}
export function previousEquipmentSet(sessions, exercises, exercise, equipment, excludeDate) {
  const records = equipmentRecords(sessions, exercises, exercise, equipment).filter(r => r.date !== excludeDate)
  const latest = records.filter(r => r.date === records[0]?.date).at(-1)
  return latest?.sets.at(-1) ?? null
}
export function defaultEquipment(exercise, sessions, exercises, remembered) {
  remembered = normalizeEquipment(remembered)
  const allowed = equipmentOptions(exercise)
  if (!allowed.length) return null
  if (allowed.includes(remembered)) return remembered
  const byId = new Map(exercises.map(ex => [ex.id, ex]))
  for (const session of [...sessions].sort((a, b) => b.date.localeCompare(a.date))) {
    for (const card of [...(session.exercises ?? [])].reverse()) {
      const source = byId.get(card.exerciseId)
      if (source && familyId(source) === familyId(exercise)) {
        const equipment = recordEquipment(card, source)
        if (allowed.includes(equipment)) return equipment
      }
    }
  }
  return namedEquipment(exercise)?.equipment ?? allowed[0]
}
export function changeCardEquipment(cards, index, exercise, equipment) {
  const card = cards[index]
  if (!card || !equipmentOptions(exercise).includes(equipment) || recordEquipment(card, exercise) === equipment) return cards
  if (card.sets.length) return [...cards, { exerciseId: card.exerciseId, equipment, sets: [] }]
  return cards.map((entry, i) => i === index ? { ...entry, equipment } : entry)
}
