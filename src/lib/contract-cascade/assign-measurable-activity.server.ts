import 'server-only'

import { nextInitiativeCode, nextObjectiveCode } from '@/lib/contract-cascade/allocate-codes'
import type {
  CascadeAssigneeOption,
  CascadeNodeRole,
  CascadeSource,
} from '@/lib/contract-cascade/types'
import { parseCreateAssigneeIds } from '@/lib/measurable-activity-evidence'
import { client } from '@/sanity/lib/client'
import { writeClient } from '@/sanity/lib/write-client'

type SourceContractType =
  | 'divisionContract'
  | 'sectionContract'
  | 'supervisorContract'
  | 'officerContract'

type SourceField =
  | 'divisionContractId'
  | 'sectionContractId'
  | 'supervisorContractId'

interface CascadeLevel {
  sourceField: SourceField
  objectiveRole: CascadeNodeRole
  initiativeRole: CascadeNodeRole
  childRole: 'manager' | 'supervisor' | 'officer'
  childLabel: string
}

const CASCADE_LEVELS: Record<
  Exclude<SourceContractType, 'officerContract'>,
  CascadeLevel
> = {
  divisionContract: {
    sourceField: 'divisionContractId',
    objectiveRole: 'divisionInitiativeAsObjective',
    initiativeRole: 'divisionActivityAsInitiative',
    childRole: 'manager',
    childLabel: 'manager',
  },
  sectionContract: {
    sourceField: 'sectionContractId',
    objectiveRole: 'managerInitiativeAsObjective',
    initiativeRole: 'managerKpiAsInitiative',
    childRole: 'supervisor',
    childLabel: 'supervisor',
  },
  supervisorContract: {
    sourceField: 'supervisorContractId',
    objectiveRole: 'supervisorInitiativeAsObjective',
    initiativeRole: 'supervisorMeasurableAsInitiative',
    childRole: 'officer',
    childLabel: 'officer',
  },
}

interface ContractNode {
  _key?: string
  _type?: string
  code?: string
  title?: string
  order?: number
  cascadeKind?: string
  cascadeSource?: CascadeSource
  initiatives?: ContractNode[]
  measurableActivities?: unknown[]
}

const STAFF_NAME = /* groq */ `"fullName": coalesce(fullName, firstName + " " + lastName)`

export async function loadCascadeAssigneeOptions(input: {
  contractType: SourceContractType
  sectionId?: string
  divisionId?: string
}): Promise<CascadeAssigneeOption[] | null> {
  if (input.contractType === 'officerContract') return null

  if (input.contractType === 'divisionContract') {
    if (!input.divisionId) return []
    return client.fetch<CascadeAssigneeOption[]>(
      /* groq */ `*[
        _type == "staff"
        && role == "manager"
        && coalesce(status, "active") == "active"
        && section->division._ref == $divisionId
        && !defined(section->project._ref)
      ] | order(fullName asc) { _id, ${STAFF_NAME} }`,
      { divisionId: input.divisionId },
    )
  }

  if (!input.sectionId) return []
  const role =
    input.contractType === 'sectionContract' ? 'supervisor' : 'officer'
  return client.fetch<CascadeAssigneeOption[]>(
    /* groq */ `*[
      _type == "staff"
      && role == $role
      && coalesce(status, "active") == "active"
      && section._ref == $sectionId
    ] | order(fullName asc) { _id, ${STAFF_NAME} }`,
    { role, sectionId: input.sectionId },
  )
}

export type SetActivityAssigneesResult =
  | { ok: true; warnings: string[] }
  | { ok: false; status: number; error: string }

const CROSS_CUTTING_CASCADE_ERROR =
  'Cross-cutting activities stay on this contract and cannot be cascaded.'

interface ActivityCascadeContext {
  _type?: SourceContractType
  financialYearLabel?: string
  sectionId?: string
  divisionId?: string
  initiativeTitle?: string
  initiativeKey?: string
  activityTitle?: string
  activityKey?: string
  activityType?: string
  currentAssigneeIds?: string[]
}

