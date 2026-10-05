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

const CONTRACT_OWNER_TITLES: Record<string, string> = {
  departmentContract: 'Commissioner',
  divisionContract: 'Assistant Commissioner',
  sectionContract: 'Manager',
  supervisorContract: 'Supervisor',
  officerContract: 'Officer',
  projectContract: 'Project Manager',
  deputyProjectContract: 'Deputy Project Manager',
}

function cascadeOwnerTitle(input: {
  _type?: string
  isProjectWorkstream?: boolean
}): string | null {
  if (input.isProjectWorkstream && input._type === 'supervisorContract') {
    return 'Workstream Lead'
  }
  if (input.isProjectWorkstream && input._type === 'officerContract') {
    return 'Workstream Member'
  }
  if (!input._type) return null
  return CONTRACT_OWNER_TITLES[input._type] ?? null
}

function cascadeHoldTitle(input: {
  _type?: string
  isProjectWorkstream?: boolean
}): string {
  return cascadeOwnerTitle(input) ?? 'level above'
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
    Array<{
      _id: string
      _type?: string
      status?: string
      isProjectWorkstream?: boolean
    }>
  >(
    /* groq */ `*[_id in $ids]{
      _id,
      _type,
      status,
      "isProjectWorkstream": defined(section->project._ref)
    }`,
    { ids: [...sourceIds] },
  )
  const released = new Set(
    sources
      .filter(source => source.status === 'finalized')
      .map(source => source._id),
  )
  const heldTitles = new Set(
    sources
      .filter(source => source.status !== 'finalized')
      .map(source => cascadeHoldTitle(source)),
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

  const titles = [...heldTitles]
  const holdMessage =
    titles.length === 0
      ? null
      : titles.length === 1
        ? `Waiting for the ${titles[0]} to finalize their contract.`
        : `Waiting for the ${titles.slice(0, -1).join(', the ')} and the ${titles.at(-1)} to finalize their contracts.`

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
