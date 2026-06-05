import 'server-only'

import { writeClient } from '@/sanity/lib/write-client'
import type { CreateNotificationInput } from '@/lib/notifications/types'

export async function createNotification(
  input: CreateNotificationInput,
): Promise<string | null> {
  try {
    const workspaceScope = input.workspaceScope ?? 'mainstream'

    const doc = await writeClient.create({
      _type: 'appNotification',
      recipient: { _type: 'reference', _ref: input.recipientStaffId },
      type: input.type,
      title: input.title,
      body: input.body ?? '',
      href: input.href,
      workspaceScope,
      ...(workspaceScope === 'projects' && input.projectId
        ? { project: { _type: 'reference', _ref: input.projectId } }
        : {}),
      metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
    })
    return doc._id
  } catch (err) {
    console.error('createNotification failed', err)
    return null
  }
}

export async function createNotifications(
  inputs: CreateNotificationInput[],
): Promise<void> {
  await Promise.all(inputs.map(input => createNotification(input)))
}
