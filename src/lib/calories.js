/**
 * MET-based calorie calculation
 * kcal = MET × body_weight_kg × duration_hours
 */
export function calcCalories(met, bodyWeightKg, durationMin) {
  if (!met || !bodyWeightKg || !durationMin) return null
  return Math.round(met * bodyWeightKg * (durationMin / 60))
}
