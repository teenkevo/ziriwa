import { managerActivityCanCascade, normalizeAim } from './aim'
import { buildCascadeSource } from './cascade-fields'
import { nextInitiativeCode, nextObjectiveCode } from './allocate-codes'
import type {
  CascadeActivityRewrite,
  CascadeImportSelection,
  CascadeSource,
} from './types'
import type {
  ContractInitiative,
  DetailedTask,
  MeasurableActivity,
  SsmartaObjective,
} from '@/sanity/lib/section-contracts/get-section-contract'

type SupervisorObjective = SsmartaObjective & {
  _type?: string
  cascadeKind?: string
  cascadeSource?: CascadeSource
}

type SupervisorInitiative = ContractInitiative & {
  _type?: string
  cascadeKind?: string
  cascadeSource?: CascadeSource
}

type SupervisorActivity = MeasurableActivity & {
  _type?: string
  cascadeKind?: string
  cascadeSource?: CascadeSource
}

type SupervisorTask = DetailedTask & {
  _type?: string
  cascadeKind?: string
  cascadeSource?: CascadeSource
}

export interface BuildSupervisorImportInput {
  managerObjectives: SsmartaObjective[]
  sectionContractId: string
  cascadeRevision: number
  selections: CascadeImportSelection[]
  existingObjectives: SupervisorObjective[]
  /** Project PM contracts: initiatives only, measurables added manually by lead. */
  upstreamIsProjectContract?: boolean
  /** Optional accepted rewrites keyed by manager activityKey. */
  rewrites?: Record<string, CascadeActivityRewrite>
}

export interface BuildSupervisorImportResult {
  objectives: SupervisorObjective[]
  importedActivityKeys: string[]
  skipped: Array<{ activityKey: string; reason: string }>
}

function taskText(task: DetailedTask | string): string {
  if (typeof task === 'string') return task.trim()
  return task.task?.trim() ?? ''
}

function resolveManagerTaskKey(raw: DetailedTask | string, index: number): string {
  if (typeof raw !== 'string' && raw._key) return raw._key
  return `idx-${index}`
}

function copyManagerTasks(
  tasks: (DetailedTask | string)[] | undefined,
  sectionContractId: string,
  activityKey: string,
  revision: number,
): SupervisorTask[] {
  const out: SupervisorTask[] = []
  for (const [index, raw] of (tasks ?? []).entries()) {
    const text = taskText(raw)
    if (!text) continue
    const managerKey = resolveManagerTaskKey(raw, index)
    out.push({
      _type: 'detailedTask',
      _key: crypto.randomUUID(),
      task: text,
      priority:
        typeof raw === 'string' ? 'medium' : (raw.priority ?? 'medium'),
      status: 'to_do',
      targetDate: typeof raw === 'string' ? undefined : raw.targetDate,
      reportingFrequency:
        typeof raw === 'string'
          ? 'n/a'
          : (raw.reportingFrequency ?? 'n/a'),
      expectedDeliverable:
        typeof raw === 'string' ? undefined : raw.expectedDeliverable,
      reportingPeriodStart:
        typeof raw === 'string' ? undefined : raw.reportingPeriodStart,
      cascadeKind: 'cascaded',
      cascadeSource: buildCascadeSource(
        {
          sectionContractId,
          activityKey,
          taskKey: managerKey,
          nodeRole: 'managerTaskAsTask',
        },
        revision,
      ),
    })
  }
  return out
}

function copyRewriteTasks(
  tasks: string[],
  sectionContractId: string,
  activityKey: string,
  revision: number,
): SupervisorTask[] {
  return tasks.map(text => ({
    _type: 'detailedTask',
    _key: crypto.randomUUID(),
    task: text,
    priority: 'medium',
    status: 'to_do',
    reportingFrequency: 'n/a',
    cascadeKind: 'cascaded',
    cascadeSource: buildCascadeSource(
      {
        sectionContractId,
        activityKey,
        nodeRole: 'managerTaskAsTask',
      },
      revision,
    ),
  }))
}

