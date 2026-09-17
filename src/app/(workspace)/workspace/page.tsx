import { clearImpersonationCookie } from '@/lib/impersonation/cookie.server'
import { WorkspaceFlow } from '@/features/workspace/workspace-flow'
import { getViewerContext } from '@/lib/impersonation/viewer-context.server'
import { getWorkspaceCapabilities } from '@/lib/workspace-entry.server'

export const dynamic = 'force-dynamic'

/**
 * Workspace picker. Never redirect to clear-impersonation from here —
 * soft navigations + redirect loops burn API calls when the clear cookie
 * does not stick on the next RSC request.
 */
export default async function WorkspacePage() {
  const viewer = await getViewerContext()
  if (viewer.isSuperadmin && viewer.isImpersonating) {
    await clearImpersonationCookie()
  }

  const caps = await getWorkspaceCapabilities()

  return (
    <WorkspaceFlow
      initialStep='choose'
      canJoinMainstream={caps.hasMainstream}
      canJoinProjects={caps.hasProjects || caps.canCreateProject}
      projects={caps.projects}
      canCreateProject={caps.canCreateProject}
    />
  )
}
