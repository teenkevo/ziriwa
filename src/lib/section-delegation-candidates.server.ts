import 'server-only'

import {
  canStaffReceiveDelegation,
  isSectionActingRole,
  type DelegationCandidate,
  type SectionActingRole,
} from '@/lib/role-delegation'
import { client } from '@/sanity/lib/client'

export type { DelegationCandidate }

export async function getDelegationCandidatesForStaff(
  sectionId: string,
  fromStaffId: string,
): Promise<DelegationCandidate[]> {
  const fromStaff = await client.fetch<{ role?: string } | null>(
    /* groq */ `*[_type == "staff" && _id == $id][0]{ role }`,
    { id: fromStaffId },
  )

  const actingRole = fromStaff?.role
  if (!isSectionActingRole(actingRole)) return []

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

  return rows.filter(c =>
    canStaffReceiveDelegation(c.role, actingRole as SectionActingRole),
  )
}
