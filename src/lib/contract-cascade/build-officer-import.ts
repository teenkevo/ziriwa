import { buildCascadeSource } from './cascade-fields'
import { expandOfficerCascadeActivities } from './officer-cascade-selection'
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

type OfficerObjective = SsmartaObjective & {
  _type?: string
  cascadeKind?: string
  cascadeSource?: CascadeSource
}

type OfficerInitiative = ContractInitiative & {
  _type?: string
  cascadeKind?: string
  cascadeSource?: CascadeSource
}

type OfficerActivity = MeasurableActivity & {
  _type?: string
  cascadeKind?: string
  cascadeSource?: CascadeSource
}

type OfficerTask = DetailedTask & {
  _type?: string
  cascadeKind?: string
  cascadeSource?: CascadeSource
}

export interface BuildOfficerImportInput {
  supervisorObjectives: SsmartaObjective[]
  supervisorContractId: string
  officerStaffId: string
  cascadeRevision: number
  selections: CascadeImportSelection[]
  existingObjectives: OfficerObjective[]
  rewrites?: Record<string, CascadeActivityRewrite>
}

/** Sanity reference when writing cascaded tasks (read back as assignee->{ _id }). */
function officerTaskAssignee(officerStaffId: string): DetailedTask['assignee'] {
  return {
    _type: 'reference',
    _ref: officerStaffId,
  } as unknown as DetailedTask['assignee']
}

export interface BuildOfficerImportResult {
  objectives: OfficerObjective[]
  importedActivityKeys: string[]
  importedTaskKeys: string[]
  skipped: Array<{ activityKey: string; reason: string }>
}

function taskText(task: DetailedTask | string): string {
  if (typeof task === 'string') return task.trim()
  return task.task?.trim() ?? ''
}

function resolveSupervisorTaskKey(
  raw: DetailedTask | string,
  index: number,
): string {
  if (typeof raw !== 'string' && raw._key) return raw._key
  return `idx-${index}`
}

function copySupervisorTasks(
  tasks: (DetailedTask | string)[] | undefined,
  supervisorContractId: string,
  officerStaffId: string,
  activityKey: string,
  revision: number,
  selectedTaskKeys: Set<string>,
): OfficerTask[] {
  const out: OfficerTask[] = []
  for (const [index, raw] of (tasks ?? []).entries()) {
    const key = resolveSupervisorTaskKey(raw, index)
    if (!selectedTaskKeys.has(key)) continue
    const text = taskText(raw)
    if (!text) continue
    out.push({
      _type: 'detailedTask',
      _key: crypto.randomUUID(),
      task: text,
      priority: typeof raw === 'string' ? 'medium' : (raw.priority ?? 'medium'),
      status: 'to_do',
      targetDate: typeof raw === 'string' ? undefined : raw.targetDate,
      reportingFrequency:
        typeof raw === 'string' ? 'n/a' : (raw.reportingFrequency ?? 'n/a'),
      expectedDeliverable:
        typeof raw === 'string' ? undefined : raw.expectedDeliverable,
      reportingPeriodStart:
        typeof raw === 'string' ? undefined : raw.reportingPeriodStart,
      assignee: officerTaskAssignee(officerStaffId),
      officerWork: [
        {
          _key: `ow-${officerStaffId.replace(/[^a-zA-Z0-9]/g, '').slice(-16)}`,
          assignee: officerTaskAssignee(officerStaffId),
          status: 'to_do',
        },
      ],
      cascadeKind: 'cascaded',
      cascadeSource: buildCascadeSource(
        {
          supervisorContractId,
          activityKey,
          taskKey: key,
          nodeRole: 'supervisorTaskAsTask',
        },
        revision,
      ),
    })
  }
  return out
}

