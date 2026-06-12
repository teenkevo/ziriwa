import { addDays, format, parseISO, startOfWeek } from 'date-fns'

import { resolveSprintTaskStatus } from '@/lib/sprint-task-status'
import type { SprintTask } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

/** Monday–Friday working week containing `today` (YYYY-MM-DD). */
export function getWorkingWeekRange(today: string): {
  weekStart: string
  weekEnd: string
} {
  const weekStartDate = startOfWeek(parseISO(today), { weekStartsOn: 1 })
  const weekEndDate = addDays(weekStartDate, 4)
  return {
    weekStart: format(weekStartDate, 'yyyy-MM-dd'),
    weekEnd: format(weekEndDate, 'yyyy-MM-dd'),
  }
}

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

/** Resolved workflow status (accounts for sprint start and work submissions). */
export function getEffectiveTaskStatus(
  task: Pick<SprintTask, 'status' | 'taskStatus'> & {
    workSubmissions?: SprintTask['workSubmissions']
  },
  weekStart: string,
  now?: Date,
): NonNullable<SprintTask['taskStatus']> {
  return resolveSprintTaskStatus(task, weekStart, now)
}
