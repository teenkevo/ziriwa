import 'server-only'

import { redirect } from 'next/navigation'

import { getAppRole } from '@/lib/clerk-app-role.server'
import { isSuperadmin } from '@/lib/authz/guards.server'
import {
  canAccessProjectWorkspace,
  getProjectMembershipForViewer,
} from '@/lib/project-access.server'
import { projectRoleToDashboardHref } from '@/lib/project-role'
import {
  buildProjectAdminHref,
  isProjectAdminPathSegment,
  parseProjectRoleFromPathSegment,
} from '@/lib/project-workspace-paths'
import { resolveProjectWorkspaceHref } from '@/lib/project-workspace-entry.server'
import { ensureProjectWorkspaceSession } from '@/lib/workspace-session.server'
import { getProjectWorkspaceContext } from '@/lib/workspace-mode.server'
import { getProjectSlugById } from '@/sanity/lib/projects/get-project-by-id'
import { getProjectBySlug } from '@/sanity/lib/projects/get-project-by-id'

export async function getProjectSlugForWorkspace(): Promise<string | null> {
  const { projectId } = await getProjectWorkspaceContext()
  if (!projectId) return null
  return getProjectSlugById(projectId)
}

/** Guard project admin route — superadmin only. */
export async function assertProjectAdminRoute(projectSlug: string) {
  const project = await getProjectBySlug(projectSlug)
  if (!project) redirect('/workspace')

  if (!(await ensureProjectWorkspaceSession(project._id))) {
    redirect('/workspace/projects')
  }

  if (!(await isSuperadmin())) {
    const membership = await getProjectMembershipForViewer(project._id)
    if (membership) {
      redirect(projectRoleToDashboardHref(projectSlug, membership.role))
    }
    redirect('/workspace/projects')
  }

  if (!(await canAccessProjectWorkspace(project._id))) {
    redirect('/workspace/projects')
  }
}

/** Redirect if user is on the wrong project role route. */
export async function assertProjectWorkspaceRoute(
  expectedSegment: string,
  projectSlug: string,
) {
  if (isProjectAdminPathSegment(expectedSegment)) {
    await assertProjectAdminRoute(projectSlug)
    return
  }

  const expectedRole = parseProjectRoleFromPathSegment(expectedSegment)
  if (!expectedRole) redirect('/workspace')

  const project = await getProjectBySlug(projectSlug)
  if (!project) redirect('/workspace')

  if (!(await ensureProjectWorkspaceSession(project._id))) {
    redirect('/workspace/projects')
  }

  if (await isSuperadmin()) {
    redirect(buildProjectAdminHref(projectSlug))
  }

  const membership = await getProjectMembershipForViewer(project._id)
  if (!membership) {
    redirect('/workspace/projects')
  }

  if (membership.role !== expectedRole) {
    redirect(projectRoleToDashboardHref(projectSlug, membership.role))
  }
}

/** Send project workspace users off mainstream /manager, /supervisor, /officer routes. */
export async function redirectProjectUserToProjectWorkspace() {
  const { isProjects, projectId } = await getProjectWorkspaceContext()
  if (!isProjects || !projectId) return

  const href = await resolveProjectWorkspaceHref(projectId)
  if (!href) {
    redirect('/workspace/projects')
  }
  redirect(href)
}

/** Redirect mainstream users away from project-only flows when cookie says projects. */
export async function redirectMainstreamRoleDashboard() {
  const { isProjects } = await getProjectWorkspaceContext()
  if (isProjects) return

  if (await isSuperadmin()) {
    redirect('/departments')
  }

  const role = await getAppRole()
  if (role === 'assistant_commissioner') {
    redirect('/assistant-commissioner/dashboard')
  }
  if (role === 'commissioner') redirect('/commissioner/dashboard')
  if (role === 'manager') redirect('/manager/dashboard')
  if (role === 'supervisor') redirect('/supervisor/dashboard')
  if (role === 'officer') redirect('/officer/dashboard')
  redirect('/departments')
}
