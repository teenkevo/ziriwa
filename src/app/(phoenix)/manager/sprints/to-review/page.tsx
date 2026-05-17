import { getAppRole } from '@/lib/clerk-app-role.server'
import { ManagerWorkspaceContent } from '@/features/manager/manager-workspace-content'
import { ManagerEmptyState } from '@/features/manager/manager-empty-state'
import { loadPrimaryManagerWorkspaceData } from '@/features/manager/load-primary-manager-workspace'

export default async function Page() {
  const [data, role] = await Promise.all([
    loadPrimaryManagerWorkspaceData(),
    getAppRole(),
  ])
  if (!data) return <ManagerEmptyState />

  return (
    <ManagerWorkspaceContent
      {...data}
      view='sprints'
      sprintView='in-review'
      sprintReviewLabel={role === 'supervisor' ? 'In Review' : 'To Review'}
    />
  )
}
