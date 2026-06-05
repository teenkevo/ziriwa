import 'server-only'

import { provisionClerkForProjectStaff } from '@/lib/project-member-clerk.server'
import { writeClient } from '@/sanity/lib/write-client'
import { client } from '@/sanity/lib/client'

function ref(id: string) {
  return { _type: 'reference' as const, _ref: id }
}

export async function deactivateWorkstreamLeadsExcept(
  projectId: string,
  workstreamId: string,
  keepStaffId: string,
) {
  const memberIds = await client.fetch<string[]>(
    /* groq */ `
      *[_type == "projectMember"
        && project._ref == $projectId
        && role == "workstream_lead"
        && status == "active"
        && workstream._ref == $workstreamId
        && staff._ref != $keepStaffId
      ]._id
    `,
    { projectId, workstreamId, keepStaffId },
  )

  for (const memberId of memberIds) {
    await writeClient.patch(memberId).set({ status: 'inactive' }).commit()
  }
}

/**
 * Assign a workstream lead on both the workstream section and projectMember.
 * Reuses a pending lead (workstream_lead without workstream) when present.
 */
export async function upsertWorkstreamLeadProjectMember(
  projectId: string,
  workstreamId: string,
  staffId: string,
) {
  await provisionClerkForProjectStaff(staffId)

  await deactivateWorkstreamLeadsExcept(projectId, workstreamId, staffId)

  const existingMemberId = await client.fetch<string | null>(
    /* groq */ `
      *[_type == "projectMember"
        && project._ref == $projectId
        && staff._ref == $staffId
        && status == "active"
        && role == "workstream_lead"
        && (!defined(workstream._ref) || workstream._ref == $workstreamId)
      ][0]._id
    `,
    { projectId, staffId, workstreamId },
  )

  if (existingMemberId) {
    await writeClient
      .patch(existingMemberId)
      .set({
        role: 'workstream_lead',
        workstream: ref(workstreamId),
        status: 'active',
      })
      .commit()
  } else {
    await writeClient.create({
      _type: 'projectMember',
      project: ref(projectId),
      staff: ref(staffId),
      role: 'workstream_lead',
      workstream: ref(workstreamId),
      status: 'active',
    })
  }

  await writeClient
    .patch(workstreamId)
    .set({ workstreamLead: ref(staffId) })
    .commit()
}
