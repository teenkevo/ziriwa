import { ManagerWorkspaceContent } from '@/features/manager/manager-workspace-content'
import { ManagerEmptyState } from '@/features/manager/manager-empty-state'
import { loadPrimaryManagerWorkspaceData } from '@/features/manager/load-primary-manager-workspace'

export default async function Page() {
  const data = await loadPrimaryManagerWorkspaceData()
  if (!data) return <ManagerEmptyState />

  return <ManagerWorkspaceContent {...data} view='stakeholders' />
}
