import { redirect } from 'next/navigation'

import { ProjectRoleViewPage } from '@/features/projects/project-role-view-pages'
import { parseProjectRoleFromPathSegment } from '@/lib/project-workspace-paths'

interface PageProps {
  params: Promise<{ projectSlug: string; role: string }>
  searchParams: Promise<{
    workContext?: string | string[]
    tab?: string | string[]
  }>
}

export default async function ProjectStaffPage(props: PageProps) {
  const { projectSlug, role } = await props.params
  const parsedRole = parseProjectRoleFromPathSegment(role)

  if (
    parsedRole === 'project_manager' ||
    parsedRole === 'deputy_project_manager'
  ) {
    redirect(
      `/projects/${encodeURIComponent(projectSlug)}/${role}/members`,
    )
  }

  return <ProjectRoleViewPage {...props} view='staff' />
}
