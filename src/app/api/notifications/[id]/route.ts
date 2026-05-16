import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { writeClient } from '@/sanity/lib/write-client'
import { client } from '@/sanity/lib/client'
import { isVirtualNotificationId } from '@/lib/notifications/virtual-notification'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params
    const body = await req.json()
    const { read } = body

    if (isVirtualNotificationId(id)) {
      return NextResponse.json({ success: true })
    }

    const notification = await writeClient.fetch<{ recipientId?: string } | null>(
      `*[_type == "appNotification" && _id == $id][0]{
        "recipientId": recipient._ref
      }`,
      { id },
    )
    if (!notification?.recipientId || notification.recipientId !== staffId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (read) {
      await writeClient
        .patch(id)
        .set({ readAt: new Date().toISOString() })
        .commit()
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH notification', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 },
    )
  }
}
