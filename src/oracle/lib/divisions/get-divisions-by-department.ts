import 'server-only'

import { oracleQuery } from '@/lib/oracle/client'
import type { Division } from '@/sanity/lib/divisions/get-divisions-by-department'

export async function getDivisionsByDepartmentOracle(
  departmentId: string,
): Promise<Division[]> {
  const rows = await oracleQuery<{
    _id: string
    fullName: string
    acronym: string | null
    slugCurrent: string
    isDefault: number
    department_id: string
    assistant_commissioner_id: string | null
    assistant_commissioner_full_name: string | null
    sectionCount: number
    staffCount: number
  }>(
    `
      SELECT
        d.id AS "_id",
        d.full_name AS "fullName",
        d.acronym AS "acronym",
        d.slug_current AS "slugCurrent",
        d.is_default AS "isDefault",
        d.department_id AS "department_id",
        ac.id AS "assistant_commissioner_id",
        coalesce(ac.full_name, ac.first_name || ' ' || ac.last_name) AS "assistant_commissioner_full_name",
        (SELECT COUNT(*) FROM sections s WHERE s.division_id = d.id) AS "sectionCount",
        (SELECT COUNT(*)
         FROM staff s
         WHERE s.status = 'active'
           AND (s.division_id = d.id OR s.section_id IN (SELECT id FROM sections WHERE division_id = d.id))
        ) AS "staffCount"
      FROM divisions d
      LEFT JOIN staff ac ON ac.id = d.assistant_commissioner_id
      WHERE d.department_id = :departmentId
      ORDER BY lower(coalesce(d.acronym, d.full_name)) ASC
    `,
    { departmentId },
  )

  return rows.map(r => ({
    _id: r._id,
    name: r.acronym?.trim() ? r.acronym : r.fullName,
    slug: { current: r.slugCurrent },
    fullName: r.fullName,
    acronym: r.acronym ?? undefined,
    isDefault: Boolean(r.isDefault),
    department: { _id: r.department_id },
    assistantCommissioner: r.assistant_commissioner_id
      ? {
          _id: r.assistant_commissioner_id,
          fullName: r.assistant_commissioner_full_name ?? undefined,
        }
      : undefined,
    sectionCount: Number(r.sectionCount ?? 0),
    staffCount: Number(r.staffCount ?? 0),
  }))
}

