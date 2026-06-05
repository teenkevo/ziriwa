import { assertProjectAdminRoute } from '@/lib/workspace-redirect.server'

export default async function ProjectAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectSlug: string }>
}) {
  const { projectSlug } = await params
  await assertProjectAdminRoute(projectSlug)
  return children
}
