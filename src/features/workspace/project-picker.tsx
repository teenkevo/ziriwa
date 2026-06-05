'use client'

import { ProjectPickerContent } from '@/features/workspace/project-picker-content'
import { WorkspaceSelectionShell } from '@/features/workspace/workspace-selection-shell'
import type { ViewerProjectOption } from '@/sanity/lib/projects/get-projects-for-viewer'

/** Standalone project picker (prefer `WorkspaceFlow` for animated step transitions). */
export function ProjectPicker({
  projects,
  canCreateProject = false,
}: {
  projects: ViewerProjectOption[]
  canCreateProject?: boolean
}) {
  return (
    <WorkspaceSelectionShell
      backHref='/workspace'
      title='Select a project'
      subtitle={
        projects.length > 0 || canCreateProject
          ? 'Open the project you need to work in.'
          : undefined
      }
    >
      <ProjectPickerContent
        projects={projects}
        canCreateProject={canCreateProject}
      />
    </WorkspaceSelectionShell>
  )
}
