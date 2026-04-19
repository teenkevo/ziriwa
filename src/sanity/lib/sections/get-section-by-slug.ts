import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'
import { getSectionBySlugOracle } from '@/oracle/lib/sections/get-section-by-slug'

export type Section = {
  _id: string
  name: string
  slug?: { current: string }
  division?: { _id: string; name: string; slug?: { current: string } }
  manager?: { _id: string; fullName?: string }
}

export async function getSectionBySlug(
  slug: string,
): Promise<Section | null> {
  if (process.env.CMS_PROVIDER === 'oracle') {
    return getSectionBySlugOracle(slug)
  }

  const query = defineQuery(`
    *[_type == "section" && slug.current == $slug][0] {
      _id,
      name,
      slug,
      division->{ _id, "name": coalesce(acronym, fullName, name), slug },
      manager->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
    }
  `)

  try {
    const section = await sanityFetch({
      query,
      params: { slug },
      revalidate: 0,
    })
    return section || null
  } catch (error) {
    console.error('Error fetching section by slug', error)
    return null
  }
}
