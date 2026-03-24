import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export type Division = {
  _id: string
  name: string
  slug?: { current: string }
  fullName?: string
  acronym?: string
  isDefault?: boolean
  sectionCount?: number
}

export async function getDivisionsByDepartment(
  departmentId: string,
): Promise<Division[]> {
  const query = defineQuery(`
    *[_type == "division" && department._ref == $departmentId] | order(coalesce(fullName, name) asc) {
      _id,
      "name": coalesce(acronym, fullName, name),
      slug,
      fullName,
      acronym,
      isDefault,
      "sectionCount": count(*[_type == "section" && division._ref == ^._id]),
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
