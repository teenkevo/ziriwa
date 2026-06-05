import type { AppRole } from '@/lib/app-role'
import type { SectionActingRole } from '@/lib/role-delegation'
import type { SectionDelegationRecord } from '@/lib/section-delegation.server'

export type WorkContextMode = 'own' | 'acting'

export interface SectionDelegationState {
  /** Viewer is covering someone else's duties (at most one). */
  assignmentAsDelegatee: SectionDelegationRecord | null
  /** Someone is covering the viewer's duties while away. */
  assignmentAsAbsent: SectionDelegationRecord | null
}

export interface SectionAccessInput {
  viewerStaffId: string | null
  sectionManagerId: string | null
  supervisorIds: string[]
  officerIds: string[]
  appRole: AppRole | null
  isGlobalAdmin?: boolean
  /** Section belongs to a project (workstream); sprint review tab is hidden. */
  isProjectWorkstream?: boolean
  delegation?: SectionDelegationState
}

/** Section-scoped capabilities for contract, detailed tasks, and sprints. */
export interface SectionAccess {
  viewerStaffId: string | null
  workContext: WorkContextMode
  delegation: SectionDelegationState
  isPermanentManager: boolean
  isPermanentSupervisor: boolean
  isPermanentOfficer: boolean
  isSectionManager: boolean
  isSectionSupervisor: boolean
  isSectionOfficer: boolean
  /** When acting as officer, the absent officer's staff id for contract/sprint scope. */
  officerContextStaffId: string | null
  /** When acting as supervisor, the absent supervisor's staff id for contract scope. */
  supervisorContextStaffId: string | null
  canManageContract: boolean
  canOnboardContract: boolean
  canManageSupervisorContract: boolean
  canManageOfficerContract: boolean
  canSuperviseDetailedTasks: boolean
  canCreateSprints: boolean
  canViewSprintDraftTab: boolean
  canViewSprintInReviewTab: boolean
  canManageSectionStaff: boolean
  /** Project workstream lead: add workstream members to their workstream only. */
  canManageWorkstreamStaff: boolean
  canSelfServiceDelegate: boolean
  isGlobalAdmin: boolean
}

function permanentFlags(input: SectionAccessInput) {
  const viewerStaffId = input.viewerStaffId
  const isPermanentManager = Boolean(
    viewerStaffId &&
      input.sectionManagerId &&
      viewerStaffId === input.sectionManagerId,
  )
  const isPermanentSupervisor = Boolean(
    viewerStaffId &&
      !isPermanentManager &&
      (input.supervisorIds.includes(viewerStaffId) ||
        (input.appRole === 'supervisor' && !input.isProjectWorkstream)),
  )
  const isPermanentOfficer = Boolean(
    viewerStaffId &&
      !isPermanentManager &&
      !isPermanentSupervisor &&
      (input.officerIds.includes(viewerStaffId) ||
        (input.appRole === 'officer' && !input.isProjectWorkstream)),
  )
  return { isPermanentManager, isPermanentSupervisor, isPermanentOfficer }
}

function capabilitiesFromRoles(flags: {
  isSectionManager: boolean
  isSectionSupervisor: boolean
  isSectionOfficer: boolean
  officerContextStaffId: string | null
  supervisorContextStaffId: string | null
  isGlobalAdmin: boolean
  canManageSectionStaff: boolean
  canSelfServiceDelegate: boolean
  isProjectWorkstream?: boolean
}): Pick<
  SectionAccess,
  | 'canManageContract'
  | 'canOnboardContract'
  | 'canManageSupervisorContract'
  | 'canManageOfficerContract'
  | 'canSuperviseDetailedTasks'
  | 'canCreateSprints'
  | 'canViewSprintDraftTab'
  | 'canViewSprintInReviewTab'
  | 'canManageSectionStaff'
  | 'canManageWorkstreamStaff'
> {
  const {
    isSectionManager,
    isSectionSupervisor,
    isSectionOfficer,
    isGlobalAdmin,
    canManageSectionStaff,
  } = flags

  const isProjectWorkstream = flags.isProjectWorkstream === true

  return {
    canManageContract: isSectionManager,
    canOnboardContract: isSectionManager,
    canManageSupervisorContract:
      isSectionSupervisor && !isSectionManager,
    canManageOfficerContract: isSectionOfficer,
    canSuperviseDetailedTasks: isSectionSupervisor,
    canCreateSprints: isSectionSupervisor,
    canViewSprintDraftTab: isSectionSupervisor,
    canViewSprintInReviewTab:
      !isProjectWorkstream && (isSectionManager || isSectionSupervisor),
    canManageSectionStaff: isGlobalAdmin || canManageSectionStaff,
    canManageWorkstreamStaff:
      isGlobalAdmin ||
      (isProjectWorkstream && isSectionSupervisor && !isSectionManager),
  }
}