function resolveSupervisorTasks(
  rewrite: CascadeActivityRewrite | undefined,
  managerTasks: (DetailedTask | string)[] | undefined,
  sectionContractId: string,
  activityKey: string,
  revision: number,
): SupervisorTask[] {
  if (rewrite?.tasks?.length) {
    return copyRewriteTasks(
      rewrite.tasks,
      sectionContractId,
      activityKey,
      revision,
    )
  }
  return copyManagerTasks(
    managerTasks,
    sectionContractId,
    activityKey,
    revision,
  )
}

function findManagerInitiative(
  objectives: SsmartaObjective[],
  initiativeKey: string,
): {
  objective: SsmartaObjective
  initiative: ContractInitiative
} | null {
  for (const objective of objectives) {
    const initiative = objective.initiatives?.find(i => i._key === initiativeKey)
    if (initiative) return { objective, initiative }
  }
  return null
}

function findExistingObjectiveByInitiative(
  objectives: SupervisorObjective[],
  sectionContractId: string,
  initiativeKey: string,
): SupervisorObjective | undefined {
  return objectives.find(o =>
    o.cascadeSource?.sectionContractId === sectionContractId &&
    o.cascadeSource?.initiativeKey === initiativeKey &&
    o.cascadeSource?.nodeRole === 'managerInitiativeAsObjective',
  )
}

function findExistingInitiativeByKpi(
  initiatives: SupervisorInitiative[] | undefined,
  sectionContractId: string,
  activityKey: string,
): SupervisorInitiative | undefined {
  return initiatives?.find(i =>
    i.cascadeSource?.sectionContractId === sectionContractId &&
    i.cascadeSource?.activityKey === activityKey &&
    i.cascadeSource?.nodeRole === 'managerKpiAsInitiative',
  )
}

function initiativeAlreadyImported(
  objectives: SupervisorObjective[],
  sectionContractId: string,
  activityKey: string,
): boolean {
  for (const obj of objectives) {
    if (
      findExistingInitiativeByKpi(
        obj.initiatives as SupervisorInitiative[] | undefined,
        sectionContractId,
        activityKey,
      )
    ) {
      return true
    }
  }
  return false
}

/**
 * Merges selected manager KPIs into supervisor contract objectives (in memory).
 * KPIs without AIM are skipped (caller should validate selections first).
 */
