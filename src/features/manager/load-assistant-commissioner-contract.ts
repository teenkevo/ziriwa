import 'server-only'

import type { WorkContextMode } from '@/lib/section-access'
import { resolveAssistantCommissionerWorkspace } from '@/lib/assistant-commissioner-workspace.server'
import type { AssistantCommissionerWorkspaceContext } from '@/lib/assistant-commissioner-workspace.server'
import {
  canManageDivisionContract,
  resolveAssistantCommissionerStaffRefForDivision,
} from '@/lib/division-contract-access.server'
import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import type { DelegationCandidate } from '@/lib/role-delegation'
import { getPlanningContractSupportCandidates } from '@/lib/section-delegation-candidates.server'
import {
  getOutgoingContractSupportDelegation,
  type SectionDelegationRecord,
} from '@/lib/section-delegation.server'
import { client } from '@/sanity/lib/client'
import { getDivisionContractByDivision } from '@/sanity/lib/division-contracts/get-division-contract-by-division'
import type { DivisionContract } from '@/sanity/lib/division-contracts/get-division-contract'

export type PlanningSectionContractSupport = {
  sectionId: string | null
  sectionName: string | null
  sectionSlug: string | null
  candidates: DelegationCandidate[]
  activeSupport: SectionDelegationRecord | null
  /** Why the CTA is disabled, when section/candidates are missing. */
  unavailableReason: string | null
}

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
  planningContractSupport: PlanningSectionContractSupport | null
}

async function loadPlanningSectionForDivision(divisionId: string): Promise<{
  _id: string
  name: string
  slug: string | null
  isPlanningSection: boolean
} | null> {
  return client.fetch(
    /* groq */ `coalesce(
      *[
        _type == "section"
        && division._ref == $divisionId
        && coalesce(isPlanningSection, false) == true
        && !defined(project._ref)
      ] | order(name asc)[0]{
        _id,
        name,
        "slug": slug.current,
        "isPlanningSection": true
      },
      *[
        _type == "section"
        && division._ref == $divisionId
        && !defined(project._ref)
        && (
          name match "*Planning*"
          || name match "*-Planning"
        )
      ] | order(name asc)[0]{
        _id,
        name,
        "slug": slug.current,
        "isPlanningSection": coalesce(isPlanningSection, false)
      }
    )`,
    { divisionId },
  )
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

  const [
    divisionContract,
    canManageContract,
    assistantCommissionerStaffIdForOnboarding,
    planningSection,
    viewerStaffId,
  ] = await Promise.all([
    getDivisionContractByDivision(division._id),
    canManageDivisionContract(division._id),
    resolveAssistantCommissionerStaffRefForDivision(division._id),
    loadPlanningSectionForDivision(division._id),
    getViewerStaffId(),
  ])

  // Own-context AC contract page always offers the support CTA. Eligibility
  // for acting is already enforced by resolveAssistantCommissionerWorkspace.
  const canOfferContractSupport =
    acWorkspace.workContext === 'own' && Boolean(viewerStaffId)

  let planningContractSupport: PlanningSectionContractSupport | null = null
  if (canOfferContractSupport && viewerStaffId) {
    if (!planningSection?._id) {
      planningContractSupport = {
        sectionId: null,
        sectionName: null,
        sectionSlug: null,
        candidates: [],
        activeSupport: null,
        unavailableReason:
          'Add a planning section (DIP-Planning) under this division to delegate contract support.',
      }
    } else if (!planningSection.isPlanningSection) {
      planningContractSupport = {
        sectionId: planningSection._id,
        sectionName: planningSection.name,
        sectionSlug: planningSection.slug,
        candidates: [],
        activeSupport: null,
        unavailableReason: `${planningSection.name} must be marked as a Planning Section before you can delegate contract support.`,
      }
    } else {
      const [candidates, activeSupport] = await Promise.all([
        getPlanningContractSupportCandidates(
          planningSection._id,
          viewerStaffId,
        ),
        getOutgoingContractSupportDelegation(
          viewerStaffId,
          planningSection._id,
        ),
      ])
      planningContractSupport = {
        sectionId: planningSection._id,
        sectionName: planningSection.name,
        sectionSlug: planningSection.slug,
        candidates,
        activeSupport,
        unavailableReason:
          candidates.length === 0
            ? `No planning supervisor is assigned to ${planningSection.name} yet.`
            : null,
      }
    }
  }

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
    planningContractSupport,
  }
}
