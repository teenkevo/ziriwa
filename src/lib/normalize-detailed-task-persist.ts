import { staffReference } from '@/lib/detailed-task-assignees'

const TASK_STATUSES = [
  'to_do',
  'inputs_submitted',
  'in_progress',
  'delivered',
  'in_review',
  'done',
]

type FileAsset = { _ref?: string; _id?: string }

type ReviewEntryInput = {
  _key?: string
  author?: string | { _id?: string } | null
  role?: string
  action?: string
  message?: string
  createdAt?: string
  file?: { asset?: FileAsset }
}

type DeliverableInput = {
  _key?: string
  file?: { asset?: { _ref?: string; _id?: string } }
  tag?: string
  locked?: boolean
}

type PeriodDeliverableInput = {
  _key?: string
  periodKey?: string
  status?: string
  submittedAt?: string
  deliverable?: DeliverableInput[]
  deliverableReviewThread?: ReviewEntryInput[]
}

export type OfficerWorkPersistInput = {
  _key?: string
  assignee?: string | null
  status?: string
  inputs?: {
    file?: { asset?: FileAsset }
    submittedAt?: string
  }
  inputsReviewThread?: ReviewEntryInput[]
  deliverableReviewThread?: ReviewEntryInput[]
  deliverable?: DeliverableInput[]
  periodDeliverables?: PeriodDeliverableInput[]
}

function authorRef(author: ReviewEntryInput['author']) {
  const id = typeof author === 'string' ? author : author?._id
  return id ? staffReference(id) : undefined
}

function fileRef(asset?: FileAsset) {
  const id = asset?._ref ?? asset?._id
  if (!id) return undefined
  return {
    _type: 'file' as const,
    asset: { _type: 'reference' as const, _ref: id },
  }
}

function normalizeReviewThread(
  entries: ReviewEntryInput[] | undefined,
  keyPrefix: string,
) {
  if (!Array.isArray(entries)) return undefined
  return entries
    .map((entry, index) => {
      if (!entry.action) return null
      const file = fileRef(entry.file?.asset)
      const out: Record<string, unknown> = {
        _key:
          entry._key ?? `${keyPrefix}-${index}-${crypto.randomUUID().slice(0, 8)}`,
        author: authorRef(entry.author),
        role: ['officer', 'supervisor'].includes(entry.role || '')
          ? entry.role
          : undefined,
        action: ['submit', 'reject', 'approve', 'respond'].includes(
          entry.action,
        )
          ? entry.action
          : undefined,
        message: typeof entry.message === 'string' ? entry.message : undefined,
        createdAt: entry.createdAt ?? new Date().toISOString(),
      }
      if (file) out.file = file
      return out
    })
    .filter(Boolean)
}

function normalizeDeliverable(items: DeliverableInput[] | undefined) {
  if (!Array.isArray(items)) return undefined
  return items
    .map((item, index) => {
      const file = fileRef(item.file?.asset)
      if (!file) return null
      return {
        _key: item._key ?? `ev-${index}-${crypto.randomUUID().slice(0, 8)}`,
        file,
        tag: item.tag === 'main' ? 'main' : 'support',
        locked: item.locked === true,
      }
    })
    .filter(Boolean)
}

function normalizePeriodDeliverables(
  items: PeriodDeliverableInput[] | undefined,
) {
  if (!Array.isArray(items)) return undefined
  return items.map((period, index) => ({
    _key: period._key ?? `pd-${index}-${crypto.randomUUID().slice(0, 8)}`,
    periodKey: period.periodKey,
    status: period.status ?? 'pending',
    submittedAt: period.submittedAt,
    deliverable: normalizeDeliverable(period.deliverable),
    deliverableReviewThread: normalizeReviewThread(
      period.deliverableReviewThread,
      'pd-thread',
    ),
  }))
}

function normalizeInputs(inputs: OfficerWorkPersistInput['inputs']) {
  if (!inputs || typeof inputs !== 'object') return undefined
  const file = fileRef(inputs.file?.asset)
  if (!file) return undefined
  return {
    file,
    submittedAt: inputs.submittedAt ?? new Date().toISOString(),
  }
}

export function normalizeOfficerWorkCopies(
  copies: OfficerWorkPersistInput[] | undefined,
  fallbackAssigneeId?: string | null,
): Record<string, unknown>[] {
  const source =
    Array.isArray(copies) && copies.length > 0
      ? copies
      : fallbackAssigneeId
        ? [{ assignee: fallbackAssigneeId, status: 'to_do' }]
        : []

  return source
    .map((copy, index) => {
      const assigneeId =
        typeof copy.assignee === 'string' && copy.assignee.trim()
          ? copy.assignee.trim()
          : fallbackAssigneeId
      if (!assigneeId) return null
      const work: Record<string, unknown> = {
        _key:
          copy._key ?? `ow-${index}-${crypto.randomUUID().slice(0, 8)}`,
        assignee: staffReference(assigneeId),
        status: TASK_STATUSES.includes(copy.status || '')
          ? copy.status
          : 'to_do',
      }
      const inputs = normalizeInputs(copy.inputs)
      if (inputs) work.inputs = inputs
      const inputsThread = normalizeReviewThread(
        copy.inputsReviewThread,
        'thread',
      )
      if (inputsThread) work.inputsReviewThread = inputsThread
      const deliverableThread = normalizeReviewThread(
        copy.deliverableReviewThread,
        'dr-thread',
      )
      if (deliverableThread) work.deliverableReviewThread = deliverableThread
      const deliverable = normalizeDeliverable(copy.deliverable)
      if (deliverable) work.deliverable = deliverable
      const periodDeliverables = normalizePeriodDeliverables(
        copy.periodDeliverables,
      )
      if (periodDeliverables) work.periodDeliverables = periodDeliverables
      return work
    })
    .filter((copy): copy is Record<string, unknown> => Boolean(copy))
}

export function storedTaskAssigneeId(stored: Record<string, unknown> | undefined) {
  if (!stored) return null
  const work = stored.officerWork
  if (Array.isArray(work) && work[0] && typeof work[0] === 'object') {
    const assignee = (work[0] as { assignee?: { _ref?: string } }).assignee
    if (assignee?._ref) return assignee._ref
  }
  const assignee = stored.assignee
  if (
    assignee &&
    typeof assignee === 'object' &&
    '_ref' in assignee &&
    typeof (assignee as { _ref?: string })._ref === 'string'
  ) {
    return (assignee as { _ref: string })._ref
  }
  return null
}
