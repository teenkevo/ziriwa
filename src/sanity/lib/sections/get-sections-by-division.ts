import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export type Section = {
  _id: string
  name: string
  slug?: { current: string }
  division?: { _id: string; name: string }
  manager?: { _id: string; fullName: string }
  order?: number
}

export async function getSectionsByDivision(
  divisionId: string,
): Promise<Section[]> {
  const query = defineQuery(`
    *[_type == "section" && division._ref == $divisionId] | order(order asc, name asc) {
      _id,
      name,
      slug,
      division->{ _id, "name": coalesce(acronym, fullName, name) },
      manager->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
      order,
    }
  `)

  try {
    const sections = await sanityFetch({
      query,
      params: { divisionId },
      revalidate: 0,
    })
    return sections || []
  } catch (error) {
    console.error('Error fetching sections by division', error)
    return []
  }
}
