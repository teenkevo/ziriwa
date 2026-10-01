import 'server-only'

import {
  canStaffReceiveDelegation,
  canStaffReceivePlanningContractRedelegation,
  isSectionActingRole,
  type DelegationCandidate,
  type SectionActingRole,
} from '@/lib/role-delegation'
import { getActiveOrgDelegationAsDelegatee } from '@/lib/org-role-delegation.server'
import {
  getActiveDelegationAsDelegatee,
  scopeContractSupportToActiveYear,
} from '@/lib/section-delegation.server'
import { client } from '@/sanity/lib/client'

export type { DelegationCandidate }

async function isAssistantCommissionerForDivision(
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
              && status == "active"
            ][0]._id != null
          )
        ][0]
      ) > 0
    `,
    { staffId, divisionId },
  )
}

async function resolveActingRoleForDelegation(
  sectionId: string,
  fromStaffId: string,
): Promise<SectionActingRole | null> {
  const [fromStaff, sectionMeta] = await Promise.all([
    client.fetch<{ role?: string } | null>(
      /* groq */ `*[_type == "staff" && _id == $id][0]{ role }`,
      { id: fromStaffId },
    ),
    client.fetch<{
      isPlanningSection?: boolean
      divisionId?: string | null
      assistantCommissionerId?: string | null
    } | null>(
      /* groq */ `*[_type == "section" && _id == $sectionId][0]{
        "isPlanningSection": coalesce(isPlanningSection, false),
        "divisionId": division._ref,
        "assistantCommissionerId": division->assistantCommissioner._ref
      }`,
      { sectionId },
    ),
  ])

  if (isSectionActingRole(fromStaff?.role)) {
    return fromStaff!.role as SectionActingRole
  }

  if (!sectionMeta?.isPlanningSection || !sectionMeta.divisionId) return null

  if (fromStaffId === sectionMeta.assistantCommissionerId) {
    return 'manager'
  }

  if (
    await isAssistantCommissionerForDivision(
      fromStaffId,
      sectionMeta.divisionId,
    )
  ) {
    return 'manager'
  }

  const actingAsAc = await getActiveOrgDelegationAsDelegatee(fromStaffId, {
    actingRole: 'assistant_commissioner',
    divisionId: sectionMeta.divisionId,
  })
  if (actingAsAc) return 'manager'

  return null
}

/**
 * Whether this staff member may redelegate planning contract work (AC →
 * supervisor acting as manager → officer).
 */
export async function isPlanningContractRedelegationFrom(
  sectionId: string,
  fromStaffId: string,
): Promise<boolean> {
  const [fromStaff, sectionMeta, incoming] = await Promise.all([
    client.fetch<{ role?: string; sectionId?: string } | null>(
      /* groq */ `*[_type == "staff" && _id == $id][0]{
        role,
        "sectionId": section._ref
      }`,
      { id: fromStaffId },
    ),
    client.fetch<{ isPlanningSection?: boolean } | null>(
      /* groq */ `*[_type == "section" && _id == $sectionId][0]{
        "isPlanningSection": coalesce(isPlanningSection, false)
      }`,
      { sectionId },
    ),
    scopeContractSupportToActiveYear(
      await getActiveDelegationAsDelegatee(fromStaffId, sectionId),
    ),
  ])

  return (
    Boolean(sectionMeta?.isPlanningSection) &&
    fromStaff?.role === 'supervisor' &&
    fromStaff.sectionId === sectionId &&
    incoming?.actingRole === 'manager'
  )
}

/** Supervisors eligible for AC → DIP-Planning contract support. */
export async function getPlanningContractSupportCandidates(
  sectionId: string,
  fromStaffId: string,
): Promise<DelegationCandidate[]> {
  const rows = await client.fetch<DelegationCandidate[]>(
    /* groq */ `*[
      _type == "staff"
      && section._ref == $sectionId
      && status == "active"
      && role == "supervisor"
      && _id != $fromStaffId
    ] | order(fullName asc) {
      _id,
      "fullName": coalesce(fullName, firstName + " " + lastName),
      role
    }`,
    { sectionId, fromStaffId },
  )
  return rows.filter(c => canStaffReceiveDelegation(c.role, 'manager'))
}

export async function getDelegationCandidatesForStaff(
  sectionId: string,
  fromStaffId: string,
): Promise<DelegationCandidate[]> {
  const isRedelegation = await isPlanningContractRedelegationFrom(
    sectionId,
    fromStaffId,
  )

  if (isRedelegation) {
    const rows = await client.fetch<DelegationCandidate[]>(
      /* groq */ `*[
        _type == "staff"
        && section._ref == $sectionId
        && status == "active"
        && role == "officer"
        && _id != $fromStaffId
      ] | order(fullName asc) {
        _id,
        "fullName": coalesce(fullName, firstName + " " + lastName),
        role
      }`,
      { sectionId, fromStaffId },
    )
    return rows.filter(c => canStaffReceivePlanningContractRedelegation(c.role))
  }

  const actingRole = await resolveActingRoleForDelegation(
    sectionId,
    fromStaffId,
  )
  if (!actingRole) return []

  const rows = await client.fetch<DelegationCandidate[]>(
    /* groq */ `*[
      _type == "staff"
      && section._ref == $sectionId
      && status == "active"
      && _id != $fromStaffId
    ] | order(fullName asc) {
      _id,
      "fullName": coalesce(fullName, firstName + " " + lastName),
      role
    }`,
    { sectionId, fromStaffId },
  )

  return rows.filter(c => canStaffReceiveDelegation(c.role, actingRole))
}
