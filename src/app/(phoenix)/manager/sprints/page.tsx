import { redirect } from 'next/navigation'
import { getAppRole } from '@/lib/clerk-app-role.server'
import { ManagerWorkspaceContent } from '@/features/manager/manager-workspace-content'
import { ManagerEmptyState } from '@/features/manager/manager-empty-state'
import { loadPrimaryManagerWorkspaceData } from '@/features/manager/load-primary-manager-workspace'

type SprintsPageProps = {
  searchParams?: Promise<{
    tab?: string | string[]
  }>
}

const TAB_TO_VIEW = {
  ready: 'ready',
  'to-review': 'in-review',
  drafts: 'draft',
} as const

type SprintTab = keyof typeof TAB_TO_VIEW

function parseSprintTab(value: string | string[] | undefined): SprintTab | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === 'ready' || raw === 'to-review' || raw === 'drafts') return raw
  return null
}

export default async function ManagerSprintsPage({
  searchParams,
}: SprintsPageProps) {
  const params = await searchParams
  const tab = parseSprintTab(params?.tab)

  if (!tab) {
    redirect('/manager/sprints?tab=ready')
  }

  const [data, role] = await Promise.all([
    loadPrimaryManagerWorkspaceData(),
    getAppRole(),
  ])
  if (!data) return <ManagerEmptyState />

  return (
    <ManagerWorkspaceContent
      {...data}
      view='sprints'
      sprintView={TAB_TO_VIEW[tab]}
      sprintReviewLabel={role === 'supervisor' ? 'In Review' : 'To Review'}
    />
  )
}
