import type { SectionAccess } from '@/lib/section-access'
import { canSubmitDetailedTaskWork } from '@/lib/section-access'

type TaskSnapshot = {
  _key?: string
  task?: string
  priority?: string
  assignee?: string | null
  status?: string
  targetDate?: string
  reportingFrequency?: string
  reportingPeriodStart?: string
  expectedDeliverable?: string
  inputs?: unknown
  deliverable?: unknown
  periodDeliverables?: unknown
  inputsReviewThread?: unknown
  deliverableReviewThread?: unknown
}

const MANAGER_ONLY_FIELDS = [
  'targetDate',
  'reportingFrequency',
  'reportingPeriodStart',
  'expectedDeliverable',
] as const satisfies readonly (keyof TaskSnapshot)[]

const SUPERVISOR_FIELDS = [
  'priority',
  'assignee',
  'status',
  'inputsReviewThread',
  'deliverableReviewThread',
] as const satisfies readonly (keyof TaskSnapshot)[]

const ASSIGNEE_CONTENT_FIELDS = [
  'inputs',
  'deliverable',
  'periodDeliverables',
] as const satisfies readonly (keyof TaskSnapshot)[]

function taskKey(task: TaskSnapshot, index: number): string {
  return task._key ?? `idx-${index}`
}

function stableJson(value: unknown): string {
  return JSON.stringify(value ?? null)
}

function fieldsChanged(
  before: TaskSnapshot,
  after: TaskSnapshot,
  fields: readonly (keyof TaskSnapshot)[],
): boolean {
  return fields.some(field => stableJson(before[field]) !== stableJson(after[field]))
}

function isAssigneeContentOnlyChange(
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

  if (fieldsChanged(before, after, [...SUPERVISOR_FIELDS, ...MANAGER_ONLY_FIELDS])) {
    return false
  }

  if (stableJson(before.task) !== stableJson(after.task)) {
    return false
  }

  return fieldsChanged(before, after, ASSIGNEE_CONTENT_FIELDS)
}

function assertTaskPairAllowed(
  access: SectionAccess,
  before: TaskSnapshot,
  after: TaskSnapshot,
): string | null {
  if (
    fieldsChanged(before, after, MANAGER_ONLY_FIELDS) &&
    !access.canManageContract
  ) {
    return 'Only the section manager can set reporting cycle, due date, and expected deliverables'
  }

  if (fieldsChanged(before, after, SUPERVISOR_FIELDS)) {
    if (!access.canSuperviseDetailedTasks) {
      if (
        !access.viewerStaffId ||
        !isAssigneeContentOnlyChange(before, after, access.viewerStaffId)
      ) {
        return 'Only supervisors can change priority, assignment, or reviews; assignees may submit inputs and deliverables on their own tasks'
      }
    }
    return null
  }

  if (stableJson(before.task) !== stableJson(after.task)) {
    if (!access.canSuperviseDetailedTasks) {
      return 'Only supervisors can edit detailed task descriptions'
    }
    return null
  }

  if (
    !access.canSuperviseDetailedTasks &&
    (!access.viewerStaffId ||
      !isAssigneeContentOnlyChange(before, after, access.viewerStaffId))
  ) {
    return 'Only supervisors can change priority, assignment, or reviews; assignees may submit inputs and deliverables on their own tasks'
  }

  return null
}

/**
 * Supervisors may edit task planning and reviews; managers set reporting/due-date fields;
 * assignees may only submit inputs/deliverables on their tasks.
 */
export function assertActivityTasksUpdateAllowed(
  access: SectionAccess,
  beforeTasks: TaskSnapshot[],
  afterTasks: TaskSnapshot[],
): string | null {
  if (access.isGlobalAdmin) return null

  const beforeByKey = new Map(
    beforeTasks.map((t, i) => [taskKey(t, i), t] as const),
  )

  for (let i = 0; i < afterTasks.length; i++) {
    const after = afterTasks[i]!
    const key = taskKey(after, i)
    const before = beforeByKey.get(key)

    if (!before) {
      if (!access.canSuperviseDetailedTasks) {
        return 'Only supervisors can add or remove detailed tasks'
      }
      continue
    }

    const err = assertTaskPairAllowed(access, before, after)
    if (err) return err
  }

  if (afterTasks.length < beforeTasks.length && !access.canSuperviseDetailedTasks) {
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
