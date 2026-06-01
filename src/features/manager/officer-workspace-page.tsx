import { redirect } from 'next/navigation'

import { ManagerEmptyState } from '@/features/manager/manager-empty-state'
import { loadPrimaryOfficerWorkspaceData } from '@/features/manager/load-primary-officer-workspace'
import { parseWorkContextParam } from '@/features/delegation/parse-work-context'
import { WorkspaceDelegationShell } from '@/features/delegation/workspace-delegation-shell'
import { getAppRole } from '@/lib/clerk-app-role.server'

type OfficerWorkspaceView =
  | 'dashboard'
  | 'contract'
  | 'sprints'
  | 'stakeholders'
  | 'reporting'

export async function OfficerWorkspacePage({
  view,
  searchParams,
}: {
  view: OfficerWorkspaceView
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  const role = await getAppRole()
  if (role === 'assistant_commissioner') {
    redirect('/assistant-commissioner/dashboard')
  }
  if (role === 'commissioner') {
    redirect('/commissioner/dashboard')
  }
  if (role === 'manager' || role === 'supervisor') {
    redirect('/manager/dashboard')
  }

  const sp = await searchParams
  const workContext = parseWorkContextParam(sp.workContext)
  const data = await loadPrimaryOfficerWorkspaceData({ workContext })
  if (!data) return <ManagerEmptyState />

  return (
    <WorkspaceDelegationShell
      {...data}
      view={view}
      workspaceBasePath='/officer'
    />
  )
}
