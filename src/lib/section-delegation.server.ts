import 'server-only'

import type {
  SectionActingRole,
  SectionDelegationPurpose,
} from '@/lib/role-delegation'
import {
  computeDelegationStatus,
  datesOverlap,
  isSectionActingRole,
  resolveSectionDelegationPurpose,
} from '@/lib/role-delegation'
import { client } from '@/sanity/lib/client'

export interface SectionDelegationRecord {
  _id: string
  actingRole: SectionActingRole
  purpose: SectionDelegationPurpose
  fromStaffId: string
  fromStaffName: string
  toStaffId: string
  toStaffName: string
  sectionId: string
  startDate: string
  endDate: string
  status: string
  note?: string
}

export interface ActiveDelegationForStaff {
  _id: string
  actingRole: SectionActingRole
  fromStaffId: string
  sectionId: string
}

const ACTIVE_STATUSES = ['scheduled', 'active'] as const

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

const delegationProjection = /* groq */ `{
  _id,
  actingRole,
  purpose,
  startDate,
  endDate,
  status,
  note,
  "fromStaffId": fromStaff._ref,
  "fromStaffName": coalesce(fromStaff->fullName, fromStaff->firstName + " " + fromStaff->lastName),
  "toStaffId": toStaff._ref,
  "toStaffName": coalesce(toStaff->fullName, toStaff->firstName + " " + toStaff->lastName),
  "sectionId": section._ref
}`

function normalizeDelegationRecord(
  row: SectionDelegationRecord | null,
): SectionDelegationRecord | null {
  if (!row || !isSectionActingRole(row.actingRole)) return null
  return {
    ...row,
    purpose: resolveSectionDelegationPurpose(row.purpose),
  }
}

export async function getActiveDelegationsForStaff(
  staffId: string,
): Promise<ActiveDelegationForStaff[]> {
  const date = todayIso()
  const rows = await client.fetch<
    { _id: string; actingRole: string; fromStaffId: string; sectionId: string }[]
  >(
    /* groq */ `*[_type == "sectionDelegation"
      && toStaff._ref == $staffId
      && status in $statuses
      && startDate <= $date
      && endDate >= $date
    ]{
      _id,
      actingRole,
      "fromStaffId": fromStaff._ref,
      "sectionId": section._ref
    }`,
    { staffId, date, statuses: [...ACTIVE_STATUSES] },
  )

  return rows.filter(
    (r): r is ActiveDelegationForStaff =>
      isSectionActingRole(r.actingRole) && Boolean(r.fromStaffId && r.sectionId),
  )
}

/** Single active assignment where viewer is the acting person (no concurrent acting). */
export async function getActiveDelegationAsDelegatee(
  staffId: string,
  sectionId?: string,
): Promise<SectionDelegationRecord | null> {
  const date = todayIso()
  const sectionFilter = sectionId ? '&& section._ref == $sectionId' : ''
  const row = await client.fetch<SectionDelegationRecord | null>(
    /* groq */ `*[_type == "sectionDelegation"
      && toStaff._ref == $staffId
      && status in $statuses
      && startDate <= $date
      && endDate >= $date
      ${sectionFilter}
    ] | order(startDate asc)[0] ${delegationProjection}`,
    {
      staffId,
      sectionId,
      date,
      statuses: [...ACTIVE_STATUSES],
    },
  )
  return normalizeDelegationRecord(row)
}

/**
 * Outgoing leave coverage only. Contract-support handoffs are not leave —
 * they must not mark the AC as absent.
 */
export async function getOutgoingActiveDelegation(
  staffId: string,
  sectionId: string,
): Promise<SectionDelegationRecord | null> {
  const date = todayIso()
  const row = await client.fetch<SectionDelegationRecord | null>(
    /* groq */ `*[_type == "sectionDelegation"
      && fromStaff._ref == $staffId
      && section._ref == $sectionId
      && status in $statuses
      && startDate <= $date
      && endDate >= $date
      && coalesce(purpose, "leave") == "leave"
    ] | order(startDate asc)[0] ${delegationProjection}`,
    { staffId, sectionId, date, statuses: [...ACTIVE_STATUSES] },
  )
  return normalizeDelegationRecord(row)
}

