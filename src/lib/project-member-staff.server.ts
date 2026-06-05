import 'server-only'

import { PROJECT_ROLE_LABELS, type ProjectRole } from '@/lib/project-role'
import { client } from '@/sanity/lib/client'
import type { SectionStaffRoster } from '@/sanity/lib/staff/get-section-staff-roster'

export async function isProjectWorkstreamSection(
  sectionId: string,
): Promise<boolean> {
  return client.fetch<boolean>(
    /* groq */ `defined(*[_type == "section" && _id == $sectionId && defined(project._ref)][0]._id)`,
    { sectionId },
  )
}

export async function getProjectWorkstreamSupervisorIds(
  sectionId: string,
): Promise<string[]> {
  const [fromMembers, leadRef] = await Promise.all([
    client.fetch<string[]>(
      /* groq */ `
        *[_type == "projectMember"
          && status == "active"
          && role == "workstream_lead"
          && workstream._ref == $sectionId
        ].staff._ref
      `,
      { sectionId },
    ),
    client.fetch<string | null>(
      /* groq */ `*[_type == "section" && _id == $sectionId][0].workstreamLead._ref`,
      { sectionId },
    ),
  ])

  const ids = new Set(fromMembers ?? [])
  if (leadRef) ids.add(leadRef)
  return [...ids]
}

export async function getProjectWorkstreamOfficerIds(
  sectionId: string,
): Promise<string[]> {
  return client.fetch<string[]>(
    /* groq */ `
      *[_type == "projectMember"
        && status == "active"
        && role == "workstream_member"
        && workstream._ref == $sectionId
      ].staff._ref
    `,
    { sectionId },
  )
}

type ProjectWorkstreamStaffRow = {
  _id: string
  fullName: string
  email?: string
  staffId?: string
  projectRole: ProjectRole
  status: string
  onboardedAt: string
}

async function getProjectWorkstreamMemberRows(
  workstreamId: string,
): Promise<ProjectWorkstreamStaffRow[]> {
  const rows = await client.fetch<
    {
      staffId: string
      fullName: string
      email?: string
      staffIdNumber?: string
      projectRole: ProjectRole
      status?: string
      onboardedAt: string
    }[]
  >(
    /* groq */ `
      *[_type == "projectMember"
        && status == "active"
        && workstream._ref == $workstreamId
        && role in ["workstream_lead", "workstream_member"]
      ] | order(
        select(role == "workstream_lead" => 0, 1) asc,
        staff->fullName asc
      ) {
        "staffId": staff._ref,
        "fullName": coalesce(
          staff->fullName,
          staff->firstName + " " + staff->lastName,
          staff->email,
          "Unknown"
        ),
        "email": staff->email,
        "staffIdNumber": staff->staffId,
        "projectRole": role,
        status,
        "onboardedAt": _createdAt
      }
    `,
    { workstreamId },
  )

  return (rows ?? [])
    .filter(row => row.staffId)
    .map(row => ({
      _id: row.staffId,
      fullName: row.fullName?.trim() || row.email?.trim() || 'Unknown',
      email: row.email,
      staffId: row.staffIdNumber,
      projectRole: row.projectRole,
      status: row.status ?? 'active',
      onboardedAt: row.onboardedAt,
    }))
}

function toRosterRow(row: ProjectWorkstreamStaffRow) {
  return {
    _id: row._id,
    fullName: row.fullName,
    email: row.email,
    role: row.projectRole,
    staffId: row.staffId,
    status: row.status,
    onboardedAt: row.onboardedAt,
  }
}

/** Staff roster for a project workstream — sourced from projectMember, not mainstream staff.role. */
export async function getProjectWorkstreamStaffRoster(
  workstreamId: string,
): Promise<SectionStaffRoster> {
  const rows = await getProjectWorkstreamMemberRows(workstreamId)
  const leads = rows.filter(row => row.projectRole === 'workstream_lead')
  const members = rows.filter(row => row.projectRole === 'workstream_member')

  return {
    manager: null,
    supervisors: leads.map(toRosterRow),
    officers: members.map(toRosterRow),
    activeDelegations: [],
    delegationHistory: [],
  }
}

export async function getProjectWorkstreamStaffPickers(
  workstreamId: string,
): Promise<{
  supervisors: { _id: string; fullName: string; role: string; staffId?: string }[]
  officers: { _id: string; fullName: string; role: string; staffId?: string }[]
}> {
  const rows = await getProjectWorkstreamMemberRows(workstreamId)

  const toPicker = (row: ProjectWorkstreamStaffRow) => ({
    _id: row._id,
    fullName: row.fullName,
    role: row.projectRole,
    staffId: row.staffId,
  })

  return {
    supervisors: rows
      .filter(row => row.projectRole === 'workstream_lead')
      .map(toPicker),
    officers: rows
      .filter(row => row.projectRole === 'workstream_member')
      .map(toPicker),
  }
}

export function projectRoleDisplayLabel(role: ProjectRole | string): string {
  return PROJECT_ROLE_LABELS[role as ProjectRole] ?? String(role)
}
