import 'server-only'

import { defineQuery } from 'next-sanity'
import { sanityFetch } from '@/sanity/lib/client'
import { oracleQuery } from '@/lib/oracle/client'

/**
 * Returns true if an email matches an active staff record in the current CMS provider.
 * Used for auth-gating access.
 */
export async function checkStaffEmail(email: string): Promise<boolean> {
  if (process.env.CMS_PROVIDER === 'oracle') {
    try {
      const normalized = email.trim().toLowerCase()

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
      if (rows.length > 0) return true

      // Bootstrap admin (e.g. first Oracle setup): allow this Clerk user until they have a staff row.
      // If we only allowed access while `COUNT(staff)=0`, the first created staff (e.g. an assistant
      // commissioner) would flip the gate off and middleware would redirect the admin to
      // /unauthorized before they add their own staff record.
      const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase()
      if (bootstrapEmail && normalized === bootstrapEmail) {
        return true
      }

      return false
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

