const TASK_STATUS_LABELS: Record<string, string> = {
  to_do: 'To do',
  inputs_submitted: 'Inputs submitted',
  in_progress: 'In progress',
  delivered: 'Delivered',
  in_review: 'In review',
  done: 'Done',
}

export const DETAILED_TASK_WORK_FIELDS = [
  'status',
  'assignee',
  'assigneeName',
  'inputs',
  'inputsReviewThread',
  'deliverable',
  'deliverableReviewThread',
  'periodDeliverables',
] as const

export type DetailedTaskWorkField = (typeof DETAILED_TASK_WORK_FIELDS)[number]

export interface OfficerWorkContent {
  inputs?: unknown
  deliverable?: unknown
  periodDeliverables?: unknown
  inputsReviewThread?: unknown
  deliverableReviewThread?: unknown
}

export interface OfficerWorkCopy extends OfficerWorkContent {
  _key: string
  assignee: string | null
  assigneeName?: string | null
  status: string
}

function fileUrl(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined
  const file = (value as { file?: { asset?: { url?: string } } }).file
  return file?.asset?.url
}

export function hasOfficerWorkContent(work: OfficerWorkContent): boolean {
  if (fileUrl(work.inputs)) return true
  if (Array.isArray(work.deliverable) && work.deliverable.some(item => fileUrl(item))) {
    return true
  }
  if (Array.isArray(work.periodDeliverables)) {
    return work.periodDeliverables.some(period => {
      const deliverable = (period as { deliverable?: unknown[] } | null)?.deliverable
      return Array.isArray(deliverable) && deliverable.some(item => fileUrl(item))
    })
  }
  return false
}

export function assigneeIdFromUnknown(
  value: string | { _id?: string; _ref?: string } | null | undefined,
): string | null {
  if (!value) return null
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'object') {
    if (typeof value._id === 'string' && value._id.trim()) return value._id
    if (typeof value._ref === 'string' && value._ref.trim()) return value._ref
  }
  return null
}

export function createEmptyOfficerWork(
  assigneeId: string,
  assigneeName?: string | null,
): OfficerWorkCopy {
  const slug = assigneeId.replace(/[^a-zA-Z0-9]/g, '').slice(-16)
  return {
    _key: `ow-${slug || crypto.randomUUID().slice(0, 8)}`,
    assignee: assigneeId,
    assigneeName: assigneeName ?? null,
    status: 'to_do',
    inputsReviewThread: [],
    deliverableReviewThread: [],
    periodDeliverables: [],
    deliverable: [],
  }
}

export function lockedAssigneeIds(works: OfficerWorkCopy[]): string[] {
  return works
    .filter(work => work.assignee && hasOfficerWorkContent(work))
    .map(work => work.assignee as string)
}

export function syncOfficerWorkCopies(
  existing: OfficerWorkCopy[],
  nextAssigneeIds: string[],
  namesById?: Map<string, string>,
): OfficerWorkCopy[] {
  const keptIds = new Set(nextAssigneeIds)
  const byAssignee = new Map<string, OfficerWorkCopy>()
  for (const work of existing) {
    if (!work.assignee) continue
    if (!byAssignee.has(work.assignee)) byAssignee.set(work.assignee, work)
  }

  const next: OfficerWorkCopy[] = []
  for (const id of nextAssigneeIds) {
    const prev = byAssignee.get(id)
    if (prev) {
      next.push({
        ...prev,
        assigneeName: namesById?.get(id) ?? prev.assigneeName ?? null,
      })
      continue
    }
    next.push(createEmptyOfficerWork(id, namesById?.get(id) ?? null))
  }

  for (const work of existing) {
    if (!work.assignee || keptIds.has(work.assignee)) continue
    if (hasOfficerWorkContent(work)) next.push(work)
  }

  return next
}

export function formatAggregateStatus(works: OfficerWorkCopy[]): string {
  if (works.length === 0) return '—'
  const statuses = works.map(work => work.status || 'to_do')
  const unique = [...new Set(statuses)]
  const doneCount = statuses.filter(status => status === 'done').length
  if (unique.length === 1) {
    return TASK_STATUS_LABELS[unique[0]!] ?? unique[0]!
  }
  if (doneCount > 0) return `${doneCount}/${works.length} done`
  return unique
    .map(status => TASK_STATUS_LABELS[status] ?? status)
    .join(' · ')
}

