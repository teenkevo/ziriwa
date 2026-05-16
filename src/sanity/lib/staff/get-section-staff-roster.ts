import { client } from '@/sanity/lib/client'

export interface SectionStaffRosterRow {
  _id: string
  fullName: string
  email?: string
  role: string
  staffId?: string
  status: string
  onboardedAt: string
  isActing?: boolean
  actingFor?: { _id: string; fullName: string } | null
}

export interface SectionStaffRoster {
  manager: SectionStaffRosterRow | null
  supervisors: SectionStaffRosterRow[]
  officers: SectionStaffRosterRow[]
  activeDelegations: {
    _id: string
    fromStaff: { _id: string; fullName: string }
    toStaff: { _id: string; fullName: string }
    actingRole: string
    startDate: string
    endDate: string
  }[]
  delegationHistory: {
    _id: string
    status: string
    actingRole: string
    startDate: string
    endDate: string
    note?: string
    fromStaff: { _id: string; fullName: string }
    toStaff: { _id: string; fullName: string }
    createdAt: string
  }[]
}

const today = () => new Date().toISOString().slice(0, 10)

export async function getSectionStaffRoster(
  sectionId: string,
): Promise<SectionStaffRoster> {
  const date = today()
  return client.fetch(
    /* groq */ `{
      "manager": *[_type == "section" && _id == $sectionId][0].manager->{
        _id,
        "fullName": coalesce(fullName, firstName + " " + lastName),
        email,
        role,
        staffId,
        status,
        "onboardedAt": _createdAt
      },
      "supervisors": *[_type == "staff" && role == "supervisor" && section._ref == $sectionId] | order(fullName asc) {
        _id,
        "fullName": coalesce(fullName, firstName + " " + lastName),
        email,
        role,
        staffId,
        status,
        "onboardedAt": _createdAt
      },
      "officers": *[_type == "staff" && role == "officer" && section._ref == $sectionId] | order(fullName asc) {
        _id,
        "fullName": coalesce(fullName, firstName + " " + lastName),
        email,
        role,
        staffId,
        status,
        "onboardedAt": _createdAt
      },
      "activeDelegations": *[_type == "sectionDelegation"
        && section._ref == $sectionId
        && status in ["scheduled", "active"]
        && startDate <= $date
        && endDate >= $date
      ] | order(startDate desc) {
        _id,
        actingRole,
        startDate,
        endDate,
        "fromStaff": fromStaff->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
        "toStaff": toStaff->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) }
      },
      "delegationHistory": *[_type == "sectionDelegation" && section._ref == $sectionId]
        | order(_createdAt desc) {
        _id,
        status,
        actingRole,
        startDate,
        endDate,
        note,
        "createdAt": _createdAt,
        "fromStaff": fromStaff->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
        "toStaff": toStaff->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) }
      }
    }`,
    { sectionId, date },
  )
}
