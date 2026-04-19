import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'
import { getSectionsByDivisionOracle } from '@/oracle/lib/sections/get-sections-by-division'

export type Section = {
  _id: string
  name: string
  slug?: { current: string }
  division?: { _id: string; name: string }
  manager?: { _id: string; fullName: string }
  order?: number
  /** Active staff tied to this section (manager, supervisors, officers). */
  staffCount?: number
}

export async function getSectionsByDivision(
  divisionId: string,
): Promise<Section[]> {
  if (process.env.CMS_PROVIDER === 'oracle') {
    return getSectionsByDivisionOracle(divisionId)
  }
  const query = defineQuery(`
    *[_type == "section" && division._ref == $divisionId] | order(order asc, name asc) {
      _id,
      name,
      slug,
      division->{ _id, "name": coalesce(acronym, fullName, name) },
      manager->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
      order,
      "staffCount": count(*[_type == "staff" && status == "active" && section._ref == ^._id]),
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
