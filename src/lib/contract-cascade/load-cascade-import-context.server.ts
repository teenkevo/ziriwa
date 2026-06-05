import { findActivityKeysBlockedWithoutAim } from '@/lib/contract-cascade/build-supervisor-import'
import { buildCascadeRewriteContexts } from '@/lib/contract-cascade/extract-cascade-context'
import type { CascadeImportSelection } from '@/lib/contract-cascade/types'
import {
  canManageSupervisorContract,
  getSectionIdFromSupervisorContract,
  supervisorContractAccessDeniedMessage,
} from '@/lib/supervisor-contract-access.server'
import { getUpstreamManagerContractForSection } from '@/lib/project-upstream-contract.server'
import type { SsmartaObjective } from '@/sanity/lib/section-contracts/get-section-contract'
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
  upstreamIsProjectContract: boolean
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
      await supervisorContractAccessDeniedMessage(sectionId),
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

  const upstream = await getUpstreamManagerContractForSection(
    sectionId,
    supervisorDoc.financialYearLabel,
  )
  if (!upstream) {
    throw new CascadeImportContextError(
      'No project manager contract for this workstream and financial year',
      404,
    )
  }

  const blocked = findActivityKeysBlockedWithoutAim(
    upstream.objectives ?? [],
    selections,
  )
  if (blocked.length > 0) {
    throw new CascadeImportContextError(
      'One or more selected activities cannot be cascaded yet.',
      400,
    )
  }

  const rewriteContexts = buildCascadeRewriteContexts(
    upstream.objectives ?? [],
    selections,
    { upstreamIsProjectContract: upstream.isProjectContract },
  )
  if (rewriteContexts.length === 0) {
    throw new CascadeImportContextError(
      'No valid activities found for import',
      400,
    )
  }

  return {
    sectionId,
    supervisorContractId,
    sectionContractId: upstream._id,
    cascadeRevision: upstream.cascadeRevision,
    upstreamIsProjectContract: upstream.isProjectContract,
    managerObjectives: upstream.objectives ?? [],
    supervisorObjectives: supervisorDoc.objectives ?? [],
    selections,
    rewriteContexts,
  }
}
