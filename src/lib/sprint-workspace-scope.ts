import type { SectionAccess } from '@/lib/section-access'
import type { WeeklySprint } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

type SprintLike = {
  status: WeeklySprint['status']
  supervisor?: { _id: string } | null
  tasks?: Array<{ assignee?: string | null }>
}

/** Supervisors who are not the section manager only see their own weekly sprints. */
export function shouldScopeSprintsToSupervisor(access: SectionAccess): boolean {
  return access.isSectionSupervisor && !access.isSectionManager
}

/** Officers see only non-draft sprints that include their assigned tasks. */
export function shouldScopeSprintsToOfficer(access: SectionAccess): boolean {
  return shouldUseOfficerContract(access)
}

/** Officers use their own contract, not the section manager's. */
export function shouldUseOfficerContract(access: SectionAccess): boolean {
  return access.isSectionOfficer && !access.isSectionManager
}

export function shouldUseSupervisorContract(access: SectionAccess): boolean {
  return shouldScopeSprintsToSupervisor(access)
}

export function filterSprintsForSupervisor<T extends SprintLike>(
  sprints: T[],
  supervisorStaffId: string | null | undefined,
): T[] {
  if (!supervisorStaffId) return sprints
  return sprints.filter(sprint => sprint.supervisor?._id === supervisorStaffId)
}

export function filterSprintsForOfficer<T extends SprintLike>(
  sprints: T[],
  officerStaffId: string | null | undefined,
): T[] {
  if (!officerStaffId) return []
  return sprints
    .filter(sprint => sprint.status !== 'draft')
    .map(sprint => ({
      ...sprint,
      tasks: (sprint.tasks ?? []).filter(
        task => task.assignee === officerStaffId,
      ),
    }))
    .filter(sprint => sprint.tasks.length > 0)
}

export function scopeSprintsForViewer<T extends SprintLike>(
  sprints: T[],
  access: SectionAccess,
): T[] {
  if (shouldScopeSprintsToSupervisor(access)) {
    return filterSprintsForSupervisor(
      sprints,
      access.supervisorContextStaffId ?? access.viewerStaffId,
    )
  }
  if (shouldScopeSprintsToOfficer(access)) {
    return filterSprintsForOfficer(
      sprints,
      access.officerContextStaffId ?? access.viewerStaffId,
    )
  }
  return sprints
}

/** Whether the viewer is the supervisor who owns this sprint. */
export function canSupervisorManageSprint(
  sprint: WeeklySprint,
  access: SectionAccess,
): boolean {
  if (!access.canCreateSprints) return false
  const effectiveSupervisorId =
    access.supervisorContextStaffId ?? access.viewerStaffId
  if (!effectiveSupervisorId) return false
  return sprint.supervisor?._id === effectiveSupervisorId
}
