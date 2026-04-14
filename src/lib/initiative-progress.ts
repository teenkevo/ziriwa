/**
 * Progress from embedded section contract objectives → initiatives → measurable activities.
 * Ratio: activities with status "completed" vs total measurable activities.
 */
export type ObjectivesProgressInput = {
  initiatives?: {
    measurableActivities?: { status?: string }[]
  }[]
}[]

export function countMeasurableActivityProgress(
  objectives: ObjectivesProgressInput | null | undefined,
): { completed: number; total: number; percent: number } {
  let completed = 0
  let total = 0
  for (const obj of objectives ?? []) {
    for (const init of obj.initiatives ?? []) {
      for (const act of init.measurableActivities ?? []) {
        total++
        if (act.status === 'completed') completed++
      }
    }
  }
  const percent =
    total === 0 ? 0 : Math.min(100, Math.round((completed / total) * 100))
  return { completed, total, percent }
}

export function aggregateProgress(
  parts: { completed: number; total: number }[],
): { completed: number; total: number; percent: number } {
  let completed = 0
  let total = 0
  for (const p of parts) {
    completed += p.completed
    total += p.total
  }
  const percent =
    total === 0 ? 0 : Math.min(100, Math.round((completed / total) * 100))
  return { completed, total, percent }
}
