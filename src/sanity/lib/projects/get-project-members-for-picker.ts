import 'server-only'

import type { ProjectRole } from '@/lib/project-role'
import type { StaffPickerMember } from '@/lib/staff-picker'
import { client } from '@/sanity/lib/client'

type ProjectMemberPickerRow = {
  staffId: string
  fullName: string
  staffIdNumber?: string
  idNumber?: string
  projectRole: ProjectRole
  workstreamId?: string
  workstreamName?: string
}

export async function getProjectMembersForPicker(
  projectId: string,
): Promise<StaffPickerMember[]> {
  const rows = await client.fetch<ProjectMemberPickerRow[]>(
    /* groq */ `
      *[_type == "projectMember"
        && project._ref == $projectId
        && status == "active"
        && defined(staff._ref)
      ] | order(
        select(
          role == "project_manager" => 0,
          role == "deputy_project_manager" => 1,
          role == "workstream_lead" => 2,
          3
        ) asc,
        coalesce(
          staff->fullName,
          staff->firstName + " " + staff->lastName
        ) asc
      ) {
        "staffId": staff._ref,
        "fullName": coalesce(
          staff->fullName,
          staff->firstName + " " + staff->lastName,
          staff->email
        ),
        "staffIdNumber": staff->staffId,
        "idNumber": staff->idNumber,
        "projectRole": role,
        "workstreamId": workstream._ref,
        "workstreamName": workstream->name
      }
    `,
    { projectId },
  )

  const seen = new Set<string>()
  const members: StaffPickerMember[] = []

  for (const row of rows ?? []) {
    if (!row.staffId || seen.has(row.staffId)) continue
    seen.add(row.staffId)
    const name = row.fullName?.trim() || 'Unknown'
    members.push({
      _id: row.staffId,
      fullName: name,
      staffId: row.staffIdNumber,
      idNumber: row.idNumber,
      projectRole: row.projectRole,
      ...(row.projectRole === 'workstream_lead' && row.workstreamId
        ? {
            assignedEntityId: row.workstreamId,
            assignedLabel: row.workstreamName?.trim() || 'Workstream',
          }
        : {}),
    })
  }

  return members
}
