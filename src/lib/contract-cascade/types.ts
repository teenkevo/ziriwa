export type CascadeNodeRole =
  | 'managerInitiativeAsObjective'
  | 'managerKpiAsInitiative'
  | 'managerAimAsMeasurable'
  | 'managerTaskAsTask'

export interface CascadeSource {
  sectionContractId: string
  initiativeKey?: string
  activityKey?: string
  taskKey?: string
  nodeRole?: CascadeNodeRole
  importedFromRevision?: number
}

export interface CascadeImportSelection {
  initiativeKey: string
  activityKeys: string[]
}

/** Verbatim or AI-accepted text applied during supervisor cascade import. */
export interface CascadeActivityRewrite {
  activityKey: string
  initiativeKey: string
  objectiveTitle: string
  initiativeTitle: string
  measurableTitle: string
  tasks: string[]
}

export interface CascadeRewritePayload {
  activities: CascadeActivityRewrite[]
}

/** Manager source + default as-is mapping for one selected KPI. */
export interface CascadeRewriteContextItem {
  activityKey: string
  initiativeKey: string
  initiativeCode?: string
  managerObjectiveCode?: string
  managerObjectiveTitle: string
  managerInitiativeTitle: string
  managerKpiTitle: string
  managerAim: string
  managerTargetDate?: string
  managerTasks: string[]
  asIs: {
    objectiveTitle: string
    initiativeTitle: string
    measurableTitle: string
    tasks: string[]
  }
}

export interface CascadeRewritePreviewItem extends CascadeRewriteContextItem {
  aiSuggested?: CascadeActivityRewrite
  validationWarnings: string[]
}

export interface CascadeRewritePreviewResponse {
  aiEnabled: boolean
  items: CascadeRewritePreviewItem[]
}

export interface ManagerCascadeKpiOption {
  activityKey: string
  title: string
  aim: string
  hasAim: boolean
  canCascade: boolean
  alreadyImported: boolean
}

export interface ManagerCascadeInitiativeOption {
  initiativeKey: string
  code?: string
  title: string
  kpis: ManagerCascadeKpiOption[]
}

export interface ManagerCascadeObjectiveOption {
  objectiveKey: string
  code?: string
  title: string
  initiatives: ManagerCascadeInitiativeOption[]
}

export interface ManagerCascadeOptionsResponse {
  sectionContractId: string
  financialYearLabel: string
  cascadeRevision: number
  objectives: ManagerCascadeObjectiveOption[]
}
