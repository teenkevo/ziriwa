import 'server-only'

import { currentUser } from '@clerk/nextjs/server'
import { writeClient } from '@/sanity/lib/write-client'
import { client } from '@/sanity/lib/client'
import type { AuditActor, RecordAuditInput } from '@/lib/audit-log/types'

/** Max embedded entries per Sanity document before opening a new batch. */
const MAX_ENTRIES_PER_BATCH = 120

const JSON_MAX = 3500

function monthlyShardKey(date = new Date()): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function safeJson(value: unknown): string | undefined {
  if (value === undefined) return undefined
  try {
    const raw = JSON.stringify(value)
    if (raw.length <= JSON_MAX) return raw
    return `${raw.slice(0, JSON_MAX)}…`
  } catch {
    return String(value).slice(0, JSON_MAX)
  }
}

export async function resolveAuditActor(): Promise<AuditActor | null> {
  const user = await currentUser()
  const emailRaw =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress
  const email = emailRaw?.trim().toLowerCase()
  if (!email) return null

  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || email

  const staffId = await client.fetch<string | null>(
    `*[_type == "staff" && lower(email) == $email && status == "active"][0]._id`,
    { email },
  )

  return { name, email, staffId: staffId ?? undefined }
}

export async function appendAuditLog(input: RecordAuditInput): Promise<void> {
  const actor = input.actor ?? (await resolveAuditActor())
  if (!actor) return

  const shardKey = monthlyShardKey()
  const entry = {
    _key: `ae-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    _type: 'auditLogEntry' as const,
    timestamp: new Date().toISOString(),
    authorName: actor.name,
    authorEmail: actor.email,
    authorStaffId: actor.staffId,
    change: input.change,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    resourceLabel: input.resourceLabel,
    message: input.message,
    actionKey: input.actionKey,
    previousValue: safeJson(input.previousValue),
    newValue: safeJson(input.newValue),
    scopeSectionId: input.scopeSectionId,
  }

  const openBatch = await writeClient.fetch<{ _id: string; entryCount?: number } | null>(
    /* groq */ `*[_type == "auditLogBatch"
      && shardKey == $shardKey
      && !defined(closedAt)
      && coalesce(entryCount, count(entries)) < $max
    ] | order(_createdAt desc)[0]{
      _id,
      entryCount
    }`,
    { shardKey, max: MAX_ENTRIES_PER_BATCH },
  )

  if (openBatch?._id) {
    const nextCount = (openBatch.entryCount ?? 0) + 1
    const patch = writeClient
      .patch(openBatch._id)
      .append('entries', [entry])
      .set({ entryCount: nextCount })

    if (nextCount >= MAX_ENTRIES_PER_BATCH) {
      patch.set({ closedAt: new Date().toISOString() })
    }

    await patch.commit()
    return
  }

  await writeClient.create({
    _type: 'auditLogBatch',
    shardKey,
    entries: [entry],
    entryCount: 1,
    ...(1 >= MAX_ENTRIES_PER_BATCH && {
      closedAt: new Date().toISOString(),
    }),
  })
}
