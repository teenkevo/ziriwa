'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useRouter } from 'next/navigation'

import { WorkContextNavigationProvider } from '@/contexts/work-context-navigation-context'
import type { SectionPageContentProps } from '@/features/sections/section-page-content'
import { ManagerWorkspaceContent } from '@/features/manager/manager-workspace-content'
import type { WorkspaceBasePath } from '@/lib/workspace-paths'
import type { DelegationCandidate } from '@/lib/role-delegation'
import type { OrgDelegationRecord } from '@/lib/org-role-delegation.server'
import {
  canCreateSelfServiceDelegation,
  canRedelegatePlanningContractWork,
  isPlanningContractSupportAssignment,
} from '@/lib/role-delegation'
import type { WorkContextMode } from '@/lib/section-access'
import { useRegisterDelegationSidebar } from '@/contexts/delegation-sidebar-context'
import { SelfServiceDelegationDialog } from '@/features/delegation/self-service-delegation-dialog'
import { PlanningContractSupportDialog } from '@/features/delegation/planning-contract-support-dialog'
import { WorkContextBar } from '@/features/delegation/work-context-bar'

type WorkspaceData = SectionPageContentProps & {
  workContext: WorkContextMode
  delegationCandidates: DelegationCandidate[]
}

type ManagerWorkspaceView =
  | 'dashboard'
  | 'contract'
  | 'sprints'
  | 'stakeholders'
  | 'staff'
  | 'reporting'

interface WorkspaceDelegationShellProps extends WorkspaceData {
  view: ManagerWorkspaceView
  workspaceBasePath: WorkspaceBasePath
  sprintView?: 'ready' | 'in-review' | 'draft'
  sprintReviewLabel?: string
  hideSprintReviewTab?: boolean
  orgActingAsDelegatee?: OrgDelegationRecord | null
}

function leaveActingRoleLabel(access: WorkspaceData['sectionAccess']) {
  if (access.isPermanentOfficer) return 'officer'
  if (access.isPermanentSupervisor) return 'supervisor'
  if (access.isPermanentManager) return 'manager'
  return 'role'
}

export function WorkspaceDelegationShell({
  view,
  workspaceBasePath,
  workContext,
  delegationCandidates,
  sectionAccess,
  section,
  orgActingAsDelegatee = null,
  sprintView,
  sprintReviewLabel,
  hideSprintReviewTab,
  ...rest
}: WorkspaceDelegationShellProps) {
  const router = useRouter()
  const [leaveOpen, setLeaveOpen] = React.useState(false)
  const [contractSupportOpen, setContractSupportOpen] = React.useState(false)

  const refresh = () => router.refresh()
  const openLeave = React.useCallback(() => setLeaveOpen(true), [])
  const openContractSupport = React.useCallback(
    () => setContractSupportOpen(true),
    [],
  )

  const canRedelegatePlanningContract = canRedelegatePlanningContractWork({
    isPlanningSection: sectionAccess.isPlanningSection,
    isPermanentSupervisor: sectionAccess.isPermanentSupervisor,
    assignmentAsDelegatee: sectionAccess.delegation.assignmentAsDelegatee,
  })

  // Planning AC uses org leave + AC contract-page support — not section leave.
  const isPlanningAc =
    sectionAccess.isPlanningSection && sectionAccess.isPermanentManager
  const canSelfServiceLeave =
    !isPlanningAc &&
    canCreateSelfServiceDelegation({
      roleAllowsDelegation: sectionAccess.canSelfServiceDelegate,
      workContext,
      assignmentAsDelegatee: sectionAccess.delegation.assignmentAsDelegatee,
      assignmentAsAbsent: sectionAccess.delegation.assignmentAsAbsent,
      hasOtherScopeActingAssignment: Boolean(orgActingAsDelegatee),
    })

  useRegisterDelegationSidebar(
    canSelfServiceLeave || canRedelegatePlanningContract,
    canRedelegatePlanningContract ? openContractSupport : openLeave,
  )

  const crossWorkspaceActingHref = React.useMemo(() => {
    if (!orgActingAsDelegatee || sectionAccess.workContext !== 'own') {
      return null
    }
    if (orgActingAsDelegatee.actingRole === 'assistant_commissioner') {
      return '/assistant-commissioner/dashboard?workContext=acting'
    }
    if (orgActingAsDelegatee.actingRole === 'commissioner') {
      return '/commissioner/dashboard?workContext=acting'
    }
    return null
  }, [orgActingAsDelegatee, sectionAccess.workContext])

  const crossWorkspaceActingLabel = orgActingAsDelegatee
    ? `Acting as ${orgActingAsDelegatee.actingRole.replace('_', ' ')} for ${orgActingAsDelegatee.fromStaffName}`
    : null

  const actingForName =
    sectionAccess.delegation.assignmentAsDelegatee?.fromStaffName ?? null

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <WorkContextNavigationProvider
        serverWorkContext={workContext}
        actingForName={actingForName}
      >
        <Suspense fallback={null}>
          <WorkContextBar
            workContext={workContext}
            assignmentAsDelegatee={
              sectionAccess.delegation.assignmentAsDelegatee
            }
            assignmentAsAbsent={sectionAccess.delegation.assignmentAsAbsent}
            crossWorkspaceActingHref={crossWorkspaceActingHref}
            crossWorkspaceActingLabel={crossWorkspaceActingLabel}
            hideActingSwitcher={isPlanningContractSupportAssignment(
              sectionAccess.isPlanningSection,
              sectionAccess.delegation.assignmentAsDelegatee,
            )}
          />
        </Suspense>

        <SelfServiceDelegationDialog
          open={leaveOpen}
          onOpenChange={setLeaveOpen}
          actingRoleLabel={leaveActingRoleLabel(sectionAccess)}
          candidates={delegationCandidates}
          createPayload={{ sectionId: section._id }}
          onSuccess={refresh}
        />

        <PlanningContractSupportDialog
          open={contractSupportOpen}
          onOpenChange={setContractSupportOpen}
          candidates={delegationCandidates}
          sectionId={section._id}
          mode='supervisor-to-officer'
          parentWindow={
            sectionAccess.delegation.assignmentAsDelegatee
              ? {
                  startDate:
                    sectionAccess.delegation.assignmentAsDelegatee.startDate,
                  endDate:
                    sectionAccess.delegation.assignmentAsDelegatee.endDate,
                }
              : null
          }
          onSuccess={refresh}
        />

        <ManagerWorkspaceContent
          {...rest}
          section={section}
          sectionAccess={sectionAccess}
          workContext={workContext}
          view={view}
          workspaceBasePath={workspaceBasePath}
          sprintView={sprintView}
          sprintReviewLabel={sprintReviewLabel}
          hideSprintReviewTab={hideSprintReviewTab}
          onOpenPlanningContractDelegate={
            canRedelegatePlanningContract ? openContractSupport : undefined
          }
        />
      </WorkContextNavigationProvider>
    </div>
  )
}
