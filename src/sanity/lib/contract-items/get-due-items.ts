import type {
  SectionContract,
  DetailedTask,
} from '../section-contracts/get-section-contract'
import { getCurrentPeriodDueDate } from '@/lib/reporting-periods'

export type DueItem = {
  _key: string
  title: string
  targetDate: string
  status?: string
  objectiveTitle?: string
  initiativeTitle?: string
  activityTitle?: string
}

/**
 * Get end of current week as ISO date string (yyyy-MM-dd).
 */
function getEndOfWeekDate(): string {
  const now = new Date()
  const day = now.getDay()
  const endOfWeek = new Date(now)
  endOfWeek.setDate(now.getDate() + (6 - day))
  return endOfWeek.toISOString().slice(0, 10)
}

/**
 * Flatten activities and KPI tasks with due dates from embedded objectives.
 * - CRC activities: use activity-level targetDate/reportingFrequency
 * - KPI tasks: use task-level reportingFrequency; due = end of current period
 */
export function getDueItemsFromContract(
  contract: SectionContract | null,
  filter: (date: string) => boolean,
): DueItem[] {
  if (!contract?.objectives) return []

  const items: DueItem[] = []
  const endOfWeekDate = getEndOfWeekDate()

  for (const obj of contract.objectives) {
    for (const init of obj.initiatives ?? []) {
      for (const act of init.measurableActivities ?? []) {
        // CRC activities: activity-level due date
        const actEffectiveDate =
          act.reportingFrequency === 'weekly'
            ? endOfWeekDate
            : act.targetDate

        if (actEffectiveDate && filter(actEffectiveDate)) {
          items.push({
            _key: act._key,
            title: act.title,
            targetDate: actEffectiveDate,
            status: act.status,
            objectiveTitle: obj.title,
            initiativeTitle: init.title,
          })
        }

        // KPI tasks with periodic reporting: task-level expected deliverable per period
        if (act.activityType === 'kpi' && act.tasks?.length) {
          for (const t of act.tasks) {
            const task =
              typeof t === 'string' ? null : (t as DetailedTask)
            if (
              !task ||
              !task.reportingFrequency ||
              task.reportingFrequency === 'n/a'
            )
              continue

            const taskDueDate = getCurrentPeriodDueDate(
              task.reportingFrequency as 'weekly' | 'monthly' | 'quarterly',
            )
            if (taskDueDate && filter(taskDueDate)) {
              items.push({
                _key: `${act._key}-${task._key ?? 'task'}`,
                title: task.task || act.title,
                targetDate: taskDueDate,
                status: task.status,
                objectiveTitle: obj.title,
                initiativeTitle: init.title,
                activityTitle: act.title,
              })
            }
          }
        }
      }
    }
  }
  items.sort((a, b) => a.targetDate.localeCompare(b.targetDate))
  return items
}
