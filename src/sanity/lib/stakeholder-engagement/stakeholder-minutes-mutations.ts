import 'server-only'

type MinutesApprovalRecord = {
  _key?: string
  _type?: string
  assignee?: { _type: string; _ref: string }
  status?: string
  decidedAt?: string
}

type MinutesRecord = {
  _type: 'stakeholderMinutes'
  content?: string
  status?: 'draft' | 'published'
  author?: { _type: string; _ref: string }
  meetingDate?: string
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
  approvals?: MinutesApprovalRecord[]
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function buildApprovalDocs(
  approverIds: string[],
  existingApprovals: MinutesApprovalRecord[] = [],
): MinutesApprovalRecord[] {
  const existingByAssignee = new Map<string, MinutesApprovalRecord>()
  for (const approval of existingApprovals) {
    const assigneeId = approval.assignee?._ref
    if (assigneeId) existingByAssignee.set(assigneeId, approval)
  }

  return approverIds.map(assigneeId => {
    const existing = existingByAssignee.get(assigneeId)
    if (existing?.status === 'approved') {
      return {
        _type: 'stakeholderMinutesApproval',
        _key: existing._key ?? crypto.randomUUID(),
        assignee: { _type: 'reference', _ref: assigneeId },
        status: 'approved',
        decidedAt: existing.decidedAt,
      }
    }
    return {
      _type: 'stakeholderMinutesApproval',
      _key: existing?._key ?? crypto.randomUUID(),
      assignee: { _type: 'reference', _ref: assigneeId },
      status: 'pending',
    }
  })
}

function getMinutesFromEntry(entry: unknown): MinutesRecord | undefined {
  if (!entry || typeof entry !== 'object') return undefined
  const minutes = (entry as { minutes?: MinutesRecord }).minutes
  if (!minutes || typeof minutes !== 'object') return undefined
  return { ...minutes, _type: 'stakeholderMinutes' }
}

export function buildSavedMinutesDoc(options: {
  existingEntry: unknown
  content: string
  authorId?: string
  meetingDate?: string
}): MinutesRecord {
  const now = new Date().toISOString()
  const existing = getMinutesFromEntry(options.existingEntry)
  const trimmedContent = options.content.trim()

  return {
    _type: 'stakeholderMinutes',
    content: trimmedContent,
    status: existing?.status === 'published' ? 'published' : 'draft',
    author: options.authorId
      ? { _type: 'reference', _ref: options.authorId }
      : existing?.author,
    meetingDate:
      options.meetingDate?.trim() ||
      existing?.meetingDate ||
      undefined,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    publishedAt: existing?.publishedAt,
    approvals: existing?.approvals ?? [],
  }
}

export function buildMinutesApprovalsDoc(
  existingEntry: unknown,
  approverIds: string[],
): MinutesRecord {
  const existing = getMinutesFromEntry(existingEntry)
  if (!existing) {
    throw new Error('Create minutes before assigning approvals')
  }

  const now = new Date().toISOString()
  return {
    ...existing,
    _type: 'stakeholderMinutes',
    approvals: buildApprovalDocs(approverIds, existing.approvals),
    updatedAt: now,
  }
}

export function buildApprovedMinutesDoc(
  existingEntry: unknown,
  assigneeId: string,
): MinutesRecord {
  const existing = getMinutesFromEntry(existingEntry)
  if (!existing) {
    throw new Error('Minutes not found')
  }

  const approvals = (existing.approvals ?? []).map(approval => {
    if (approval.assignee?._ref !== assigneeId) return approval
    return {
      ...approval,
      _type: 'stakeholderMinutesApproval' as const,
      status: 'approved',
      decidedAt: new Date().toISOString(),
    }
  })

  const hasAssignee = approvals.some(
    approval => approval.assignee?._ref === assigneeId,
  )
  if (!hasAssignee) {
    throw new Error('You are not assigned as an approver for these minutes')
  }

  return {
    ...existing,
    _type: 'stakeholderMinutes',
    approvals,
    updatedAt: new Date().toISOString(),
  }
}

export function buildPublishedMinutesDoc(
  existingEntry: unknown,
  content?: string,
): MinutesRecord {
  const existing = getMinutesFromEntry(existingEntry)
  if (!existing) {
    throw new Error('Minutes not found')
  }

  const finalContent = (content ?? existing.content ?? '').trim()
  if (!stripHtml(finalContent)) {
    throw new Error('Minutes content is required before publishing')
  }

  const approvals = existing.approvals ?? []
  const hasPending = approvals.some(approval => approval.status !== 'approved')
  if (approvals.length > 0 && hasPending) {
    throw new Error('All assigned approvers must approve before publishing')
  }

  const now = new Date().toISOString()
  return {
    ...existing,
    _type: 'stakeholderMinutes',
    content: finalContent,
    status: 'published',
    updatedAt: now,
    publishedAt: existing.publishedAt ?? now,
  }
}
