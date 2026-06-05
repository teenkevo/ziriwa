/**
 * Roles within a project workspace (stored on `projectMember`).
 * Maps to mainstream UI surfaces: PM → manager, lead → supervisor, member → officer.
 */
export const PROJECT_ROLE_VALUES = [
  'project_manager',
  'deputy_project_manager',
  'workstream_lead',
  'workstream_member',
] as const

export type ProjectRole = (typeof PROJECT_ROLE_VALUES)[number]

/** All roles assignable from project admin members page. */
export const PROJECT_ONBOARD_MEMBER_ROLES = PROJECT_ROLE_VALUES

export function isProjectRole(value: unknown): value is ProjectRole {
  return (
    typeof value === 'string' &&
    PROJECT_ROLE_VALUES.includes(value as ProjectRole)
  )
}

export function parseProjectRole(value: unknown): ProjectRole | null {
  return isProjectRole(value) ? value : null
}

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  project_manager: 'Project Manager',
  deputy_project_manager: 'Deputy Project Manager',
  workstream_lead: 'Workstream Lead',
  workstream_member: 'Workstream Member',
}

export function projectRoleRequiresWorkstream(role: ProjectRole): boolean {
  return role === 'workstream_lead' || role === 'workstream_member'
}

/** Navbar role label for project workspace users. */
export function formatProjectNavbarRoleLabel(
  role: ProjectRole,
  workstreamName?: string | null,
): string {
  if (role === 'workstream_lead') {
    const trimmedWorkstream = workstreamName?.trim()
    return trimmedWorkstream ? `${trimmedWorkstream} Lead` : 'Lead'
  }
  return PROJECT_ROLE_LABELS[role]
}

/** PM and DPM share whole-project oversight (members, workstreams, aggregated views). */
export const PROJECT_LEADERSHIP_ROLES = [
  'project_manager',
  'deputy_project_manager',
] as const satisfies readonly ProjectRole[]

export type ProjectLeadershipRole = (typeof PROJECT_LEADERSHIP_ROLES)[number]

export function isProjectLeadershipRole(
  role: ProjectRole | null | undefined,
): role is ProjectLeadershipRole {
  return (
    role != null &&
    (PROJECT_LEADERSHIP_ROLES as readonly string[]).includes(role)
  )
}

import {
  buildProjectAdminHref,
  buildProjectDashboardHref,
  buildProjectWorkspaceBasePath,
} from '@/lib/project-workspace-paths'

/** Project workspace dashboard URL (requires project slug). */
export function projectRoleToDashboardHref(
  projectSlug: string,
  role: ProjectRole,
): string {
  return buildProjectDashboardHref(projectSlug, role)
}

export function projectRoleToWorkspaceBasePath(
  projectSlug: string,
  role: ProjectRole,
): string {
  return buildProjectWorkspaceBasePath(projectSlug, role)
}

export { buildProjectWorkspaceBasePath }
