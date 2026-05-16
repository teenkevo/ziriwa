import type { AppRole } from '@/lib/app-role'

export interface SectionAccessInput {
  viewerStaffId: string | null
  sectionManagerId: string | null
  supervisorIds: string[]
  /** Staff acting as manager via active delegation. */
  actingManagerStaffIds?: string[]
  /** Staff acting as supervisor via active delegation. */
  actingSupervisorStaffIds?: string[]
  appRole: AppRole | null
  isGlobalAdmin?: boolean
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
  canManageSectionStaff: boolean
  /** Bootstrap / superadmin email or CG — full section capabilities. */
  isGlobalAdmin: boolean
}

export function buildSectionAccess(input: SectionAccessInput): SectionAccess {
  if (input.isGlobalAdmin) {
    return {
      viewerStaffId: input.viewerStaffId,
      isSectionManager: true,
      isSectionSupervisor: true,
      isSectionOfficer: false,
      canManageContract: true,
      canSuperviseDetailedTasks: true,
      canCreateSprints: true,
      canViewSprintDraftTab: true,
      canViewSprintInReviewTab: true,
      canManageSectionStaff: true,
      isGlobalAdmin: true,
    }
  }

  const actingManagers = input.actingManagerStaffIds ?? []
  const actingSupervisors = input.actingSupervisorStaffIds ?? []
  const isSectionManager = Boolean(
    input.viewerStaffId &&
      input.sectionManagerId &&
      (input.viewerStaffId === input.sectionManagerId ||
        actingManagers.includes(input.viewerStaffId)),
  )
  const isSectionSupervisor = Boolean(
    input.viewerStaffId &&
      (input.supervisorIds.includes(input.viewerStaffId) ||
        actingSupervisors.includes(input.viewerStaffId)),
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
    canManageSectionStaff: isSectionManager,
    isGlobalAdmin: false,
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
