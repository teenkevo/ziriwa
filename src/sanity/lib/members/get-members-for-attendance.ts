import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export interface MemberForAttendance {
  _id: string
  fullName: string
  memberId: string
}

export async function getMembersForAttendance(): Promise<MemberForAttendance[]> {
  const query = defineQuery(`
    *[_type == "member" && status == "active"] | order(fullName asc) {
      _id,
      fullName,
      memberId
    }
  `)

  try {
    const members = (await sanityFetch({
      query,
      revalidate: 0,
    })) as MemberForAttendance[]
    return members ?? []
  } catch (error) {
    console.error('Error fetching members for attendance', error)
    return []
  }
}
