import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'
import { getDivisionsByDepartmentOracle } from '@/oracle/lib/divisions/get-divisions-by-department'

export type Division = {
  _id: string
  name: string
  slug?: { current: string }
  fullName?: string
  acronym?: string
  isDefault?: boolean
  sectionCount?: number
  department?: { _id: string }
  assistantCommissioner?: { _id: string; fullName?: string }
  /** Active staff assigned to this division (directly or via a section). */
  staffCount?: number
}

export async function getDivisionsByDepartment(
  departmentId: string,
): Promise<Division[]> {
  if (process.env.CMS_PROVIDER === 'oracle') {
    return getDivisionsByDepartmentOracle(departmentId)
  }
  const query = defineQuery(`
    *[_type == "division" && department._ref == $departmentId] | order(coalesce(fullName, name) asc) {
      _id,
      "name": coalesce(acronym, fullName, name),
      slug,
      fullName,
      acronym,
      isDefault,
      department->{ _id },
      assistantCommissioner->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
      "sectionCount": count(*[_type == "section" && division._ref == ^._id]),
      "staffCount": count(*[_type == "staff" && status == "active" && (
        division._ref == ^._id || section->division._ref == ^._id
      )]),
    }
  `)

  try {
    const divisions = await sanityFetch({
      query,
      params: { departmentId },
      revalidate: 0,
    })
    return divisions || []
  } catch (error) {
    console.error('Error fetching divisions by department', error)
    return []
  }
}
