import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export type Section = {
  _id: string
  name: string
  slug?: { current: string }
  division?: { _id: string; name: string }
  order?: number
}

export async function getAllSections(): Promise<Section[]> {
  const query = defineQuery(`
    *[_type == "section"] | order(division->name asc, order asc, name asc) {
      _id,
      name,
      slug,
      division->{ _id, name },
      order,
    }
  `)

  try {
    const sections = await sanityFetch({ query, revalidate: 0 })
    return sections || []
  } catch (error) {
    console.error('Error fetching sections', error)
    return []
  }
}
