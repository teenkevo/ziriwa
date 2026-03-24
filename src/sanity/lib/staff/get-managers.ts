import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export type StaffMember = {
  _id: string
  fullName: string
  staffId?: string
}

export async function getManagers(): Promise<StaffMember[]> {
  const query = defineQuery(`
    *[_type == "staff" && role == "manager" && status == "active"] | order(coalesce(fullName, firstName + " " + lastName) asc) {
      _id,
      "fullName": coalesce(fullName, firstName + " " + lastName),
      staffId,
    }
  `)

  try {
    const staff = await sanityFetch({ query, revalidate: 0 })
    return staff || []
  } catch (error) {
    console.error('Error fetching managers', error)
    return []
  }
}

/** Managers in this division (via section or direct division ref). */
export async function getManagersByDivision(
  divisionId: string,
): Promise<StaffMember[]> {
  if (!divisionId) return []
  const query = defineQuery(`
    *[_type == "staff" && role == "manager" && status == "active" && (
      division._ref == $divisionId ||
      section->division._ref == $divisionId
    )] | order(coalesce(fullName, firstName + " " + lastName) asc) {
      _id,
      "fullName": coalesce(fullName, firstName + " " + lastName),
      staffId,
    }
  `)

  try {
    const staff = await sanityFetch({
      query,
      params: { divisionId },
      revalidate: 0,
    })
    return staff || []
  } catch (error) {
    console.error('Error fetching managers by division', error)
    return []
  }
}

/**
 * Managers tied to this division who do not yet head a section — pick when creating a section.
 */
export async function getManagersAvailableForDivision(
  divisionId: string,
): Promise<StaffMember[]> {
  if (!divisionId) return []
  const query = defineQuery(`
    *[_type == "staff" && role == "manager" && status == "active" && division._ref == $divisionId && !defined(section)] | order(coalesce(fullName, firstName + " " + lastName) asc) {
      _id,
      "fullName": coalesce(fullName, firstName + " " + lastName),
      staffId,
    }
  `)

  try {
    const staff = await sanityFetch({
      query,
      params: { divisionId },
      revalidate: 0,
    })
    return staff || []
  } catch (error) {
    console.error('Error fetching managers available for division', error)
    return []
  }
}
