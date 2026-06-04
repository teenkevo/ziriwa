import { NextResponse } from 'next/server'

import { assertActivityTasksUpdateAllowed } from '@/lib/section-contract-task-auth'
import type { SectionAccess } from '@/lib/section-access'
import { audit } from '@/lib/audit-log/events'
import { emitContractTaskReviewNotifications } from '@/lib/notifications/emit-contract-notifications'
import type { ActivityPageContractType } from '@/sanity/lib/contracts/get-contract-for-activity'
import { client } from '@/sanity/lib/client'
import { writeClient } from '@/sanity/lib/write-client'

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
  const TASK_STATUSES = [
    'to_do',
    'inputs_submitted',
    'in_progress',
    'delivered',
    'in_review',
    'done',
  ]
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
          status?: string
          targetDate?: string
          reportingFrequency?: string
          reportingPeriodStart?: string
          expectedDeliverable?: string
          periodDeliverables?: Array<{
            _key?: string
            periodKey?: string
            status?: string
            submittedAt?: string
            deliverable?: Array<{
              _key?: string
              file?: { asset?: { _ref?: string; _id?: string } }
              tag?: string
              locked?: boolean
            }>
            deliverableReviewThread?: Array<{
              _key?: string
              author?: string | { _id?: string } | null
              role?: string
              action?: string
              message?: string
              createdAt?: string
              file?: { asset?: { _ref?: string; _id?: string } }
            }>
          }>
          _key?: string
          inputs?: {
            file?: { asset?: { _ref?: string; _id?: string } }
            submittedAt?: string
          }
          inputsReviewThread?: Array<{
            _key?: string
            author?: string | null
            role?: string
            action?: string
            message?: string
            createdAt?: string
            file?: { asset?: { _ref?: string; _id?: string } }
          }>
          deliverableReviewThread?: Array<{
            _key?: string
            author?: string | null
            role?: string
            action?: string
            message?: string
            createdAt?: string
            file?: { asset?: { _ref?: string; _id?: string } }
          }>
          deliverable?: Array<{
            _key?: string
            file?: { asset?: { _ref?: string } }
            tag?: string
            locked?: boolean
          }>
        }
        const FREQ_VALUES = ['weekly', 'monthly', 'quarterly', 'n/a']
        const task: Record<string, unknown> = {
          _type: 'detailedTask',
          _key: obj._key ?? `task-${i}-${crypto.randomUUID().slice(0, 8)}`,
          task: String(obj.task || '').trim(),
          priority: PRIORITIES.includes(obj.priority || '')
            ? obj.priority
            : 'medium',
          status: TASK_STATUSES.includes(obj.status || '')
            ? obj.status
            : 'to_do',
        }
        if (typeof obj.targetDate === 'string') task.targetDate = obj.targetDate
        if (FREQ_VALUES.includes(obj.reportingFrequency || ''))
          task.reportingFrequency = obj.reportingFrequency
        if (typeof obj.reportingPeriodStart === 'string')
          task.reportingPeriodStart = obj.reportingPeriodStart
        if (typeof obj.expectedDeliverable === 'string')
          task.expectedDeliverable = obj.expectedDeliverable
        if (Array.isArray(obj.periodDeliverables))
          task.periodDeliverables = obj.periodDeliverables
        if (obj.inputs && typeof obj.inputs === 'object') {
          const assetRef =
            obj.inputs.file?.asset?._ref ?? obj.inputs.file?.asset?._id
          if (assetRef) {
            task.inputs = {
              file: {
                _type: 'file',
                asset: { _type: 'reference', _ref: assetRef },
              },
              submittedAt: obj.inputs.submittedAt ?? new Date().toISOString(),
            }
          }
        }
        if (Array.isArray(obj.inputsReviewThread)) {
          task.inputsReviewThread = obj.inputsReviewThread
            .map(
              (
                entry: {
                  _key?: string
                  author?: string | null
                  role?: string
                  action?: string
                  message?: string
                  createdAt?: string
                  file?: { asset?: { _ref?: string; _id?: string } }
                },
                ei: number,
              ) => {
                if (!entry.action) return null
                const assetRef =
                  entry.file?.asset?._ref ?? entry.file?.asset?._id
                const authorRef =
                  typeof entry.author === 'string'
                    ? entry.author
                    : (entry.author as unknown as { _id?: string } | null)
                        ?._id
                const out: Record<string, unknown> = {
                  _key:
                    entry._key ??
                    `thread-${ei}-${crypto.randomUUID().slice(0, 8)}`,
                  author: authorRef
                    ? { _type: 'reference', _ref: authorRef }
                    : undefined,
                  role: ['officer', 'supervisor'].includes(entry.role || '')
                    ? entry.role
                    : undefined,
                  action: ['submit', 'reject', 'approve', 'respond'].includes(
                    entry.action,
                  )
                    ? entry.action
                    : undefined,
                  message:
                    typeof entry.message === 'string' ? entry.message : undefined,
                  createdAt: entry.createdAt ?? new Date().toISOString(),
                }
                if (assetRef) {
                  out.file = {
                    _type: 'file',
                    asset: { _type: 'reference', _ref: assetRef },
                  }
                }
                return out
              },
            )
            .filter(Boolean)
        }
        if (Array.isArray(obj.deliverableReviewThread)) {
          task.deliverableReviewThread = obj.deliverableReviewThread
            .map(
              (
                entry: {
                  _key?: string
                  author?: string | null
                  role?: string
                  action?: string
                  message?: string
                  createdAt?: string
                  file?: { asset?: { _ref?: string; _id?: string } }
                },
                ei: number,
              ) => {
                if (!entry.action) return null
                const assetRef =
                  entry.file?.asset?._ref ?? entry.file?.asset?._id
                const authorRef =
                  typeof entry.author === 'string'
                    ? entry.author
                    : (entry.author as unknown as { _id?: string } | null)?._id
                const out: Record<string, unknown> = {
                  _key:
                    entry._key ??
                    `dr-thread-${ei}-${crypto.randomUUID().slice(0, 8)}`,
                  author: authorRef
                    ? { _type: 'reference', _ref: authorRef }
                    : undefined,
                  role: ['officer', 'supervisor'].includes(entry.role || '')
                    ? entry.role
                    : undefined,
                  action: ['submit', 'reject', 'approve', 'respond'].includes(
                    entry.action,
                  )
                    ? entry.action
                    : undefined,
                  message:
                    typeof entry.message === 'string' ? entry.message : undefined,
                  createdAt: entry.createdAt ?? new Date().toISOString(),
                }
                if (assetRef) {
                  out.file = {
                    _type: 'file',
                    asset: { _type: 'reference', _ref: assetRef },
                  }
                }
                return out
              },
            )
            .filter(Boolean)
        }
        if (obj.assignee && typeof obj.assignee === 'string') {
          task.assignee = { _type: 'reference', _ref: obj.assignee }
        }
        if (Array.isArray(obj.deliverable)) {
          task.deliverable = obj.deliverable
            .map(
              (
                ev: {
                  _key?: string
                  file?: { asset?: { _ref?: string } }
                  tag?: string
                  locked?: boolean
                },
                ei: number,
              ) => {
                const assetRef = ev.file?.asset?._ref
                if (!assetRef) return null
                return {
                  _key: ev._key ?? `ev-${ei}-${crypto.randomUUID().slice(0, 8)}`,
                  file: {
                    _type: 'file',
                    asset: { _type: 'reference', _ref: assetRef },
                  },
                  tag: ev.tag === 'main' ? 'main' : 'support',
                  locked: ev.locked === true,
                }
              },
            )
            .filter(Boolean)
        }
        return task
      }
      return null
    })
    .filter(Boolean)

  await writeClient.patch(contractId).set({ [path]: normalizedTasks }).commit()

  const sectionMeta = await client.fetch<{ slug?: string } | null>(
    /* groq */ `*[_id == $id][0]{ "slug": section->slug.current }`,
    { id: contractId },
  )

  void emitContractTaskReviewNotifications({
    beforeTasks: currentTasks as Parameters<
      typeof emitContractTaskReviewNotifications
    >[0]['beforeTasks'],
    afterTasks: normalizedTasks as Parameters<
      typeof emitContractTaskReviewNotifications
    >[0]['afterTasks'],
    sectionSlug: sectionMeta?.slug,
  })

  audit.sectionContract.updated(
    contractId,
    input.contractLabel ?? CONTRACT_LABEL[contractType],
    'updateActivityTasks',
    sectionId,
  )
  return NextResponse.json({ ok: true })
}