function copyRewriteTasks(
  tasks: string[],
  supervisorContractId: string,
  officerStaffId: string,
  activityKey: string,
  revision: number,
): OfficerTask[] {
  return tasks.map(text => ({
    _type: 'detailedTask',
    _key: crypto.randomUUID(),
    task: text,
    priority: 'medium',
    status: 'to_do',
    reportingFrequency: 'n/a',
    assignee: officerTaskAssignee(officerStaffId),
    officerWork: [
      {
        _key: `ow-${officerStaffId.replace(/[^a-zA-Z0-9]/g, '').slice(-16)}`,
        assignee: officerTaskAssignee(officerStaffId),
        status: 'to_do',
      },
    ],
    cascadeKind: 'cascaded',
    cascadeSource: buildCascadeSource(
      {
        supervisorContractId,
        activityKey,
        nodeRole: 'supervisorTaskAsTask',
      },
      revision,
    ),
  }))
}

function officerTaskAlreadyExists(
  measurable: OfficerActivity | undefined,
  supervisorContractId: string,
  activityKey: string,
  supervisorTaskKey: string,
): boolean {
  for (const raw of measurable?.tasks ?? []) {
    const src = (raw as OfficerTask).cascadeSource
    if (
      src?.supervisorContractId === supervisorContractId &&
      src.activityKey === activityKey &&
      src.taskKey === supervisorTaskKey &&
      src.nodeRole === 'supervisorTaskAsTask'
    ) {
      return true
    }
  }
  return false
}

function resolveOfficerTasks(
  rewrite: CascadeActivityRewrite | undefined,
  supervisorTasks: (DetailedTask | string)[] | undefined,
  supervisorContractId: string,
  officerStaffId: string,
  activityKey: string,
  revision: number,
  selectedTaskKeys: Set<string>,
): OfficerTask[] {
  if (rewrite?.tasks?.length) {
    return copyRewriteTasks(
      rewrite.tasks,
      supervisorContractId,
      officerStaffId,
      activityKey,
      revision,
    )
  }
  return copySupervisorTasks(
    supervisorTasks,
    supervisorContractId,
    officerStaffId,
    activityKey,
    revision,
    selectedTaskKeys,
  )
}

function findSupervisorInitiative(
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
  objectives: OfficerObjective[],
  supervisorContractId: string,
  initiativeKey: string,
): OfficerObjective | undefined {
  return objectives.find(
    o =>
      o.cascadeSource?.supervisorContractId === supervisorContractId &&
      o.cascadeSource?.initiativeKey === initiativeKey &&
      o.cascadeSource?.nodeRole === 'supervisorInitiativeAsObjective',
  )
}

function findExistingInitiativeByMeasurable(
  objectives: OfficerObjective[],
  supervisorContractId: string,
  activityKey: string,
): {
  objective: OfficerObjective
  initiative: OfficerInitiative
  measurable: OfficerActivity
} | null {
  for (const objective of objectives) {
    for (const initiative of (objective.initiatives ??
      []) as OfficerInitiative[]) {
      if (
        initiative.cascadeSource?.supervisorContractId !==
          supervisorContractId ||
        initiative.cascadeSource?.activityKey !== activityKey ||
        initiative.cascadeSource?.nodeRole !== 'supervisorMeasurableAsInitiative'
      ) {
        continue
      }
      const measurable = initiative.measurableActivities?.[0] as
        | OfficerActivity
        | undefined
      if (!measurable) continue
      return { objective, initiative, measurable }
    }
  }
  return null
}

