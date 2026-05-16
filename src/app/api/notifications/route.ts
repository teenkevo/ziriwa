import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { client } from '@/sanity/lib/client'
import { parseAppRole } from '@/lib/app-role'
import { isSuperadmin } from '@/lib/authz/guards.server'
import { getUnsubmittedSprintNotifications } from '@/lib/notifications/get-unsubmitted-sprint-notifications'
import { notificationTypesForViewer } from '@/lib/notifications/notification-audience'
import type { AppNotificationRow, NotificationType } from '@/lib/notifications/types'

export async function GET() {
  try {
    const user = await currentUser()
    const emailRaw =
      user?.primaryEmailAddress?.emailAddress ??
      user?.emailAddresses?.[0]?.emailAddress
    const email = emailRaw?.trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ notifications: [], unreadCount: 0 })
    }

    const staff = await client.fetch<{ _id: string; role?: string } | null>(
      `*[_type == "staff" && lower(email) == $email && status == "active"][0]{
        _id,
        role
      }`,
      { email },
    )
    if (!staff?._id) {
      return NextResponse.json({ notifications: [], unreadCount: 0 })
    }

    const appRole = parseAppRole(
      (user?.publicMetadata as Record<string, unknown> | undefined)?.appRole,
    )
    const globalAdmin =
      (await isSuperadmin()) || appRole === 'commissioner_general'
    const allowedTypes = notificationTypesForViewer({
      staffRole: staff.role ?? null,
      appRole,
      isGlobalAdmin: globalAdmin,
    })

    const notifications = await client.fetch<AppNotificationRow[]>(
      /* groq */ `*[_type == "appNotification" && recipient._ref == $staffId]
        | order(_createdAt desc)[0...50]{
          _id,
          type,
          title,
          body,
          href,
          readAt,
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

    const showUnsubmittedSprints =
      allowedTypes === null ||
      allowedTypes.includes('sprint_unsubmitted')

    if (showUnsubmittedSprints) {
      const live = await getUnsubmittedSprintNotifications(staff._id)
      if (live.length > 0) {
        const storedIds = new Set(filtered.map(n => n._id))
        filtered = [
          ...live.filter(n => !storedIds.has(n._id)),
          ...filtered,
        ]
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime(),
          )
          .slice(0, 50)
      }
    }

    const unreadCount = filtered.filter(n => !n.readAt).length

    return NextResponse.json({ notifications: filtered, unreadCount })
  } catch (error) {
    console.error('GET notifications', error)
    return NextResponse.json(
      { error: 'Failed to load notifications' },
      { status: 500 },
    )
  }
}
