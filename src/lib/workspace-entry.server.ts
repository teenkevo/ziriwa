import 'server-only'

import { getManagedSectionsForViewer } from '@/features/sections/load-section-workspace-data'
import { getAppRole } from '@/lib/clerk-app-role.server'
import {
  canUseSuperadminPowers,
  getViewerContext,
} from '@/lib/impersonation/viewer-context.server'
import { getProjectsForViewer } from '@/sanity/lib/projects/get-projects-for-viewer'
import { client } from '@/sanity/lib/client'
import type { ViewerProjectOption } from '@/sanity/lib/projects/get-projects-for-viewer'

/** Whether the viewer can use the mainstream (section/org) workspace. */
export async function hasMainstreamWorkspaceForViewer(): Promise<boolean> {
  if (await canUseSuperadminPowers()) return true

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
  if (await canUseSuperadminPowers()) return '/departments'

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

async function getAllActiveProjectsForPicker(): Promise<ViewerProjectOption[]> {
  return client.fetch<ViewerProjectOption[]>(
    /* groq */ `
      *[_type == "project" && coalesce(status, "active") == "active"] | order(name asc) {
        _id,
        name,
        slug,
        "role": "project_manager",
        "memberCount": count(*[_type == "projectMember" && status == "active" && project._ref == ^._id])
      }
    `,
  )
}

/**
 * What the workspace picker should offer (no redirects).
 * Uses the signed-in account (real superadmin), not the impersonated subject —
 * so clearing impersonation mid-request does not hide picker options.
 */
export async function getWorkspaceCapabilities(): Promise<WorkspaceCapabilities> {
  const viewer = await getViewerContext()

  if (viewer.isSuperadmin) {
    const projects = await getAllActiveProjectsForPicker()
    return {
      projects,
      hasMainstream: true,
      hasProjects: projects.length > 0,
      canCreateProject: true,
    }
  }

  const [projects, hasMainstream] = await Promise.all([
    getProjectsForViewer(),
    hasMainstreamWorkspaceForViewer(),
  ])

  return {
    projects,
    hasMainstream,
    hasProjects: projects.length > 0,
    canCreateProject: false,
  }
}

export type PostSignInAction = { type: 'picker'; path: '/workspace' }

/** After sign-in: always show the workspace chooser. */
export async function resolvePostSignInAction(): Promise<PostSignInAction> {
  return { type: 'picker', path: '/workspace' }
}