export function formatAssigneeNames(
  works: OfficerWorkCopy[],
  officers: Array<{ _id: string; fullName?: string }>,
  fallbackName?: string | null,
): string {
  const names = works
    .map(work => {
      if (!work.assignee) return ''
      return (
        officers.find(officer => officer._id === work.assignee)?.fullName ??
        work.assigneeName ??
        fallbackName ??
        ''
      )
    })
    .filter(Boolean)
  if (names.length === 0) return '—'
  if (names.length === 1) return names[0]!
  if (names.length === 2) return `${names[0]}, ${names[1]}`
  return `${names[0]} +${names.length - 1}`
}

export function defaultOfficerWorkKey(
  works: OfficerWorkCopy[],
  options?: { viewerStaffId?: string | null; canSupervise?: boolean },
): string | null {
  if (works.length === 0) return null
  const viewerStaffId = options?.viewerStaffId
  if (!options?.canSupervise && viewerStaffId) {
    return works.find(work => work.assignee === viewerStaffId)?._key ?? null
  }
  const incomplete = works.find(work => (work.status ?? 'to_do') !== 'done')
  return (incomplete ?? works[0])?._key ?? null
}

export function findOfficerWork<T extends OfficerWorkCopy>(
  works: T[],
  workKey: string | null | undefined,
): T | null {
  if (!workKey) return works[0] ?? null
  return works.find(work => work._key === workKey) ?? works[0] ?? null
}

export function flattenOfficerWork<T extends { _key?: string }>(
  task: T,
  work: OfficerWorkCopy | null,
): T & OfficerWorkCopy {
  if (!work) {
    return {
      ...task,
      _key: task._key ?? '',
      assignee: null,
      assigneeName: null,
      status: 'to_do',
    }
  }
  return { ...task, ...work, _key: task._key ?? work._key }
}

export function pickWorkFields<T extends Record<string, unknown>>(
  updates: T,
): Pick<T, Extract<keyof T, DetailedTaskWorkField>> {
  const picked = {} as Pick<T, Extract<keyof T, DetailedTaskWorkField>>
  for (const field of DETAILED_TASK_WORK_FIELDS) {
    if (field in updates) {
      ;(picked as Record<string, unknown>)[field] = updates[field]
    }
  }
  return picked
}

export function omitWorkFields<T extends Record<string, unknown>>(
  updates: T,
): Omit<T, DetailedTaskWorkField> {
  const rest = { ...updates }
  for (const field of DETAILED_TASK_WORK_FIELDS) {
    delete rest[field]
  }
  return rest
}

export function taskHasAssignee(task: {
  assignee?: { _id?: string } | null
  officerWork?: Array<{ assignee?: { _id?: string } | null }>
}): boolean {
  if (task.officerWork?.some(work => Boolean(work.assignee?._id))) return true
  return Boolean(task.assignee?._id)
}

export function staffReference(assigneeId: string) {
  return { _type: 'reference' as const, _ref: assigneeId }
}

export function cascadeOfficerAssignment(assigneeId: string) {
  const slug = assigneeId.replace(/[^a-zA-Z0-9]/g, '').slice(-16)
  return {
    assignee: staffReference(assigneeId),
    officerWork: [
      {
        _key: `ow-${slug || crypto.randomUUID().slice(0, 8)}`,
        assignee: staffReference(assigneeId),
        status: 'to_do' as const,
      },
    ],
  }
}

export function taskHasStoredAssignee(
  task:
    | string
    | {
        assignee?: { _id?: string; _ref?: string } | null
        officerWork?: Array<{
          assignee?: { _id?: string; _ref?: string } | null
        }>
      },
): boolean {
  if (typeof task === 'string') return false
  if (task.officerWork?.some(work => Boolean(work.assignee?._id || work.assignee?._ref))) {
    return true
  }
  return Boolean(task.assignee?._id || task.assignee?._ref)
}