export function buildSectionAccessForWorkContext(
  input: SectionAccessInput,
  workContext: WorkContextMode,
): SectionAccess {
  const delegation = input.delegation ?? {
    assignmentAsDelegatee: null,
    assignmentAsAbsent: null,
  }

  if (input.isGlobalAdmin) {
    return {
      viewerStaffId: input.viewerStaffId,
      workContext,
      delegation,
      isPermanentManager: true,
      isPermanentSupervisor: true,
      isPermanentOfficer: false,
      isSectionManager: true,
      isSectionSupervisor: true,
      isSectionOfficer: false,
      officerContextStaffId: null,
      supervisorContextStaffId: null,
      canManageContract: true,
      canOnboardContract: true,
      canManageSupervisorContract: true,
      canManageOfficerContract: true,
      canSuperviseDetailedTasks: true,
      canCreateSprints: true,
      canViewSprintDraftTab: true,
      canViewSprintInReviewTab: true,
      canManageSectionStaff: true,
      canManageWorkstreamStaff: true,
      canSelfServiceDelegate: false,
      isGlobalAdmin: true,
    }
  }

  const permanent = permanentFlags(input)
  const assignment = delegation.assignmentAsDelegatee

  if (workContext === 'acting' && assignment) {
    const actingRole = assignment.actingRole as SectionActingRole
    const isSectionManager = actingRole === 'manager'
    const isSectionSupervisor = actingRole === 'supervisor'
    const isSectionOfficer = actingRole === 'officer'
    const officerContextStaffId = isSectionOfficer
      ? assignment.fromStaffId
      : null
    const supervisorContextStaffId = isSectionSupervisor
      ? assignment.fromStaffId
      : null

    const roleFlags = {
      isSectionManager,
      isSectionSupervisor,
      isSectionOfficer,
      officerContextStaffId,
      supervisorContextStaffId,
      isGlobalAdmin: false,
      canManageSectionStaff: false,
      canSelfServiceDelegate: false,
      isProjectWorkstream: input.isProjectWorkstream,
    }

    return {
      viewerStaffId: input.viewerStaffId,
      workContext,
      delegation,
      ...permanent,
      ...roleFlags,
      ...capabilitiesFromRoles(roleFlags),
      canSelfServiceDelegate: false,
      isGlobalAdmin: false,
    }
  }

  const isSectionManager = permanent.isPermanentManager
  const isSectionSupervisor = permanent.isPermanentSupervisor
  const isSectionOfficer = permanent.isPermanentOfficer
  const canSelfServiceDelegate =
    permanent.isPermanentManager ||
    permanent.isPermanentSupervisor ||
    permanent.isPermanentOfficer

  const roleFlags = {
    isSectionManager,
    isSectionSupervisor,
    isSectionOfficer,
    officerContextStaffId: isSectionOfficer ? input.viewerStaffId : null,
    supervisorContextStaffId: isSectionSupervisor ? input.viewerStaffId : null,
    isGlobalAdmin: false,
    canManageSectionStaff: isSectionManager,
    canSelfServiceDelegate,
    isProjectWorkstream: input.isProjectWorkstream,
  }

  return {
    viewerStaffId: input.viewerStaffId,
    workContext: 'own',
    delegation,
    ...permanent,
    ...roleFlags,
    ...capabilitiesFromRoles(roleFlags),
    canSelfServiceDelegate,
    isGlobalAdmin: false,
  }
}

/** @deprecated Use buildSectionAccessForWorkContext — defaults to own work. */
export function buildSectionAccess(input: SectionAccessInput): SectionAccess {
  return buildSectionAccessForWorkContext(input, 'own')
}

export function canSubmitDetailedTaskWork(
  access: SectionAccess,
  taskAssigneeId: string | null | undefined,
): boolean {
  if (!access.viewerStaffId || !taskAssigneeId) return false
  const allowedIds = new Set(
    [access.viewerStaffId, access.officerContextStaffId].filter(Boolean),
  )
  return allowedIds.has(taskAssigneeId)
}

export type SprintUiMode = 'officer' | 'manager' | 'supervisor' | 'other'

export function getSprintUiMode(access: SectionAccess): SprintUiMode {
  if (access.isSectionSupervisor) return 'supervisor'
  if (access.isSectionManager) return 'manager'
  if (access.isSectionOfficer) return 'officer'
  return 'other'
}
