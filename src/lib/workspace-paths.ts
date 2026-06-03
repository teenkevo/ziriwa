import type { SectionAccess } from '@/lib/section-access'

export type WorkspaceBasePath = '/manager' | '/officer' | '/supervisor'

export function getWorkspacePaths(basePath: WorkspaceBasePath) {
  return {
    basePath,
    dashboard: `${basePath}/dashboard`,
    contract: `${basePath}/contract`,
    sprints: `${basePath}/sprints`,
    sprintsReady:
      basePath === '/officer'
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
