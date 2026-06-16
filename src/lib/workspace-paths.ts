import type { SectionAccess } from '@/lib/section-access'

export type MainstreamWorkspaceBasePath = '/manager' | '/officer' | '/supervisor'

/** Mainstream or `/projects/[slug]/[role]` workspace prefix. */
export type WorkspaceBasePath = MainstreamWorkspaceBasePath | (string & {})

export function getWorkspacePaths(basePath: WorkspaceBasePath) {
  const isOfficerLike =
    basePath === '/officer' || basePath.endsWith('/workstream-member')

  return {
    basePath,
    dashboard: `${basePath}/dashboard`,
    contract: `${basePath}/contract`,
    sprints: `${basePath}/sprints`,
    sprintsReady: isOfficerLike
        ? `${basePath}/sprints`
        : `${basePath}/sprints?tab=ready`,
    stakeholders: `${basePath}/stakeholders`,
    staff: `${basePath}/staff`,
    reporting: `${basePath}/reporting`,
  } as const
}

export function getWorkspaceBasePathForAccess(
  access: Pick<
    SectionAccess,
    'isSectionOfficer' | 'isSectionSupervisor' | 'isSectionManager'
  >,
): WorkspaceBasePath {
  if (access.isSectionOfficer) return '/officer'
  if (access.isSectionSupervisor && !access.isSectionManager) return '/supervisor'
  return '/manager'
}

/** Manager dashboard: section manager or project / deputy project manager. */
export function isManagerDashboardBasePath(basePath: string): boolean {
  return (
    basePath === '/manager' ||
    basePath.endsWith('/project-manager') ||
    basePath.endsWith('/deputy-project-manager')
  )
}

/** Supervisor dashboard: section supervisor or workstream lead. */
export function isSupervisorDashboardBasePath(basePath: string): boolean {
  return basePath === '/supervisor' || basePath.endsWith('/workstream-lead')
}

export function buildSprintReviseHref(
  workspaceBasePath: WorkspaceBasePath,
  sprintId: string,
  taskKey: string,
): string {
  const params = new URLSearchParams({
    tab: 'to-review',
    reviseSprint: sprintId,
    reviseTask: taskKey,
  })
  return `${workspaceBasePath}/sprints?${params.toString()}`
}

export function buildSectionSprintReviseHref(
  sectionPathname: string,
  sprintId: string,
  taskKey: string,
): string {
  const params = new URLSearchParams({
    tab: 'weekly-sprint',
    reviseSprint: sprintId,
    reviseTask: taskKey,
  })
  return `${sectionPathname}?${params.toString()}`
}
