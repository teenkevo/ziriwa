import 'server-only'

import { oracleQuery } from '@/lib/oracle/client'
import type { Department } from '@/lib/department-types'

export async function getAllDepartments(): Promise<Department[]> {
  const rows = await oracleQuery<{
    _id: string
    name: string
    fullName: string
    acronym: string | null
    slugCurrent: string
    isDefault: number
  }>(
    `
      SELECT
        id AS "_id",
        coalesce(acronym, full_name) AS "name",
        full_name AS "fullName",
        acronym AS "acronym",
        slug_current AS "slugCurrent",
        is_default AS "isDefault"
      FROM departments
      ORDER BY lower(coalesce(acronym, full_name)) ASC
    `,
  )

  return rows.map(r => ({
    _id: r._id,
    name: r.name,
    slug: { current: r.slugCurrent },
    fullName: r.fullName,
    acronym: r.acronym ?? undefined,
    isDefault: Boolean(r.isDefault),
  }))
}