export function buildSupervisorImport(
  input: BuildSupervisorImportInput,
): BuildSupervisorImportResult {
  const {
    managerObjectives,
    sectionContractId,
    cascadeRevision,
    selections,
    existingObjectives,
    upstreamIsProjectContract = false,
    rewrites,
  } = input

  const objectives: SupervisorObjective[] = structuredClone(
    existingObjectives,
  ) as SupervisorObjective[]

  const importedActivityKeys: string[] = []
  const skipped: Array<{ activityKey: string; reason: string }> = []

  for (const selection of selections) {
    const located = findManagerInitiative(
      managerObjectives,
      selection.initiativeKey,
    )
    if (!located) {
      for (const activityKey of selection.activityKeys) {
        skipped.push({
          activityKey,
          reason: 'Manager initiative not found',
        })
      }
      continue
    }

    const { initiative: managerInitiative } = located

    for (const activityKey of selection.activityKeys) {
      if (initiativeAlreadyImported(objectives, sectionContractId, activityKey)) {
        skipped.push({
          activityKey,
          reason: 'Already imported on this supervisor contract',
        })
        continue
      }

      const managerActivity = managerInitiative.measurableActivities?.find(
        a => a._key === activityKey,
      )
      if (!managerActivity) {
        skipped.push({ activityKey, reason: 'Upstream activity not found' })
        continue
      }
      if (
        managerActivity.activityType !== 'kpi' &&
        managerActivity.activityType !== 'measurable'
      ) {
        skipped.push({
          activityKey,
          reason: 'Only KPIs and measurable activities can be cascaded',
        })
        continue
      }
      if (!managerActivityCanCascade(managerActivity)) {
        skipped.push({
          activityKey,
          reason:
            managerActivity.activityType === 'measurable'
              ? 'Project measurable activity has no title — cannot cascade'
              : 'Manager KPI has no AIM — cannot cascade',
        })
        continue
      }

      const rewrite = rewrites?.[activityKey]
      const isProjectCascade =
        upstreamIsProjectContract ||
        managerActivity.activityType === 'measurable'
      const managerMeasurableTitle = managerActivity.title?.trim() ?? ''

      let supervisorObjective = findExistingObjectiveByInitiative(
        objectives,
        sectionContractId,
        selection.initiativeKey,
      )

      if (!supervisorObjective) {
        const objectiveCodes = objectives
          .map(o => o.code?.trim())
          .filter(Boolean) as string[]
        const code = nextObjectiveCode(objectiveCodes)
        supervisorObjective = {
          _type: 'ssmartaObjective',
          _key: crypto.randomUUID(),
          code,
          title: rewrite?.objectiveTitle ?? managerInitiative.title,
          order: objectives.length,
          initiatives: [],
          cascadeKind: 'cascaded',
          cascadeSource: buildCascadeSource(
            {
              sectionContractId,
              initiativeKey: selection.initiativeKey,
              nodeRole: 'managerInitiativeAsObjective',
            },
            cascadeRevision,
          ),
        }
        objectives.push(supervisorObjective)
      }

      const objectiveForKpi = supervisorObjective!
      const initiatives = (objectiveForKpi.initiatives ??
        []) as SupervisorInitiative[]
      const objectiveCode =
        objectiveForKpi.code?.trim() ?? String(objectives.length)
      const initiativeCodes = initiatives
        .map(i => i.code?.trim())
        .filter(Boolean) as string[]
      const initiativeCode = nextInitiativeCode(objectiveCode, initiativeCodes)

      const supervisorInitiative: SupervisorInitiative = {
        _type: 'contractInitiative',
        _key: crypto.randomUUID(),
        code: initiativeCode,
        title:
          rewrite?.initiativeTitle ??
          (isProjectCascade ? managerMeasurableTitle : managerActivity.title),
        order: initiatives.length,
        measurableActivities: [],
        cascadeKind: 'cascaded',
        cascadeSource: buildCascadeSource(
          {
            sectionContractId,
            initiativeKey: selection.initiativeKey,
            activityKey,
            nodeRole: 'managerKpiAsInitiative',
          },
          cascadeRevision,
        ),
      }

      if (isProjectCascade) {
        // Workstream leads define their own measurables on the contract page.
        supervisorInitiative.measurableActivities = []
      } else {
        const supervisorMeasurable: SupervisorActivity = {
          _type: 'measurableActivity',
          _key: crypto.randomUUID(),
          activityType: 'measurable',
          title:
            rewrite?.measurableTitle ?? normalizeAim(managerActivity.aim),
          order: 0,
          targetDate: managerActivity.targetDate,
          status: 'not_started',
          reportingFrequency: managerActivity.reportingFrequency ?? 'monthly',
          tasks: resolveSupervisorTasks(
            rewrite,
            managerActivity.tasks,
            sectionContractId,
            activityKey,
            cascadeRevision,
          ),
          cascadeKind: 'cascaded',
          cascadeSource: buildCascadeSource(
            {
              sectionContractId,
              initiativeKey: selection.initiativeKey,
              activityKey,
              nodeRole: 'managerAimAsMeasurable',
            },
            cascadeRevision,
          ),
        }
        supervisorInitiative.measurableActivities = [supervisorMeasurable]
      }
      initiatives.push(supervisorInitiative)
      objectiveForKpi.initiatives = initiatives

      importedActivityKeys.push(activityKey)
    }
  }

  return { objectives, importedActivityKeys, skipped }
}

/** Validates API payload; returns activity keys that cannot cascade yet. */
export function findActivityKeysBlockedWithoutAim(
  managerObjectives: SsmartaObjective[],
  selections: CascadeImportSelection[],
): string[] {
  const blocked: string[] = []
  for (const selection of selections) {
    const located = findManagerInitiative(
      managerObjectives,
      selection.initiativeKey,
    )
    if (!located) continue
    for (const activityKey of selection.activityKeys) {
      const activity = located.initiative.measurableActivities?.find(
        a => a._key === activityKey,
      )
      if (activity && !managerActivityCanCascade(activity)) {
        blocked.push(activityKey)
      }
    }
  }
  return blocked
}
