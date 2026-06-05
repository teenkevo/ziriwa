import { ProjectAdminMembersPage } from '@/features/projects/project-admin-members-page'

export default async function Page({
  params,
}: {
  params: Promise<{ projectSlug: string }>
}) {
  const { projectSlug } = await params
  return <ProjectAdminMembersPage projectSlug={projectSlug} />
}
