import { redirect } from 'next/navigation'

import { WorkspaceFlow } from '@/features/workspace/workspace-flow'
import { getViewerContext } from '@/lib/impersonation/viewer-context.server'
import { getWorkspaceCapabilities } from '@/lib/workspace-entry.server'

export const dynamic = 'force-dynamic'

export default async function WorkspacePage() {
  const viewer = await getViewerContext()
  if (viewer.isSuperadmin && viewer.isImpersonating) {
    redirect('/workspace/clear-impersonation')
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
