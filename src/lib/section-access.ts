import type { AppRole } from '@/lib/app-role'

export interface SectionAccessInput {
  viewerStaffId: string | null
  sectionManagerId: string | null
  supervisorIds: string[]
  appRole: AppRole | null
}

/** Section-scoped capabilities for contract, detailed tasks, and sprints. */
export interface SectionAccess {
  viewerStaffId: string | null
  isSectionManager: boolean
  isSectionSupervisor: boolean
  isSectionOfficer: boolean
  /** SSMARTA objectives, initiatives, measurable activities (structure). */
  canManageContract: boolean
  /** Detailed tasks: priority, assignee, approve/reject inputs & deliverables. */
  canSuperviseDetailedTasks: boolean
  canCreateSprints: boolean
  canViewSprintDraftTab: boolean
  canViewSprintInReviewTab: boolean
}

export function buildSectionAccess(input: SectionAccessInput): SectionAccess {
  const isSectionManager = Boolean(
    input.viewerStaffId &&
      input.sectionManagerId &&
      input.viewerStaffId === input.sectionManagerId,
  )
  const isSectionSupervisor = Boolean(
    input.viewerStaffId && input.supervisorIds.includes(input.viewerStaffId),
  )
  const isSectionOfficer =
    input.appRole === 'officer' &&
    Boolean(input.viewerStaffId) &&
    !isSectionManager &&
    !isSectionSupervisor

  return {
    viewerStaffId: input.viewerStaffId,
    isSectionManager,
    isSectionSupervisor,
    isSectionOfficer,
    canManageContract: isSectionManager,
    canSuperviseDetailedTasks: isSectionSupervisor,
    canCreateSprints: isSectionSupervisor,
    canViewSprintDraftTab: isSectionSupervisor,
    canViewSprintInReviewTab: isSectionManager || isSectionSupervisor,
  }
}

export function canSubmitDetailedTaskWork(
  access: SectionAccess,
  taskAssigneeId: string | null | undefined,
): boolean {
  if (!access.viewerStaffId || !taskAssigneeId) return false
  return access.viewerStaffId === taskAssigneeId
}

/** Weekly sprint tab layout for the current viewer in this section. */
export type SprintUiMode = 'officer' | 'manager' | 'supervisor' | 'other'

export function getSprintUiMode(access: SectionAccess): SprintUiMode {
  if (access.isSectionSupervisor) return 'supervisor'
  if (access.isSectionManager) return 'manager'
  if (access.isSectionOfficer) return 'officer'
  return 'other'
}
