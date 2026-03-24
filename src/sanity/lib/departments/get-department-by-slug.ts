import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export type Department = {
  _id: string
  name: string
  fullName?: string
  slug?: { current: string }
}

export async function getDepartmentBySlug(
  slug: string,
): Promise<Department | null> {
  const query = defineQuery(`
    *[_type == "department" && slug.current == $slug][0] {
      _id,
      "name": coalesce(acronym, fullName, name),
      fullName,
      slug,
    }
  `)

  try {
    const department = await sanityFetch({
      query,
      params: { slug },
      revalidate: 0,
    })
    return department || null
  } catch (error) {
    console.error('Error fetching department by slug', error)
    return null
  }
}
