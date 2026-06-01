import 'server-only'

import type { WorkContextMode } from '@/lib/section-access'
import { resolveAssistantCommissionerWorkspace } from '@/lib/assistant-commissioner-workspace.server'
import type { AssistantCommissionerWorkspaceContext } from '@/lib/assistant-commissioner-workspace.server'
import {
  canManageDivisionContract,
  resolveAssistantCommissionerStaffRefForDivision,
} from '@/lib/division-contract-access.server'
import { client } from '@/sanity/lib/client'
import { getDivisionContractByDivision } from '@/sanity/lib/division-contracts/get-division-contract-by-division'
import type { DivisionContract } from '@/sanity/lib/division-contracts/get-division-contract'

export type AssistantCommissionerContractPageData = {
  acWorkspace: AssistantCommissionerWorkspaceContext
  division: {
    _id: string
    name: string
    fullName?: string
    acronym?: string
  }
  divisionContract: DivisionContract | null
  assistantCommissioner: { _id: string; fullName: string } | null
  assistantCommissionerStaffIdForOnboarding: string | null
  canManageContract: boolean
}

export async function loadAssistantCommissionerContractPageData(options?: {
  workContext?: WorkContextMode
}): Promise<AssistantCommissionerContractPageData | null> {
  const acWorkspace = await resolveAssistantCommissionerWorkspace(
    options?.workContext ?? 'own',
  )
  if (!acWorkspace) return null
  const division = acWorkspace.division
  if (!division?._id) return null

  const assistantCommissioner = await client.fetch<{
    _id: string
    fullName: string
  } | null>(
    /* groq */ `
      coalesce(
        *[_type == "division" && _id == $divisionId && assistantCommissioner->status == "active"][0].assistantCommissioner->{
          _id,
          "fullName": coalesce(fullName, firstName + " " + lastName)
        },
        *[
          _type == "division"
          && _id == $divisionId
          && defined(assistantCommissioner)
          && assistantCommissioner._ref == *[
            _type == "staff"
            && division._ref == $divisionId
            && role == "assistant_commissioner"
            && status == "active"
          ][0]._id
        ][0].assistantCommissioner->{
          _id,
          "fullName": coalesce(fullName, firstName + " " + lastName)
        },
        *[_type == "staff" && division._ref == $divisionId && role == "assistant_commissioner" && status == "active"][0]{
          _id,
          "fullName": coalesce(fullName, firstName + " " + lastName)
        }
      )
    `,
    { divisionId: division._id },
  )

  const [divisionContract, canManageContract, assistantCommissionerStaffIdForOnboarding] =
    await Promise.all([
      getDivisionContractByDivision(division._id),
      canManageDivisionContract(division._id),
      resolveAssistantCommissionerStaffRefForDivision(division._id),
    ])

  return {
    acWorkspace,
    division: {
      _id: division._id,
      name: division.name,
      fullName: division.fullName,
      acronym: division.acronym,
    },
    divisionContract,
    assistantCommissioner,
    assistantCommissionerStaffIdForOnboarding,
    canManageContract,
  }
}
