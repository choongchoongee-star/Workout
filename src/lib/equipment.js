import { DEFAULT_EXERCISES } from '../data/exercises.js'

export const EQUIPMENT_LABELS = {
  barbell: 'Barbell', dumbbell: 'Dumbbell', smith: 'Smith Machine',
  machine: 'Machine', cable: 'Cable', ezbar: 'EZ Bar', unspecified: 'Unspecified',
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
  'barbell-curl': ['barbell', 'dumbbell', 'ezbar', 'cable'],
  'overhead-extension': ['dumbbell', 'cable', 'ezbar'],
  'preacher-curl': ['ezbar', 'dumbbell', 'machine'],
  'skull-crusher': ['ezbar', 'barbell', 'dumbbell'],
  'seated-row': ['machine', 'cable'],
  'lat-pulldown': ['cable', 'machine'],
  'chest-press': ['machine'], 'shoulder-press': ['machine'],
}
const aliases = {
  'incline-dumbbell-press': ['incline-bench', 'dumbbell'],
  'dumbbell-shoulder-press': ['overhead-press', 'dumbbell'],
  'dumbbell-curl': ['barbell-curl', 'dumbbell'],
  'ez-bar-curl': ['barbell-curl', 'ezbar'],
  'cable-row': ['seated-row', 'cable'],
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
  return definition(exercise) ? options[familyId(exercise)] ?? [] : []
}
export function movementName(exercise) {
  if (!definition(exercise)) return exercise?.name
  const family = familyId(exercise)
  if (family === 'barbell-curl') return 'Biceps Curl'
  return DEFAULT_EXERCISES.find(ex => ex.id === family)?.name ?? exercise?.name
}
export function recordEquipment(card, exercise) {
  if (card.equipment) return card.equipment
  const base = definition(exercise)
  if (aliases[base?.id]) return aliases[base.id][1]
  if (base?.id === 'barbell-curl') return 'barbell'
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
  return allowed[0]
}
export function changeCardEquipment(cards, index, exercise, equipment) {
  const card = cards[index]
  if (!card || !equipmentOptions(exercise).includes(equipment) || recordEquipment(card, exercise) === equipment) return cards
  if (card.sets.length) return [...cards, { exerciseId: card.exerciseId, equipment, sets: [] }]
  return cards.map((entry, i) => i === index ? { ...entry, equipment } : entry)
}
