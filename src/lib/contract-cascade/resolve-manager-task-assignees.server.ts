import 'server-only'

import { expandOfficerCascadeActivities } from './officer-cascade-selection'
import type { CascadeImportSelection } from './types'
import type { DetailedTask, SsmartaObjective } from '@/sanity/lib/section-contracts/get-section-contract'
import { client } from '@/sanity/lib/client'
import { writeClient } from '@/sanity/lib/write-client'

export interface DownstreamTaskAssignee {
  assigneeId: string
  assigneeName: string
}

interface ManagerCascadeSourceLike {
  sectionContractId?: string
  activityKey?: string
  taskKey?: string
  nodeRole?: string
}

interface SupervisorCascadeSourceLike {
  supervisorContractId?: string
  activityKey?: string
  taskKey?: string
  nodeRole?: string
}

type SupervisorTaskBridge = {
  managerTaskKey: string
  supervisorContractId: string
  supervisorActivityKey: string
  supervisorTaskKey: string
}

function bridgeKey(
  supervisorContractId: string,
  supervisorActivityKey: string,
  supervisorTaskKey: string,
) {
  return `${supervisorContractId}::${supervisorActivityKey}::${supervisorTaskKey}`
}

type TaskLike = DetailedTask | string | null | undefined

function resolveTaskKey(raw: TaskLike, index: number): string {
  if (raw == null) return `idx-${index}`
  if (typeof raw !== 'string' && raw._key) return raw._key
  return `idx-${index}`
}

function taskLabel(raw: TaskLike): string {
  if (raw == null) return ''
  if (typeof raw === 'string') return raw.trim()
  return raw.task?.trim() ?? ''
}

async function buildManagerTaskTextIndex(
  sectionContractId: string,
  managerActivityKey: string,
): Promise<Map<string, string>> {
  const tasks = await client.fetch<TaskLike[] | null>(
    /* groq */ `
      *[_type == "sectionContract" && _id == $id][0]
        .objectives[].initiatives[].measurableActivities[_key == $activityKey][0].tasks
    `,
    { id: sectionContractId, activityKey: managerActivityKey },
  )

  const index = new Map<string, string>()
  for (const [i, raw] of (tasks ?? []).entries()) {
    if (raw == null) continue
    const label = taskLabel(raw)
    if (!label) continue
    index.set(label, resolveTaskKey(raw, i))
  }
  return index
}

async function buildSupervisorToManagerBridges(
  sectionId: string,
  sectionContractId: string,
  managerActivityKey: string,
): Promise<Map<string, SupervisorTaskBridge>> {
  const managerTaskByText = await buildManagerTaskTextIndex(
    sectionContractId,
    managerActivityKey,
  )
  const supervisorContracts = await client.fetch<
    {
      _id: string
      rows?: Array<{
        supervisorActivityKey?: string
        tasks?: Array<{
          _key?: string
          task?: string
          cascadeSource?: ManagerCascadeSourceLike
        }>
      }>
    }[]
  >(
    /* groq */ `
      *[_type == "supervisorContract" && section._ref == $sectionId]{
        _id,
        "rows": objectives[].initiatives[].measurableActivities[]{
          "supervisorActivityKey": _key,
          "tasks": tasks[]{
            _key,
            "task": coalesce(task, @),
            cascadeSource,
          },
        },
      }
    `,
    { sectionId },
  )

  const bridges = new Map<string, SupervisorTaskBridge>()

  for (const contract of supervisorContracts ?? []) {
    for (const row of contract.rows ?? []) {
      const supervisorActivityKey = row.supervisorActivityKey
      if (!supervisorActivityKey) continue
      for (const task of row.tasks ?? []) {
        if (!task) continue
        const src = task.cascadeSource
        if (
          src?.sectionContractId !== sectionContractId ||
          src?.activityKey !== managerActivityKey ||
          src?.nodeRole !== 'managerTaskAsTask' ||
          !task._key
        ) {
          continue
        }

        const supervisorLabel = (task.task ?? '').trim()
        const resolvedManagerKey =
          src.taskKey?.trim() ||
          (supervisorLabel
            ? managerTaskByText.get(supervisorLabel)
            : undefined) ||
          null
        if (!resolvedManagerKey) continue

        bridges.set(
          bridgeKey(contract._id, supervisorActivityKey, task._key),
          {
            managerTaskKey: resolvedManagerKey,
            supervisorContractId: contract._id,
            supervisorActivityKey,
            supervisorTaskKey: task._key,
          },
        )
      }
    }
  }

  return bridges
}

