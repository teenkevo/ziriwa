import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export type StaffMember = {
  _id: string
  fullName: string
  staffId?: string
}

export async function getAssistantCommissioners(): Promise<StaffMember[]> {
  const query = defineQuery(`
    *[_type == "staff" && role == "assistant_commissioner" && status == "active"] | order(coalesce(fullName, firstName + " " + lastName) asc) {
      _id,
      "fullName": coalesce(fullName, firstName + " " + lastName),
      staffId,
      idNumber,
    }
  `)

  try {
    const staff = await sanityFetch({ query, revalidate: 0 })
    return staff || []
  } catch (error) {
    console.error('Error fetching assistant commissioners', error)
    return []
  }
}

/** ACs assigned to this division (e.g. division switcher context). */
export async function getAssistantCommissionersByDivision(
  divisionId: string,
): Promise<StaffMember[]> {
  if (!divisionId) return []
  const query = defineQuery(`
    *[_type == "staff" && role == "assistant_commissioner" && status == "active" && division._ref == $divisionId] | order(coalesce(fullName, firstName + " " + lastName) asc) {
      _id,
      "fullName": coalesce(fullName, firstName + " " + lastName),
      staffId,
      idNumber,
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
    console.error('Error fetching assistant commissioners by division', error)
    return []
  }
}

/**
 * ACs in a department who are not yet assigned to a division — used when creating a new division.
 */
export async function getAssistantCommissionersAvailableForDepartment(
  departmentId: string,
): Promise<StaffMember[]> {
  if (!departmentId) return []
  const query = defineQuery(`
    *[_type == "staff" && role == "assistant_commissioner" && status == "active" && department._ref == $departmentId && !defined(division)] | order(coalesce(fullName, firstName + " " + lastName) asc) {
      _id,
      "fullName": coalesce(fullName, firstName + " " + lastName),
      staffId,
      idNumber,
    }
  `)

  try {
    const staff = await sanityFetch({
      query,
      params: { departmentId },
      revalidate: 0,
    })
    return staff || []
  } catch (error) {
    console.error(
      'Error fetching assistant commissioners available for department',
      error,
    )
    return []
  }
}
