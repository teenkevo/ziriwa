import { NextResponse } from 'next/server'

import { assertActivityTasksUpdateAllowed } from '@/lib/section-contract-task-auth'
import type { SectionAccess } from '@/lib/section-access'
import { audit } from '@/lib/audit-log/events'
import type { ActivityPageContractType } from '@/sanity/lib/contracts/get-contract-for-activity'
import { client } from '@/sanity/lib/client'
import { writeClient } from '@/sanity/lib/write-client'
import {
  normalizeOfficerWorkCopies,
  storedTaskAssigneeId,
  type OfficerWorkPersistInput,
} from '@/lib/normalize-detailed-task-persist'

const CONTRACT_LABEL: Record<ActivityPageContractType, string> = {
  sectionContract: 'Section contract',
  supervisorContract: 'Supervisor contract',
  officerContract: 'Officer contract',
}

interface PatchContractActivityTasksInput {
  contractType: ActivityPageContractType
  contractId: string
  sectionId: string
  contractLabel?: string | null
  access: SectionAccess
  payload: {
    objectiveIndex?: number
    initiativeIndex?: number
    activityIndex?: number
    tasks?: unknown
  }
}

export async function patchContractActivityTasks(
  input: PatchContractActivityTasksInput,
): Promise<NextResponse> {
  const { contractType, contractId, sectionId, access, payload } = input
  const { objectiveIndex, initiativeIndex, activityIndex, tasks } = payload

  if (
    typeof objectiveIndex !== 'number' ||
    typeof initiativeIndex !== 'number' ||
    typeof activityIndex !== 'number' ||
    !Array.isArray(tasks)
  ) {
    return NextResponse.json(
      {
        error:
          'objectiveIndex, initiativeIndex, activityIndex, and tasks (array) are required',
      },
      { status: 400 },
    )
  }

  const contractOfficerId =
    contractType === 'officerContract'
      ? await client.fetch<string | null>(
          /* groq */ `*[_type == "officerContract" && _id == $id][0].officer._ref`,
          { id: contractId },
        )
      : null

  const currentTasks =
    (await writeClient.fetch<unknown[] | null>(
      /* groq */ `*[_type == $contractType && _id == $id][0].objectives[$objIdx].initiatives[$initIdx].measurableActivities[$actIdx].tasks`,
      {
        contractType,
        id: contractId,
        objIdx: objectiveIndex,
        initIdx: initiativeIndex,
        actIdx: activityIndex,
      },
    )) ?? []

  const storedTaskByKey = new Map<string, Record<string, unknown>>()
  for (let i = 0; i < currentTasks.length; i++) {
    const row = currentTasks[i]
    if (!row || typeof row !== 'object') continue
    const key =
      '_key' in row && typeof (row as { _key?: string })._key === 'string'
        ? (row as { _key: string })._key
        : `idx-${i}`
    storedTaskByKey.set(key, row as Record<string, unknown>)
  }

  const tasksAuthError = assertActivityTasksUpdateAllowed(
    access,
    currentTasks as Parameters<typeof assertActivityTasksUpdateAllowed>[1],
    tasks as Parameters<typeof assertActivityTasksUpdateAllowed>[2],
  )
  if (tasksAuthError) {
    return NextResponse.json({ error: tasksAuthError }, { status: 403 })
  }

  const path = `objectives[${objectiveIndex}].initiatives[${initiativeIndex}].measurableActivities[${activityIndex}].tasks`
  const PRIORITIES = ['highest', 'high', 'medium', 'low', 'lowest']
  const normalizedTasks = tasks
    .map((t: unknown, i: number) => {
      if (typeof t === 'string') {
        return {
          _type: 'detailedTask',
          _key: `task-${i}-${crypto.randomUUID().slice(0, 8)}`,
          task: t,
          priority: 'medium',
          status: 'not_started',
        }
      }
      if (t && typeof t === 'object' && 'task' in t) {
        const obj = t as {
          task: string
          priority?: string
          assignee?: string | null
          officerWork?: OfficerWorkPersistInput[]
          status?: string
          targetDate?: string
          reportingFrequency?: string
          reportingPeriodStart?: string
          expectedDeliverable?: string
          _key?: string
        }
        const FREQ_VALUES = ['weekly', 'monthly', 'quarterly', 'n/a']
        const task: Record<string, unknown> = {
          _type: 'detailedTask',
          _key: obj._key ?? `task-${i}-${crypto.randomUUID().slice(0, 8)}`,
          task: String(obj.task || '').trim(),
          priority: PRIORITIES.includes(obj.priority || '')
            ? obj.priority
            : 'medium',
        }
        if (typeof obj.targetDate === 'string') task.targetDate = obj.targetDate
        if (FREQ_VALUES.includes(obj.reportingFrequency || ''))
          task.reportingFrequency = obj.reportingFrequency
        if (typeof obj.reportingPeriodStart === 'string')
          task.reportingPeriodStart = obj.reportingPeriodStart
        if (typeof obj.expectedDeliverable === 'string')
          task.expectedDeliverable = obj.expectedDeliverable

        const stored = obj._key ? storedTaskByKey.get(obj._key) : undefined
        if (stored?.cascadeKind === 'cascaded') {
          task.cascadeKind = 'cascaded'
          if (stored.cascadeSource) task.cascadeSource = stored.cascadeSource
          const assigneeRef =
            storedTaskAssigneeId(stored) ??
            (typeof obj.assignee === 'string' ? obj.assignee : null) ??
            contractOfficerId
          const cascadeCopies = obj.officerWork?.length
            ? obj.officerWork.map(copy => ({
                ...copy,
                assignee: assigneeRef,
              }))
            : undefined
          task.officerWork = cascadeCopies
            ? normalizeOfficerWorkCopies(cascadeCopies, assigneeRef)
            : Array.isArray(stored.officerWork) && stored.officerWork.length
              ? stored.officerWork
              : normalizeOfficerWorkCopies(undefined, assigneeRef)
        } else {
          task.officerWork = normalizeOfficerWorkCopies(
            obj.officerWork,
            typeof obj.assignee === 'string' ? obj.assignee : null,
          )
        }
        return task
      }
      return null
    })
    .filter(Boolean)

  await writeClient.patch(contractId).set({ [path]: normalizedTasks }).commit()

  audit.sectionContract.updated(
    contractId,
    input.contractLabel ?? CONTRACT_LABEL[contractType],
    'updateActivityTasks',
    sectionId,
  )
  return NextResponse.json({ ok: true })
}
