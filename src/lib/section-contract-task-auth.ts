import type { SectionAccess } from '@/lib/section-access'
import { canSubmitDetailedTaskWork } from '@/lib/section-access'

type TaskSnapshot = {
  _key?: string
  priority?: string
  assignee?: string | null
  status?: string
  inputs?: unknown
  deliverable?: unknown
  periodDeliverables?: unknown
  inputsReviewThread?: unknown
  deliverableReviewThread?: unknown
}

function taskKey(task: TaskSnapshot, index: number): string {
  return task._key ?? `idx-${index}`
}

function stableJson(value: unknown): string {
  return JSON.stringify(value ?? null)
}

function isAssigneeOnlyChange(
  before: TaskSnapshot,
  after: TaskSnapshot,
  viewerStaffId: string,
): boolean {
  const assigneeId =
    typeof after.assignee === 'string'
      ? after.assignee
      : typeof before.assignee === 'string'
        ? before.assignee
        : null

  if (assigneeId !== viewerStaffId) return false

  const supervisorFields: (keyof TaskSnapshot)[] = [
    'priority',
    'assignee',
    'status',
    'inputsReviewThread',
    'deliverableReviewThread',
  ]

  for (const field of supervisorFields) {
    if (stableJson(before[field]) !== stableJson(after[field])) {
      return false
    }
  }

  return true
}

/**
 * Supervisors may edit task planning and reviews; assignees may only submit inputs/deliverables on their tasks.
 */
export function assertActivityTasksUpdateAllowed(
  access: SectionAccess,
  beforeTasks: TaskSnapshot[],
  afterTasks: TaskSnapshot[],
): string | null {
  if (access.canSuperviseDetailedTasks) return null

  const beforeByKey = new Map(
    beforeTasks.map((t, i) => [taskKey(t, i), t] as const),
  )

  for (let i = 0; i < afterTasks.length; i++) {
    const after = afterTasks[i]!
    const key = taskKey(after, i)
    const before = beforeByKey.get(key)

    if (!before) {
      return 'Only supervisors can add or remove detailed tasks'
    }

    if (
      !access.viewerStaffId ||
      !isAssigneeOnlyChange(before, after, access.viewerStaffId)
    ) {
      return 'Only supervisors can change priority, assignment, or reviews; assignees may submit inputs and deliverables on their own tasks'
    }
  }

  if (afterTasks.length < beforeTasks.length) {
    return 'Only supervisors can add or remove detailed tasks'
  }

  for (let i = 0; i < beforeTasks.length; i++) {
    const key = taskKey(beforeTasks[i]!, i)
    if (!afterTasks.some((t, j) => taskKey(t, j) === key)) {
      if (
        !access.viewerStaffId ||
        !canSubmitDetailedTaskWork(
          access,
          typeof beforeTasks[i]?.assignee === 'string'
            ? beforeTasks[i]?.assignee
            : null,
        )
      ) {
        return 'Only supervisors can add or remove detailed tasks'
      }
    }
  }

  return null
}
