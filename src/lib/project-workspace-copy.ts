import { isProjectWorkspaceBasePath } from '@/lib/project-workspace-paths'

export type WorkspaceScopeKind = 'mainstream' | 'project' | 'workstream'

export interface WorkspaceScopeLabels {
  kind: WorkspaceScopeKind
  /** Lowercase noun: section | project | workstream */
  unit: string
  /** Title case: Section | Project | Workstream */
  unitTitle: string
}

export function resolveWorkspaceScopeLabels(input: {
  workspaceBasePath: string
  isProjectManagerWorkspace?: boolean
  isDeputyProjectManagerWorkspace?: boolean
  isProjectWorkstreamWorkspace?: boolean
}): WorkspaceScopeLabels {
  if (!isProjectWorkspaceBasePath(input.workspaceBasePath)) {
    return { kind: 'mainstream', unit: 'section', unitTitle: 'Section' }
  }
  if (input.isProjectManagerWorkspace || input.isDeputyProjectManagerWorkspace) {
    return { kind: 'project', unit: 'project', unitTitle: 'Project' }
  }
  return { kind: 'workstream', unit: 'workstream', unitTitle: 'Workstream' }
}

/** e.g. "the project contract" */
export function theContractPhrase(scope: WorkspaceScopeLabels): string {
  return `the ${scope.unit} contract`
}

export function scopeLabelsFromKind(
  kind: WorkspaceScopeKind = 'mainstream',
): WorkspaceScopeLabels {
  if (kind === 'project') {
    return { kind: 'project', unit: 'project', unitTitle: 'Project' }
  }
  if (kind === 'workstream') {
    return { kind: 'workstream', unit: 'workstream', unitTitle: 'Workstream' }
  }
  return { kind: 'mainstream', unit: 'section', unitTitle: 'Section' }
}

export type ManagerWorkspaceViewKey =
  | 'dashboard'
  | 'contract'
  | 'sprints'
  | 'stakeholders'
  | 'staff'
  | 'reporting'

export function getManagerWorkspaceViewConfig(
  scope: WorkspaceScopeLabels,
): Record<ManagerWorkspaceViewKey, { title: string; description: string }> {
  const { unit, unitTitle } = scope

  if (scope.kind === 'project') {
    return {
      dashboard: {
        title: 'Dashboard',
        description:
          'Project performance, sprint progress across workstreams, contract status, and pending work.',
      },
      contract: {
        title: 'Contract',
        description: 'Manage your project contract and deliverables.',
      },
      sprints: {
        title: 'Sprints',
        description: 'Manage weekly sprints and tasks across project workstreams.',
      },
      stakeholders: {
        title: 'Stakeholders',
        description:
          'Maintain stakeholder engagement plans and reports for the project.',
      },
      staff: {
        title: 'Staff',
        description: 'Manage project members, delegations, and transfers.',
      },
      reporting: {
        title: 'Reporting',
        description: 'Generate weekly reports from completed sprints.',
      },
    }
  }

  if (scope.kind === 'workstream') {
    return {
      dashboard: {
        title: 'Dashboard',
        description:
          'Workstream performance, sprint progress, contract status, and pending work.',
      },
      contract: {
        title: 'Contract',
        description: 'Manage your workstream contract and deliverables.',
      },
      sprints: {
        title: 'Sprints',
        description: 'Manage weekly sprints and tasks for your workstream.',
      },
      stakeholders: {
        title: 'Stakeholders',
        description:
          'View and maintain the project stakeholder engagement matrix shared across all workstreams.',
      },
      staff: {
        title: 'Workstream Members',
        description: 'Manage workstream members for your workstream.',
      },
      reporting: {
        title: 'Reporting',
        description: 'Generate weekly reports from completed sprints.',
      },
    }
  }

  return {
    dashboard: {
      title: 'Dashboard',
      description:
        'Section performance, sprint progress, contract status, and pending work.',
    },
    contract: {
      title: 'Contract',
      description: 'Manage your section contract and deliverables.',
    },
    sprints: {
      title: 'Sprints',
      description: `Manage weekly sprints and tasks for your ${unit}.`,
    },
    stakeholders: {
      title: 'Stakeholders',
      description:
        `Maintain stakeholder engagement plans and reports for your ${unit}.`,
    },
    staff: {
      title: 'Staff',
      description: `Manage ${unit} staff, delegations, and transfers.`,
    },
    reporting: {
      title: 'Reporting',
      description: 'Generate weekly reports from completed sprints.',
    },
  }
}
