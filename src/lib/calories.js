/**
 * MET-based calorie calculation
 * kcal = MET × body_weight_kg × duration_hours
 */
export function calcCalories(met, bodyWeightKg, durationMin) {
  if (met == null || bodyWeightKg == null || durationMin == null) return null
  if (met <= 0 || bodyWeightKg <= 0 || durationMin <= 0) return null
  return Math.round(met * bodyWeightKg * (durationMin / 60))
}