export function buildOfficerImport(
  input: BuildOfficerImportInput,
): BuildOfficerImportResult {
  const {
    supervisorObjectives,
    supervisorContractId,
    cascadeRevision,
    selections,
    existingObjectives,
    rewrites,
  } = input

  const objectives: OfficerObjective[] = structuredClone(
    existingObjectives,
  ) as OfficerObjective[]

  const importedActivityKeys: string[] = []
  const importedTaskKeys: string[] = []
  const skipped: Array<{ activityKey: string; reason: string }> = []

  for (const selection of selections) {
    const located = findSupervisorInitiative(
      supervisorObjectives,
      selection.initiativeKey,
    )
    if (!located) {
      for (const activity of expandOfficerCascadeActivities(selection)) {
        skipped.push({
          activityKey: activity.activityKey,
          reason: 'Supervisor initiative not found',
        })
      }
      continue
    }

    const { initiative: supervisorInitiative } = located

    for (const activitySelection of expandOfficerCascadeActivities(selection)) {
      const { activityKey } = activitySelection

      const supervisorMeasurable = supervisorInitiative.measurableActivities?.find(
        a => a._key === activityKey,
      )
      if (!supervisorMeasurable) {
        skipped.push({
          activityKey,
          reason: 'Supervisor measurable not found',
        })
        continue
      }
      if (supervisorMeasurable.activityType === 'cross-cutting') {
        skipped.push({
          activityKey,
          reason:
            'Cross-cutting activities stay on this contract and cannot be cascaded',
        })
        continue
      }

      const rewrite = rewrites?.[activityKey]
      const measurableTitle =
        rewrite?.measurableTitle ??
        supervisorMeasurable.title?.trim() ??
        'Measurable activity'

      const alreadyImported = objectives.some(objective =>
        ((objective.initiatives ?? []) as OfficerInitiative[]).some(
          initiative =>
            initiative.cascadeSource?.supervisorContractId ===
              supervisorContractId &&
            initiative.cascadeSource?.activityKey === activityKey &&
            initiative.cascadeSource?.nodeRole ===
              'supervisorMeasurableAsInitiative',
        ),
      )
      if (alreadyImported) {
        skipped.push({
          activityKey,
          reason: 'Already imported on this officer contract',
        })
        continue
      }

      let officerObjective = findExistingObjectiveByInitiative(
        objectives,
        supervisorContractId,
        selection.initiativeKey,
      )

      if (!officerObjective) {
        const objectiveCodes = objectives
          .map(o => o.code?.trim())
          .filter(Boolean) as string[]
        const code = nextObjectiveCode(objectiveCodes)
        officerObjective = {
          _type: 'ssmartaObjective',
          _key: crypto.randomUUID(),
          code,
          title: rewrite?.objectiveTitle ?? supervisorInitiative.title,
          order: objectives.length,
          initiatives: [],
          cascadeKind: 'cascaded',
          cascadeSource: buildCascadeSource(
            {
              supervisorContractId,
              initiativeKey: selection.initiativeKey,
              nodeRole: 'supervisorInitiativeAsObjective',
            },
            cascadeRevision,
          ),
        }
        objectives.push(officerObjective)
      }

      const objectiveForMeasurable = officerObjective!
      const initiatives = (objectiveForMeasurable.initiatives ??
        []) as OfficerInitiative[]
      const objectiveCode =
        objectiveForMeasurable.code?.trim() ?? String(objectives.length)
      const initiativeCodes = initiatives
        .map(i => i.code?.trim())
        .filter(Boolean) as string[]
      const initiativeCode = nextInitiativeCode(objectiveCode, initiativeCodes)

      const officerInitiative: OfficerInitiative = {
        _type: 'contractInitiative',
        _key: crypto.randomUUID(),
        code: initiativeCode,
        title: rewrite?.initiativeTitle ?? measurableTitle,
        order: initiatives.length,
        measurableActivities: [],
        cascadeKind: 'cascaded',
        cascadeSource: buildCascadeSource(
          {
            supervisorContractId,
            initiativeKey: selection.initiativeKey,
            activityKey,
            nodeRole: 'supervisorMeasurableAsInitiative',
          },
          cascadeRevision,
        ),
      }

      // Officers add their own measurable activities and do not cascade further.
      officerInitiative.measurableActivities = []
      initiatives.push(officerInitiative)
      objectiveForMeasurable.initiatives = initiatives

      importedActivityKeys.push(activityKey)
    }
  }

  return { objectives, importedActivityKeys, importedTaskKeys, skipped }
}
