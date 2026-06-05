import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'
import type { StaffPickerMember } from '@/lib/staff-picker'

const staffBaseFields = /* groq */ `
  _id,
  "fullName": coalesce(fullName, firstName + " " + lastName),
  staffId,
  idNumber
`

export async function getCommissionersForPicker(): Promise<StaffPickerMember[]> {
  const query = defineQuery(`
    *[_type == "staff" && role == "commissioner" && status == "active"] | order(coalesce(fullName, firstName + " " + lastName) asc) {
      ${staffBaseFields},
      "headedDepartment": *[_type == "department" && commissioner._ref == ^._id][0]{
        _id,
        "label": coalesce(acronym, fullName, name)
      }
    }
  `)

  try {
    const rows = (await sanityFetch({ query, revalidate: 0 })) as Array<
      StaffPickerMember & {
        headedDepartment?: { _id: string; label?: string }
      }
    >
    return (rows ?? []).map(({ headedDepartment, ...rest }) => ({
      ...rest,
      assignedEntityId: headedDepartment?._id,
      assignedLabel: headedDepartment?.label,
    }))
  } catch (error) {
    console.error('Error fetching commissioners for picker', error)
    return []
  }
}

export async function getAssistantCommissionersForPicker(): Promise<
  StaffPickerMember[]
> {
  const query = defineQuery(`
    *[_type == "staff" && role == "assistant_commissioner" && status == "active"] | order(coalesce(fullName, firstName + " " + lastName) asc) {
      ${staffBaseFields},
      "headedDivision": *[_type == "division" && assistantCommissioner._ref == ^._id][0]{
        _id,
        "label": coalesce(acronym, fullName, name)
      }
    }
  `)

  try {
    const rows = (await sanityFetch({ query, revalidate: 0 })) as Array<
      StaffPickerMember & {
        headedDivision?: { _id: string; label?: string }
      }
    >
    return (rows ?? []).map(({ headedDivision, ...rest }) => ({
      ...rest,
      assignedEntityId: headedDivision?._id,
      assignedLabel: headedDivision?.label,
    }))
  } catch (error) {
    console.error('Error fetching assistant commissioners for picker', error)
    return []
  }
}

export async function getOfficersForPicker(): Promise<StaffPickerMember[]> {
  const query = defineQuery(`
    *[_type == "staff" && role == "officer" && status == "active"] | order(coalesce(fullName, firstName + " " + lastName) asc) {
      ${staffBaseFields}
    }
  `)

  try {
    return (await sanityFetch({ query, revalidate: 0 })) as StaffPickerMember[]
  } catch (error) {
    console.error('Error fetching officers for picker', error)
    return []
  }
}

export async function getSupervisorsForPicker(): Promise<StaffPickerMember[]> {
  const query = defineQuery(`
    *[_type == "staff" && role == "supervisor" && status == "active"] | order(coalesce(fullName, firstName + " " + lastName) asc) {
      ${staffBaseFields}
    }
  `)

  try {
    return (await sanityFetch({ query, revalidate: 0 })) as StaffPickerMember[]
  } catch (error) {
    console.error('Error fetching supervisors for picker', error)
    return []
  }
}

export async function getManagersForPicker(): Promise<StaffPickerMember[]> {
  const query = defineQuery(`
    *[_type == "staff" && role == "manager" && status == "active"] | order(coalesce(fullName, firstName + " " + lastName) asc) {
      ${staffBaseFields},
      "headedSection": *[_type == "section" && manager._ref == ^._id][0]{
        _id,
        "label": coalesce(acronym, fullName, name)
      }
    }
  `)

  try {
    const rows = (await sanityFetch({ query, revalidate: 0 })) as Array<
      StaffPickerMember & {
        headedSection?: { _id: string; label?: string }
      }
    >
    return (rows ?? []).map(({ headedSection, ...rest }) => ({
      ...rest,
      assignedEntityId: headedSection?._id,
      assignedLabel: headedSection?.label,
    }))
  } catch (error) {
    console.error('Error fetching managers for picker', error)
    return []
  }
}
