import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export type Department = {
  _id: string
  name: string
  slug?: { current: string }
  fullName?: string
  acronym?: string
  isDefault?: boolean
}

export async function getAllDepartments(): Promise<Department[]> {
  const query = defineQuery(`
    *[_type == "department"] | order(coalesce(fullName, name) asc) {
      _id,
      "name": coalesce(acronym, fullName, name),
      slug,
      fullName,
      acronym,
      isDefault,
    }
  `)

  try {
    const departments = await sanityFetch({ query, revalidate: 0 }) as Department[]
    return departments || []
  } catch (error) {
    console.error('Error fetching departments', error)
    return []
  }
}
