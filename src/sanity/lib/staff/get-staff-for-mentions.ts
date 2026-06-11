import { defineQuery } from 'next-sanity'

import { sanityFetch } from '../client'

export interface StaffMentionRow {
  _id: string
  fullName: string
  staffId?: string
  role?: string
}

export async function getStaffForMentions(
  query = '',
  limit = 25,
): Promise<StaffMentionRow[]> {
  const q = query.trim().toLowerCase()

  const groq = defineQuery(`
    *[_type == "staff" && status == "active" && (
      !defined($q) || $q == "" ||
      lower(coalesce(fullName, firstName + " " + lastName)) match "*" + $q + "*" ||
      lower(coalesce(staffId, "")) match "*" + $q + "*"
    )] | order(coalesce(fullName, firstName + " " + lastName) asc) [0...$limit] {
      _id,
      "fullName": coalesce(fullName, firstName + " " + lastName),
      staffId,
      role
    }
  `)

  try {
    const rows = (await sanityFetch({
      query: groq,
      params: { q, limit },
      revalidate: 60,
    })) as StaffMentionRow[]

    return rows ?? []
  } catch (error) {
    console.error('Error fetching staff for mentions', error)
    return []
  }
}
