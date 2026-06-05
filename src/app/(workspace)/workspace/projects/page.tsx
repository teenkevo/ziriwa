import { WorkspaceFlow } from '@/features/workspace/workspace-flow'
import { getWorkspaceCapabilities } from '@/lib/workspace-entry.server'

export const dynamic = 'force-dynamic'

export default async function WorkspaceProjectsPage() {
  const caps = await getWorkspaceCapabilities()

  return (
    <WorkspaceFlow
      initialStep='projects'
      canJoinMainstream={caps.hasMainstream}
      canJoinProjects={caps.hasProjects || caps.canCreateProject}
      projects={caps.projects}
      canCreateProject={caps.canCreateProject}
    />
  )
}
