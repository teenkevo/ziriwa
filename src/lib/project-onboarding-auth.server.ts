import 'server-only'

import { isSuperadmin } from '@/lib/authz/guards.server'
import { getProjectMembershipForViewer } from '@/lib/project-access.server'
import { isProjectLeadershipRole } from '@/lib/project-role'

export async function canManageProjectRoster(
  projectId: string,
): Promise<boolean> {
  if (await isSuperadmin()) return true
  const membership = await getProjectMembershipForViewer(projectId)
  return isProjectLeadershipRole(membership?.role)
}

export async function canManageWorkstreamRoster(
  projectId: string,
  workstreamId: string,
): Promise<boolean> {
  if (await canManageProjectRoster(projectId)) return true
  const membership = await getProjectMembershipForViewer(projectId)
  return (
    membership?.role === 'workstream_lead' &&
    membership.workstreamId === workstreamId
  )
}
