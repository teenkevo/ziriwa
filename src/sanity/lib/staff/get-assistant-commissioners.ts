import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export type StaffMember = {
  _id: string
  fullName: string
  staffId?: string
}

export async function getAssistantCommissioners(): Promise<StaffMember[]> {
  const query = defineQuery(`
    *[_type == "staff" && role == "assistant_commissioner" && status == "active"] | order(coalesce(fullName, firstName + " " + lastName) asc) {
      _id,
      "fullName": coalesce(fullName, firstName + " " + lastName),
      staffId,
      idNumber,
    }
  `)

  try {
    const staff = await sanityFetch({ query, revalidate: 0 })
    return staff || []
  } catch (error) {
    console.error('Error fetching assistant commissioners', error)
    return []
  }
}
