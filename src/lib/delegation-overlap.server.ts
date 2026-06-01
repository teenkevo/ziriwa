import 'server-only'

import {
  findOverlappingDelegationAsAbsent,
  findOverlappingDelegationAsDelegatee,
  type SectionDelegationRecord,
} from '@/lib/section-delegation.server'
import {
  findOverlappingOrgDelegationAsAbsent,
  findOverlappingOrgDelegationAsDelegatee,
  type OrgDelegationRecord,
} from '@/lib/org-role-delegation.server'

export type AnyDelegationOverlap =
  | { kind: 'section'; record: SectionDelegationRecord }
  | { kind: 'org'; record: OrgDelegationRecord }

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
): Promise<AnyDelegationOverlap | null> {
  const [section, org] = await Promise.all([
    findOverlappingDelegationAsAbsent(
      fromStaffId,
      startDate,
      endDate,
      exclude?.sectionId,
    ),
    findOverlappingOrgDelegationAsAbsent(
      fromStaffId,
      startDate,
      endDate,
      exclude?.orgId,
    ),
  ])

  if (section) return { kind: 'section', record: section }
  if (org) return { kind: 'org', record: org }
  return null
}
