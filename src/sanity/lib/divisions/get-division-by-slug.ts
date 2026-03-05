import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export type Division = {
  _id: string
  name: string
  slug?: { current: string }
}

export async function getDivisionBySlug(
  slug: string,
): Promise<Division | null> {
  const query = defineQuery(`
    *[_type == "division" && slug.current == $slug][0] {
      _id,
      "name": coalesce(acronym, fullName, name),
      slug,
    }
  `)

  try {
    const division = await sanityFetch({
      query,
      params: { slug },
      revalidate: 0,
    })
    return division || null
  } catch (error) {
    console.error('Error fetching division by slug', error)
    return null
  }
}
