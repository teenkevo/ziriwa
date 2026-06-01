import type { AppRole } from '@/lib/app-role'

/** Roles that can be covered via section-scoped leave delegation (phase 1). */
export const SECTION_ACTING_ROLES = [
  'officer',
  'supervisor',
  'manager',
] as const

export type SectionActingRole = (typeof SECTION_ACTING_ROLES)[number]

export function isSectionActingRole(value: unknown): value is SectionActingRole {
  return (
    typeof value === 'string' &&
    SECTION_ACTING_ROLES.includes(value as SectionActingRole)
  )
}

/** Max inclusive calendar days for a single delegation window. */
export const DELEGATION_MAX_DAYS = 30

export const DELEGATION_STATUSES = [
  'scheduled',
  'active',
  'completed',
  'cancelled',
] as const

export type DelegationStatus = (typeof DELEGATION_STATUSES)[number]

/** Who may receive duties when the absent person holds `actingRole`. */
export const SECTION_DELEGATION_TARGETS: Record<
  SectionActingRole,
  readonly AppRole[]
> = {
  officer: ['officer'],
  supervisor: ['officer', 'supervisor'],
  manager: ['supervisor'],
}

export function delegationDayCount(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T00:00:00.000Z`)
  const ms = end.getTime() - start.getTime()
  return Math.floor(ms / 86_400_000) + 1
}

export function isDelegationWithinMaxDays(
  startDate: string,
  endDate: string,
): boolean {
  if (endDate < startDate) return false
  return delegationDayCount(startDate, endDate) <= DELEGATION_MAX_DAYS
}

export function computeDelegationStatus(
  startDate: string,
  endDate: string,
  today = new Date().toISOString().slice(0, 10),
): DelegationStatus {
  if (endDate < today) return 'completed'
  if (startDate <= today) return 'active'
  return 'scheduled'
}

export function datesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd
}

export function staffRoleMatchesActingRole(
  staffRole: string | undefined,
  actingRole: SectionActingRole,
): boolean {
  return staffRole === actingRole
}

export function canStaffReceiveDelegation(
  toStaffRole: string | undefined,
  actingRole: SectionActingRole,
): boolean {
  if (!toStaffRole) return false
  return SECTION_DELEGATION_TARGETS[actingRole].includes(toStaffRole as AppRole)
}

export interface DelegationCandidate {
  _id: string
  fullName: string
  role: string
}

/** Organisation-scoped acting roles (phase 2). */
export const ORG_ACTING_ROLES = [
  'assistant_commissioner',
  'commissioner',
] as const

export type OrgActingRole = (typeof ORG_ACTING_ROLES)[number]

export function isOrgActingRole(value: unknown): value is OrgActingRole {
  return (
    typeof value === 'string' &&
    ORG_ACTING_ROLES.includes(value as OrgActingRole)
  )
}

export const ORG_DELEGATION_TARGETS: Record<OrgActingRole, readonly AppRole[]> =
  {
    assistant_commissioner: ['manager'],
    commissioner: ['assistant_commissioner'],
  }

export function canStaffReceiveOrgDelegation(
  toStaffRole: string | undefined,
  actingRole: OrgActingRole,
): boolean {
  if (!toStaffRole) return false
  return ORG_DELEGATION_TARGETS[actingRole].includes(toStaffRole as AppRole)
}

export function staffRoleMatchesOrgActingRole(
  staffRole: string | undefined,
  actingRole: OrgActingRole,
): boolean {
  return staffRole === actingRole
}