/** Assigns the measurable activity just appended to an initiative. */
export async function assignAppendedMeasurableActivity(input: {
  contractId: string
  objectiveIndex: number
  initiativeIndex: number
  assigneeIds: string[]
}): Promise<SetActivityAssigneesResult | null> {
  if (input.assigneeIds.length === 0) return null
  const count = await client.fetch<number | null>(
    `count(*[_id == $contractId][0].objectives[$objectiveIndex].initiatives[$initiativeIndex].measurableActivities)`,
    {
      contractId: input.contractId,
      objectiveIndex: input.objectiveIndex,
      initiativeIndex: input.initiativeIndex,
    },
  )
  if (!count) {
    return { ok: false, status: 404, error: 'Measurable activity not found' }
  }
  return setMeasurableActivityAssignees({
    contractId: input.contractId,
    objectiveIndex: input.objectiveIndex,
    initiativeIndex: input.initiativeIndex,
    activityIndex: count - 1,
    assigneeIds: input.assigneeIds,
  })
}

export async function createdActivityAssigneeIds(input: {
  contractType: Exclude<SourceContractType, 'officerContract'>
  sectionId?: string
  divisionId?: string
  activityType: unknown
  assigneeIds: unknown
}): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  const ids =
    input.activityType === 'cross-cutting'
      ? []
      : parseCreateAssigneeIds(input.assigneeIds)
  if (input.activityType !== 'cross-cutting' && ids.length === 0) {
    return { ok: false, error: 'Assignees are required' }
  }
  if (ids.length === 0) return { ok: true, ids: [] }
  const eligible = await loadCascadeAssigneeOptions({
    contractType: input.contractType,
    sectionId: input.sectionId,
    divisionId: input.divisionId,
  })
  const allowed = new Set((eligible ?? []).map(person => person._id))
  if (ids.some(id => !allowed.has(id))) {
    const label =
      input.contractType === 'divisionContract'
        ? 'managers'
        : input.contractType === 'sectionContract'
          ? 'supervisors'
          : 'officers'
    return {
      ok: false,
      error: `Assignees must be ${label} on the level below`,
    }
  }
  return { ok: true, ids }
}

