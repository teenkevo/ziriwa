import type { SprintTask } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

/**
 * Sprint week starts Monday 10:00 local on `weekStart` (YYYY-MM-DD).
 * Matches SprintWeekTimer and work-submission time tracking.
 */
export function getSprintWeekStartLocal(weekStart: string): Date {
  const [y, m, d] = weekStart.split('-').map(Number)
  if (!y || !m || !d) return new Date(NaN)
  return new Date(y, m - 1, d, 10, 0, 0, 0)
}

export function isSprintWeekStarted(
  weekStart: string,
  now: Date = new Date(),
): boolean {
  return now.getTime() >= getSprintWeekStartLocal(weekStart).getTime()
}

/**
 * For accepted tasks before the sprint week starts, workflow status is fixed to To do.
 */
export function getEffectiveTaskStatus(
  task: Pick<SprintTask, 'status' | 'taskStatus'>,
  weekStart: string,
): NonNullable<SprintTask['taskStatus']> {
  const raw = task.taskStatus ?? 'to_do'
  if (task.status === 'accepted' && !isSprintWeekStarted(weekStart)) {
    return 'to_do'
  }
  return raw
}
