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

function finalizeHoldMessage(title: string): string {
  return `Waiting for the ${title} to finalize their contract.`
}

interface UpstreamContractContext {
  _type?: string
  financialYearLabel?: string
  sectionId?: string | null
  projectId?: string | null
  officerReportsToId?: string | null
  sectionDivisionId?: string | null
  sectionProjectId?: string | null
  isPlanningSection?: boolean
  workstreamLeadId?: string | null
}

/** Contracts with no cascade parent. Everyone below these waits on the level above. */
const TOP_LEVEL_CONTRACT_TYPES = new Set([
  'departmentContract',
  'divisionContract',
  'projectContract',
])

async function contractStatus(
  query: string,
  params: Record<string, string>,
): Promise<string | null> {
  return client.fetch<string | null>(query, params)
}

async function holdUntilFinalized(
  query: string,
  params: Record<string, string>,
  title: string,
): Promise<string | null> {
  const status = await contractStatus(query, params)
  if (status === 'finalized') return null
  return finalizeHoldMessage(title)
}

/**
 * Hold finalize until the contract one level up is finalized.
 * Missing upstream contracts count as not finalized.
 */
async function getUpstreamFinalizeHold(
  contractId: string,
): Promise<string | null> {
  const ctx = await client.fetch<UpstreamContractContext | null>(
    /* groq */ `*[_id == $contractId][0]{
      _type,
      financialYearLabel,
      "sectionId": section._ref,
      "projectId": project._ref,
      "officerReportsToId": officer->reportsTo._ref,
      "sectionDivisionId": section->division._ref,
      "sectionProjectId": section->project._ref,
      "isPlanningSection": coalesce(section->isPlanningSection, false),
      "workstreamLeadId": section->workstreamLead._ref
    }`,
    { contractId },
  )
  if (!ctx?._type || TOP_LEVEL_CONTRACT_TYPES.has(ctx._type)) return null

  const fy = ctx.financialYearLabel?.trim()
  if (!fy) return finalizeHoldMessage('level above')

  switch (ctx._type) {
    case 'sectionContract':
      if (ctx.sectionProjectId) {
        return holdUntilFinalized(
          /* groq */ `*[_type == "projectContract" && project._ref == $projectId && financialYearLabel == $fy][0].status`,
          { projectId: ctx.sectionProjectId, fy },
          'Project Manager',
        )
      }
      if (ctx.sectionDivisionId) {
        return holdUntilFinalized(
          /* groq */ `*[_type == "divisionContract" && division._ref == $divisionId && financialYearLabel == $fy][0].status`,
          { divisionId: ctx.sectionDivisionId, fy },
          'Assistant Commissioner',
        )
      }
      return finalizeHoldMessage('level above')
    case 'deputyProjectContract':
      if (!ctx.projectId) return finalizeHoldMessage('Project Manager')
      return holdUntilFinalized(
        /* groq */ `*[_type == "projectContract" && project._ref == $projectId && financialYearLabel == $fy][0].status`,
        { projectId: ctx.projectId, fy },
        'Project Manager',
      )
    case 'supervisorContract':
      if (ctx.sectionProjectId) {
        return holdUntilFinalized(
          /* groq */ `*[_type == "projectContract" && project._ref == $projectId && financialYearLabel == $fy][0].status`,
          { projectId: ctx.sectionProjectId, fy },
          'Project Manager',
        )
      }
      if (ctx.isPlanningSection && ctx.sectionDivisionId) {
        return holdUntilFinalized(
          /* groq */ `*[_type == "divisionContract" && division._ref == $divisionId && financialYearLabel == $fy][0].status`,
          { divisionId: ctx.sectionDivisionId, fy },
          'Assistant Commissioner',
        )
      }
      if (!ctx.sectionId) return finalizeHoldMessage('Manager')
      return holdUntilFinalized(
        /* groq */ `*[_type == "sectionContract" && section._ref == $sectionId && financialYearLabel == $fy][0].status`,
        { sectionId: ctx.sectionId, fy },
        'Manager',
      )
    case 'officerContract': {
      const title = ctx.sectionProjectId ? 'Workstream Lead' : 'Supervisor'
      if (!ctx.sectionId) return finalizeHoldMessage(title)
      const supervisorContracts = await client.fetch<
        Array<{ status?: string; supervisorId?: string }>
      >(
        /* groq */ `*[
          _type == "supervisorContract"
          && section._ref == $sectionId
          && financialYearLabel == $fy
        ]{ status, "supervisorId": supervisor._ref }`,
        { sectionId: ctx.sectionId, fy },
      )
      if (supervisorContracts.length === 0) return finalizeHoldMessage(title)
      const directSupervisorId = ctx.sectionProjectId
        ? ctx.workstreamLeadId
        : ctx.officerReportsToId
      const direct = directSupervisorId
        ? supervisorContracts.find(
            contract => contract.supervisorId === directSupervisorId,
          )
        : undefined
      const relevant = direct ? [direct] : supervisorContracts
      if (relevant.every(contract => contract.status === 'finalized')) {
        return null
      }
      return finalizeHoldMessage(title)
    }
    default:
      return null
  }
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
    return {
      hiddenKeys: [],
      holdMessage: await getUpstreamFinalizeHold(contractId),
    }
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
  const sourceHold =
    titles.length === 0
      ? null
      : titles.length === 1
        ? finalizeHoldMessage(titles[0])
        : `Waiting for the ${titles.slice(0, -1).join(', the ')} and the ${titles.at(-1)} to finalize their contracts.`
  const upstreamHold = await getUpstreamFinalizeHold(contractId)

  return {
    hiddenKeys: [...hiddenObjectives, ...hiddenInitiatives],
    holdMessage: upstreamHold ?? sourceHold,
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
