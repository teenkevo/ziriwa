import { ProjectRoleViewPage } from '@/features/projects/project-role-view-pages'

export default function ProjectDashboardPage(
  props: Parameters<typeof ProjectRoleViewPage>[0],
) {
  return <ProjectRoleViewPage {...props} view='dashboard' />
}
