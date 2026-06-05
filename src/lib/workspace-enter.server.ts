import 'server-only'

import { canAccessProjectWorkspace } from '@/lib/project-access.server'
import { resolveProjectWorkspaceHref } from '@/lib/project-workspace-entry.server'
import { resolveMainstreamDashboardHref } from '@/lib/workspace-entry.server'
import type { WorkspaceMode } from '@/lib/workspace-mode'

export interface WorkspaceEnterDestination {
  redirect: string
  mode: WorkspaceMode
  projectId?: string
}

/** Final URL + cookie payload after /workspace/enter (or post-sign-in). */
export async function resolveWorkspaceEnterDestination(
  mode: WorkspaceMode,
  projectId = '',
): Promise<WorkspaceEnterDestination> {
  if (mode === 'mainstream') {
    return {
      redirect: await resolveMainstreamDashboardHref(),
      mode: 'mainstream',
    }
  }

  if (!projectId) {
    return {
      redirect: '/workspace/projects',
      mode: 'projects',
    }
  }

  if (!(await canAccessProjectWorkspace(projectId))) {
    return {
      redirect: '/workspace/projects',
      mode: 'projects',
    }
  }

  const href = await resolveProjectWorkspaceHref(projectId)
  return {
    redirect: href ?? '/workspace/projects',
    mode: 'projects',
    projectId,
  }
}
