import { ProjectRoleViewPage } from '@/features/projects/project-role-view-pages'

export default function ProjectStakeholdersPage(
  props: Parameters<typeof ProjectRoleViewPage>[0],
) {
  return <ProjectRoleViewPage {...props} view='stakeholders' />
}
