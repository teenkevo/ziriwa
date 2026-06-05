export type CascadeNodeRole =
  | 'managerInitiativeAsObjective'
  | 'managerKpiAsInitiative'
  | 'managerAimAsMeasurable'
  | 'managerTaskAsTask'
  | 'supervisorInitiativeAsObjective'
  | 'supervisorMeasurableAsInitiative'
  | 'supervisorTaskAsTask'

export interface CascadeSource {
  sectionContractId?: string
  supervisorContractId?: string
  initiativeKey?: string
  activityKey?: string
  taskKey?: string
  nodeRole?: CascadeNodeRole
  importedFromRevision?: number
}

export interface CascadeImportActivitySelection {
  activityKey: string
  taskKeys: string[]
}

export interface CascadeImportSelection {
  initiativeKey: string
  /** Whole-measurable import (manager / supervisor cascade). */
  activityKeys: string[]
  /** Task-level import (officer cascade); when set, drives import per measurable. */
  activities?: CascadeImportActivitySelection[]
}

export interface CascadeKpiTaskOption {
  taskKey: string
  title: string
  canCascade: boolean
  alreadyImported: boolean
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
  activityType: 'kpi' | 'measurable' | 'cross-cutting'
  hasAim: boolean
  canCascade: boolean
  alreadyImported: boolean
  /** Officer cascade: selectable detailed tasks under this KPI. */
  tasks?: CascadeKpiTaskOption[]
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

export interface SupervisorCascadeOptionsResponse {
  supervisorContractId: string
  financialYearLabel: string
  cascadeRevision: number
  objectives: ManagerCascadeObjectiveOption[]
}
