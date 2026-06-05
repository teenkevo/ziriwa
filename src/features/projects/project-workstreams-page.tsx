import 'server-only'

import { notFound, redirect } from 'next/navigation'

import { ProjectWorkstreamsContent } from '@/features/projects/project-workstreams-content'
import { getProjectBySlug } from '@/sanity/lib/projects/get-project-by-id'
import { getProjectMembersForPicker } from '@/sanity/lib/projects/get-project-members-for-picker'
import { getProjectWorkstreamsForManagement } from '@/sanity/lib/projects/get-project-workstreams-for-management'
import { isSuperadmin } from '@/lib/authz/guards.server'
import { getProjectMembershipForViewer } from '@/lib/project-access.server'
import {
  isProjectLeadershipRole,
  projectRoleToDashboardHref,
} from '@/lib/project-role'
import { parseProjectRoleFromPathSegment } from '@/lib/project-workspace-paths'
import { getProjectWorkspaceContext } from '@/lib/workspace-mode.server'
import { assertProjectWorkspaceRoute } from '@/lib/workspace-redirect.server'

interface ProjectWorkstreamsPageProps {
  projectSlug: string
  roleSegment: string
}

export async function ProjectWorkstreamsPage({
  projectSlug,
  roleSegment,
}: ProjectWorkstreamsPageProps) {
  const role = parseProjectRoleFromPathSegment(roleSegment)
  if (!role || !isProjectLeadershipRole(role)) notFound()

  const project = await getProjectBySlug(projectSlug)
  if (!project || project.status === 'archived') notFound()

  const { isProjects, projectId } = await getProjectWorkspaceContext()
  if (!isProjects || projectId !== project._id) {
    redirect('/workspace/projects')
  }

  await assertProjectWorkspaceRoute(roleSegment, projectSlug)

  if (await isSuperadmin()) {
    redirect(`/projects/${encodeURIComponent(projectSlug)}/admin`)
  }

  const membership = await getProjectMembershipForViewer(project._id)
  if (!membership || !isProjectLeadershipRole(membership.role)) {
    if (membership) {
      redirect(projectRoleToDashboardHref(projectSlug, membership.role))
    }
    redirect('/workspace/projects')
  }

  const [initialWorkstreams, initialProjectMembers] = await Promise.all([
    getProjectWorkstreamsForManagement(project._id),
    getProjectMembersForPicker(project._id),
  ])

  return (
    <div className='flex min-h-0 w-full flex-1 flex-col overflow-hidden'>
      <div className='flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-4 pt-6 md:p-8'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-2xl font-bold'>Workstreams</h1>
          <p className='max-w-3xl text-sm text-muted-foreground'>
            Create and manage workstreams for {project.name}. Onboard leads and
            members from Project members.
          </p>
        </div>
        <ProjectWorkstreamsContent
          projectId={project._id}
          projectName={project.name}
          canManage
          viewModeStorageKey={`${roleSegment}-workstreams-view`}
          initialWorkstreams={initialWorkstreams}
          initialProjectMembers={initialProjectMembers}
        />
      </div>
    </div>
  )
}
