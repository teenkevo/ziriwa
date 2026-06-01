'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useRouter } from 'next/navigation'

import { WorkContextNavigationProvider } from '@/contexts/work-context-navigation-context'
import type { AssistantCommissionerWorkspaceContext } from '@/lib/assistant-commissioner-workspace.server'
import type { CommissionerWorkspaceContext } from '@/lib/commissioner-workspace.server'
import { canCreateSelfServiceDelegation } from '@/lib/role-delegation'
import { SelfServiceDelegationDialog } from '@/features/delegation/self-service-delegation-dialog'
import { WorkContextBar } from '@/features/delegation/work-context-bar'

type OrgWorkspaceContext =
  | AssistantCommissionerWorkspaceContext
  | CommissionerWorkspaceContext

function actingRoleLabel(ctx: OrgWorkspaceContext) {
  if (
    'isPermanentAssistantCommissioner' in ctx &&
    ctx.isPermanentAssistantCommissioner
  ) {
    return 'assistant commissioner'
  }
  if ('isPermanentCommissioner' in ctx && ctx.isPermanentCommissioner) {
    return 'commissioner'
  }
  return 'role'
}

function buildCreatePayload(ctx: OrgWorkspaceContext): Record<string, string> {
  if ('isPermanentCommissioner' in ctx) {
    return {
      scope: 'department',
      departmentId: ctx.department._id,
    }
  }
  return {
    scope: 'division',
    divisionId: ctx.division._id,
  }
}

interface OrgDelegationShellProps {
  workspace: OrgWorkspaceContext
  children: React.ReactNode
}

export function OrgDelegationShell({
  workspace,
  children,
}: OrgDelegationShellProps) {
  const router = useRouter()
  const [delegateOpen, setDelegateOpen] = React.useState(false)

  const refresh = () => router.refresh()
  const createPayload = buildCreatePayload(workspace)

  const crossWorkspaceActingHref = React.useMemo(() => {
    if (workspace.workContext !== 'own') return null
    const acting = workspace.delegation.assignmentAsDelegatee
    if (!acting) return null
    if (acting.actingRole === 'commissioner') {
      return '/commissioner/dashboard?workContext=acting'
    }
    return null
  }, [workspace])

  const crossWorkspaceActingLabel = workspace.delegation.assignmentAsDelegatee
    ? `Acting as commissioner for ${workspace.delegation.assignmentAsDelegatee.fromStaffName}`
    : null

  const actingForName =
    workspace.delegation.assignmentAsDelegatee?.fromStaffName ?? null

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
      <WorkContextNavigationProvider
        serverWorkContext={workspace.workContext}
        actingForName={actingForName}
      >
        <Suspense fallback={null}>
          <WorkContextBar
            workContext={workspace.workContext}
            assignmentAsDelegatee={workspace.delegation.assignmentAsDelegatee}
            assignmentAsAbsent={workspace.delegation.assignmentAsAbsent}
            canSelfServiceDelegate={canCreateSelfServiceDelegation({
              roleAllowsDelegation: workspace.canSelfServiceDelegate,
              workContext: workspace.workContext,
              assignmentAsDelegatee: workspace.delegation.assignmentAsDelegatee,
              assignmentAsAbsent: workspace.delegation.assignmentAsAbsent,
            })}
            onOpenDelegate={() => setDelegateOpen(true)}
            cancelApiBase='/api/org-role-delegations'
            crossWorkspaceActingHref={crossWorkspaceActingHref}
            crossWorkspaceActingLabel={crossWorkspaceActingLabel}
          />
        </Suspense>

        <SelfServiceDelegationDialog
          open={delegateOpen}
          onOpenChange={setDelegateOpen}
          actingRoleLabel={actingRoleLabel(workspace)}
          candidates={workspace.delegationCandidates}
          createPayload={createPayload}
          apiPath='/api/org-role-delegations'
          onSuccess={refresh}
        />

        {children}
      </WorkContextNavigationProvider>
    </div>
  )
}
