import type { ResultSet } from 'oracledb'
import { oracleQuery } from '@/lib/oracle/client'

export type Section = {
  _id: string
  name: string
  slug?: { current: string }
  division?: { _id: string; name: string; slug?: { current: string } }
  manager?: { _id: string; fullName?: string }
}

function fullNameExpr(alias: string) {
  // Qualify columns to avoid ambiguity across joins.
  return `coalesce(${alias}.full_name, ${alias}.first_name || ' ' || ${alias}.last_name)`
}

export async function getSectionBySlugOracle(
  slug: string,
): Promise<Section | null> {
  const rows = await oracleQuery<any>(
    `
      SELECT
        s.id AS "_id",
        s.name AS "name",
        s.slug_current AS "section_slug_current",
        d.id AS "division_id",
        coalesce(d.acronym, d.full_name) AS "division_name",
        d.slug_current AS "division_slug_current",
        m.id AS "manager_id",
        ${fullNameExpr('m')} AS "manager_full_name"
      FROM sections s
      JOIN divisions d ON d.id = s.division_id
      JOIN staff m ON m.id = s.manager_id
      WHERE s.slug_current = :slug
      FETCH FIRST 1 ROWS ONLY
    `,
    { slug },
  )

  const r = rows[0]
  if (!r) return null

  return {
    _id: r._id,
    name: r.name,
    slug: r.section_slug_current ? { current: r.section_slug_current } : undefined,
    division: {
      _id: r.division_id,
      name: r.division_name,
      slug: r.division_slug_current
        ? { current: r.division_slug_current }
        : undefined,
    },
    manager: {
      _id: r.manager_id,
      fullName: r.manager_full_name,
    },
  }
}

