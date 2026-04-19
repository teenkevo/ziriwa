import 'server-only'

import { oracleQuery } from '@/lib/oracle/client'
import type { DepartmentListRow } from '@/lib/department-types'

export async function getAllDepartmentsForList(): Promise<DepartmentListRow[]> {
  const rows = await oracleQuery<{
    _id: string
    fullName: string
    acronym: string | null
    slugCurrent: string
    isDefault: number
    commissioner_id: string | null
    commissioner_full_name: string | null
    staffCount: number
  }>(
    `
      SELECT
        d.id AS "_id",
        d.full_name AS "fullName",
        d.acronym AS "acronym",
        d.slug_current AS "slugCurrent",
        d.is_default AS "isDefault",
        c.id AS "commissioner_id",
        coalesce(c.full_name, c.first_name || ' ' || c.last_name) AS "commissioner_full_name",
        (SELECT COUNT(*)
         FROM staff s
         WHERE s.status = 'active' AND s.department_id = d.id) AS "staffCount"
      FROM departments d
      LEFT JOIN staff c ON c.id = d.commissioner_id
      ORDER BY lower(coalesce(d.acronym, d.full_name)) ASC
    `,
  )

  const divisionNames = await oracleQuery<{
    department_id: string
    division_name: string
  }>(
    `
      SELECT
        department_id AS "department_id",
        full_name AS "division_name"
      FROM divisions
      WHERE department_id IS NOT NULL
    `,
  )

  const divisionNamesByDept = new Map<string, string[]>()
  for (const r of divisionNames) {
    if (!divisionNamesByDept.has(r.department_id))
      divisionNamesByDept.set(r.department_id, [])
    divisionNamesByDept.get(r.department_id)!.push(r.division_name)
  }

  return rows.map(r => ({
    _id: r._id,
    name: r.acronym?.trim() ? r.acronym : r.fullName,
    slug: { current: r.slugCurrent },
    fullName: r.fullName,
    acronym: r.acronym ?? undefined,
    isDefault: Boolean(r.isDefault),
    commissioner: r.commissioner_id
      ? { _id: r.commissioner_id, fullName: r.commissioner_full_name ?? undefined }
      : undefined,
    staffCount: Number(r.staffCount ?? 0),
    divisionNames: divisionNamesByDept.get(r._id) ?? [],
    initiativeProgressPercent: 0,
    initiativeProgressCompleted: 0,
    initiativeProgressTotal: 0,
  }))
}
