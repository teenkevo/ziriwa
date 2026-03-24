import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'

export type StaffMember = {
  _id: string
  fullName: string
  staffId?: string
}

export async function getCommissioners(): Promise<StaffMember[]> {
  const query = defineQuery(`
    *[_type == "staff" && role == "commissioner" && status == "active"] | order(coalesce(fullName, firstName + " " + lastName) asc) {
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
    console.error('Error fetching commissioners', error)
    return []
  }
}

/** Commissioners not yet assigned to a department (e.g. pick when creating a department). */
export async function getCommissionersUnassigned(): Promise<StaffMember[]> {
  const query = defineQuery(`
    *[_type == "staff" && role == "commissioner" && status == "active" && !defined(department)] | order(coalesce(fullName, firstName + " " + lastName) asc) {
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
    console.error('Error fetching unassigned commissioners', error)
    return []
  }
}

export async function getCommissionersByDepartment(
  departmentId: string,
): Promise<StaffMember[]> {
  const query = defineQuery(`
    *[_type == "staff" && role == "commissioner" && status == "active" && department._ref == $departmentId] | order(coalesce(fullName, firstName + " " + lastName) asc) {
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
    console.error('Error fetching commissioners by department', error)
    return []
  }
}
