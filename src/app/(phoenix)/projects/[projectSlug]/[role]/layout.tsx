import { notFound } from 'next/navigation'

import { parseProjectRoleFromPathSegment } from '@/lib/project-workspace-paths'
import { assertProjectWorkspaceRoute } from '@/lib/workspace-redirect.server'

export default async function ProjectRoleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectSlug: string; role: string }>
}) {
  const { projectSlug, role } = await params
  if (!parseProjectRoleFromPathSegment(role)) notFound()

  await assertProjectWorkspaceRoute(role, projectSlug)

  return children
}
