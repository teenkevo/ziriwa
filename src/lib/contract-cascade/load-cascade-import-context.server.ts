import { findActivityKeysBlockedWithoutAim } from '@/lib/contract-cascade/build-supervisor-import'
import { buildCascadeRewriteContexts } from '@/lib/contract-cascade/extract-cascade-context'
import type { CascadeImportSelection } from '@/lib/contract-cascade/types'
import {
  canManageSupervisorContract,
  getSectionIdFromSupervisorContract,
} from '@/lib/supervisor-contract-access.server'
import { getSectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import type { SsmartaObjective } from '@/sanity/lib/section-contracts/get-section-contract'
import { client } from '@/sanity/lib/client'
import { writeClient } from '@/sanity/lib/write-client'

export class CascadeImportContextError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export interface CascadeImportContext {
  sectionId: string
  supervisorContractId: string
  sectionContractId: string
  cascadeRevision: number
  managerObjectives: SsmartaObjective[]
  supervisorObjectives: SsmartaObjective[]
  selections: CascadeImportSelection[]
  rewriteContexts: ReturnType<typeof buildCascadeRewriteContexts>
}

export async function loadCascadeImportContext(
  supervisorContractId: string,
  selections: CascadeImportSelection[],
): Promise<CascadeImportContext> {
  const sectionId =
    await getSectionIdFromSupervisorContract(supervisorContractId)
  if (!sectionId) {
    throw new CascadeImportContextError('Contract not found', 404)
  }

  if (!(await canManageSupervisorContract(sectionId))) {
    throw new CascadeImportContextError(
      'Only the section supervisor can change this contract',
      403,
    )
  }

  const supervisorDoc = await writeClient.fetch<{
    financialYearLabel?: string
    objectives?: SsmartaObjective[]
  }>(
    `*[_type == "supervisorContract" && _id == $id][0]{
      financialYearLabel,
      objectives
    }`,
    { id: supervisorContractId },
  )
  if (!supervisorDoc?.financialYearLabel) {
    throw new CascadeImportContextError('Contract not found', 404)
  }

  const sectionContract = await getSectionContract(
    sectionId,
    supervisorDoc.financialYearLabel,
  )
  if (!sectionContract) {
    throw new CascadeImportContextError(
      'No manager contract for this section and financial year',
      404,
    )
  }

  const blocked = findActivityKeysBlockedWithoutAim(
    sectionContract.objectives ?? [],
    selections,
  )
  if (blocked.length > 0) {
    throw new CascadeImportContextError(
      'One or more selected KPIs have no AIM and cannot be cascaded.',
      400,
    )
  }

  const cascadeRevision =
    (await client.fetch<number>(
      `coalesce(*[_type == "sectionContract" && _id == $id][0].cascadeRevision, 0)`,
      { id: sectionContract._id },
    )) ?? 0

  const rewriteContexts = buildCascadeRewriteContexts(
    sectionContract.objectives ?? [],
    selections,
  )
  if (rewriteContexts.length === 0) {
    throw new CascadeImportContextError('No valid KPIs found for import', 400)
  }

  return {
    sectionId,
    supervisorContractId,
    sectionContractId: sectionContract._id,
    cascadeRevision,
    managerObjectives: sectionContract.objectives ?? [],
    supervisorObjectives: supervisorDoc.objectives ?? [],
    selections,
    rewriteContexts,
  }
}
