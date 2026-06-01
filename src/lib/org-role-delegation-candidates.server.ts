import 'server-only'

import {
  canStaffReceiveOrgDelegation,
  isOrgActingRole,
  type DelegationCandidate,
  type OrgActingRole,
} from '@/lib/role-delegation'
import { client } from '@/sanity/lib/client'

export type { DelegationCandidate }

export async function getOrgDelegationCandidates(
  scope: 'division' | 'department',
  scopeId: string,
  actingRole: OrgActingRole,
  fromStaffId: string,
): Promise<DelegationCandidate[]> {
  if (scope === 'division' && actingRole === 'assistant_commissioner') {
    return client.fetch<DelegationCandidate[]>(
      /* groq */ `
        *[
          _type == "staff"
          && role == "manager"
          && status == "active"
          && _id != $fromStaffId
          && section._ref in *[_type == "section" && division._ref == $divisionId]._id
        ] | order(fullName asc) {
          _id,
          "fullName": coalesce(fullName, firstName + " " + lastName),
          role
        }
      `,
      { divisionId: scopeId, fromStaffId },
    )
  }

  if (scope === 'department' && actingRole === 'commissioner') {
    return client.fetch<DelegationCandidate[]>(
      /* groq */ `
        *[
          _type == "staff"
          && role == "assistant_commissioner"
          && status == "active"
          && _id != $fromStaffId
          && division._ref in *[_type == "division" && department._ref == $departmentId]._id
        ] | order(fullName asc) {
          _id,
          "fullName": coalesce(fullName, firstName + " " + lastName),
          role
        }
      `,
      { departmentId: scopeId, fromStaffId },
    )
  }

  return []
}

export async function getOrgDelegationCandidatesForStaff(
  fromStaffId: string,
  scope: 'division' | 'department',
  scopeId: string,
): Promise<DelegationCandidate[]> {
  const fromStaff = await client.fetch<{ role?: string } | null>(
    /* groq */ `*[_type == "staff" && _id == $id][0]{ role }`,
    { id: fromStaffId },
  )

  const actingRole = fromStaff?.role
  if (!isOrgActingRole(actingRole)) return []

  const rows = await getOrgDelegationCandidates(
    scope,
    scopeId,
    actingRole,
    fromStaffId,
  )

  return rows.filter(c => canStaffReceiveOrgDelegation(c.role, actingRole))
}