export async function setMeasurableActivityAssignees(input: {
  contractId: string
  objectiveIndex: number
  initiativeIndex: number
  activityIndex: number
  assigneeIds: string[]
}): Promise<SetActivityAssigneesResult> {
  const { contractId, objectiveIndex, initiativeIndex, activityIndex, assigneeIds } =
    input
  if (
    !Number.isInteger(objectiveIndex) ||
    !Number.isInteger(initiativeIndex) ||
    !Number.isInteger(activityIndex) ||
    objectiveIndex < 0 ||
    initiativeIndex < 0 ||
    activityIndex < 0
  ) {
    return { ok: false, status: 400, error: 'Activity location is required' }
  }
  if (
    !Array.isArray(assigneeIds) ||
    assigneeIds.some(id => typeof id !== 'string' || !id.trim())
  ) {
    return { ok: false, status: 400, error: 'assigneeIds must be a list of staff ids' }
  }

  const uniqueIds = [...new Set(assigneeIds.map(id => id.trim()))]

  const source = await loadActivityCascadeContext({
    contractId,
    objectiveIndex,
    initiativeIndex,
    activityIndex,
  })

  if (!source?._type || !source.activityKey || !source.initiativeKey) {
    return { ok: false, status: 404, error: 'Measurable activity not found' }
  }
  if (source.activityType === 'cross-cutting') {
    await clearActivityCascade({
      contractId,
      objectiveIndex,
      initiativeIndex,
      activityIndex,
      source,
    })
    return { ok: false, status: 400, error: CROSS_CUTTING_CASCADE_ERROR }
  }
  if (source._type === 'officerContract') {
    return {
      ok: false,
      status: 400,
      error: 'Officers do not cascade measurable activities further down',
    }
  }
  if (!source.financialYearLabel) {
    return { ok: false, status: 400, error: 'Contract has no financial year' }
  }

  const level = CASCADE_LEVELS[source._type]
  const eligible = await loadCascadeAssigneeOptions({
    contractType: source._type,
    sectionId: source.sectionId,
    divisionId: source.divisionId,
  })
  const eligibleIds = new Set((eligible ?? []).map(person => person._id))
  const currentIds = (source.currentAssigneeIds ?? []).filter(Boolean)
  const allowedIds = new Set([...eligibleIds, ...currentIds])
  if (uniqueIds.some(id => !allowedIds.has(id))) {
    return {
      ok: false,
      status: 400,
      error: `Assignees must be ${level.childLabel}s on the level below`,
    }
  }

  await writeClient
    .patch(contractId)
    .set({
      [`objectives[${objectiveIndex}].initiatives[${initiativeIndex}].measurableActivities[${activityIndex}].assignees`]:
        uniqueIds.map(id => ({
          _type: 'reference',
          _ref: id,
          _key: crypto.randomUUID(),
        })),
    })
    .commit()

  const names = await staffNames([...uniqueIds, ...currentIds])
  const warnings: string[] = []
  const removed = currentIds.filter(id => !uniqueIds.includes(id))

  for (const staffId of uniqueIds) {
    const downstreamId = await findDownstreamContractId({
      contractType: source._type,
      staffId,
      financialYearLabel: source.financialYearLabel,
      sectionId: source.sectionId,
      divisionId: source.divisionId,
    })
    if (!downstreamId) {
      warnings.push(
        `${names.get(staffId) ?? 'This person'} has no performance contract for ${source.financialYearLabel}, so nothing was cascaded yet.`,
      )
      continue
    }
    await upsertDownstreamContract({
      downstreamId,
      level,
      upstreamContractId: contractId,
      initiativeKey: source.initiativeKey,
      initiativeTitle: source.initiativeTitle?.trim() || 'Initiative',
      activityKey: source.activityKey,
      activityTitle: source.activityTitle?.trim() || 'Measurable activity',
    })
  }

  for (const staffId of removed) {
    const downstreamId = await findDownstreamContractId({
      contractType: source._type,
      staffId,
      financialYearLabel: source.financialYearLabel,
      sectionId: source.sectionId,
      divisionId: source.divisionId,
    })
    if (!downstreamId) continue
    await removeDownstreamInitiative({
      downstreamId,
      level,
      upstreamContractId: contractId,
      initiativeKey: source.initiativeKey,
      activityKey: source.activityKey,
    })
  }

  return { ok: true, warnings }
}

/** Drop downstream copies of cross-cutting activities that were already assigned. */
export async function releaseAssignedCrossCuttingActivities(input: {
  contractId: string
  objectives?: Array<{
    initiatives?: Array<{
      measurableActivities?: Array<{
        activityType?: string
        assignees?: Array<{ _id?: string } | null> | null
      } | null> | null
    } | null> | null
  } | null> | null
}): Promise<void> {
  const objectives = input.objectives ?? []
  for (let objectiveIndex = 0; objectiveIndex < objectives.length; objectiveIndex++) {
    const initiatives = objectives[objectiveIndex]?.initiatives ?? []
    for (
      let initiativeIndex = 0;
      initiativeIndex < initiatives.length;
      initiativeIndex++
    ) {
      const activities = initiatives[initiativeIndex]?.measurableActivities ?? []
      for (let activityIndex = 0; activityIndex < activities.length; activityIndex++) {
        const activity = activities[activityIndex]
        if (activity?.activityType !== 'cross-cutting') continue
        if (!(activity.assignees ?? []).some(person => person?._id)) continue
        await releaseCrossCuttingActivity({
          contractId: input.contractId,
          objectiveIndex,
          initiativeIndex,
          activityIndex,
        })
      }
    }
  }
}

/** Pull a cross-cutting activity back off downstream contracts. It stays owned here. */
export async function releaseCrossCuttingActivity(input: {
  contractId: string
  objectiveIndex: number
  initiativeIndex: number
  activityIndex: number
}): Promise<void> {
  const source = await loadActivityCascadeContext(input)
  if (!source?._type || source.activityType !== 'cross-cutting') return
  if (source._type === 'officerContract') return
  await clearActivityCascade({ ...input, source })
}

