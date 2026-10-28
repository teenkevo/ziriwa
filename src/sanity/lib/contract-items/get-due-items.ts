import type {
  SectionContract,
  DetailedTask,
} from '../section-contracts/get-section-contract'
import { getCurrentPeriodDueDate } from '@/lib/reporting-periods'
import { isCoreActivityType } from '@/lib/measurable-activity-type'

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
 * Flatten activities and detailed tasks with due dates from embedded objectives.
 * The activity due date is the deadline. Periodic tasks use the current report due date.
 */
export function getDueItemsFromContract(
  contract: SectionContract | null,
  filter: (date: string) => boolean,
): DueItem[] {
  if (!contract?.objectives) return []

  const items: DueItem[] = []

  for (const obj of contract.objectives) {
    for (const init of obj.initiatives ?? []) {
      for (const act of init.measurableActivities ?? []) {
        // CRC activities: activity-level due date
        const actEffectiveDate = act.targetDate

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
        if (isCoreActivityType(act.activityType) && act.tasks?.length) {
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

/**
 * Get all items with target dates strictly before `today` that are not yet
 * completed/done. Mirrors {@link getDueItemsFromContract} but applied to the
 * "overdue" bucket:
 *   - CRC activities: targetDate < today AND status !== 'completed'.
 *   - KPI tasks: current-period due date < today AND status !== 'done'.
 *
 * Items are sorted oldest target date first (so the most overdue are at the top).
 */
export function getOverdueItemsFromContract(
  contract: SectionContract | null,
  today: string,
): DueItem[] {
  if (!contract?.objectives) return []

  const items: DueItem[] = []

  for (const obj of contract.objectives) {
    for (const init of obj.initiatives ?? []) {
      for (const act of init.measurableActivities ?? []) {
        const actDate = act.targetDate

        if (actDate && actDate < today && act.status !== 'completed') {
          items.push({
            _key: act._key,
            title: act.title,
            targetDate: actDate,
            status: act.status,
            objectiveTitle: obj.title,
            initiativeTitle: init.title,
          })
        }

        if (isCoreActivityType(act.activityType) && act.tasks?.length) {
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
            if (taskDueDate && taskDueDate < today && task.status !== 'done') {
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
