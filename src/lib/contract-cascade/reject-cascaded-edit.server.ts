import 'server-only'

import { NextResponse } from 'next/server'

import { isCascadedItem } from '@/lib/contract-cascade/is-cascaded'
import { writeClient } from '@/sanity/lib/write-client'

const LOCKED_MESSAGE = 'Cascaded items cannot be edited or deleted.'

const LOCKED_OPS = new Set([
  'updateObjective',
  'deleteObjective',
  'updateInitiative',
  'deleteInitiative',
  'updateActivity',
  'deleteMeasurableActivity',
  'setActivityAssignees',
])

const ASSIGNED_TYPE_MESSAGE =
  'Remove assignees before changing this activity type.'

interface EditPayload {
  objectiveIndex?: unknown
  initiativeIndex?: unknown
  activityIndex?: unknown
  activityType?: unknown
}

/** Blocks edits and deletes of items that were cascaded onto this contract. */
export async function rejectCascadedContractEdit(
  contractId: string,
  op: string,
  payload: EditPayload,
): Promise<NextResponse | null> {
  if (!LOCKED_OPS.has(op)) return null
  const objectiveIndex = payload.objectiveIndex
  if (!Number.isInteger(objectiveIndex)) return null

  const params: Record<string, unknown> = { id: contractId, objectiveIndex }
  let query = `*[_id == $id][0].objectives[$objectiveIndex].cascadeKind`

  if (
    op === 'updateInitiative' ||
    op === 'deleteInitiative' ||
    op === 'updateActivity' ||
    op === 'deleteMeasurableActivity' ||
    op === 'setActivityAssignees'
  ) {
    const initiativeIndex = payload.initiativeIndex
    if (!Number.isInteger(initiativeIndex)) return null
    params.initiativeIndex = initiativeIndex
    query = `*[_id == $id][0].objectives[$objectiveIndex].initiatives[$initiativeIndex].cascadeKind`
    if (
      op === 'updateActivity' ||
      op === 'deleteMeasurableActivity' ||
      op === 'setActivityAssignees'
    ) {
      const activityIndex = payload.activityIndex
      if (!Number.isInteger(activityIndex)) return null
      params.activityIndex = activityIndex
      query = `*[_id == $id][0].objectives[$objectiveIndex].initiatives[$initiativeIndex].measurableActivities[$activityIndex].cascadeKind`
    }
  }

  const kind = await writeClient.fetch<string | null>(query, params)
  if (isCascadedItem({ cascadeKind: kind })) {
    return NextResponse.json({ error: LOCKED_MESSAGE }, { status: 403 })
  }

  if (
    op === 'updateActivity' &&
    payload.activityType === 'cross-cutting' &&
    Number.isInteger(payload.initiativeIndex) &&
    Number.isInteger(payload.activityIndex)
  ) {
    const assignees = await writeClient.fetch<unknown[] | null>(
      `*[_id == $id][0].objectives[$objectiveIndex].initiatives[$initiativeIndex].measurableActivities[$activityIndex].assignees`,
      {
        id: contractId,
        objectiveIndex,
        initiativeIndex: payload.initiativeIndex,
        activityIndex: payload.activityIndex,
      },
    )
    if ((assignees?.length ?? 0) > 0) {
      return NextResponse.json({ error: ASSIGNED_TYPE_MESSAGE }, { status: 400 })
    }
  }

  return null
}