async function loadActivityCascadeContext(input: {
  contractId: string
  objectiveIndex: number
  initiativeIndex: number
  activityIndex: number
}): Promise<ActivityCascadeContext | null> {
  return writeClient.fetch<ActivityCascadeContext | null>(
    /* groq */ `*[_id == $contractId][0]{
      _type,
      financialYearLabel,
      "sectionId": section._ref,
      "divisionId": division._ref,
      "initiativeTitle": objectives[$objectiveIndex].initiatives[$initiativeIndex].title,
      "initiativeKey": objectives[$objectiveIndex].initiatives[$initiativeIndex]._key,
      "activityTitle": objectives[$objectiveIndex].initiatives[$initiativeIndex].measurableActivities[$activityIndex].title,
      "activityKey": objectives[$objectiveIndex].initiatives[$initiativeIndex].measurableActivities[$activityIndex]._key,
      "activityType": objectives[$objectiveIndex].initiatives[$initiativeIndex].measurableActivities[$activityIndex].activityType,
      "currentAssigneeIds": objectives[$objectiveIndex].initiatives[$initiativeIndex].measurableActivities[$activityIndex].assignees[]._ref
    }`,
    input,
  )
}

async function clearActivityCascade(input: {
  contractId: string
  objectiveIndex: number
  initiativeIndex: number
  activityIndex: number
  source: ActivityCascadeContext
}) {
  const { contractId, objectiveIndex, initiativeIndex, activityIndex, source } =
    input
  const currentIds = (source.currentAssigneeIds ?? []).filter(Boolean)
  if (!source._type || source._type === 'officerContract' || !source.activityKey) {
    return
  }
  if (!source.initiativeKey || !source.financialYearLabel) return

  await writeClient
    .patch(contractId)
    .set({
      [`objectives[${objectiveIndex}].initiatives[${initiativeIndex}].measurableActivities[${activityIndex}].assignees`]:
        [],
    })
    .commit()

  if (currentIds.length === 0) return
  const level = CASCADE_LEVELS[source._type]
  for (const staffId of currentIds) {
    const downstreamId = await findDownstreamContractId({
      contractType: source._type,
      staffId,
      financialYearLabel: source.financialYearLabel,
      sectionId: source.sectionId,
      divisionId: source.divisionId,
    })
    if (!downstreamId) continue
    await removeDownstreamInitiative({
      downstreamId,
      level,
      upstreamContractId: contractId,
      initiativeKey: source.initiativeKey,
      activityKey: source.activityKey,
    })
  }
}

async function staffNames(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return new Map()
  const rows = await client.fetch<{ _id: string; fullName?: string }[]>(
    /* groq */ `*[_type == "staff" && _id in $ids]{ _id, ${STAFF_NAME} }`,
    { ids: unique },
  )
  return new Map(rows.map(row => [row._id, row.fullName?.trim() || 'Staff']))
}

async function findDownstreamContractId(input: {
  contractType: Exclude<SourceContractType, 'officerContract'>
  staffId: string
  financialYearLabel: string
  sectionId?: string
  divisionId?: string
}): Promise<string | null> {
  if (input.contractType === 'divisionContract') {
    if (!input.divisionId) return null
    return writeClient.fetch<string | null>(
      /* groq */ `*[
        _type == "sectionContract"
        && financialYearLabel == $financialYearLabel
        && manager._ref == $staffId
        && section->division._ref == $divisionId
        && !defined(section->project._ref)
      ][0]._id`,
      input,
    )
  }

  if (!input.sectionId) return null
  const childType =
    input.contractType === 'sectionContract'
      ? 'supervisorContract'
      : 'officerContract'
  const staffField =
    input.contractType === 'sectionContract' ? 'supervisor' : 'officer'
  return writeClient.fetch<string | null>(
    /* groq */ `*[
      _type == $childType
      && financialYearLabel == $financialYearLabel
      && section._ref == $sectionId
      && ${staffField}._ref == $staffId
    ][0]._id`,
    { ...input, childType },
  )
}

