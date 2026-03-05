import { NextRequest, NextResponse } from 'next/server'
import { getAttendanceByMeeting } from '@/sanity/lib/meetings/get-attendance-by-meeting'
import { isAttendanceLocked } from '@/sanity/lib/meetings/get-meeting-attendance-lock'
import { lockAttendanceAndCreateVerification } from '@/sanity/lib/meetings/lock-attendance-and-create-verification'
import { upsertAttendance } from '@/sanity/lib/meetings/upsert-attendance'
import type { AttendanceStatus } from '@/sanity/lib/meetings/upsert-attendance'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: meetingId } = await params
  if (!meetingId) {
    return NextResponse.json({ error: 'Meeting ID required' }, { status: 400 })
  }
  try {
    const attendance = await getAttendanceByMeeting(meetingId)
    return NextResponse.json(attendance)
  } catch (error) {
    console.error('Error fetching attendance', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance' },
      { status: 500 },
    )
  }
}

interface BodyItem {
  memberId: string
  status: AttendanceStatus
  excusedReason?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: meetingId } = await params

  if (!meetingId) {
    return NextResponse.json({ error: 'Meeting ID required' }, { status: 400 })
  }

  let body: BodyItem[]

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  if (!Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Body must be an array of { memberId, status }' },
      { status: 400 },
    )
  }

  const validStatuses: AttendanceStatus[] = ['present', 'absent', 'excused']

  for (const item of body) {
    if (
      !item ||
      typeof item.memberId !== 'string' ||
      !validStatuses.includes(item.status)
    ) {
      return NextResponse.json(
        { error: 'Each item must have memberId (string) and status (present|absent|excused)' },
        { status: 400 },
      )
    }
    if (
      item.status === 'excused' &&
      (!item.excusedReason || typeof item.excusedReason !== 'string' || !item.excusedReason.trim())
    ) {
      return NextResponse.json(
        { error: 'Reason for excusal is required when status is Excused' },
        { status: 400 },
      )
    }
  }

  try {
    const locked = await isAttendanceLocked(meetingId)
    if (locked) {
      return NextResponse.json(
        { error: 'Attendance for this meeting is locked and cannot be modified' },
        { status: 409 },
      )
    }

    await upsertAttendance(meetingId, body)
    const { verificationId } =
      await lockAttendanceAndCreateVerification(meetingId)

    return NextResponse.json({ success: true, verificationId })
  } catch (error) {
    console.error('Error saving attendance', error)
    return NextResponse.json(
      { error: 'Failed to save attendance' },
      { status: 500 },
    )
  }
}
