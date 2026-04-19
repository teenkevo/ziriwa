import 'server-only'

import { oracleQuery } from '@/lib/oracle/client'
import type { Division } from '@/sanity/lib/divisions/get-division-by-slug'

export async function getDivisionBySlugOracle(
  slug: string,
): Promise<Division | null> {
  const rows = await oracleQuery<{
    _id: string
    name: string
    fullName: string
    acronym: string | null
    slugCurrent: string
    isDefault: number
    department_id: string | null
    department_full_name: string | null
    department_acronym: string | null
    department_slug: string | null
    assistant_commissioner_id: string | null
  }>(
    `
      SELECT
        d.id AS "_id",
        coalesce(d.acronym, d.full_name) AS "name",
        d.full_name AS "fullName",
        d.acronym AS "acronym",
        d.slug_current AS "slugCurrent",
        d.is_default AS "isDefault",
        dep.id AS "department_id",
        dep.full_name AS "department_full_name",
        dep.acronym AS "department_acronym",
        dep.slug_current AS "department_slug",
        d.assistant_commissioner_id AS "assistant_commissioner_id"
      FROM divisions d
      LEFT JOIN departments dep ON dep.id = d.department_id
      WHERE d.slug_current = :slug
      FETCH FIRST 1 ROWS ONLY
    `,
    { slug },
  )
  const r = rows[0]
  if (!r) return null
  return {
    _id: r._id,
    name: r.name,
    fullName: r.fullName,
    acronym: r.acronym ?? undefined,
    slug: { current: r.slugCurrent },
    isDefault: Boolean(r.isDefault),
    department: r.department_id
      ? {
          _id: r.department_id,
          fullName: r.department_full_name ?? undefined,
          acronym: r.department_acronym ?? undefined,
          slug: r.department_slug ? { current: r.department_slug } : undefined,
        }
      : undefined,
    assistantCommissioner: r.assistant_commissioner_id
      ? { _id: r.assistant_commissioner_id }
      : undefined,
  }
}

