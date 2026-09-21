import 'server-only'

import {
  canStaffReceiveDelegation,
  isSectionActingRole,
  type DelegationCandidate,
  type SectionActingRole,
} from '@/lib/role-delegation'
import { getActiveOrgDelegationAsDelegatee } from '@/lib/org-role-delegation.server'
import { client } from '@/sanity/lib/client'

export type { DelegationCandidate }

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

  const actingAsAc = await getActiveOrgDelegationAsDelegatee(fromStaffId, {
    actingRole: 'assistant_commissioner',
    divisionId: sectionMeta.divisionId,
  })
  if (actingAsAc) return 'manager'

  return null
}

export async function getDelegationCandidatesForStaff(
  sectionId: string,
  fromStaffId: string,
): Promise<DelegationCandidate[]> {
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
