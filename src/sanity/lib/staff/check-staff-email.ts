import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'
import { oracleQuery } from '@/lib/oracle/client'

/**
 * Returns true if an email matches a staff document in Sanity (performance app access).
 */
export async function checkStaffEmail(email: string): Promise<boolean> {
  if (process.env.CMS_PROVIDER === 'oracle') {
    try {
      const rows = await oracleQuery<{ id: string }>(
        `
          SELECT id AS "id"
          FROM staff
          WHERE lower(email) = lower(:email)
            AND status = 'active'
          FETCH FIRST 1 ROWS ONLY
        `,
        { email },
      )
      return rows.length > 0
    } catch {
      return false
    }
  }

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
