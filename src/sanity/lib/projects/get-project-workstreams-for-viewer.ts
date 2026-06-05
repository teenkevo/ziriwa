import 'server-only'

import { currentUser } from '@clerk/nextjs/server'

import { client } from '@/sanity/lib/client'
import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import {
  getProjectMembershipForViewer,
  type ProjectMembership,
} from '@/lib/project-access.server'
import { isSuperadmin } from '@/lib/authz/guards.server'

export type ProjectWorkstreamLookup = {
  _id: string
  name: string
  slug?: { current: string }
  manager?: { _id: string; fullName?: string }
  workstreamLead?: { _id: string; fullName?: string }
}

export async function getProjectWorkstreamsForViewer(
  projectId: string,
  membership?: ProjectMembership | null,
): Promise<ProjectWorkstreamLookup[]> {
  const resolved =
    membership ?? (await getProjectMembershipForViewer(projectId))
  if (!resolved) return []

  if (
    resolved.role === 'project_manager' ||
    resolved.role === 'deputy_project_manager' ||
    (await isSuperadmin())
  ) {
    return client.fetch<ProjectWorkstreamLookup[]>(
      /* groq */ `
        *[_type == "section" && project._ref == $projectId] | order(name asc) {
          _id,
          name,
          slug,
          manager->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
          workstreamLead->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) }
        }
      `,
      { projectId },
    )
  }

  if (resolved.role === 'workstream_lead' && resolved.workstreamId) {
    return client.fetch<ProjectWorkstreamLookup[]>(
      /* groq */ `
        *[_type == "section" && _id == $workstreamId && project._ref == $projectId] {
          _id,
          name,
          slug,
          manager->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
          workstreamLead->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) }
        }
      `,
      { projectId, workstreamId: resolved.workstreamId },
    )
  }

  if (resolved.role === 'workstream_member' && resolved.workstreamId) {
    return client.fetch<ProjectWorkstreamLookup[]>(
      /* groq */ `
        *[_type == "section" && _id == $workstreamId && project._ref == $projectId] {
          _id,
          name,
          slug,
          manager->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
          workstreamLead->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) }
        }
      `,
      { projectId, workstreamId: resolved.workstreamId },
    )
  }

  const staffId = await getViewerStaffId()
  if (!staffId) return []

  return client.fetch<ProjectWorkstreamLookup[]>(
    /* groq */ `
      *[_type == "section"
        && project._ref == $projectId
        && (
          workstreamLead._ref == $staffId ||
          _id in *[_type == "staff" && _id == $staffId && defined(section._ref)][0].section._ref
        )
      ] | order(name asc) {
        _id,
        name,
        slug,
        manager->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) },
        workstreamLead->{ _id, "fullName": coalesce(fullName, firstName + " " + lastName) }
      }
    `,
    { projectId, staffId },
  )
}
