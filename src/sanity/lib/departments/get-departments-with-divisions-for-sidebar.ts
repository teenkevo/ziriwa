import { defineQuery } from 'next-sanity'
import { cache } from 'react'
import { sanityFetch } from '../client'

export type SidebarDivision = {
  _id: string
  name: string
  slug?: { current: string }
  fullName?: string
}

export type SidebarDepartmentWithDivisions = {
  _id: string
  name: string
  slug?: { current: string }
  fullName?: string
  acronym?: string
  isDefault?: boolean
  divisions: SidebarDivision[]
}

export const getDepartmentsWithDivisionsForSidebar = cache(async function getDepartmentsWithDivisionsForSidebar(): Promise<
  SidebarDepartmentWithDivisions[]
> {
  const query = defineQuery(`
    *[_type == "department"] | order(coalesce(fullName, name) asc) {
      _id,
      "name": coalesce(acronym, fullName, name),
      slug,
      fullName,
      acronym,
      isDefault,
      "divisions": *[_type == "division" && department._ref == ^._id] | order(coalesce(fullName, name) asc) {
        _id,
        "name": coalesce(acronym, fullName, name),
        slug,
        fullName,
      }
    }
  `)

  try {
    const rows = (await sanityFetch({ query, revalidate: 0 })) as
      | SidebarDepartmentWithDivisions[]
      | null
    return rows ?? []
  } catch (error) {
    console.error('Error fetching departments with divisions for sidebar', error)
    return []
  }
})

export async function getSidebarDivisionsForDepartment(
  departmentId: string,
): Promise<SidebarDivision[]> {
  const query = defineQuery(`
    *[_type == "division" && department._ref == $departmentId] | order(coalesce(fullName, name) asc) {
      _id,
      "name": coalesce(acronym, fullName, name),
      slug,
      fullName,
    }
  `)

  try {
    const rows = (await sanityFetch({
      query,
      params: { departmentId },
      revalidate: 0,
    })) as SidebarDivision[] | null
    return rows ?? []
  } catch (error) {
    console.error('Error fetching sidebar divisions for department', error)
    return []
  }
}
