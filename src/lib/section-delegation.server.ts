import 'server-only'

import type { SectionActingRole } from '@/lib/role-delegation'
import {
  computeDelegationStatus,
  datesOverlap,
  isSectionActingRole,
} from '@/lib/role-delegation'
import { client } from '@/sanity/lib/client'

export interface SectionDelegationRecord {
  _id: string
  actingRole: SectionActingRole
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
  if (!row || !isSectionActingRole(row.actingRole)) return null
  return row
}

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
    ] | order(startDate asc)[0] ${delegationProjection}`,
    { staffId, sectionId, date, statuses: [...ACTIVE_STATUSES] },
  )
  if (!row || !isSectionActingRole(row.actingRole)) return null
  return row
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
    rows.find(
      d =>
        isSectionActingRole(d.actingRole) &&
        datesOverlap(startDate, endDate, d.startDate, d.endDate),
    ) ?? null
  )
}

export async function findOverlappingDelegationAsAbsent(
  fromStaffId: string,
  startDate: string,
  endDate: string,
  excludeId?: string,
): Promise<SectionDelegationRecord | null> {
  const rows = await client.fetch<SectionDelegationRecord[]>(
    /* groq */ `*[_type == "sectionDelegation"
      && fromStaff._ref == $fromStaffId
      && status in $statuses
      && (!defined($excludeId) || _id != $excludeId)
    ] ${delegationProjection}`,
    {
      fromStaffId,
      excludeId: excludeId ?? null,
      statuses: [...ACTIVE_STATUSES],
    },
  )

  return (
    rows.find(
      d =>
        isSectionActingRole(d.actingRole) &&
        datesOverlap(startDate, endDate, d.startDate, d.endDate),
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
