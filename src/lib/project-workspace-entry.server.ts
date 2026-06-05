import 'server-only'

import { isSuperadmin } from '@/lib/authz/guards.server'
import {
  getProjectMembershipForViewer,
} from '@/lib/project-access.server'
import { projectRoleToDashboardHref } from '@/lib/project-role'
import { buildProjectAdminHref } from '@/lib/project-workspace-paths'
import { getProjectSlugById } from '@/sanity/lib/projects/get-project-by-id'

/** Landing URL after entering a project workspace (role route or admin). */
export async function resolveProjectWorkspaceHref(
  projectId: string,
): Promise<string | null> {
  const slug = await getProjectSlugById(projectId)
  if (!slug) return null

  if (await isSuperadmin()) {
    return buildProjectAdminHref(slug)
  }

  const membership = await getProjectMembershipForViewer(projectId)
  if (!membership) return null

  return projectRoleToDashboardHref(slug, membership.role)
}
