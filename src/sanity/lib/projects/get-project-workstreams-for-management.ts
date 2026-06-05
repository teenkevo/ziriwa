import 'server-only'

import { client } from '@/sanity/lib/client'

export interface ProjectWorkstreamRow {
  _id: string
  name: string
  slug?: string
  workstreamLeadId?: string
  workstreamLeadName?: string
  workstreamLeadEmail?: string
  memberNames?: string[]
}

export async function getProjectWorkstreamsForManagement(
  projectId: string,
): Promise<ProjectWorkstreamRow[]> {
  return client.fetch<ProjectWorkstreamRow[]>(
    /* groq */ `
      *[_type == "section" && project._ref == $projectId] | order(name asc) {
        _id,
        name,
        "slug": slug.current,
        "workstreamLeadId": workstreamLead._ref,
        "workstreamLeadName": coalesce(
          workstreamLead->fullName,
          workstreamLead->firstName + " " + workstreamLead->lastName
        ),
        "workstreamLeadEmail": workstreamLead->email,
        "memberNames": *[_type == "projectMember"
          && status == "active"
          && role == "workstream_member"
          && workstream._ref == ^._id
        ] | order(
          coalesce(
            staff->fullName,
            staff->firstName + " " + staff->lastName
          ) asc
        ) {
          "name": coalesce(
            staff->fullName,
            staff->firstName + " " + staff->lastName,
            staff->email
          )
        }.name
      }
    `,
    { projectId },
  )
}
