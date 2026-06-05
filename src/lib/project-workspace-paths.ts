import type { ProjectRole } from '@/lib/project-role'

/** Superadmin project setup (not a `projectMember` role). */
export const PROJECT_ADMIN_PATH_SEGMENT = 'admin' as const

/** Roles with a dedicated project workspace UI. */
export type ProjectWorkspaceRole = ProjectRole

export const PROJECT_ROLE_PATH_SEGMENTS = {
  project_manager: 'project-manager',
  deputy_project_manager: 'deputy-project-manager',
  workstream_lead: 'workstream-lead',
  workstream_member: 'workstream-member',
} as const satisfies Record<ProjectWorkspaceRole, string>

export type ProjectRolePathSegment =
  (typeof PROJECT_ROLE_PATH_SEGMENTS)[ProjectWorkspaceRole]

export function buildProjectWorkspaceBasePath(
  projectSlug: string,
  role: ProjectWorkspaceRole,
): string {
  const segment = PROJECT_ROLE_PATH_SEGMENTS[role]
  return `/projects/${encodeURIComponent(projectSlug)}/${segment}`
}

export function buildProjectDashboardHref(
  projectSlug: string,
  role: ProjectWorkspaceRole,
): string {
  return `${buildProjectWorkspaceBasePath(projectSlug, role)}/dashboard`
}

export function isProjectAdminPathSegment(segment: string): boolean {
  return segment === PROJECT_ADMIN_PATH_SEGMENT
}

export function buildProjectAdminBasePath(projectSlug: string): string {
  return `/projects/${encodeURIComponent(projectSlug)}/${PROJECT_ADMIN_PATH_SEGMENT}`
}

export function buildProjectAdminHref(projectSlug: string): string {
  return buildProjectAdminBasePath(projectSlug)
}

export function parseProjectRoleFromPathSegment(
  segment: string,
): ProjectWorkspaceRole | null {
  if (isProjectAdminPathSegment(segment)) return null
  for (const [role, path] of Object.entries(PROJECT_ROLE_PATH_SEGMENTS)) {
    if (path === segment) return role as ProjectWorkspaceRole
  }
  return null
}

export function isProjectWorkspaceBasePath(basePath: string): boolean {
  return basePath.startsWith('/projects/')
}

export function isOfficerLikeWorkspaceBasePath(basePath: string): boolean {
  return basePath === '/officer' || basePath.endsWith('/workstream-member')
}

export function isLeadershipWorkspaceBasePath(basePath: string): boolean {
  return (
    basePath === '/manager' ||
    basePath === '/supervisor' ||
    basePath.endsWith('/project-manager') ||
    basePath.endsWith('/deputy-project-manager') ||
    basePath.endsWith('/workstream-lead')
  )
}
