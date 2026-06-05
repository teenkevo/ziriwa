import { redirect } from 'next/navigation'

import {
  ProjectRoleWorkspacePage,
  type ProjectRoleWorkspaceView,
} from '@/features/projects/project-role-workspace-page'
import { isProjectLeadershipRole } from '@/lib/project-role'
import { parseProjectRoleFromPathSegment } from '@/lib/project-workspace-paths'

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

interface ProjectViewPageProps {
  params: Promise<{ projectSlug: string; role: string }>
  searchParams: Promise<{
    workContext?: string | string[]
    tab?: string | string[]
  }>
  view: ProjectRoleWorkspaceView
}

export async function ProjectRoleViewPage({
  params,
  searchParams,
  view,
}: ProjectViewPageProps) {
  const { projectSlug, role } = await params
  return (
    <ProjectRoleWorkspacePage
      projectSlug={projectSlug}
      roleSegment={role}
      view={view}
      searchParams={searchParams}
    />
  )
}

export async function ProjectRoleSprintsPage({
  params,
  searchParams,
}: Omit<ProjectViewPageProps, 'view'>) {
  const { projectSlug, role } = await params
  const parsedRole = parseProjectRoleFromPathSegment(role)
  const sp = await searchParams
  let tab = parseSprintTab(sp.tab)
  const base = `/projects/${encodeURIComponent(projectSlug)}/${role}/sprints`

  if (parsedRole && isProjectLeadershipRole(parsedRole)) {
    if (tab && tab !== 'ready') {
      redirect(base)
    }
    return (
      <ProjectRoleWorkspacePage
        projectSlug={projectSlug}
        roleSegment={role}
        view='sprints'
        searchParams={searchParams}
        sprintView='ready'
      />
    )
  }

  if (!tab) {
    redirect(`${base}?tab=ready`)
  }

  const reviewLabel =
    parsedRole === 'workstream_lead' ? 'In Review' : 'To Review'

  return (
    <ProjectRoleWorkspacePage
      projectSlug={projectSlug}
      roleSegment={role}
      view='sprints'
      searchParams={searchParams}
      sprintView={TAB_TO_VIEW[tab]}
      sprintReviewLabel={reviewLabel}
    />
  )
}
