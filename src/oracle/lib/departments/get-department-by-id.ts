import 'server-only'

import { oracleQuery } from '@/lib/oracle/client'
import type { Department } from '@/lib/department-types'

export async function getDepartmentById(
  id: string,
): Promise<Department | null> {
  if (!id.trim()) return null
  const rows = await oracleQuery<{
    _id: string
    name: string
    fullName: string
    acronym: string | null
    slugCurrent: string
    commissioner_id: string | null
  }>(
    `
      SELECT
        d.id AS "_id",
        coalesce(d.acronym, d.full_name) AS "name",
        d.full_name AS "fullName",
        d.acronym AS "acronym",
        d.slug_current AS "slugCurrent",
        d.commissioner_id AS "commissioner_id"
      FROM departments d
      WHERE d.id = :id
      FETCH FIRST 1 ROWS ONLY
    `,
    { id },
  )
  const r = rows[0]
  if (!r) return null
  return {
    _id: r._id,
    name: r.name,
    fullName: r.fullName,
    acronym: r.acronym ?? undefined,
    slug: { current: r.slugCurrent },
    commissioner: r.commissioner_id ? { _id: r.commissioner_id } : undefined,
  }
}
