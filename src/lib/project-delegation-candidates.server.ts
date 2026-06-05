import 'server-only'

import type { DelegationCandidate } from '@/lib/role-delegation'
import { client } from '@/sanity/lib/client'

/** Project managers may only delegate to the deputy project manager. */
export async function getProjectDelegationCandidatesForProjectManager(
  projectId: string,
  fromStaffId: string,
): Promise<DelegationCandidate[]> {
  return client.fetch<DelegationCandidate[]>(
    /* groq */ `
      *[_type == "projectMember"
        && project._ref == $projectId
        && status == "active"
        && role == "deputy_project_manager"
        && staff._ref != $fromStaffId
        && defined(staff._ref)
      ] | order(
        coalesce(staff->fullName, staff->firstName + " " + staff->lastName) asc
      ) {
        "_id": staff._ref,
        "fullName": coalesce(
          staff->fullName,
          staff->firstName + " " + staff->lastName,
          staff->email,
          "Deputy Project Manager"
        ),
        "role": "manager"
      }
    `,
    { projectId, fromStaffId },
  )
}
