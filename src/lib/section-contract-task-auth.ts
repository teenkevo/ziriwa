import type { SectionAccess } from '@/lib/section-access'
import { canSubmitDetailedTaskWork } from '@/lib/section-access'
import { assigneeIdFromUnknown } from '@/lib/detailed-task-assignees'

type WorkSnapshot = {
  _key?: string
  assignee?: string | { _id?: string; _ref?: string } | null
  status?: string
  inputs?: unknown
  deliverable?: unknown
  periodDeliverables?: unknown
  inputsReviewThread?: unknown
  deliverableReviewThread?: unknown
}

type TaskSnapshot = {
  _key?: string
  task?: string
  priority?: string
  cascadeKind?: string | null
  assignee?: string | { _ref?: string; _id?: string } | null
  officerWork?: WorkSnapshot[]
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

const PLANNING_FIELDS = [
  'targetDate',
  'reportingFrequency',
  'reportingPeriodStart',
  'expectedDeliverable',
] as const satisfies readonly (keyof TaskSnapshot)[]

const SUPERVISOR_TASK_FIELDS = [
  'priority',
  'assignee',
] as const satisfies readonly (keyof TaskSnapshot)[]

const WORK_CONTENT_FIELDS = [
  'inputs',
  'deliverable',
  'periodDeliverables',
] as const satisfies readonly (keyof WorkSnapshot)[]

const ASSIGNEE_STATUS_VALUES = [
  'inputs_submitted',
  'in_progress',
  'delivered',
  'in_review',
] as const

function taskKey(task: TaskSnapshot, index: number): string {
  return task._key ?? `idx-${index}`
}

function workCopies(task: TaskSnapshot): WorkSnapshot[] {
  if (Array.isArray(task.officerWork) && task.officerWork.length) {
    return task.officerWork
  }
  return [
    {
      assignee: task.assignee,
      status: task.status,
      inputs: task.inputs,
      deliverable: task.deliverable,
      periodDeliverables: task.periodDeliverables,
      inputsReviewThread: task.inputsReviewThread,
      deliverableReviewThread: task.deliverableReviewThread,
    },
  ]
}

function workAssigneeId(work: WorkSnapshot): string | null {
  return assigneeIdFromUnknown(work.assignee)
}

function assigneeIds(task: TaskSnapshot): string[] {
  return workCopies(task)
    .map(workAssigneeId)
    .filter((id): id is string => Boolean(id))
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

function workFieldsChanged(
  before: WorkSnapshot,
  after: WorkSnapshot,
  fields: readonly (keyof WorkSnapshot)[],
): boolean {
  return fields.some(field => stableJson(before[field]) !== stableJson(after[field]))
}

function isOwnWorkContentOnlyChange(
  before: TaskSnapshot,
  after: TaskSnapshot,
  viewerStaffId: string,
): boolean {
  if (fieldsChanged(before, after, ['priority', 'assignee', ...PLANNING_FIELDS])) {
    return false
  }
  if (stableJson(before.task) !== stableJson(after.task)) return false

  const beforeIds = [...assigneeIds(before)].sort().join(',')
  const afterIds = [...assigneeIds(after)].sort().join(',')
  if (beforeIds !== afterIds) return false

  const beforeByAssignee = new Map(
    workCopies(before)
      .map(work => [workAssigneeId(work), work] as const)
      .filter((entry): entry is readonly [string, WorkSnapshot] => Boolean(entry[0])),
  )
  const afterCopies = workCopies(after)

  let ownWorkChanged = false
  for (const afterWork of afterCopies) {
    const id = workAssigneeId(afterWork)
    if (!id) continue
    const beforeWork = beforeByAssignee.get(id)
    if (!beforeWork) return false
    if (stableJson(beforeWork) === stableJson(afterWork)) continue
    if (id !== viewerStaffId) return false

    if (workFieldsChanged(beforeWork, afterWork, ['assignee'])) return false

    const contentChanged = workFieldsChanged(
      beforeWork,
      afterWork,
      WORK_CONTENT_FIELDS,
    )
    const reviewThreadChanged = workFieldsChanged(beforeWork, afterWork, [
      'inputsReviewThread',
      'deliverableReviewThread',
    ])
    const statusChanged = stableJson(beforeWork.status) !== stableJson(afterWork.status)
    if (statusChanged) {
      if (
        !ASSIGNEE_STATUS_VALUES.includes(
          afterWork.status as (typeof ASSIGNEE_STATUS_VALUES)[number],
        )
      ) {
        return false
      }
      if (!contentChanged && !reviewThreadChanged) return false
    }
    ownWorkChanged = contentChanged || reviewThreadChanged || statusChanged
  }

  return ownWorkChanged
}

function assertTaskPairAllowed(
  access: SectionAccess,
  before: TaskSnapshot,
  after: TaskSnapshot,
): string | null {
  const beforeIds = [...assigneeIds(before)].sort().join(',')
  const afterIds = [...assigneeIds(after)].sort().join(',')
  if (before.cascadeKind === 'cascaded' && beforeIds !== afterIds) {
    return 'Assignee is locked for cascaded tasks'
  }

  if (
    fieldsChanged(before, after, PLANNING_FIELDS) &&
    !access.canSuperviseDetailedTasks
  ) {
    return 'Only supervisors can set reporting cycle, due date, and expected deliverables'
  }

  const officerWorkChanged =
    stableJson(workCopies(before)) !== stableJson(workCopies(after))
  const supervisorMetaChanged = fieldsChanged(before, after, SUPERVISOR_TASK_FIELDS)

  if (supervisorMetaChanged || officerWorkChanged) {
    if (!access.canSuperviseDetailedTasks) {
      if (
        !access.viewerStaffId ||
        !isOwnWorkContentOnlyChange(before, after, access.viewerStaffId)
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
      !isOwnWorkContentOnlyChange(before, after, access.viewerStaffId))
  ) {
    return 'Only supervisors can change priority, assignment, or reviews; assignees may submit inputs and deliverables on their own tasks'
  }

  return null
}

/**
 * Supervisors may edit task planning and reviews;
 * assignees may only submit inputs/deliverables on their own work copies.
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
        !canSubmitDetailedTaskWork(access, assigneeIds(beforeTasks[i]!))
      ) {
        return 'Only supervisors can add or remove detailed tasks'
      }
    }
  }

  return null
}
