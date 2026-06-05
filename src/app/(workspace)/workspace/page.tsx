import { WorkspaceFlow } from '@/features/workspace/workspace-flow'
import { getWorkspaceCapabilities } from '@/lib/workspace-entry.server'

export const dynamic = 'force-dynamic'

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