function sourceMatches(
  source: CascadeSource | undefined,
  level: CascadeLevel,
  upstreamContractId: string,
  role: CascadeNodeRole,
  keys: { initiativeKey?: string; activityKey?: string },
): boolean {
  if (!source || source.nodeRole !== role) return false
  if (source[level.sourceField] !== upstreamContractId) return false
  if (keys.initiativeKey && source.initiativeKey !== keys.initiativeKey) return false
  if (keys.activityKey && source.activityKey !== keys.activityKey) return false
  return true
}

async function upsertDownstreamContract(input: {
  downstreamId: string
  level: CascadeLevel
  upstreamContractId: string
  initiativeKey: string
  initiativeTitle: string
  activityKey: string
  activityTitle: string
}) {
  const objectives =
    (await writeClient.fetch<ContractNode[] | null>(
      /* groq */ `*[_id == $id][0].objectives`,
      { id: input.downstreamId },
    )) ?? []

  const next = upsertCascadedNodes(objectives, input)
  await writeClient.patch(input.downstreamId).set({ objectives: next }).commit()
}

function upsertCascadedNodes(
  objectives: ContractNode[],
  input: {
    level: CascadeLevel
    upstreamContractId: string
    initiativeKey: string
    initiativeTitle: string
    activityKey: string
    activityTitle: string
  },
): ContractNode[] {
  const next = objectives.map(objective => ({
    ...objective,
    initiatives: [...(objective.initiatives ?? [])],
  }))
  let objective = next.find(item =>
    sourceMatches(item.cascadeSource, input.level, input.upstreamContractId, input.level.objectiveRole, {
      initiativeKey: input.initiativeKey,
    }),
  )

  if (!objective) {
    const code = nextObjectiveCode(next.map(item => item.code ?? ''))
    objective = {
      _type: 'ssmartaObjective',
      _key: crypto.randomUUID(),
      code,
      title: input.initiativeTitle,
      order: next.length + 1,
      cascadeKind: 'cascaded',
      cascadeSource: {
        [input.level.sourceField]: input.upstreamContractId,
        initiativeKey: input.initiativeKey,
        nodeRole: input.level.objectiveRole,
      },
      initiatives: [],
    }
    next.push(objective)
  } else {
    objective.title = input.initiativeTitle
  }

  const initiatives = objective.initiatives ?? []
  const initiative = initiatives.find(item =>
    sourceMatches(
      item.cascadeSource,
      input.level,
      input.upstreamContractId,
      input.level.initiativeRole,
      { activityKey: input.activityKey },
    ),
  )
  if (!initiative) {
    initiatives.push({
      _type: 'contractInitiative',
      _key: crypto.randomUUID(),
      code: nextInitiativeCode(
        objective.code ?? '',
        initiatives.map(item => item.code ?? ''),
      ),
      title: input.activityTitle,
      order: initiatives.length + 1,
      cascadeKind: 'cascaded',
      cascadeSource: {
        [input.level.sourceField]: input.upstreamContractId,
        initiativeKey: input.initiativeKey,
        activityKey: input.activityKey,
        nodeRole: input.level.initiativeRole,
      },
      measurableActivities: [],
    })
    objective.initiatives = initiatives
  } else {
    initiative.title = input.activityTitle
  }

  return next
}

async function removeDownstreamInitiative(input: {
  downstreamId: string
  level: CascadeLevel
  upstreamContractId: string
  initiativeKey: string
  activityKey: string
}) {
  const objectives =
    (await writeClient.fetch<ContractNode[] | null>(
      /* groq */ `*[_id == $id][0].objectives`,
      { id: input.downstreamId },
    )) ?? []

  const next = objectives.flatMap(objective => {
    const initiatives = (objective.initiatives ?? []).filter(
      item =>
        !sourceMatches(
          item.cascadeSource,
          input.level,
          input.upstreamContractId,
          input.level.initiativeRole,
          { activityKey: input.activityKey },
        ),
    )
    const fromThisInitiative = sourceMatches(
      objective.cascadeSource,
      input.level,
      input.upstreamContractId,
      input.level.objectiveRole,
      { initiativeKey: input.initiativeKey },
    )
    if (fromThisInitiative && initiatives.length === 0) return []
    return [{ ...objective, initiatives }]
  })

  await writeClient.patch(input.downstreamId).set({ objectives: next }).commit()
}