/**
 * Maps manager detailed-task _key → officer assignee via supervisor + officer cascadeSource.
 */
export async function getManagerTaskAssigneesFromDownstream(
  sectionId: string,
  sectionContractId: string,
  managerActivityKey: string,
): Promise<Record<string, DownstreamTaskAssignee>> {
  const bridges = await buildSupervisorToManagerBridges(
    sectionId,
    sectionContractId,
    managerActivityKey,
  )
  if (bridges.size === 0) return {}

  const officerContracts = await client.fetch<
    {
      contractOfficerId?: string | null
      contractOfficerName?: string | null
      tasks?: Array<{
        cascadeSource?: SupervisorCascadeSourceLike
        assigneeId?: string | null
        assigneeName?: string | null
      }>
    }[]
  >(
    /* groq */ `
      *[_type == "officerContract" && section._ref == $sectionId]{
        "contractOfficerId": officer._ref,
        "contractOfficerName": coalesce(
          officer->fullName,
          officer->firstName + " " + officer->lastName
        ),
        "tasks": objectives[].initiatives[].measurableActivities[].tasks[]{
          cascadeSource,
          "assigneeId": assignee._ref,
          "assigneeName": coalesce(
            assignee->fullName,
            assignee->firstName + " " + assignee->lastName
          ),
        },
      }
    `,
    { sectionId },
  )

  const byManagerTaskKey: Record<string, DownstreamTaskAssignee> = {}

  for (const contract of officerContracts ?? []) {
    for (const task of contract.tasks ?? []) {
      if (!task) continue
      const src = task.cascadeSource
      if (
        src?.nodeRole !== 'supervisorTaskAsTask' ||
        !src.supervisorContractId ||
        !src.activityKey ||
        !src.taskKey
      ) {
        continue
      }

      const bridge = bridges.get(
        bridgeKey(src.supervisorContractId, src.activityKey, src.taskKey),
      )
      if (!bridge) continue

      const assigneeId =
        task.assigneeId ?? contract.contractOfficerId ?? null
      if (!assigneeId) continue

      const assigneeName =
        task.assigneeName?.trim() ||
        contract.contractOfficerName?.trim() ||
        'Officer'

      if (!byManagerTaskKey[bridge.managerTaskKey]) {
        byManagerTaskKey[bridge.managerTaskKey] = { assigneeId, assigneeName }
      }
    }
  }

  return byManagerTaskKey
}

/**
 * After officer cascade, mirror assignee onto manager section-contract tasks
 * (via supervisor tasks' managerTaskAsTask cascadeSource).
 */
export async function syncManagerTaskAssigneesFromOfficerCascade(
  supervisorContractId: string,
  officerStaffId: string,
  selections: CascadeImportSelection[],
): Promise<void> {
  const taskKeysBySupervisorActivity = new Map<string, Set<string>>()
  for (const selection of selections) {
    for (const activity of expandOfficerCascadeActivities(selection)) {
      const set =
        taskKeysBySupervisorActivity.get(activity.activityKey) ??
        new Set<string>()
      for (const key of activity.taskKeys) set.add(key)
      taskKeysBySupervisorActivity.set(activity.activityKey, set)
    }
  }
  if (taskKeysBySupervisorActivity.size === 0) return

  const supervisorObjectives = await writeClient.fetch<SsmartaObjective[] | null>(
    /* groq */ `*[_type == "supervisorContract" && _id == $id][0].objectives`,
    { id: supervisorContractId },
  )
  if (!supervisorObjectives?.length) return

  const patchesBySection = new Map<
    string,
    Map<string, Map<string, string>>
  >()

  for (const obj of supervisorObjectives) {
    for (const init of obj.initiatives ?? []) {
      for (const act of init.measurableActivities ?? []) {
        const keysToSync = taskKeysBySupervisorActivity.get(act._key)
        if (!keysToSync?.size || !act.tasks?.length) continue

        for (const [index, raw] of act.tasks.entries()) {
          if (raw == null) continue
          const supervisorTaskKey = resolveTaskKey(raw, index)
          if (!keysToSync.has(supervisorTaskKey)) continue
          const src =
            typeof raw !== 'string'
              ? (
                  raw as DetailedTask & {
                    cascadeSource?: ManagerCascadeSourceLike
                  }
                ).cascadeSource
              : undefined
          if (
            src?.nodeRole !== 'managerTaskAsTask' ||
            !src.sectionContractId ||
            !src.activityKey ||
            !src.taskKey
          ) {
            continue
          }

          const sectionMap =
            patchesBySection.get(src.sectionContractId) ??
            new Map<string, Map<string, string>>()
          const activityMap =
            sectionMap.get(src.activityKey) ?? new Map<string, string>()
          activityMap.set(src.taskKey, officerStaffId)
          sectionMap.set(src.activityKey, activityMap)
          patchesBySection.set(src.sectionContractId, sectionMap)
        }
      }
    }
  }

  for (const [sectionContractId, activityMap] of patchesBySection) {
    await applyManagerTaskAssigneePatches(
      sectionContractId,
      activityMap,
      officerStaffId,
    )
  }
}

