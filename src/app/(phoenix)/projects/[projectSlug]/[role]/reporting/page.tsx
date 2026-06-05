import { ProjectRoleViewPage } from '@/features/projects/project-role-view-pages'

export default function ProjectReportingPage(
  props: Parameters<typeof ProjectRoleViewPage>[0],
) {
  return <ProjectRoleViewPage {...props} view='reporting' />
}
