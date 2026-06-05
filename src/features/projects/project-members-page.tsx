import 'server-only'

import { notFound, redirect } from 'next/navigation'

import { ProjectAdminMembersContent } from '@/features/projects/project-admin-members-content'
import { getProjectBySlug } from '@/sanity/lib/projects/get-project-by-id'
import { getProjectMembersRoster } from '@/sanity/lib/projects/get-project-members-roster'
import { client } from '@/sanity/lib/client'
import { getProjectWorkspaceContext } from '@/lib/workspace-mode.server'

interface ProjectMembersPageProps {
  projectSlug: string
}

export async function ProjectMembersPage({
  projectSlug,
}: ProjectMembersPageProps) {
  const project = await getProjectBySlug(projectSlug)
  if (!project || project.status === 'archived') notFound()

  const { isProjects, projectId } = await getProjectWorkspaceContext()
  if (!isProjects || projectId !== project._id) {
    redirect('/workspace/projects')
  }

  const [roster, workstreams] = await Promise.all([
    getProjectMembersRoster(project._id),
    client.fetch<{ _id: string; name: string }[]>(
      /* groq */ `
        *[_type == "section" && project._ref == $projectId] | order(name asc) {
          _id,
          name
        }
      `,
      { projectId: project._id },
    ),
  ])

  return (
    <div className='flex min-h-0 w-full flex-1 flex-col overflow-hidden'>
      <div className='flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-4 pt-6 md:p-8'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-2xl font-bold'>Project members</h1>
          <p className='max-w-3xl text-sm text-muted-foreground'>
            View and onboard project members to the {project.name} project.
          </p>
        </div>
        <ProjectAdminMembersContent
          projectId={project._id}
          initialRoster={roster}
          workstreams={workstreams ?? []}
        />
      </div>
    </div>
  )
}
