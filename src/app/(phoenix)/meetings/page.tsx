import { Metadata } from 'next'
import { getAllMeetings } from '@/sanity/lib/meetings/get-all-meeting-minutes'
import { getMembersForAttendance } from '@/sanity/lib/members/get-members-for-attendance'
import { MeetingsPage } from '@/features/meetings/meeting-minutes'

export const metadata: Metadata = {
  title: 'Meetings',
}

export default async function MeetingsRoute() {
  const [meetings, members] = await Promise.all([
    getAllMeetings(),
    getMembersForAttendance(),
  ])

  return <MeetingsPage meetings={meetings} members={members} />
}
