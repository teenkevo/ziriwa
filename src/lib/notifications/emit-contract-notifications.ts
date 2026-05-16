import 'server-only'

import { createNotifications } from '@/lib/notifications/create-notification'
import type { CreateNotificationInput } from '@/lib/notifications/types'

type ReviewEntry = {
  role?: string
  action?: string
  message?: string
}

type TaskLike = {
  _key?: string
  task?: string
  assignee?: string | { _ref?: string } | null
  inputsReviewThread?: ReviewEntry[]
  deliverableReviewThread?: ReviewEntry[]
  periodDeliverables?: Array<{
    periodKey?: string
    deliverableReviewThread?: ReviewEntry[]
  }>
}

function assigneeRef(task: TaskLike): string | null {
  const a = task.assignee
  if (typeof a === 'string') return a
  if (a && typeof a === 'object' && typeof a._ref === 'string') return a._ref
  return null
}

function taskKey(task: TaskLike, index: number): string {
  return task._key ?? `idx-${index}`
}

function lastSupervisorReviewAction(
  before: ReviewEntry[] | undefined,
  after: ReviewEntry[] | undefined,
): 'approve' | 'reject' | null {
  const bLen = before?.length ?? 0
  const aLen = after?.length ?? 0
  if (aLen <= bLen) return null
  const entry = after?.[aLen - 1]
  if (entry?.role !== 'supervisor') return null
  if (entry.action === 'approve') return 'approve'
  if (entry.action === 'reject') return 'reject'
  return null
}

export async function emitContractTaskReviewNotifications(input: {
  beforeTasks: TaskLike[]
  afterTasks: TaskLike[]
  sectionSlug?: string
  taskLabel?: string
}): Promise<void> {
  const href = input.sectionSlug
    ? `/sections/${input.sectionSlug}?tab=contract`
    : undefined

  const beforeByKey = new Map(
    input.beforeTasks.map((t, i) => [taskKey(t, i), t]),
  )

  const notifications: CreateNotificationInput[] = []

  input.afterTasks.forEach((after, i) => {
    const key = taskKey(after, i)
    const before = beforeByKey.get(key)
    if (!before) return

    const recipientStaffId = assigneeRef(after) ?? assigneeRef(before)
    if (!recipientStaffId) return

    const label = (after.task ?? before.task ?? input.taskLabel ?? 'Task').slice(
      0,
      120,
    )

    const inputsAction = lastSupervisorReviewAction(
      before.inputsReviewThread,
      after.inputsReviewThread,
    )
    if (inputsAction) {
      notifications.push({
        recipientStaffId,
        type:
          inputsAction === 'approve'
            ? 'contract_inputs_approved'
            : 'contract_inputs_rejected',
        title:
          inputsAction === 'approve'
            ? 'Task inputs approved'
            : 'Task inputs rejected',
        body: label,
        href,
      })
    }

    const deliverableAction = lastSupervisorReviewAction(
      before.deliverableReviewThread,
      after.deliverableReviewThread,
    )
    if (deliverableAction) {
      notifications.push({
        recipientStaffId,
        type:
          deliverableAction === 'approve'
            ? 'contract_deliverable_approved'
            : 'contract_deliverable_rejected',
        title:
          deliverableAction === 'approve'
            ? 'Deliverable approved'
            : 'Deliverable rejected',
        body: label,
        href,
      })
    }

    const beforePeriods = before.periodDeliverables ?? []
    const afterPeriods = after.periodDeliverables ?? []
    afterPeriods.forEach((ap, pi) => {
      const bp = beforePeriods[pi]
      const periodAction = lastSupervisorReviewAction(
        bp?.deliverableReviewThread,
        ap.deliverableReviewThread,
      )
      if (!periodAction) return
      notifications.push({
        recipientStaffId,
        type:
          periodAction === 'approve'
            ? 'contract_deliverable_approved'
            : 'contract_deliverable_rejected',
        title:
          periodAction === 'approve'
            ? 'Period deliverable approved'
            : 'Period deliverable rejected',
        body: ap.periodKey ? `${label} (${ap.periodKey})` : label,
        href,
      })
    })
  })

  if (notifications.length > 0) {
    await createNotifications(notifications)
  }
}
