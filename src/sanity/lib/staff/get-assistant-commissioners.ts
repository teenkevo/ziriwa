import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'
import {
  getAssistantCommissionersAvailableForDepartmentOracle,
  getAssistantCommissionersByDivisionOracle,
  getAssistantCommissionersInDepartmentOracle,
  getAssistantCommissionersOracle,
} from '@/oracle/lib/staff/get-assistant-commissioners'

export type StaffMember = {
  _id: string
  fullName: string
  staffId?: string
}

export async function getAssistantCommissioners(): Promise<StaffMember[]> {
  if (process.env.CMS_PROVIDER === 'oracle') {
    return getAssistantCommissionersOracle()
  }
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
  if (process.env.CMS_PROVIDER === 'oracle') {
    return getAssistantCommissionersByDivisionOracle(divisionId)
  }
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
/** All assistant commissioners in a department (for division edit / assignment). */
export async function getAssistantCommissionersInDepartment(
  departmentId: string,
): Promise<StaffMember[]> {
  if (!departmentId) return []
  if (process.env.CMS_PROVIDER === 'oracle') {
    return getAssistantCommissionersInDepartmentOracle(departmentId)
  }
  const query = defineQuery(`
    *[_type == "staff" && role == "assistant_commissioner" && status == "active" && department._ref == $departmentId] | order(coalesce(fullName, firstName + " " + lastName) asc) {
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
      'Error fetching assistant commissioners in department',
      error,
    )
    return []
  }
}

export async function getAssistantCommissionersAvailableForDepartment(
  departmentId: string,
): Promise<StaffMember[]> {
  if (!departmentId) return []
  if (process.env.CMS_PROVIDER === 'oracle') {
    return getAssistantCommissionersAvailableForDepartmentOracle(departmentId)
  }
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
