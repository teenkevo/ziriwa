import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export type AttendanceStatus = 'present' | 'absent' | 'excused'

export interface MeetingAttendanceRecord {
  member: {
    _id: string
    fullName: string
    memberId: string
  }
  status: AttendanceStatus
  excusedReason?: string
}

export async function getAttendanceByMeeting(meetingId: string) {
  const query = defineQuery(`
    *[_type == "meeting" && _id == $meetingId][0].attendance[] {
      member->{
        _id,
        fullName,
        memberId
      },
      status,
      excusedReason
    }
  `)

  try {
    const attendance = (await sanityFetch({
      query,
      params: { meetingId },
      revalidate: 0,
    })) as MeetingAttendanceRecord[] | null
    return attendance ?? []
  } catch (error) {
    console.error('Error fetching attendance', error)
    return []
  }
}
