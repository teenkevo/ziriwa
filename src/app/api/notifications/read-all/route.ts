import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'

import { client } from '@/sanity/lib/client'
import { writeClient } from '@/sanity/lib/write-client'
import { filterNotificationsForWorkspace } from '@/lib/notifications/notification-workspace.server'
import type { AppNotificationRow } from '@/lib/notifications/types'
import { getProjectWorkspaceContext } from '@/lib/workspace-mode.server'

export async function POST() {
  try {
    const user = await currentUser()
    const emailRaw =
      user?.primaryEmailAddress?.emailAddress ??
      user?.emailAddresses?.[0]?.emailAddress
    const email = emailRaw?.trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const staffId = await client.fetch<string | null>(
      `*[_type == "staff" && lower(email) == $email && status == "active"][0]._id`,
      { email },
    )
    if (!staffId) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 403 })
    }

    const { mode, projectId } = await getProjectWorkspaceContext()
    const workspace = { mode, projectId }

    const notifications = await client.fetch<AppNotificationRow[]>(
      /* groq */ `*[_type == "appNotification"
        && recipient._ref == $staffId
        && !defined(readAt)
      ]{
        _id,
        type,
        title,
        body,
        href,
        readAt,
        workspaceScope,
        "projectId": project._ref,
        "createdAt": _createdAt
      }`,
      { staffId },
    )

    const scoped = await filterNotificationsForWorkspace(notifications, workspace)
    const readAt = new Date().toISOString()

    await Promise.all(
      scoped.map(notification =>
        writeClient.patch(notification._id).set({ readAt }).commit(),
      ),
    )

    return NextResponse.json({ success: true, marked: scoped.length })
  } catch (error) {
    console.error('POST notifications/read-all', error)
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 },
    )
  }
}
