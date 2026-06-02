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
