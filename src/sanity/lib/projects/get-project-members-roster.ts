import 'server-only'

import type { ProjectRole } from '@/lib/project-role'
import { client } from '@/sanity/lib/client'

export interface ProjectMemberRosterRow {
  _id: string
  memberId: string
  fullName: string
  email?: string
  staffId?: string
  projectRole: ProjectRole
  workstreamId?: string | null
  workstreamName?: string | null
  status: string
  onboardedAt: string
}

export async function getProjectMembersRoster(
  projectId: string,
): Promise<ProjectMemberRosterRow[]> {
  const rows = await client.fetch<
    {
      memberId: string
      projectRole: ProjectRole
      workstreamId?: string | null
      workstreamName?: string | null
      status?: string
      onboardedAt: string
      staffId: string
      fullName: string
      email?: string
      staffIdNumber?: string
    }[]
  >(
    /* groq */ `
      *[_type == "projectMember" && project._ref == $projectId] | order(
        select(
          role == "project_manager" => 0,
          role == "deputy_project_manager" => 1,
          role == "workstream_lead" => 2,
          3
        ) asc,
        workstream->name asc,
        staff->fullName asc
      ) {
        "memberId": _id,
        "projectRole": role,
        "workstreamId": workstream._ref,
        "workstreamName": workstream->name,
        status,
        "onboardedAt": _createdAt,
        "staffId": staff._ref,
        "fullName": coalesce(
          staff->fullName,
          staff->firstName + " " + staff->lastName,
          staff->email,
          "Unknown"
        ),
        "email": staff->email,
        "staffIdNumber": staff->staffId
      }
    `,
    { projectId },
  )

  return (rows ?? [])
    .filter(row => row.staffId)
    .map(row => ({
    _id: row.staffId,
    memberId: row.memberId,
    fullName: row.fullName?.trim() || row.email?.trim() || 'Unknown',
    email: row.email,
    staffId: row.staffIdNumber,
    projectRole: row.projectRole,
    workstreamId: row.workstreamId ?? null,
    workstreamName: row.workstreamName ?? null,
    status: row.status ?? 'active',
    onboardedAt: row.onboardedAt,
  }))
}
