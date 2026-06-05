export const WORKSPACE_MODE_COOKIE = 'ziriwa_workspace_mode'
export const PROJECT_ID_COOKIE = 'ziriwa_project_id'

export type WorkspaceMode = 'mainstream' | 'projects'

export function parseWorkspaceMode(value: string | undefined): WorkspaceMode | null {
  if (value === 'mainstream' || value === 'projects') return value
  return null
}

export function isProjectsWorkspace(mode: WorkspaceMode | null | undefined): boolean {
  return mode === 'projects'
}

/** Full-page navigation to enter route (Set-Cookie + redirect). */
export function buildWorkspaceEnterHref(
  mode: 'mainstream' | 'projects',
  projectId?: string,
): string {
  if (mode === 'projects' && projectId) {
    return `/workspace/enter?mode=projects&projectId=${encodeURIComponent(projectId)}`
  }
  return '/workspace/enter?mode=mainstream'
}
