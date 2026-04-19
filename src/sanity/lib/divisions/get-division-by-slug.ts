import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'
import { getDivisionBySlugOracle } from '@/oracle/lib/divisions/get-division-by-slug'

export type Division = {
  _id: string
  name: string
  fullName?: string
  acronym?: string
  slug?: { current: string }
  isDefault?: boolean
  department?: {
    _id: string
    fullName?: string
    acronym?: string
    slug?: { current: string }
  }
  assistantCommissioner?: { _id: string }
}

export async function getDivisionBySlug(
  slug: string,
): Promise<Division | null> {
  if (process.env.CMS_PROVIDER === 'oracle') {
    return getDivisionBySlugOracle(slug)
  }
  const query = defineQuery(`
    *[_type == "division" && slug.current == $slug][0] {
      _id,
      "name": coalesce(acronym, fullName, name),
      fullName,
      acronym,
      slug,
      isDefault,
      department->{ _id, fullName, acronym, slug },
      assistantCommissioner->{ _id },
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
