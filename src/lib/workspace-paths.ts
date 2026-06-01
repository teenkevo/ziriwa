export type WorkspaceBasePath = '/manager' | '/officer'

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
