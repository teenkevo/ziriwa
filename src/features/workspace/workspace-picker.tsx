'use client'

import { WorkspaceFlow } from '@/features/workspace/workspace-flow'
import type { ViewerProjectOption } from '@/sanity/lib/projects/get-projects-for-viewer'

/** @deprecated Use `WorkspaceFlow` with server-prefetched projects. */
export function WorkspacePicker({
  projects,
  canCreateProject,
}: {
  projects: ViewerProjectOption[]
  canCreateProject?: boolean
}) {
  return (
    <WorkspaceFlow
      initialStep='choose'
      canJoinMainstream
      canJoinProjects={projects.length > 0 || Boolean(canCreateProject)}
      projects={projects}
      canCreateProject={canCreateProject}
    />
  )
}
