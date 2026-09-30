import 'server-only'

import type { LeaveKind, LeaveStatus } from '@/lib/leave/dates'
import { isDateKey } from '@/lib/leave/dates'
import {
  annualEntitlementError,
  annualLeaveAllowance,
  financialYearsTouched,
  summarizeEntitlement,
  workingDaysInYear,
  type LeaveEntitlement,
} from '@/lib/leave/entitlement'
import type { LeavePlan, LeaveReliefOption } from '@/lib/leave/types'
import { client } from '@/sanity/lib/client'
import { writeClient } from '@/sanity/lib/write-client'

const LEAVE_KINDS = new Set<LeaveKind>([
  'annual',
  'sick',
  'study',
  'compassionate',
  'unpaid',
  'other',
])

const LEAVE_PROJECTION = `{
  "id": _id,
  "staffId": staff._ref,
  "staffName": coalesce(staff->fullName, staff->firstName + " " + staff->lastName, "Staff"),
  "reliefStaffId": reliefStaff._ref,
  "reliefStaffName": coalesce(reliefStaff->fullName, reliefStaff->firstName + " " + reliefStaff->lastName),
  "sectionId": staff->section._ref,
  "sectionName": staff->section->name,
  "divisionId": staff->division._ref,
  "divisionName": staff->division->name,
  "departmentId": staff->department._ref,
  "departmentName": staff->department->name,
  startDate,
  endDate,
  status,
  kind,
  note
}`

interface LeavePlanRow {
  id: string
  staffId: string | null
  staffName: string | null
  reliefStaffId?: string | null
  reliefStaffName?: string | null
  sectionId?: string | null
  sectionName?: string | null
  divisionId?: string | null
  divisionName?: string | null
  departmentId?: string | null
  departmentName?: string | null
  startDate: string
  endDate: string
  status: string
  kind: string
  note?: string | null
}

function toLeavePlan(row: LeavePlanRow): LeavePlan | null {
  if (!row.staffId || !isDateKey(row.startDate) || !isDateKey(row.endDate)) {
    return null
  }
  const status: LeaveStatus = row.status === 'confirmed' ? 'confirmed' : 'planned'
  const kind: LeaveKind = LEAVE_KINDS.has(row.kind as LeaveKind)
    ? (row.kind as LeaveKind)
    : 'other'
  const unitId = row.sectionId
    ? `section:${row.sectionId}`
    : row.divisionId
      ? `division:${row.divisionId}`
      : row.departmentId
        ? `department:${row.departmentId}`
        : null
  const unitName =
    row.sectionName?.trim() ||
    row.divisionName?.trim() ||
    row.departmentName?.trim() ||
    null

  return {
    id: row.id,
    staffId: row.staffId,
    staffName: row.staffName?.trim() || 'Staff',
    reliefStaffId: row.reliefStaffId ?? null,
    reliefStaffName: row.reliefStaffName?.trim() || null,
    unitId,
    unitName,
    startDate: row.startDate,
    endDate: row.endDate,
    status,
    kind,
    note: row.note?.trim() ?? '',
  }
}

async function staffRole(staffId: string): Promise<string | null> {
  return client.fetch<string | null>(
    `*[_type == "staff" && _id == $staffId][0].role`,
    { staffId },
  )
}

async function annualSpansForStaff(
  staffId: string,
  from: string,
  to: string,
  exceptId?: string,
): Promise<{ id: string; startDate: string; endDate: string }[]> {
  const rows = await client.fetch<
    { id: string; startDate: string | null; endDate: string | null }[]
  >(
    `*[_type == "leavePlan" && staff._ref == $staffId && kind == "annual" && startDate <= $to && endDate >= $from && _id != $exceptId]{
      "id": _id,
      startDate,
      endDate
    }`,
    { staffId, from, to, exceptId: exceptId ?? '' },
  )
  return rows.flatMap(row =>
    row.startDate && row.endDate && isDateKey(row.startDate) && isDateKey(row.endDate)
      ? [{ id: row.id, startDate: row.startDate, endDate: row.endDate }]
      : [],
  )
}

export async function listLeaveEntitlements(
  staffId: string,
  from: string,
  to: string,
): Promise<LeaveEntitlement[]> {
  const years = financialYearsTouched(from, to)
  if (years.length === 0) return []
  const [role, plans] = await Promise.all([
    staffRole(staffId),
    annualSpansForStaff(
      staffId,
      years[0].startDate,
      years[years.length - 1].endDate,
    ),
  ])
  const allowance = annualLeaveAllowance(role)
  return years.map(fy => summarizeEntitlement(fy, allowance, plans))
}

