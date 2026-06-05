import 'server-only'

import { notFound, redirect } from 'next/navigation'

import { ProjectMembersPage } from '@/features/projects/project-members-page'
import { getProjectBySlug } from '@/sanity/lib/projects/get-project-by-id'
import { getProjectMembershipForViewer } from '@/lib/project-access.server'
import { projectRoleToDashboardHref } from '@/lib/project-role'
import { isProjectLeadershipRole } from '@/lib/project-role'
import { parseProjectRoleFromPathSegment } from '@/lib/project-workspace-paths'
import { getProjectWorkspaceContext } from '@/lib/workspace-mode.server'
import { assertProjectWorkspaceRoute } from '@/lib/workspace-redirect.server'

interface ProjectRoleMembersPageProps {
  projectSlug: string
  roleSegment: string
}

export async function ProjectRoleMembersPage({
  projectSlug,
  roleSegment,
}: ProjectRoleMembersPageProps) {
  const role = parseProjectRoleFromPathSegment(roleSegment)
  if (!role || !isProjectLeadershipRole(role)) notFound()

  const project = await getProjectBySlug(projectSlug)
  if (!project || project.status === 'archived') notFound()

  const { isProjects, projectId } = await getProjectWorkspaceContext()
  if (!isProjects || projectId !== project._id) {
    redirect('/workspace/projects')
  }

  await assertProjectWorkspaceRoute(roleSegment, projectSlug)

  const membership = await getProjectMembershipForViewer(project._id)
  if (!membership || membership.role !== role) {
    if (membership) {
      redirect(projectRoleToDashboardHref(projectSlug, membership.role))
    }
    redirect('/workspace/projects')
  }

  return <ProjectMembersPage projectSlug={projectSlug} />
}
