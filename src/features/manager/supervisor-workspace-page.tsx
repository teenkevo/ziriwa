import { redirect } from 'next/navigation'

import { ManagerEmptyState } from '@/features/manager/manager-empty-state'
import { loadPrimaryManagerWorkspaceData } from '@/features/manager/load-primary-manager-workspace'
import { parseWorkContextParam } from '@/features/delegation/parse-work-context'
import { WorkspaceDelegationShell } from '@/features/delegation/workspace-delegation-shell'
import { getAppRole } from '@/lib/clerk-app-role.server'

type SupervisorWorkspaceView =
  | 'dashboard'
  | 'contract'
  | 'sprints'
  | 'stakeholders'
  | 'staff'
  | 'reporting'

export async function SupervisorWorkspacePage({
  view,
  searchParams,
  sprintView,
}: {
  view: SupervisorWorkspaceView
  searchParams: Promise<{
    workContext?: string | string[]
    tab?: string | string[]
  }>
  sprintView?: 'ready' | 'in-review' | 'draft'
}) {
  const role = await getAppRole()
  if (role === 'manager') {
    redirect('/manager/dashboard')
  }
  if (role === 'officer') {
    redirect('/officer/dashboard')
  }

  const sp = await searchParams
  const workContext = parseWorkContextParam(sp.workContext)
  const data = await loadPrimaryManagerWorkspaceData({ workContext })
  if (!data) return <ManagerEmptyState />

  return (
    <WorkspaceDelegationShell
      {...data}
      orgActingAsDelegatee={data.orgActingAsDelegatee ?? null}
      view={view}
      workspaceBasePath='/supervisor'
      sprintView={sprintView}
      sprintReviewLabel='In Review'
    />
  )
}
