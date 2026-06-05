import { ProjectRoleMembersPage } from '@/features/projects/project-role-members-page'

interface PageProps {
  params: Promise<{ projectSlug: string; role: string }>
}

export default async function Page({ params }: PageProps) {
  const { projectSlug, role } = await params
  return (
    <ProjectRoleMembersPage projectSlug={projectSlug} roleSegment={role} />
  )
}
