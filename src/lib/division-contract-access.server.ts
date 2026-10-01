import 'server-only'

import { NextResponse } from 'next/server'

import {
  canUseSuperadminPowers,
  getEffectiveViewerEmail,
} from '@/lib/impersonation/viewer-context.server'
import { getAppRole } from '@/lib/clerk-app-role.server'
import { isWorkspaceFinancialYearWritable } from '@/lib/financial-year-access.server'
import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import { getActiveOrgDelegationAsDelegatee } from '@/lib/org-role-delegation.server'
import {
  getActiveDelegationAsDelegatee,
  scopeContractSupportToActiveYear,
} from '@/lib/section-delegation.server'
import { canManageAssistantCommissionerDivision } from '@/lib/assistant-commissioner.server'
import { client } from '@/sanity/lib/client'
import { resolveSectionDelegationPurpose } from '@/lib/role-delegation'

export async function getDivisionIdFromContract(
  contractId: string,
): Promise<string | null> {
  return client.fetch<string | null>(
    /* groq */ `*[_type == "divisionContract" && _id == $contractId][0].division._ref`,
    { contractId },
  )
}

export async function resolveAssistantCommissionerStaffRefForDivision(
  divisionId: string,
): Promise<string | null> {
  const viewerStaffId = await getViewerStaffId()
  if (!viewerStaffId) return null

  const acting = await getActiveOrgDelegationAsDelegatee(viewerStaffId, {
    actingRole: 'assistant_commissioner',
    divisionId,
  })
  if (acting) return acting.fromStaffId

  return client.fetch<string | null>(
    /* groq */ `
      coalesce(
        *[
          _type == "staff"
          && _id == $viewerStaffId
          && coalesce(status, "active") != "inactive"
          && role == "assistant_commissioner"
          && division._ref == $divisionId
        ][0]._id,
        *[_type == "division" && _id == $divisionId][0].assistantCommissioner._ref
      )
    `,
    { viewerStaffId, divisionId },
  )
}

function isContractSupportManagerAssignment(
  assignment: { actingRole?: string; purpose?: string } | null,
): boolean {
  if (assignment?.actingRole !== 'manager') return false
  // Legacy planning AC handoffs predate the purpose field.
  if (assignment.purpose == null || assignment.purpose === '') return true
  return resolveSectionDelegationPurpose(assignment.purpose) === 'contract_support'
}

/**
 * DIP-Planning staff covering AC contract support may edit the division
 * contract for the planning section's division.
 */
export async function canManageDivisionContractViaPlanningSupport(
  divisionId: string,
  viewerStaffId: string,
): Promise<boolean> {
  const planningSection = await client.fetch<{
    _id: string
  } | null>(
    /* groq */ `*[
      _type == "section"
      && division._ref == $divisionId
      && coalesce(isPlanningSection, false) == true
      && !defined(project._ref)
    ] | order(name asc)[0]{ _id }`,
    { divisionId },
  )
  if (!planningSection?._id) return false

  const assignment = await scopeContractSupportToActiveYear(
    await getActiveDelegationAsDelegatee(viewerStaffId, planningSection._id),
  )
  return isContractSupportManagerAssignment(assignment)
}

export async function canManageDivisionContract(
  divisionId: string,
): Promise<boolean> {
  if (!(await isWorkspaceFinancialYearWritable())) return false
  const appRole = await getAppRole()
  if ((await canUseSuperadminPowers()) || appRole === 'commissioner_general') return true

  const email = await getEffectiveViewerEmail()
  if (!email) return false

  const acActive =
    '!defined(assistantCommissioner->status) || assistantCommissioner->status == "active"'

  const allowed = await client.fetch<boolean>(
    /* groq */ `
      count(
        *[
          _type == "division"
          && _id == $divisionId
          && (
            (
              (${acActive})
              && (
                lower(assistantCommissioner->email) == $email
                || assistantCommissioner._ref == *[
                  _type == "staff"
                  && lower(email) == $email
                  && coalesce(status, "active") != "inactive"
                ][0]._id
              )
            )
            || count(
              *[
                _type == "staff"
                && lower(email) == $email
                && coalesce(status, "active") != "inactive"
                && role == "assistant_commissioner"
                && division._ref == $divisionId
              ]
            ) > 0
          )
        ][0]
      ) > 0
    `,
    { divisionId, email },
  )

  if (allowed) return true

  if (appRole === 'assistant_commissioner') {
    const resolved =
      await resolveAssistantCommissionerStaffRefForDivision(divisionId)
    if (resolved) return true
  }

  const viewerStaffId = await getViewerStaffId()
  if (viewerStaffId) {
    const acting = await getActiveOrgDelegationAsDelegatee(viewerStaffId, {
      actingRole: 'assistant_commissioner',
      divisionId,
    })
    if (acting) return true

    if (
      await canManageDivisionContractViaPlanningSupport(
        divisionId,
        viewerStaffId,
      )
    ) {
      return true
    }
  }

  if (await canManageAssistantCommissionerDivision(divisionId)) return true

  return false
}

export function divisionContractAccessDenied(message: string) {
  return NextResponse.json({ error: message }, { status: 403 })
}

export async function assertDivisionContractManageAllowed(
  divisionId: string,
): Promise<NextResponse | null> {
  if (await canManageDivisionContract(divisionId)) return null
  return divisionContractAccessDenied(
    'Only the division assistant commissioner can change this contract',
  )
}
