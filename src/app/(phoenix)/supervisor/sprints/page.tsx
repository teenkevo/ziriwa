import { redirect } from 'next/navigation'

import { SupervisorWorkspacePage } from '@/features/manager/supervisor-workspace-page'
type SprintsPageProps = {
  searchParams: Promise<{
    tab?: string | string[]
    workContext?: string | string[]
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

export default async function SupervisorSprintsPage({
  searchParams,
}: SprintsPageProps) {
  const params = await searchParams
  const tab = parseSprintTab(params.tab)

  if (!tab) {
    redirect('/supervisor/sprints?tab=ready')
  }

  return (
    <SupervisorWorkspacePage
      view='sprints'
      searchParams={searchParams}
      sprintView={TAB_TO_VIEW[tab]}
    />
  )
}
