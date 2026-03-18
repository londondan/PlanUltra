export function computeSectionCalories(
  caloriesPerHour: number | null,
  durationMinutes: number | null
): number | null {
  if (caloriesPerHour === null || durationMinutes === null) return null
  return Math.round((caloriesPerHour * durationMinutes) / 60)
}