/** Active contract-support handoff the viewer created (AC → planning supervisor). */
export async function getOutgoingContractSupportDelegation(
  staffId: string,
  sectionId: string,
): Promise<SectionDelegationRecord | null> {
  const date = todayIso()
  const row = await client.fetch<SectionDelegationRecord | null>(
    /* groq */ `*[_type == "sectionDelegation"
      && fromStaff._ref == $staffId
      && section._ref == $sectionId
      && status in $statuses
      && startDate <= $date
      && endDate >= $date
      && coalesce(purpose, "leave") == "contract_support"
    ] | order(startDate asc)[0] ${delegationProjection}`,
    { staffId, sectionId, date, statuses: [...ACTIVE_STATUSES] },
  )
  return normalizeDelegationRecord(row)
}

export async function findOverlappingDelegationAsDelegatee(
  toStaffId: string,
  startDate: string,
  endDate: string,
  excludeId?: string,
): Promise<SectionDelegationRecord | null> {
  const rows = await client.fetch<SectionDelegationRecord[]>(
    /* groq */ `*[_type == "sectionDelegation"
      && toStaff._ref == $toStaffId
      && status in $statuses
      && (!defined($excludeId) || _id != $excludeId)
    ] ${delegationProjection}`,
    {
      toStaffId,
      excludeId: excludeId ?? null,
      statuses: [...ACTIVE_STATUSES],
    },
  )

  return (
    rows
      .map(r => normalizeDelegationRecord(r))
      .find(
        d => d && datesOverlap(startDate, endDate, d.startDate, d.endDate),
      ) ?? null
  )
}

export async function findOverlappingDelegationAsAbsent(
  fromStaffId: string,
  startDate: string,
  endDate: string,
  excludeId?: string,
  purpose: SectionDelegationPurpose = 'leave',
): Promise<SectionDelegationRecord | null> {
  const rows = await client.fetch<SectionDelegationRecord[]>(
    /* groq */ `*[_type == "sectionDelegation"
      && fromStaff._ref == $fromStaffId
      && status in $statuses
      && coalesce(purpose, "leave") == $purpose
      && (!defined($excludeId) || _id != $excludeId)
    ] ${delegationProjection}`,
    {
      fromStaffId,
      excludeId: excludeId ?? null,
      purpose,
      statuses: [...ACTIVE_STATUSES],
    },
  )

  return (
    rows
      .map(r => normalizeDelegationRecord(r))
      .find(
        d => d && datesOverlap(startDate, endDate, d.startDate, d.endDate),
      ) ?? null
  )
}

export async function getSectionDelegationActors(sectionId: string) {
  const date = todayIso()
  return client.fetch<
    { actingRole: SectionActingRole; toStaffId: string; fromStaffId: string }[]
  >(
    /* groq */ `*[_type == "sectionDelegation"
      && section._ref == $sectionId
      && status in $statuses
      && startDate <= $date
      && endDate >= $date
    ]{
      actingRole,
      "toStaffId": toStaff._ref,
      "fromStaffId": fromStaff._ref
    }`,
    { sectionId, date, statuses: [...ACTIVE_STATUSES] },
  )
}

export async function syncDelegationStatuses(sectionId?: string): Promise<void> {
  const date = todayIso()
  const filter = sectionId
    ? `section._ref == $sectionId && status in $statuses`
    : `status in $statuses`
  const delegations = await client.fetch<
    { _id: string; startDate: string; endDate: string; status: string }[]
  >(
    /* groq */ `*[_type == "sectionDelegation" && ${filter}]{ _id, startDate, endDate, status }`,
    sectionId
      ? { sectionId, statuses: [...ACTIVE_STATUSES] }
      : { statuses: [...ACTIVE_STATUSES] },
  )

  const { writeClient } = await import('@/sanity/lib/write-client')
  for (const d of delegations) {
    const next = computeDelegationStatus(d.startDate, d.endDate, date)
    if (next !== d.status) {
      await writeClient.patch(d._id).set({ status: next }).commit()
    }
  }
}