async function applyManagerTaskAssigneePatches(
  sectionContractId: string,
  taskAssigneesByActivity: Map<string, Map<string, string>>,
  defaultAssigneeId: string,
): Promise<void> {
  const objectives = await writeClient.fetch<SsmartaObjective[] | null>(
    /* groq */ `*[_type == "sectionContract" && _id == $id][0].objectives`,
    { id: sectionContractId },
  )
  if (!objectives?.length) return

  let changed = false

  for (const obj of objectives) {
    for (const init of obj.initiatives ?? []) {
      for (const act of init.measurableActivities ?? []) {
        const taskMap = taskAssigneesByActivity.get(act._key)
        if (!taskMap?.size || !act.tasks?.length) continue

        act.tasks = act.tasks.map((raw, index) => {
          if (raw == null) return raw
          const key = resolveTaskKey(raw, index)
          const assigneeId = taskMap.get(key) ?? defaultAssigneeId
          if (!taskMap.has(key)) return raw

          const hasRef =
            typeof raw !== 'string' &&
            raw.assignee &&
            typeof raw.assignee === 'object' &&
            '_id' in raw.assignee
          if (hasRef) return raw

          changed = true
          const assigneeRef = {
            _type: 'reference' as const,
            _ref: assigneeId,
          }
          if (typeof raw === 'string') {
            return {
              _type: 'detailedTask' as const,
              _key: key,
              task: raw,
              priority: 'medium',
              status: 'to_do',
              assignee: assigneeRef,
            } as unknown as DetailedTask
          }
          return {
            ...(raw as DetailedTask),
            assignee: assigneeRef as unknown as DetailedTask['assignee'],
          } as unknown as DetailedTask
        }) as (DetailedTask | string)[]
      }
    }
  }

  if (!changed) return

  await writeClient
    .patch(sectionContractId)
    .set({ objectives })
    .commit()
}

export async function backfillManagerActivityAssigneesFromDownstream(
  sectionId: string,
  sectionContractId: string,
  managerActivityKey: string,
): Promise<number> {
  const lookup = await getManagerTaskAssigneesFromDownstream(
    sectionId,
    sectionContractId,
    managerActivityKey,
  )
  if (Object.keys(lookup).length === 0) return 0

  const taskMap = new Map(
    Object.entries(lookup).map(([taskKey, value]) => [
      taskKey,
      value.assigneeId,
    ]),
  )

  const objectives = await writeClient.fetch<SsmartaObjective[] | null>(
    /* groq */ `*[_type == "sectionContract" && _id == $id][0].objectives`,
    { id: sectionContractId },
  )
  if (!objectives?.length) return 0

  let updated = 0

  for (const obj of objectives) {
    for (const init of obj.initiatives ?? []) {
      for (const act of init.measurableActivities ?? []) {
        if (act._key !== managerActivityKey || !act.tasks?.length) continue

        act.tasks = act.tasks.map((raw, index) => {
          if (raw == null) return raw
          const key = resolveTaskKey(raw, index)
          const assigneeId = taskMap.get(key)
          if (!assigneeId) return raw

          const hasRef =
            typeof raw !== 'string' &&
            raw.assignee &&
            typeof raw.assignee === 'object' &&
            '_id' in raw.assignee
          if (hasRef) return raw

          updated += 1
          const assigneeRef = {
            _type: 'reference' as const,
            _ref: assigneeId,
          }
          if (typeof raw === 'string') {
            return {
              _type: 'detailedTask' as const,
              _key: key,
              task: raw,
              priority: 'medium',
              status: 'to_do',
              assignee: assigneeRef,
            } as unknown as DetailedTask
          }
          return {
            ...(raw as DetailedTask),
            assignee: assigneeRef as unknown as DetailedTask['assignee'],
          } as unknown as DetailedTask
        }) as (DetailedTask | string)[]
      }
    }
  }

  if (updated === 0) return 0

  await writeClient
    .patch(sectionContractId)
    .set({ objectives })
    .commit()

  return updated
}
