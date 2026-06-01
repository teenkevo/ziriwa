import 'server-only'

import type { OrgActingRole } from '@/lib/role-delegation'
import {
  computeDelegationStatus,
  datesOverlap,
  isOrgActingRole,
} from '@/lib/role-delegation'
import { client } from '@/sanity/lib/client'

export interface OrgDelegationRecord {
  _id: string
  scope: 'division' | 'department'
  actingRole: OrgActingRole
  fromStaffId: string
  fromStaffName: string
  toStaffId: string
  toStaffName: string
  divisionId: string | null
  departmentId: string | null
  startDate: string
  endDate: string
  status: string
  note?: string
}

const ACTIVE_STATUSES = ['scheduled', 'active'] as const

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

const orgProjection = /* groq */ `{
  _id,
  scope,
  actingRole,
  startDate,
  endDate,
  status,
  note,
  "fromStaffId": fromStaff._ref,
  "fromStaffName": coalesce(fromStaff->fullName, fromStaff->firstName + " " + fromStaff->lastName),
  "toStaffId": toStaff._ref,
  "toStaffName": coalesce(toStaff->fullName, toStaff->firstName + " " + toStaff->lastName),
  "divisionId": division._ref,
  "departmentId": department._ref
}`

function normalizeOrgRow(
  row: OrgDelegationRecord | null,
): OrgDelegationRecord | null {
  if (!row || !isOrgActingRole(row.actingRole)) return null
  return row
}

export async function getActiveOrgDelegationAsDelegatee(
  staffId: string,
  filters?: {
    actingRole?: OrgActingRole
    divisionId?: string
    departmentId?: string
  },
): Promise<OrgDelegationRecord | null> {
  const date = todayIso()
  const roleFilter = filters?.actingRole
    ? `&& actingRole == $actingRole`
    : ''
  const divisionFilter = filters?.divisionId
    ? `&& division._ref == $divisionId`
    : ''
  const departmentFilter = filters?.departmentId
    ? `&& department._ref == $departmentId`
    : ''

  const row = await client.fetch<OrgDelegationRecord | null>(
    /* groq */ `*[_type == "orgRoleDelegation"
      && toStaff._ref == $staffId
      && status in $statuses
      && startDate <= $date
      && endDate >= $date
      ${roleFilter}
      ${divisionFilter}
      ${departmentFilter}
    ] | order(startDate asc)[0] ${orgProjection}`,
    {
      staffId,
      date,
      statuses: [...ACTIVE_STATUSES],
      actingRole: filters?.actingRole,
      divisionId: filters?.divisionId,
      departmentId: filters?.departmentId,
    },
  )

  return normalizeOrgRow(row)
}

export async function getOutgoingActiveOrgDelegation(
  staffId: string,
  filters?: { divisionId?: string; departmentId?: string },
): Promise<OrgDelegationRecord | null> {
  const date = todayIso()
  const divisionFilter = filters?.divisionId
    ? `&& division._ref == $divisionId`
    : ''
  const departmentFilter = filters?.departmentId
    ? `&& department._ref == $departmentId`
    : ''

  const row = await client.fetch<OrgDelegationRecord | null>(
    /* groq */ `*[_type == "orgRoleDelegation"
      && fromStaff._ref == $staffId
      && status in $statuses
      && startDate <= $date
      && endDate >= $date
      ${divisionFilter}
      ${departmentFilter}
    ] | order(startDate asc)[0] ${orgProjection}`,
    {
      staffId,
      date,
      statuses: [...ACTIVE_STATUSES],
      divisionId: filters?.divisionId,
      departmentId: filters?.departmentId,
    },
  )

  return normalizeOrgRow(row)
}

export async function findOverlappingOrgDelegationAsDelegatee(
  toStaffId: string,
  startDate: string,
  endDate: string,
  excludeId?: string,
): Promise<OrgDelegationRecord | null> {
  const rows = await client.fetch<OrgDelegationRecord[]>(
    /* groq */ `*[_type == "orgRoleDelegation"
      && toStaff._ref == $toStaffId
      && status in $statuses
      && (!defined($excludeId) || _id != $excludeId)
    ] ${orgProjection}`,
    {
      toStaffId,
      excludeId: excludeId ?? null,
      statuses: [...ACTIVE_STATUSES],
    },
  )

  return (
    rows.find(
      d =>
        isOrgActingRole(d.actingRole) &&
        datesOverlap(startDate, endDate, d.startDate, d.endDate),
    ) ?? null
  )
}

export async function findOverlappingOrgDelegationAsAbsent(
  fromStaffId: string,
  startDate: string,
  endDate: string,
  excludeId?: string,
): Promise<OrgDelegationRecord | null> {
  const rows = await client.fetch<OrgDelegationRecord[]>(
    /* groq */ `*[_type == "orgRoleDelegation"
      && fromStaff._ref == $fromStaffId
      && status in $statuses
      && (!defined($excludeId) || _id != $excludeId)
    ] ${orgProjection}`,
    {
      fromStaffId,
      excludeId: excludeId ?? null,
      statuses: [...ACTIVE_STATUSES],
    },
  )

  return (
    rows.find(
      d =>
        isOrgActingRole(d.actingRole) &&
        datesOverlap(startDate, endDate, d.startDate, d.endDate),
    ) ?? null
  )
}

export async function syncOrgDelegationStatuses(
  scopeId?: { divisionId?: string; departmentId?: string },
): Promise<void> {
  const date = todayIso()
  let filter = `status in $statuses`
  const params: Record<string, unknown> = {
    statuses: [...ACTIVE_STATUSES],
    date,
  }

  if (scopeId?.divisionId) {
    filter = `division._ref == $divisionId && ${filter}`
    params.divisionId = scopeId.divisionId
  } else if (scopeId?.departmentId) {
    filter = `department._ref == $departmentId && ${filter}`
    params.departmentId = scopeId.departmentId
  }

  const delegations = await client.fetch<
    { _id: string; startDate: string; endDate: string; status: string }[]
  >(
    /* groq */ `*[_type == "orgRoleDelegation" && ${filter}]{ _id, startDate, endDate, status }`,
    params,
  )

  const { writeClient } = await import('@/sanity/lib/write-client')
  for (const d of delegations) {
    const next = computeDelegationStatus(d.startDate, d.endDate, date)
    if (next !== d.status) {
      await writeClient.patch(d._id).set({ status: next }).commit()
    }
  }
}
