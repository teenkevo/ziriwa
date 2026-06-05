import type { InitiativeWithActivities } from '@/lib/flatten-initiatives-with-activities'

export function supervisorSprintInitiativesKey(
  sectionId: string,
  supervisorStaffId: string,
): string {
  return `${sectionId}:${supervisorStaffId}`
}

export function getSupervisorSprintInitiatives(
  map: Record<string, InitiativeWithActivities[]>,
  sectionId: string,
  supervisorStaffId: string,
): InitiativeWithActivities[] {
  return map[supervisorSprintInitiativesKey(sectionId, supervisorStaffId)] ?? []
}
