import 'server-only'
import { writeClient } from '../write-client'

export type AttendanceStatus = 'present' | 'absent' | 'excused'

export interface AttendanceInput {
  memberId: string
  status: AttendanceStatus
  excusedReason?: string
}

export async function upsertAttendance(
  meetingId: string,
  records: AttendanceInput[],
) {
  const attendance = records.map(({ memberId, status, excusedReason }) => {
    const item: Record<string, unknown> = {
      _key: `member-${memberId}`,
      _type: 'attendanceItem',
      member: { _type: 'reference', _ref: memberId },
      status,
    }
    if (status === 'excused' && excusedReason) {
      item.excusedReason = excusedReason
    }
    return item
  })

  await writeClient
    .patch(meetingId)
    .set({ attendance })
    .commit()
}
