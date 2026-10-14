import 'server-only'

import { writeClient } from '@/sanity/lib/write-client'

export type ReorderMeasurableActivitiesResult =
  | { ok: true }
  | { ok: false; error: string; status: number }

function isIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isSanityKey(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value)
}

function parseOrderedKeys(
  orderedKeys: unknown,
  itemLabel: string,
):
  | { ok: true; keys: string[] }
  | { ok: false; error: string; status: number } {
  if (
    !Array.isArray(orderedKeys) ||
    orderedKeys.length === 0 ||
    orderedKeys.some(key => typeof key !== 'string' || !key.trim())
  ) {
    return {
      ok: false,
      error: `orderedKeys must be a non-empty array of ${itemLabel} keys`,
      status: 400,
    }
  }

  const keys = orderedKeys.map(key => String(key))
  if (new Set(keys).size !== keys.length) {
    return {
      ok: false,
      error: 'orderedKeys must not contain duplicates',
      status: 400,
    }
  }
  return { ok: true, keys }
}

async function reorderKeyedArray({
  contractId,
  fetchQuery,
  fetchParams,
  setPath,
  orderedKeys,
  itemLabel,
  missingMessage,
}: {
  contractId: string
  fetchQuery: string
  fetchParams: Record<string, unknown>
  setPath: string
  orderedKeys: unknown
  itemLabel: string
  missingMessage: string
}): Promise<ReorderMeasurableActivitiesResult> {
  const parsed = parseOrderedKeys(orderedKeys, itemLabel)
  if (!parsed.ok) return parsed
  const { keys } = parsed

  const current = await writeClient.fetch<Array<{ _key?: string }> | null>(
    fetchQuery,
    fetchParams,
  )
  if (!current) {
    return { ok: false, error: missingMessage, status: 404 }
  }

  const currentKeys = current.map(item => item._key).filter(Boolean) as string[]
  if (currentKeys.length !== current.length) {
    return {
      ok: false,
      error: `Every ${itemLabel} must have a key before reordering`,
      status: 400,
    }
  }
  if (keys.length !== currentKeys.length) {
    return {
      ok: false,
      error: `orderedKeys must include every ${itemLabel} exactly once`,
      status: 400,
    }
  }

  const currentKeySet = new Set(currentKeys)
  if (keys.some(key => !currentKeySet.has(key))) {
    return {
      ok: false,
      error: `orderedKeys must include every ${itemLabel} exactly once`,
      status: 400,
    }
  }

  const unchanged = keys.every((key, index) => key === currentKeys[index])
  if (unchanged) return { ok: true }

  const byKey = new Map(current.map(item => [item._key as string, item]))
  const next = keys.map((key, index) => ({
    ...byKey.get(key),
    order: index + 1,
  }))

  await writeClient.patch(contractId).set({ [setPath]: next }).commit()
  return { ok: true }
}

/**
 * Replaces an initiative's measurable-activity array with the same items in
 * `orderedKeys` sequence and writes 1-based `order` to match.
 */
export async function reorderMeasurableActivities({
  contractId,
  objectiveIndex,
  initiativeIndex,
  orderedKeys,
}: {
  contractId: string
  objectiveIndex: unknown
  initiativeIndex: unknown
  orderedKeys: unknown
}): Promise<ReorderMeasurableActivitiesResult> {
  if (!isIndex(objectiveIndex) || !isIndex(initiativeIndex)) {
    return {
      ok: false,
      error: 'objectiveIndex and initiativeIndex are required',
      status: 400,
    }
  }
  return reorderKeyedArray({
    contractId,
    fetchQuery: `*[_id == $id][0].objectives[$objectiveIndex].initiatives[$initiativeIndex].measurableActivities`,
    fetchParams: { id: contractId, objectiveIndex, initiativeIndex },
    setPath: `objectives[${objectiveIndex}].initiatives[${initiativeIndex}].measurableActivities`,
    orderedKeys,
    itemLabel: 'measurable activity',
    missingMessage: 'Initiative not found',
  })
}

/** Replaces the contract's SSMARTA objective array with the same items in key order. */
export async function reorderContractObjectives({
  contractId,
  orderedKeys,
}: {
  contractId: string
  orderedKeys: unknown
}): Promise<ReorderMeasurableActivitiesResult> {
  return reorderKeyedArray({
    contractId,
    fetchQuery: `*[_id == $id][0].objectives`,
    fetchParams: { id: contractId },
    setPath: 'objectives',
    orderedKeys,
    itemLabel: 'SSMARTA objective',
    missingMessage: 'Contract not found',
  })
}

/** Replaces an objective's initiative array with the same items in key order. */
export async function reorderContractInitiatives({
  contractId,
  objectiveKey,
  orderedKeys,
}: {
  contractId: string
  objectiveKey: unknown
  orderedKeys: unknown
}): Promise<ReorderMeasurableActivitiesResult> {
  if (!isSanityKey(objectiveKey)) {
    return {
      ok: false,
      error: 'objectiveKey is required',
      status: 400,
    }
  }
  return reorderKeyedArray({
    contractId,
    fetchQuery: `*[_id == $id][0].objectives[_key == $objectiveKey][0].initiatives`,
    fetchParams: { id: contractId, objectiveKey },
    setPath: `objectives[_key=="${objectiveKey}"].initiatives`,
    orderedKeys,
    itemLabel: 'initiative',
    missingMessage: 'Objective not found',
  })
}