export async function annualLeaveOverEntitlement(input: {
  staffId: string
  startDate: string
  endDate: string
  kind: string
  exceptId?: string
}): Promise<string | null> {
  if (input.kind !== 'annual') return null
  const years = financialYearsTouched(input.startDate, input.endDate)
  if (years.length === 0) return null
  const [role, plans] = await Promise.all([
    staffRole(input.staffId),
    annualSpansForStaff(
      input.staffId,
      years[0].startDate,
      years[years.length - 1].endDate,
      input.exceptId,
    ),
  ])
  const allowance = annualLeaveAllowance(role)
  for (const fy of years) {
    const usedByOthers = summarizeEntitlement(fy, allowance, plans).used
    const requested = workingDaysInYear(input.startDate, input.endDate, fy)
    const error = annualEntitlementError({ fy, allowance, usedByOthers, requested })
    if (error) return error
  }
  return null
}

export async function listReporteeStaffIds(staffId: string): Promise<string[]> {
  const viewer = await client.fetch<{
    role: string | null
    sectionId: string | null
    divisionId: string | null
    departmentId: string | null
  } | null>(
    `*[_type == "staff" && _id == $staffId][0]{
      role,
      "sectionId": section._ref,
      "divisionId": coalesce(
        division._ref,
        *[_type == "division" && assistantCommissioner._ref == $staffId][0]._id
      ),
      "departmentId": coalesce(
        department._ref,
        *[_type == "department" && commissioner._ref == $staffId][0]._id
      )
    }`,
    { staffId },
  )
  if (!viewer?.role || viewer.role === 'officer') return []

  const params: Record<string, string> = { staffId }
  let filter = ''
  if (viewer.role === 'commissioner_general') {
    filter = `role in ["commissioner", "assistant_commissioner", "manager", "supervisor", "officer"]`
  } else if (viewer.role === 'commissioner' && viewer.departmentId) {
    params.departmentId = viewer.departmentId
    filter = `role in ["assistant_commissioner", "manager", "supervisor", "officer"] && (
      department._ref == $departmentId
      || division._ref in *[_type == "division" && department._ref == $departmentId]._id
      || section._ref in *[_type == "section" && division->department._ref == $departmentId]._id
    )`
  } else if (viewer.role === 'assistant_commissioner' && viewer.divisionId) {
    params.divisionId = viewer.divisionId
    filter = `role in ["manager", "supervisor", "officer"] && (
      division._ref == $divisionId
      || section._ref in *[_type == "section" && division._ref == $divisionId]._id
    )`
  } else if (viewer.role === 'manager' && viewer.sectionId) {
    params.sectionId = viewer.sectionId
    filter = `role in ["supervisor", "officer"] && section._ref == $sectionId`
  } else if (viewer.role === 'supervisor' && viewer.sectionId) {
    params.sectionId = viewer.sectionId
    filter = `role == "officer" && section._ref == $sectionId`
  }
  if (!filter) return []

  const ids = await client.fetch<string[]>(
    `*[_type == "staff" && coalesce(status, "active") == "active" && _id != $staffId && ${filter}]._id`,
    params,
  )
  return ids.filter(id => typeof id === 'string' && id.length > 0)
}

export async function staffLeaveOverlaps(input: {
  staffId: string
  startDate: string
  endDate: string
  exceptId?: string
}): Promise<boolean> {
  const match = await writeClient.fetch<string | null>(
    `*[_type == "leavePlan" && staff._ref == $staffId && startDate <= $endDate && endDate >= $startDate && _id != $exceptId][0]._id`,
    {
      staffId: input.staffId,
      startDate: input.startDate,
      endDate: input.endDate,
      exceptId: input.exceptId ?? '',
    },
  )
  return Boolean(match)
}

export async function listLeavePlans(
  from: string,
  to: string,
): Promise<LeavePlan[]> {
  const rows = await client.fetch<LeavePlanRow[]>(
    `*[_type == "leavePlan" && startDate <= $to && endDate >= $from] | order(startDate asc) ${LEAVE_PROJECTION}`,
    { from, to },
  )
  return rows.flatMap(row => {
    const plan = toLeavePlan(row)
    return plan ? [plan] : []
  })
}

export async function listOwnLeavePlans(staffId: string): Promise<LeavePlan[]> {
  const rows = await client.fetch<LeavePlanRow[]>(
    `*[_type == "leavePlan" && staff._ref == $staffId] | order(startDate asc) ${LEAVE_PROJECTION}`,
    { staffId },
  )
  return rows.flatMap(row => {
    const plan = toLeavePlan(row)
    return plan ? [plan] : []
  })
}

