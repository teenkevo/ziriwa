import 'server-only'

import { notFound, redirect } from 'next/navigation'

import { ProjectMembersPage } from '@/features/projects/project-members-page'
import { getProjectBySlug } from '@/sanity/lib/projects/get-project-by-id'
import { getProjectWorkspaceContext } from '@/lib/workspace-mode.server'
import { assertProjectAdminRoute } from '@/lib/workspace-redirect.server'

interface ProjectAdminMembersPageProps {
  projectSlug: string
}

export async function ProjectAdminMembersPage({
  projectSlug,
}: ProjectAdminMembersPageProps) {
  const project = await getProjectBySlug(projectSlug)
  if (!project || project.status === 'archived') notFound()

  const { isProjects, projectId } = await getProjectWorkspaceContext()
  if (!isProjects || projectId !== project._id) {
    redirect('/workspace/projects')
  }

  await assertProjectAdminRoute(projectSlug)

  return <ProjectMembersPage projectSlug={projectSlug} />
}
