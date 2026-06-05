import 'server-only'

import { notFound, redirect } from 'next/navigation'

import { ManagerEmptyState } from '@/features/manager/manager-empty-state'
import { loadPrimaryManagerWorkspaceData } from '@/features/manager/load-primary-manager-workspace'
import { loadPrimaryOfficerWorkspaceData } from '@/features/manager/load-primary-officer-workspace'
import { parseWorkContextParam } from '@/features/delegation/parse-work-context'
import { WorkspaceDelegationShell } from '@/features/delegation/workspace-delegation-shell'
import { getAppRole } from '@/lib/clerk-app-role.server'
import type { ProjectRole } from '@/lib/project-role'
import {
  buildProjectWorkspaceBasePath,
  parseProjectRoleFromPathSegment,
} from '@/lib/project-workspace-paths'
import { ensureProjectWorkspaceSession } from '@/lib/workspace-session.server'
import { assertProjectWorkspaceRoute } from '@/lib/workspace-redirect.server'
import { getProjectBySlug } from '@/sanity/lib/projects/get-project-by-id'

export type ProjectRoleWorkspaceView =
  | 'dashboard'
  | 'contract'
  | 'sprints'
  | 'stakeholders'
  | 'staff'
  | 'reporting'

interface ProjectRoleWorkspacePageProps {
  projectSlug: string
  roleSegment: string
  view: ProjectRoleWorkspaceView
  searchParams: Promise<{
    workContext?: string | string[]
    tab?: string | string[]
  }>
  sprintView?: 'ready' | 'in-review' | 'draft'
  sprintReviewLabel?: string
}

export async function ProjectRoleWorkspacePage({
  projectSlug,
  roleSegment,
  view,
  searchParams,
  sprintView,
  sprintReviewLabel,
}: ProjectRoleWorkspacePageProps) {
  const role = parseProjectRoleFromPathSegment(roleSegment)
  if (!role) notFound()

  const project = await getProjectBySlug(projectSlug)
  if (!project || project.status === 'archived') notFound()

  if (!(await ensureProjectWorkspaceSession(project._id))) {
    redirect('/workspace/projects')
  }

  await assertProjectWorkspaceRoute(roleSegment, projectSlug)

  const workspaceBasePath = buildProjectWorkspaceBasePath(projectSlug, role)
  const sp = await searchParams
  const workContext = parseWorkContextParam(sp.workContext)

  if (role === 'workstream_member') {
    const data = await loadPrimaryOfficerWorkspaceData({ workContext })
    if (!data) return <ManagerEmptyState variant='project' />
    return (
      <WorkspaceDelegationShell
        {...data}
        orgActingAsDelegatee={data.orgActingAsDelegatee ?? null}
        view={view}
        workspaceBasePath={workspaceBasePath}
        sprintView={sprintView}
      />
    )
  }

  const data = await loadPrimaryManagerWorkspaceData({ workContext })
  if (!data) return <ManagerEmptyState variant='project' />

  const hideSprintReview =
    role === 'project_manager' ||
    role === 'deputy_project_manager' ||
    role === 'workstream_lead'
  const reviewLabel =
    sprintReviewLabel ?? (role === 'workstream_lead' ? 'In Review' : 'To Review')
  return (
    <WorkspaceDelegationShell
      {...data}
      orgActingAsDelegatee={data.orgActingAsDelegatee ?? null}
      view={view}
      workspaceBasePath={workspaceBasePath}
      sprintView={sprintView}
      sprintReviewLabel={reviewLabel}
        hideSprintReviewTab={hideSprintReview}
      />
  )
}
