import type { SectionAccess } from '@/lib/section-access'
import type { WeeklySprint } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

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

export function filterSprintsForSupervisor(
  sprints: WeeklySprint[],
  supervisorStaffId: string | null | undefined,
): WeeklySprint[] {
  if (!supervisorStaffId) return sprints
  return sprints.filter(sprint => sprint.supervisor?._id === supervisorStaffId)
}

export function filterSprintsForOfficer(
  sprints: WeeklySprint[],
  officerStaffId: string | null | undefined,
): WeeklySprint[] {
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

export function scopeSprintsForViewer(
  sprints: WeeklySprint[],
  access: SectionAccess,
): WeeklySprint[] {
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
