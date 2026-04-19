import 'server-only'

import { oracleQuery } from '@/lib/oracle/client'
import type { StaffMember } from '@/lib/staff-types'

export async function getCommissioners(): Promise<StaffMember[]> {
  const rows = await oracleQuery<{
    _id: string
    fullName: string
    staffId: string | null
  }>(
    `
      SELECT
        id AS "_id",
        coalesce(full_name, first_name || ' ' || last_name) AS "fullName",
        id_number AS "staffId"
      FROM staff
      WHERE role = 'commissioner'
        AND status = 'active'
      ORDER BY lower(coalesce(full_name, first_name || ' ' || last_name)) ASC
    `,
  )
  return rows.map(r => ({ _id: r._id, fullName: r.fullName, staffId: r.staffId ?? undefined }))
}

