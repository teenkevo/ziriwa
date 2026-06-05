import 'server-only'

import { getCurrentFinancialYear } from '@/lib/financial-year'
import { getProjectContract } from '@/sanity/lib/project-contracts/get-project-contract'
import { getSectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import type { SsmartaObjective } from '@/sanity/lib/section-contracts/get-section-contract'
import { client } from '@/sanity/lib/client'

export interface UpstreamManagerContract {
  _id: string
  financialYearLabel: string
  objectives: SsmartaObjective[]
  cascadeRevision: number
  /** When true, cascade source id is a project contract (stored in sectionContractId field). */
  isProjectContract: boolean
}

export async function getProjectIdForWorkstreamSection(
  sectionId: string,
): Promise<string | null> {
  return client.fetch<string | null>(
    /* groq */ `*[_type == "section" && _id == $sectionId && defined(project._ref)][0].project._ref`,
    { sectionId },
  )
}

export async function getUpstreamManagerContractForSection(
  sectionId: string,
  financialYearLabel?: string,
): Promise<UpstreamManagerContract | null> {
  const fy = financialYearLabel ?? getCurrentFinancialYear().label
  const projectId = await getProjectIdForWorkstreamSection(sectionId)

  if (projectId) {
    const projectContract = await getProjectContract(projectId, fy)
    if (!projectContract) return null
    const revision =
      (await client.fetch<number>(
        /* groq */ `coalesce(*[_type == "projectContract" && _id == $id][0].cascadeRevision, 0)`,
        { id: projectContract._id },
      )) ?? 0
    return {
      _id: projectContract._id,
      financialYearLabel: projectContract.financialYearLabel ?? fy,
      objectives: projectContract.objectives ?? [],
      cascadeRevision: revision,
      isProjectContract: true,
    }
  }

  const sectionContract = await getSectionContract(sectionId, fy)
  if (!sectionContract) return null
  const revision =
    (await client.fetch<number>(
      /* groq */ `coalesce(*[_type == "sectionContract" && _id == $id][0].cascadeRevision, 0)`,
      { id: sectionContract._id },
    )) ?? 0
  return {
    _id: sectionContract._id,
    financialYearLabel: sectionContract.financialYearLabel ?? fy,
    objectives: sectionContract.objectives ?? [],
    cascadeRevision: revision,
    isProjectContract: false,
  }
}
