import 'server-only'

import { redirect } from 'next/navigation'

import { canAccessProjectWorkspace } from '@/lib/project-access.server'
import { buildWorkspaceEnterHref } from '@/lib/workspace-mode'
import { getProjectWorkspaceContext } from '@/lib/workspace-mode.server'

export type ProjectWorkspaceSessionStatus = 'ok' | 'denied' | 'needs-enter'

export async function getProjectWorkspaceSessionStatus(
  projectId: string,
): Promise<ProjectWorkspaceSessionStatus> {
  const { isProjects, projectId: cookieProjectId } =
    await getProjectWorkspaceContext()
  if (isProjects && cookieProjectId === projectId) {
    return 'ok'
  }

  if (!(await canAccessProjectWorkspace(projectId))) {
    return 'denied'
  }

  return 'needs-enter'
}

/**
 * Ensures project workspace cookies are set. Redirects via /workspace/enter when missing
 * (cookies can only be set in Route Handlers, not Server Components).
 */
export async function ensureProjectWorkspaceSession(
  projectId: string,
): Promise<boolean> {
  const status = await getProjectWorkspaceSessionStatus(projectId)
  if (status === 'ok') return true
  if (status === 'needs-enter') {
    redirect(buildWorkspaceEnterHref('projects', projectId))
  }
  return false
}
