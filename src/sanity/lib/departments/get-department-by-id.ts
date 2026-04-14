import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export type Department = {
  _id: string
  name: string
  fullName?: string
  acronym?: string
  slug?: { current: string }
  commissioner?: { _id: string }
}

export async function getDepartmentById(
  id: string,
): Promise<Department | null> {
  const query = defineQuery(`
    *[_type == "department" && _id == $id][0] {
      _id,
      "name": coalesce(acronym, fullName, name),
      fullName,
      acronym,
      slug,
      commissioner->{ _id },
    }
  `)

  try {
    const department = await sanityFetch({
      query,
      params: { id },
      revalidate: 0,
    })
    return department || null
  } catch (error) {
    console.error('Error fetching department by id', error)
    return null
  }
}
