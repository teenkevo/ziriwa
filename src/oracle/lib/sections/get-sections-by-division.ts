import 'server-only'

import { oracleQuery } from '@/lib/oracle/client'
import type { Section } from '@/sanity/lib/sections/get-sections-by-division'

export async function getSectionsByDivisionOracle(
  divisionId: string,
): Promise<Section[]> {
  const rows = await oracleQuery<{
    _id: string
    name: string
    slugCurrent: string
    division_id: string
    division_name: string
    manager_id: string | null
    manager_full_name: string | null
    order_number: number | null
    staffCount: number
  }>(
    `
      SELECT
        s.id AS "_id",
        s.name AS "name",
        s.slug_current AS "slugCurrent",
        d.id AS "division_id",
        coalesce(d.acronym, d.full_name) AS "division_name",
        m.id AS "manager_id",
        coalesce(m.full_name, m.first_name || ' ' || m.last_name) AS "manager_full_name",
        s.order_number AS "order_number",
        (
          SELECT COUNT(*)
          FROM staff st
          WHERE st.status = 'active' AND st.section_id = s.id
        ) AS "staffCount"
      FROM sections s
      JOIN divisions d ON d.id = s.division_id
      LEFT JOIN staff m ON m.id = s.manager_id
      WHERE s.division_id = :divisionId
      ORDER BY s.order_number NULLS LAST, lower(s.name) ASC
    `,
    { divisionId },
  )

  return rows.map(r => ({
    _id: r._id,
    name: r.name,
    slug: { current: r.slugCurrent },
    division: { _id: r.division_id, name: r.division_name },
    manager: r.manager_id
      ? { _id: r.manager_id, fullName: r.manager_full_name ?? '' }
      : undefined,
    order: r.order_number ?? undefined,
    staffCount: Number(r.staffCount ?? 0),
  }))
}