export async function getLeavePlan(id: string): Promise<LeavePlan | null> {
  const row = await writeClient.fetch<LeavePlanRow | null>(
    `*[_type == "leavePlan" && _id == $id][0] ${LEAVE_PROJECTION}`,
    { id },
  )
  return row ? toLeavePlan(row) : null
}

const RELIEF_HINTS: Record<string, string> = {
  assistant_commissioner: 'Choose a manager in your division.',
  manager: 'Choose a supervisor in your section.',
  supervisor: 'Choose an officer in your section.',
  officer: 'Choose another officer in your section.',
}

export async function listReliefStaffOptions(staffId: string | null): Promise<{
  options: LeaveReliefOption[]
  hint: string
}> {
  if (!staffId) return { options: [], hint: '' }

  const viewer = await client.fetch<{
    role: string | null
    sectionId: string | null
    divisionId: string | null
  } | null>(
    `*[_type == "staff" && _id == $staffId && coalesce(status, "active") == "active"][0]{
      role,
      "sectionId": section._ref,
      "divisionId": coalesce(
        division._ref,
        *[_type == "division" && assistantCommissioner._ref == $staffId][0]._id
      )
    }`,
    { staffId },
  )

  const hint = RELIEF_HINTS[viewer?.role ?? ''] ?? ''
  if (!viewer?.role || !hint) return { options: [], hint: '' }

  const scope =
    viewer.role === 'assistant_commissioner'
      ? viewer.divisionId
        ? {
            filter: `role == "manager" && section._ref in *[_type == "section" && division._ref == $divisionId]._id`,
            params: { divisionId: viewer.divisionId },
          }
        : null
      : viewer.sectionId
        ? {
            filter:
              viewer.role === 'manager'
                ? `role == "supervisor" && section._ref == $sectionId`
                : `role == "officer" && section._ref == $sectionId`,
            params: { sectionId: viewer.sectionId },
          }
        : null

  if (!scope) return { options: [], hint }

  const rows = await client.fetch<
    { id: string; name: string | null; role: string | null }[]
  >(
    `*[_type == "staff" && coalesce(status, "active") == "active" && _id != $staffId && ${scope.filter}] | order(coalesce(fullName, firstName + " " + lastName) asc) {
      "id": _id,
      "name": coalesce(fullName, firstName + " " + lastName),
      role
    }`,
    { staffId, ...scope.params },
  )

  return {
    hint,
    options: rows.flatMap(row => {
      const name = row.name?.trim()
      if (!row.id || !name) return []
      return [{ id: row.id, name, role: row.role?.trim() || '' }]
    }),
  }
}

export async function reliefStaffError(input: {
  staffId: string
  reliefStaffId: string
}): Promise<string | null> {
  const { options } = await listReliefStaffOptions(input.staffId)
  if (!options.some(option => option.id === input.reliefStaffId)) {
    return 'Choose a relief person from your reporting line.'
  }
  return null
}

export async function createLeavePlan(input: {
  staffId: string
  reliefStaffId: string
  startDate: string
  endDate: string
  status: LeaveStatus
  kind: LeaveKind
  note: string
}): Promise<LeavePlan> {
  const created = await writeClient.create({
    _type: 'leavePlan',
    staff: { _type: 'reference', _ref: input.staffId },
    reliefStaff: { _type: 'reference', _ref: input.reliefStaffId },
    startDate: input.startDate,
    endDate: input.endDate,
    status: input.status,
    kind: input.kind,
    note: input.note,
  })
  const plan = await getLeavePlan(created._id)
  if (!plan) throw new Error('Leave plan was saved but could not be read back')
  return plan
}

export async function updateLeavePlan(
  id: string,
  patch: Partial<
    Pick<LeavePlan, 'startDate' | 'endDate' | 'status' | 'kind' | 'note'>
  > & { reliefStaffId?: string },
): Promise<LeavePlan | null> {
  const existing = await getLeavePlan(id)
  if (!existing) return null
  await writeClient
    .patch(id)
    .set({
      ...(patch.startDate ? { startDate: patch.startDate } : {}),
      ...(patch.endDate ? { endDate: patch.endDate } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.kind ? { kind: patch.kind } : {}),
      ...(patch.note !== undefined ? { note: patch.note } : {}),
      ...(patch.reliefStaffId
        ? {
            reliefStaff: { _type: 'reference' as const, _ref: patch.reliefStaffId },
          }
        : {}),
    })
    .commit()
  return getLeavePlan(id)
}

export async function deleteLeavePlan(id: string): Promise<boolean> {
  const existing = await getLeavePlan(id)
  if (!existing) return false
  await writeClient.delete(id)
  return true
}
