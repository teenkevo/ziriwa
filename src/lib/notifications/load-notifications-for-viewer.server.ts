import 'server-only'

import { client } from '@/sanity/lib/client'
import { getAppRole } from '@/lib/clerk-app-role.server'
import { canUseSuperadminPowers } from '@/lib/impersonation/viewer-context.server'
import { getEffectiveViewerEmail } from '@/lib/impersonation/viewer-context.server'
import { getUnsubmittedSprintNotifications } from '@/lib/notifications/get-unsubmitted-sprint-notifications'
import { notificationTypesForViewer } from '@/lib/notifications/notification-audience'
import {
  filterNotificationsForWorkspace,
  type NotificationWorkspaceContext,
} from '@/lib/notifications/notification-workspace.server'
import type { AppNotificationRow, NotificationType } from '@/lib/notifications/types'
import { getProjectWorkspaceContext } from '@/lib/workspace-mode.server'

export async function loadNotificationsForViewer(): Promise<{
  notifications: AppNotificationRow[]
  unreadCount: number
}> {
  const email = await getEffectiveViewerEmail()
  if (!email) {
    return { notifications: [], unreadCount: 0 }
  }

  const staff = await client.fetch<{ _id: string; role?: string } | null>(
    `*[_type == "staff" && lower(email) == $email && status == "active"][0]{
      _id,
      role
    }`,
    { email },
  )
  if (!staff?._id) {
    return { notifications: [], unreadCount: 0 }
  }

  const appRole = await getAppRole()
  const globalAdmin =
    (await canUseSuperadminPowers()) || appRole === 'commissioner_general'
  const allowedTypes = notificationTypesForViewer({
    staffRole: staff.role ?? null,
    appRole,
    isGlobalAdmin: globalAdmin,
  })

  const { mode, projectId } = await getProjectWorkspaceContext()
  const workspace: NotificationWorkspaceContext = {
    mode,
    projectId,
  }

  const notifications = await client.fetch<AppNotificationRow[]>(
    /* groq */ `*[_type == "appNotification" && recipient._ref == $staffId]
      | order(_createdAt desc)[0...50]{
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
    { staffId: staff._id },
  )

  let filtered =
    allowedTypes === null
      ? notifications
      : notifications.filter(n =>
          allowedTypes.includes(n.type as NotificationType),
        )

  filtered = await filterNotificationsForWorkspace(filtered, workspace)

  const showUnsubmittedSprints =
    allowedTypes === null || allowedTypes.includes('sprint_unsubmitted')

  if (showUnsubmittedSprints) {
    const live = await getUnsubmittedSprintNotifications(staff._id, workspace)
    if (live.length > 0) {
      const storedIds = new Set(filtered.map(n => n._id))
      filtered = [
        ...live.filter(n => !storedIds.has(n._id)),
        ...filtered,
      ]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 50)
    }
  }

  const unreadCount = filtered.filter(n => !n.readAt).length

  return { notifications: filtered, unreadCount }
}
