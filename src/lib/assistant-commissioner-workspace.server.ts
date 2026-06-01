import 'server-only'

import type { WorkContextMode } from '@/lib/section-access'
import type { DelegationCandidate } from '@/lib/role-delegation'
import {
  getAssistantCommissionerDivision,
  type AssistantCommissionerDivision,
} from '@/lib/assistant-commissioner.server'
import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import { getOrgDelegationCandidatesForStaff } from '@/lib/org-role-delegation-candidates.server'
import {
  getActiveOrgDelegationAsDelegatee,
  getOutgoingActiveOrgDelegation,
  syncOrgDelegationStatuses,
} from '@/lib/org-role-delegation.server'
import type { OrgDelegationRecord } from '@/lib/org-role-delegation.server'
import { client } from '@/sanity/lib/client'

export interface OrgDelegationState {
  assignmentAsDelegatee: OrgDelegationRecord | null
  assignmentAsAbsent: OrgDelegationRecord | null
}

export interface AssistantCommissionerWorkspaceContext {
  workContext: WorkContextMode
  division: AssistantCommissionerDivision
  delegation: OrgDelegationState
  isPermanentAssistantCommissioner: boolean
  canSelfServiceDelegate: boolean
  delegationCandidates: DelegationCandidate[]
}

async function getDivisionById(
  divisionId: string,
): Promise<AssistantCommissionerDivision | null> {
  return client.fetch<AssistantCommissionerDivision | null>(
    /* groq */ `*[_type == "division" && _id == $divisionId][0]{
      _id,
      "name": coalesce(acronym, fullName),
      fullName,
      acronym,
      slug
    }`,
    { divisionId },
  )
}

async function isPermanentAcForDivision(
  staffId: string,
  divisionId: string,
): Promise<boolean> {
  return client.fetch<boolean>(
    /* groq */ `
      count(
        *[
          _type == "division"
          && _id == $divisionId
          && (
            assistantCommissioner._ref == $staffId
            || *[
              _type == "staff"
              && _id == $staffId
              && role == "assistant_commissioner"
              && division._ref == $divisionId
            ][0]._id != null
          )
        ][0]
      ) > 0
    `,
    { staffId, divisionId },
  )
}

export async function resolveAssistantCommissionerWorkspace(
  workContext: WorkContextMode = 'own',
): Promise<AssistantCommissionerWorkspaceContext | null> {
  const viewerStaffId = await getViewerStaffId()
  if (!viewerStaffId) return null

  if (workContext === 'acting') {
    const assignmentAsDelegatee = await getActiveOrgDelegationAsDelegatee(
      viewerStaffId,
      { actingRole: 'assistant_commissioner' },
    )
    if (!assignmentAsDelegatee?.divisionId) return null

    await syncOrgDelegationStatuses({
      divisionId: assignmentAsDelegatee.divisionId,
    })

    const division = await getDivisionById(assignmentAsDelegatee.divisionId)
    if (!division) return null

    return {
      workContext: 'acting',
      division,
      delegation: {
        assignmentAsDelegatee,
        assignmentAsAbsent: null,
      },
      isPermanentAssistantCommissioner: false,
      canSelfServiceDelegate: false,
      delegationCandidates: [],
    }
  }

  const division = await getAssistantCommissionerDivision()
  if (!division?._id) return null

  await syncOrgDelegationStatuses({ divisionId: division._id })

  const [isPermanentAssistantCommissioner, assignmentAsDelegatee, assignmentAsAbsent] =
    await Promise.all([
      isPermanentAcForDivision(viewerStaffId, division._id),
      getActiveOrgDelegationAsDelegatee(viewerStaffId, {
        divisionId: division._id,
      }),
      getOutgoingActiveOrgDelegation(viewerStaffId, {
        divisionId: division._id,
      }),
    ])

  const canSelfServiceDelegate = isPermanentAssistantCommissioner
  const delegationCandidates = canSelfServiceDelegate
    ? await getOrgDelegationCandidatesForStaff(
        viewerStaffId,
        'division',
        division._id,
      )
    : []

  return {
    workContext: 'own',
    division,
    delegation: {
      assignmentAsDelegatee,
      assignmentAsAbsent,
    },
    isPermanentAssistantCommissioner,
    canSelfServiceDelegate,
    delegationCandidates,
  }
}

export async function canAccessAssistantCommissionerWorkspace(): Promise<boolean> {
  const role = await import('@/lib/clerk-app-role.server').then(m =>
    m.getAppRole(),
  )
  if (role === 'assistant_commissioner') return true

  const viewerStaffId = await getViewerStaffId()
  if (!viewerStaffId) return false

  const acting = await getActiveOrgDelegationAsDelegatee(viewerStaffId, {
    actingRole: 'assistant_commissioner',
  })
  return Boolean(acting)
}
