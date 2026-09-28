import 'server-only'

import {
  findOverlappingDelegationAsAbsent,
  findOverlappingDelegationAsDelegatee,
  getActiveDelegationAsDelegatee,
  type SectionDelegationRecord,
} from '@/lib/section-delegation.server'
import {
  findOverlappingOrgDelegationAsAbsent,
  findOverlappingOrgDelegationAsDelegatee,
  getActiveOrgDelegationAsDelegatee,
  type OrgDelegationRecord,
} from '@/lib/org-role-delegation.server'

export type AnyDelegationOverlap =
  | { kind: 'section'; record: SectionDelegationRecord }
  | { kind: 'org'; record: OrgDelegationRecord }

/** True when the staff member is currently acting for someone else (any scope). */
export async function hasActiveDelegationAsDelegateeAnyScope(
  staffId: string,
): Promise<boolean> {
  const [section, org] = await Promise.all([
    getActiveDelegationAsDelegatee(staffId),
    getActiveOrgDelegationAsDelegatee(staffId),
  ])
  return Boolean(section || org)
}

export async function findOverlappingDelegationAsDelegateeAnyScope(
  toStaffId: string,
  startDate: string,
  endDate: string,
  exclude?: { sectionId?: string; orgId?: string },
): Promise<AnyDelegationOverlap | null> {
  const [section, org] = await Promise.all([
    findOverlappingDelegationAsDelegatee(
      toStaffId,
      startDate,
      endDate,
      exclude?.sectionId,
    ),
    findOverlappingOrgDelegationAsDelegatee(
      toStaffId,
      startDate,
      endDate,
      exclude?.orgId,
    ),
  ])

  if (section) return { kind: 'section', record: section }
  if (org) return { kind: 'org', record: org }
  return null
}

export async function findOverlappingDelegationAsAbsentAnyScope(
  fromStaffId: string,
  startDate: string,
  endDate: string,
  exclude?: { sectionId?: string; orgId?: string },
  purpose: 'leave' | 'contract_support' = 'leave',
): Promise<AnyDelegationOverlap | null> {
  const [section, org] = await Promise.all([
    findOverlappingDelegationAsAbsent(
      fromStaffId,
      startDate,
      endDate,
      exclude?.sectionId,
      purpose,
    ),
    // Org delegations are leave-only; skip for contract support.
    purpose === 'leave'
      ? findOverlappingOrgDelegationAsAbsent(
          fromStaffId,
          startDate,
          endDate,
          exclude?.orgId,
        )
      : Promise.resolve(null),
  ])

  if (section) return { kind: 'section', record: section }
  if (org) return { kind: 'org', record: org }
  return null
}
