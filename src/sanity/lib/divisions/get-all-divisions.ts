import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export type Division = {
  _id: string
  name: string
  slug?: { current: string }
  fullName?: string
  acronym?: string
  isDefault?: boolean
}

export async function getAllDivisions(): Promise<Division[]> {
  const query = defineQuery(`
    *[_type == "division"] | order(coalesce(fullName, name) asc) {
      _id,
      "name": coalesce(acronym, fullName, name),
      slug,
      fullName,
      acronym,
      isDefault,
    }
  `)

  try {
    const divisions = await sanityFetch({ query, revalidate: 0 })
    return divisions || []
  } catch (error) {
    console.error('Error fetching divisions', error)
    return []
  }
}
