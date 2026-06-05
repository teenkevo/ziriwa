import 'server-only'

import { getManagedSectionsForViewer } from '@/features/sections/load-section-workspace-data'
import { getAppRole } from '@/lib/clerk-app-role.server'
import { isSuperadmin } from '@/lib/authz/guards.server'
import { getProjectsForViewer } from '@/sanity/lib/projects/get-projects-for-viewer'

/** Whether the viewer can use the mainstream (section/org) workspace. */
export async function hasMainstreamWorkspaceForViewer(): Promise<boolean> {
  if (await isSuperadmin()) return true

  const role = await getAppRole()
  if (
    role === 'commissioner' ||
    role === 'assistant_commissioner' ||
    role === 'commissioner_general'
  ) {
    return true
  }

  const sections = await getManagedSectionsForViewer()
  return sections.length > 0
}

/** Mainstream dashboard URL after workspace mode is mainstream. */
export async function resolveMainstreamDashboardHref(): Promise<string> {
  if (await isSuperadmin()) return '/departments'

  const role = await getAppRole()
  if (role === 'assistant_commissioner') {
    return '/assistant-commissioner/dashboard'
  }
  if (role === 'commissioner') return '/commissioner/dashboard'
  if (role === 'manager') return '/manager/dashboard'
  if (role === 'supervisor') return '/supervisor/dashboard'
  if (role === 'officer') return '/officer/dashboard'
  return '/departments'
}

export interface WorkspaceCapabilities {
  projects: Awaited<ReturnType<typeof getProjectsForViewer>>
  hasMainstream: boolean
  hasProjects: boolean
  canCreateProject: boolean
}

/** What the workspace picker should offer (no redirects). */
export async function getWorkspaceCapabilities(): Promise<WorkspaceCapabilities> {
  const [superadmin, projects, hasMainstream] = await Promise.all([
    isSuperadmin(),
    getProjectsForViewer(),
    hasMainstreamWorkspaceForViewer(),
  ])

  return {
    projects,
    hasMainstream,
    hasProjects: projects.length > 0,
    canCreateProject: superadmin,
  }
}

export type PostSignInAction = { type: 'picker'; path: '/workspace' }

/** After sign-in: always show the workspace chooser. */
export async function resolvePostSignInAction(): Promise<PostSignInAction> {
  return { type: 'picker', path: '/workspace' }
}
