import { client } from '@/sanity/lib/client'

interface CascadeLineageNode {
  _key?: string
  cascadeKind?: string
  cascadeSource?: {
    divisionContractId?: string
    sectionContractId?: string
    supervisorContractId?: string
  }
  initiatives?: CascadeLineageNode[] | null
}

function sourceContractId(
  source: CascadeLineageNode['cascadeSource'],
): string | null {
  return (
    source?.divisionContractId ||
    source?.sectionContractId ||
    source?.supervisorContractId ||
    null
  )
}

/** Keys of cascaded nodes whose source contract is not finalized yet. */
export async function getUnreleasedCascadeKeys(contractId: string): Promise<{
  hiddenKeys: string[]
  holdMessage: string | null
}> {
  const lineage = await client.fetch<CascadeLineageNode[] | null>(
    /* groq */ `*[_id == $contractId][0].objectives[]{
      _key,
      cascadeKind,
      cascadeSource{ divisionContractId, sectionContractId, supervisorContractId },
      initiatives[]{
        _key,
        cascadeKind,
        cascadeSource{ divisionContractId, sectionContractId, supervisorContractId }
      }
    }`,
    { contractId },
  )
  const sourceIds = new Set<string>()
  for (const objective of lineage ?? []) {
    const objectiveSource = sourceContractId(objective.cascadeSource)
    if (objective.cascadeKind === 'cascaded' && objectiveSource) {
      sourceIds.add(objectiveSource)
    }
    for (const initiative of objective.initiatives ?? []) {
      const initiativeSource = sourceContractId(initiative?.cascadeSource)
      if (initiative?.cascadeKind === 'cascaded' && initiativeSource) {
        sourceIds.add(initiativeSource)
      }
    }
  }
  if (sourceIds.size === 0) {
    return { hiddenKeys: [], holdMessage: null }
  }

  const sources = await client.fetch<
    Array<{ _id: string; status?: string; ownerName?: string }>
  >(
    /* groq */ `*[_id in $ids]{
      _id,
      status,
      "ownerName": coalesce(
        assistantCommissioner->fullName,
        manager->fullName,
        supervisor->fullName,
        projectManager->fullName,
        "the level above"
      )
    }`,
    { ids: [...sourceIds] },
  )
  const released = new Set(
    sources
      .filter(source => source.status === 'finalized')
      .map(source => source._id),
  )
  const heldNames = new Set(
    sources
      .filter(source => source.status !== 'finalized')
      .map(source => source.ownerName?.trim() || 'the level above'),
  )

  const hiddenObjectives = new Set<string>()
  const hiddenInitiatives = new Set<string>()
  for (const objective of lineage ?? []) {
    const objectiveSource = sourceContractId(objective.cascadeSource)
    if (
      objective.cascadeKind === 'cascaded' &&
      objectiveSource &&
      !released.has(objectiveSource) &&
      objective._key
    ) {
      hiddenObjectives.add(objective._key)
    }
    for (const initiative of objective.initiatives ?? []) {
      const initiativeSource = sourceContractId(initiative?.cascadeSource)
      if (
        initiative?.cascadeKind === 'cascaded' &&
        initiativeSource &&
        !released.has(initiativeSource) &&
        initiative._key
      ) {
        hiddenInitiatives.add(initiative._key)
      }
    }
  }

  const names = [...heldNames]
  const holdMessage =
    names.length === 0
      ? null
      : names.length === 1
        ? `Waiting for ${names[0]} to finalize their contract.`
        : `Waiting for ${names.slice(0, -1).join(', ')} and ${names.at(-1)} to finalize their contracts.`

  return {
    hiddenKeys: [...hiddenObjectives, ...hiddenInitiatives],
    holdMessage,
  }
}

export async function gateContractObjectives<T extends { _id: string }>(
  contract: T | null,
): Promise<
  | (T & { cascadeHoldMessage: string | null; hiddenCascadeKeys: string[] })
  | null
> {
  if (!contract) return null
  const gated = await getUnreleasedCascadeKeys(contract._id)
  return {
    ...contract,
    cascadeHoldMessage: gated.holdMessage,
    hiddenCascadeKeys: gated.hiddenKeys,
  }
}
