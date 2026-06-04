import 'server-only'

import { expandOfficerCascadeActivities } from './officer-cascade-selection'
import type { CascadeImportSelection } from './types'
import type { DetailedTask, SsmartaObjective } from '@/sanity/lib/section-contracts/get-section-contract'
import { client } from '@/sanity/lib/client'
import { writeClient } from '@/sanity/lib/write-client'

export interface OfficerCascadeAssignee {
  assigneeId: string
  assigneeName: string
}

interface CascadeSourceLike {
  supervisorContractId?: string
  activityKey?: string
  taskKey?: string
  nodeRole?: string
}

type OfficerContractTaskRow = {
  cascadeSource?: CascadeSourceLike
  assigneeId?: string | null
  assigneeName?: string | null
  contractOfficerId?: string | null
  contractOfficerName?: string | null
}

/**
 * Maps supervisor detailed-task _key → officer who took the task on via officer cascade.
 */
export async function getSupervisorTaskAssigneesFromOfficerContracts(
  sectionId: string,
  supervisorContractId: string,
  activityKey: string,
): Promise<Record<string, OfficerCascadeAssignee>> {
  const contracts = await client.fetch<
    {
      tasks?: OfficerContractTaskRow[]
      contractOfficerId?: string | null
      contractOfficerName?: string | null
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

  const byTaskKey: Record<string, OfficerCascadeAssignee> = {}

  for (const contract of contracts ?? []) {
    for (const task of contract.tasks ?? []) {
      const src = task.cascadeSource
      if (
        src?.supervisorContractId !== supervisorContractId ||
        src?.activityKey !== activityKey ||
        src?.nodeRole !== 'supervisorTaskAsTask' ||
        !src.taskKey
      ) {
        continue
      }

      const assigneeId =
        task.assigneeId ?? contract.contractOfficerId ?? null
      if (!assigneeId) continue

      const assigneeName =
        task.assigneeName?.trim() ||
        contract.contractOfficerName?.trim() ||
        'Officer'

      if (!byTaskKey[src.taskKey]) {
        byTaskKey[src.taskKey] = { assigneeId, assigneeName }
      }
    }
  }

  return byTaskKey
}

function resolveTaskKey(raw: DetailedTask | string, index: number): string {
  if (typeof raw !== 'string' && raw._key) return raw._key
  return `idx-${index}`
}

/**
 * After officer cascade import, mirror assignee onto matching supervisor contract tasks.
 */
export async function syncSupervisorTaskAssigneesFromOfficerCascade(
  supervisorContractId: string,
  officerStaffId: string,
  selections: CascadeImportSelection[],
): Promise<void> {
  const objectives = await writeClient.fetch<SsmartaObjective[] | null>(
    /* groq */ `*[_type == "supervisorContract" && _id == $id][0].objectives`,
    { id: supervisorContractId },
  )
  if (!objectives?.length) return

  const taskKeysByActivity = new Map<string, Set<string>>()
  for (const selection of selections) {
    for (const activity of expandOfficerCascadeActivities(selection)) {
      const set =
        taskKeysByActivity.get(activity.activityKey) ?? new Set<string>()
      for (const key of activity.taskKeys) set.add(key)
      taskKeysByActivity.set(activity.activityKey, set)
    }
  }
  if (taskKeysByActivity.size === 0) return

  let changed = false

  for (const obj of objectives) {
    for (const init of obj.initiatives ?? []) {
      for (const act of init.measurableActivities ?? []) {
        const keysToSync = taskKeysByActivity.get(act._key)
        if (!keysToSync?.size || !act.tasks?.length) continue

        act.tasks = act.tasks.map((raw, index) => {
          const key = resolveTaskKey(raw, index)
          if (!keysToSync.has(key)) return raw
          changed = true
          const assigneeRef = {
            _type: 'reference' as const,
            _ref: officerStaffId,
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
    .patch(supervisorContractId)
    .set({ objectives })
    .commit()
}

/**
 * Persist officer cascade assignees onto supervisor contract tasks (one KPI).
 * Safe to call when tasks were imported before assignee mirroring existed.
 */
export async function backfillSupervisorActivityAssigneesFromOfficers(
  sectionId: string,
  supervisorContractId: string,
  activityKey: string,
): Promise<number> {
  const lookup = await getSupervisorTaskAssigneesFromOfficerContracts(
    sectionId,
    supervisorContractId,
    activityKey,
  )
  const taskKeys = Object.keys(lookup)
  if (taskKeys.length === 0) return 0

  const objectives = await writeClient.fetch<SsmartaObjective[] | null>(
    /* groq */ `*[_type == "supervisorContract" && _id == $id][0].objectives`,
    { id: supervisorContractId },
  )
  if (!objectives?.length) return 0

  let updated = 0

  for (const obj of objectives) {
    for (const init of obj.initiatives ?? []) {
      for (const act of init.measurableActivities ?? []) {
        if (act._key !== activityKey || !act.tasks?.length) continue

        act.tasks = act.tasks.map((raw, index) => {
          const key = resolveTaskKey(raw, index)
          const match = lookup[key]
          if (!match) return raw
          const hasRef =
            typeof raw !== 'string' &&
            raw.assignee &&
            typeof raw.assignee === 'object' &&
            '_id' in raw.assignee
          if (hasRef) return raw

          updated += 1
          const assigneeRef = {
            _type: 'reference' as const,
            _ref: match.assigneeId,
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
    .patch(supervisorContractId)
    .set({ objectives })
    .commit()

  return updated
}
