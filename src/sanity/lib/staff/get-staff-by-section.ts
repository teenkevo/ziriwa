import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export type SectionStaff = {
  _id: string
  fullName: string
  role: string
  staffId?: string
}

export async function getSupervisorsBySection(
  sectionId: string,
): Promise<SectionStaff[]> {
  const query = defineQuery(`
    *[_type == "staff"
      && role == "supervisor"
      && section._ref == $sectionId
      && status == "active"
    ] | order(coalesce(fullName, firstName + " " + lastName) asc) {
      _id,
      "fullName": coalesce(fullName, firstName + " " + lastName),
      role,
      staffId,
    }
  `)

  try {
    const staff = await sanityFetch({
      query,
      params: { sectionId },
      revalidate: 0,
    })
    return staff || []
  } catch (error) {
    console.error('Error fetching supervisors by section', error)
    return []
  }
}

export async function getOfficersBySection(
  sectionId: string,
): Promise<SectionStaff[]> {
  const query = defineQuery(`
    *[_type == "staff"
      && role == "officer"
      && section._ref == $sectionId
      && status == "active"
    ] | order(coalesce(fullName, firstName + " " + lastName) asc) {
      _id,
      "fullName": coalesce(fullName, firstName + " " + lastName),
      role,
      staffId,
    }
  `)

  try {
    const staff = await sanityFetch({
      query,
      params: { sectionId },
      revalidate: 0,
    })
    return staff || []
  } catch (error) {
    console.error('Error fetching officers by section', error)
    return []
  }
}
