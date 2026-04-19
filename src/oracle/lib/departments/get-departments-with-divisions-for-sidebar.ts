import 'server-only'

import { oracleQuery } from '@/lib/oracle/client'
import type {
  SidebarDepartmentWithDivisions,
  SidebarDivision,
} from '@/lib/department-types'

export async function getDepartmentsWithDivisionsForSidebar(): Promise<
  SidebarDepartmentWithDivisions[]
> {
  const deptRows = await oracleQuery<{
    _id: string
    fullName: string
    acronym: string | null
    slugCurrent: string
    isDefault: number
  }>(
    `
      SELECT
        id AS "_id",
        full_name AS "fullName",
        acronym AS "acronym",
        slug_current AS "slugCurrent",
        is_default AS "isDefault"
      FROM departments
      ORDER BY lower(coalesce(acronym, full_name)) ASC
    `,
  )

  if (!deptRows.length) return []

  const divRows = await oracleQuery<{
    department_id: string
    _id: string
    fullName: string
    acronym: string | null
    slugCurrent: string
  }>(
    `
      SELECT
        department_id AS "department_id",
        id AS "_id",
        full_name AS "fullName",
        acronym AS "acronym",
        slug_current AS "slugCurrent"
      FROM divisions
      WHERE department_id IS NOT NULL
      ORDER BY department_id, lower(coalesce(acronym, full_name)) ASC
    `,
  )

  const divsByDept = new Map<string, SidebarDivision[]>()
  for (const d of divRows) {
    const list = divsByDept.get(d.department_id) ?? []
    list.push({
      _id: d._id,
      name: d.acronym?.trim() ? d.acronym : d.fullName,
      slug: { current: d.slugCurrent },
      fullName: d.fullName,
    })
    divsByDept.set(d.department_id, list)
  }

  return deptRows.map(d => ({
    _id: d._id,
    name: d.acronym?.trim() ? d.acronym : d.fullName,
    slug: { current: d.slugCurrent },
    fullName: d.fullName,
    acronym: d.acronym ?? undefined,
    isDefault: Boolean(d.isDefault),
    divisions: divsByDept.get(d._id) ?? [],
  }))
}

