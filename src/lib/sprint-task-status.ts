import type {
  SprintTask,
  WorkSubmission,
} from '@/sanity/lib/weekly-sprints/get-sprints-by-section'
import { isSprintWeekStarted } from '@/lib/sprint-week'

export type SprintTaskWorkflowStatus = NonNullable<SprintTask['taskStatus']>

export const SPRINT_TASK_STATUS_LABELS: Record<SprintTaskWorkflowStatus, string> =
  {
    to_do: 'To do',
    in_progress: 'In progress',
    delivered: 'Delivered',
    in_review: 'In review',
    done: 'Done',
  }

export function getSprintTaskStatusLabel(
  status: SprintTaskWorkflowStatus,
): string {
  return SPRINT_TASK_STATUS_LABELS[status] ?? status
}

type ResolveSprintTaskStatusInput = Pick<SprintTask, 'status' | 'taskStatus'> & {
  workSubmissions?: WorkSubmission[] | null
}

/**
 * Derives the workflow status for an accepted sprint activity.
 * - Before sprint week: To do
 * - Sprint started, no evidence: In progress
 * - Pending evidence review: In review
 * - All evidence approved: Done
 * - Rejected evidence awaiting resubmit: In progress
 */
export function resolveSprintTaskStatus(
  task: ResolveSprintTaskStatusInput,
  weekStart: string,
  now: Date = new Date(),
): SprintTaskWorkflowStatus {
  const stored = task.taskStatus ?? 'to_do'

  if (task.status !== 'accepted') {
    return stored
  }

  if (!isSprintWeekStarted(weekStart, now)) {
    return 'to_do'
  }

  const submissions = (task.workSubmissions ?? []).filter(Boolean)
  if (submissions.length === 0) {
    if (stored === 'delivered' || stored === 'done') return stored
    return 'in_progress'
  }

  const hasPending = submissions.some(
    submission => (submission.status ?? 'pending') === 'pending',
  )
  const allApproved = submissions.every(
    submission => submission.status === 'approved',
  )

  if (allApproved) return 'done'
  if (hasPending) return 'in_review'

  return 'in_progress'
}
