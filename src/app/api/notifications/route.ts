import { NextResponse } from 'next/server'

import { loadNotificationsForViewer } from '@/lib/notifications/load-notifications-for-viewer.server'

export async function GET() {
  try {
    return NextResponse.json(await loadNotificationsForViewer())
  } catch (error) {
    console.error('GET notifications', error)
    return NextResponse.json(
      { error: 'Failed to load notifications' },
      { status: 500 },
    )
  }
}
