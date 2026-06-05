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
