import 'server-only'

import { client } from '@/sanity/lib/client'
import { AUDIT_RESOURCE_TYPES } from '@/lib/audit-log/types'
import type { AuditLogRow } from '@/lib/audit-log/types'

interface BatchDoc {
  _id: string
  entries?: Array<{
    _key?: string
    timestamp?: string
    authorName?: string
    authorEmail?: string
    change?: string
    resourceType?: string
    resourceId?: string
    resourceLabel?: string
    message?: string
    previousValue?: string
    newValue?: string
  }>
}

export interface GetAuditEntriesOptions {
  limit?: number
  offset?: number
  resourceType?: string
  change?: string
  search?: string
  shardLimit?: number
}

export interface GetAuditEntriesResult {
  entries: AuditLogRow[]
  total: number
  resourceTypes: { value: string; label: string }[]
}

export async function getAuditEntries(
  options: GetAuditEntriesOptions = {},
): Promise<GetAuditEntriesResult> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100)
  const offset = Math.max(options.offset ?? 0, 0)
  const shardLimit = Math.min(Math.max(options.shardLimit ?? 24, 1), 48)

  const batches = await client.fetch<BatchDoc[]>(
    /* groq */ `*[_type == "auditLogBatch"] | order(shardKey desc, _createdAt desc)[0...$shardLimit]{
      _id,
      entries[]{
        _key,
        timestamp,
        authorName,
        authorEmail,
        change,
        resourceType,
        resourceId,
        resourceLabel,
        message,
        previousValue,
        newValue
      }
    }`,
    { shardLimit },
  )

  let flat: AuditLogRow[] = []
  for (const batch of batches) {
    for (const e of batch.entries ?? []) {
      if (!e.timestamp || !e._key) continue
      flat.push({
        id: `${batch._id}:${e._key}`,
        timestamp: e.timestamp,
        authorName: e.authorName ?? '—',
        authorEmail: e.authorEmail ?? '',
        change: e.change ?? 'UPDATED',
        resourceType: e.resourceType ?? '—',
        resourceLabel: e.resourceLabel ?? e.resourceId ?? '—',
        resourceId: e.resourceId ?? '',
        message: e.message ?? '',
        previousValue: e.previousValue,
        newValue: e.newValue,
      })
    }
  }

  if (options.resourceType) {
    flat = flat.filter(e => e.resourceType === options.resourceType)
  }
  if (options.change) {
    flat = flat.filter(e => e.change === options.change)
  }
  if (options.search?.trim()) {
    const q = options.search.trim().toLowerCase()
    flat = flat.filter(
      e =>
        e.message.toLowerCase().includes(q) ||
        e.resourceLabel.toLowerCase().includes(q) ||
        e.authorName.toLowerCase().includes(q) ||
        e.authorEmail.toLowerCase().includes(q) ||
        e.resourceId.toLowerCase().includes(q),
    )
  }

  flat.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )

  const total = flat.length
  const entries = flat.slice(offset, offset + limit)

  const resourceTypes = Object.entries(AUDIT_RESOURCE_TYPES).map(
    ([value, label]) => ({ value, label }),
  )

  return { entries, total, resourceTypes }
}
