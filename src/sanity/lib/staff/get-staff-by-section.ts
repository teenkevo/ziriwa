import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'
import {
  getSupervisorsBySection as getSupervisorsBySectionOracle,
  getOfficersBySection as getOfficersBySectionOracle,
  getSupervisorsOracle,
  getOfficersOracle,
} from '@/oracle/lib/staff/get-staff-by-section'

export type SectionStaff = {
  _id: string
  fullName: string
  role: string
  staffId?: string
}

/** All active supervisors (e.g. pickers not scoped to a section). */
export async function getSupervisors(): Promise<SectionStaff[]> {
  if (process.env.CMS_PROVIDER === 'oracle') {
    return getSupervisorsOracle()
  }

  const query = defineQuery(`
    *[_type == "staff"
      && role == "supervisor"
      && status == "active"
    ] | order(coalesce(fullName, firstName + " " + lastName) asc) {
      _id,
      "fullName": coalesce(fullName, firstName + " " + lastName),
      role,
      staffId,
    }
  `)

  try {
    const staff = await sanityFetch({ query, revalidate: 0 })
    return staff || []
  } catch (error) {
    console.error('Error fetching supervisors', error)
    return []
  }
}

/** All active officers (e.g. pickers not scoped to a section). */
export async function getOfficers(): Promise<SectionStaff[]> {
  if (process.env.CMS_PROVIDER === 'oracle') {
    return getOfficersOracle()
  }

  const query = defineQuery(`
    *[_type == "staff"
      && role == "officer"
      && status == "active"
    ] | order(coalesce(fullName, firstName + " " + lastName) asc) {
      _id,
      "fullName": coalesce(fullName, firstName + " " + lastName),
      role,
      staffId,
    }
  `)

  try {
    const staff = await sanityFetch({ query, revalidate: 0 })
    return staff || []
  } catch (error) {
    console.error('Error fetching officers', error)
    return []
  }
}

export async function getSupervisorsBySection(
  sectionId: string,
): Promise<SectionStaff[]> {
  if (process.env.CMS_PROVIDER === 'oracle') {
    return getSupervisorsBySectionOracle(sectionId)
  }

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
  if (process.env.CMS_PROVIDER === 'oracle') {
    return getOfficersBySectionOracle(sectionId)
  }

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
