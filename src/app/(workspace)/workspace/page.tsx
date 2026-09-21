import { WorkspaceFlow } from '@/features/workspace/workspace-flow'
import { getWorkspaceCapabilities } from '@/lib/workspace-entry.server'

export const dynamic = 'force-dynamic'

/**
 * Workspace picker.
 * Do NOT clear impersonation here — Next.js Link prefetch of /workspace (e.g. sidebar
 * logo) would wipe the cookie in production right after impersonation starts.
 * Use /workspace/clear-impersonation for an intentional exit from impersonation.
 */
export default async function WorkspacePage() {
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
