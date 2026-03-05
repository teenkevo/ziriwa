import { sanityFetch } from '../client'
import { defineQuery } from 'next-sanity'

export async function isAttendanceLocked(meetingId: string): Promise<boolean> {
  const query = defineQuery(`
    *[_type == "meeting" && _id == $meetingId][0].attendanceLockedAt
  `)
  const lockedAt = (await sanityFetch({
    query,
    params: { meetingId },
    revalidate: 0,
  })) as string | null
  return !!lockedAt
}
