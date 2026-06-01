'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useRouter } from 'next/navigation'

import type { SectionPageContentProps } from '@/features/sections/section-page-content'
import { ManagerWorkspaceContent } from '@/features/manager/manager-workspace-content'
import type { WorkspaceBasePath } from '@/lib/workspace-paths'
import type { DelegationCandidate } from '@/lib/role-delegation'
import type { WorkContextMode } from '@/lib/section-access'
import { SelfServiceDelegationDialog } from '@/features/delegation/self-service-delegation-dialog'
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
}

function actingRoleLabel(access: WorkspaceData['sectionAccess']) {
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
  ...rest
}: WorkspaceDelegationShellProps) {
  const router = useRouter()
  const [delegateOpen, setDelegateOpen] = React.useState(false)

  const refresh = () => router.refresh()

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <Suspense fallback={null}>
        <WorkContextBar
          workContext={workContext}
          assignmentAsDelegatee={
            sectionAccess.delegation.assignmentAsDelegatee
          }
          assignmentAsAbsent={sectionAccess.delegation.assignmentAsAbsent}
          canSelfServiceDelegate={
            sectionAccess.canSelfServiceDelegate &&
            workContext === 'own' &&
            !sectionAccess.delegation.assignmentAsAbsent
          }
          onOpenDelegate={() => setDelegateOpen(true)}
        />
      </Suspense>

      <SelfServiceDelegationDialog
        open={delegateOpen}
        onOpenChange={setDelegateOpen}
        sectionId={section._id}
        actingRoleLabel={actingRoleLabel(sectionAccess)}
        candidates={delegationCandidates}
        onSuccess={refresh}
      />

      <ManagerWorkspaceContent
        {...rest}
        section={section}
        sectionAccess={sectionAccess}
        view={view}
        workspaceBasePath={workspaceBasePath}
      />
    </div>
  )
}
