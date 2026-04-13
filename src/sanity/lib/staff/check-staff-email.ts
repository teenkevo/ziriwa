import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

/**
 * Returns true if an email matches a staff document in Sanity (performance app access).
 */
export async function checkStaffEmail(email: string): Promise<boolean> {
  const query = defineQuery(`
    *[_type == "staff" && lower(email) == lower($email)][0] {
      _id
    }
  `)

  try {
    const doc = await sanityFetch({
      query,
      params: { email },
      revalidate: 0,
    })
    return !!doc
  } catch {
    return false
  }
}
