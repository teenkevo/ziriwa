import { buildOfficerCascadeRewriteContexts } from '@/lib/contract-cascade/extract-officer-cascade-context'
import type { CascadeImportSelection } from '@/lib/contract-cascade/types'
import {
  canManageOfficerContract,
  getOfficerStaffIdFromContract,
  getSectionIdFromOfficerContract,
} from '@/lib/officer-contract-access.server'
import type { SsmartaObjective } from '@/sanity/lib/section-contracts/get-section-contract'
import { client } from '@/sanity/lib/client'
import { writeClient } from '@/sanity/lib/write-client'

export class OfficerCascadeImportContextError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export interface OfficerCascadeImportContext {
  sectionId: string
  officerContractId: string
  officerStaffId: string
  supervisorContractId: string
  cascadeRevision: number
  supervisorObjectives: SsmartaObjective[]
  officerObjectives: SsmartaObjective[]
  selections: CascadeImportSelection[]
  rewriteContexts: ReturnType<typeof buildOfficerCascadeRewriteContexts>
}

export async function loadOfficerCascadeImportContext(
  officerContractId: string,
  selections: CascadeImportSelection[],
  supervisorContractIdParam?: string | null,
): Promise<OfficerCascadeImportContext> {
  const sectionId = await getSectionIdFromOfficerContract(officerContractId)
  if (!sectionId) {
    throw new OfficerCascadeImportContextError('Contract not found', 404)
  }

  if (!(await canManageOfficerContract(sectionId))) {
    throw new OfficerCascadeImportContextError(
      'Only the section officer can change this contract',
      403,
    )
  }

  const officerDoc = await writeClient.fetch<{
    financialYearLabel?: string
    objectives?: SsmartaObjective[]
  }>(
    `*[_type == "officerContract" && _id == $id][0]{
      financialYearLabel,
      objectives
    }`,
    { id: officerContractId },
  )
  if (!officerDoc?.financialYearLabel) {
    throw new OfficerCascadeImportContextError('Contract not found', 404)
  }

  const officerStaffId = await getOfficerStaffIdFromContract(officerContractId)
  if (!officerStaffId) {
    throw new OfficerCascadeImportContextError(
      'Officer contract has no assigned officer',
      400,
    )
  }

  const supervisorContractId =
    supervisorContractIdParam?.trim() ||
    (await client.fetch<string | null>(
      `*[_type == "supervisorContract" && section._ref == $sectionId && financialYearLabel == $fy][0]._id`,
      { sectionId, fy: officerDoc.financialYearLabel },
    ))

  if (!supervisorContractId) {
    throw new OfficerCascadeImportContextError(
      'No supervisor contract for this section and financial year',
      404,
    )
  }

  const supervisorDoc = await client.fetch<{
    section?: { _ref?: string }
    objectives?: SsmartaObjective[]
  } | null>(
    `*[_type == "supervisorContract" && _id == $id][0]{
      section,
      objectives
    }`,
    { id: supervisorContractId },
  )

  if (
    !supervisorDoc ||
    supervisorDoc.section?._ref !== sectionId
  ) {
    throw new OfficerCascadeImportContextError(
      'Supervisor contract not found for this section',
      404,
    )
  }

  const rewriteContexts = buildOfficerCascadeRewriteContexts(
    supervisorDoc.objectives ?? [],
    selections,
  )
  if (rewriteContexts.length === 0) {
    throw new OfficerCascadeImportContextError(
      'No valid measurables found for import',
      400,
    )
  }

  const cascadeRevision =
    (await client.fetch<number>(
      `coalesce(*[_type == "supervisorContract" && _id == $id][0].cascadeRevision, 0)`,
      { id: supervisorContractId },
    )) ?? 0

  return {
    sectionId,
    officerContractId,
    officerStaffId,
    supervisorContractId,
    cascadeRevision,
    supervisorObjectives: supervisorDoc.objectives ?? [],
    officerObjectives: officerDoc.objectives ?? [],
    selections,
    rewriteContexts,
  }
}
