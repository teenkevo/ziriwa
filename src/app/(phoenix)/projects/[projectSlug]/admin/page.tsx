import { ProjectAdminPage } from '@/features/projects/project-admin-page'

export default async function Page({
  params,
}: {
  params: Promise<{ projectSlug: string }>
}) {
  const { projectSlug } = await params
  return <ProjectAdminPage projectSlug={projectSlug} />
}
