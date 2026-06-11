import { getDepartmentsWithDivisionsForSidebar } from '@/sanity/lib/departments/get-departments-with-divisions-for-sidebar'
import { AppSidebarNav } from '@/components/app-sidebar-nav'
import type { SidebarSection } from '@/components/app-sidebar-nav'
import { getAssistantCommissionerDivision } from '@/lib/assistant-commissioner.server'
import { getAppRole } from '@/lib/clerk-app-role.server'
import {
  canUseSuperadminPowers,
  getEffectiveViewerEmail,
} from '@/lib/impersonation/viewer-context.server'
import { client } from '@/sanity/lib/client'
import { getProjectMembershipForViewer } from '@/lib/project-access.server'
import { getSprintNavCountsForViewer } from '@/lib/sprint-nav-counts.server'
import { buildProjectAdminBasePath } from '@/lib/project-workspace-paths'
import { projectRoleToWorkspaceBasePath } from '@/lib/project-role'
import { getProjectWorkspaceContext } from '@/lib/workspace-mode.server'
import { getProjectSlugById } from '@/sanity/lib/projects/get-project-by-id'

export async function AppSidebarNavWrapper() {
  const role = await getAppRole()
  const departmentsTree = await getDepartmentsWithDivisionsForSidebar()
  const useFallbackExplorer = await canUseSuperadminPowers()
  const { isProjects, projectId } = await getProjectWorkspaceContext()
  const hideSprintReviewTab = isProjects

  if (isProjects && projectId) {
    const slug = await getProjectSlugById(projectId)
    if (slug && useFallbackExplorer) {
      return (
        <AppSidebarNav
          departmentsTree={departmentsTree}
          variant='project-admin'
          workspaceBasePath={buildProjectAdminBasePath(slug)}
        />
      )
    }

    const [membership, sprintNavCounts] = await Promise.all([
      getProjectMembershipForViewer(projectId),
      getSprintNavCountsForViewer(),
    ])

    if (membership && slug) {
      const workspaceBasePath = projectRoleToWorkspaceBasePath(
        slug,
        membership.role,
      )
      if (membership.role === 'project_manager') {
        return (
          <AppSidebarNav
            departmentsTree={departmentsTree}
            variant='manager'
            workspaceBasePath={workspaceBasePath}
            managerSprintsReviewLabel='To Review'
            sprintNavCounts={sprintNavCounts}
            hideSprintReviewTab
            showWorkstreamsNav
            useProjectMembersNav
            sprintsNavMode='ready-only'
          />
        )
      }
      if (membership.role === 'deputy_project_manager') {
        return (
          <AppSidebarNav
            departmentsTree={departmentsTree}
            variant='manager'
            workspaceBasePath={workspaceBasePath}
            managerSprintsReviewLabel='To Review'
            sprintNavCounts={sprintNavCounts}
            hideSprintReviewTab
            showWorkstreamsNav
            useProjectMembersNav
            sprintsNavMode='ready-only'
          />
        )
      }
      if (membership.role === 'workstream_lead') {
        return (
          <AppSidebarNav
            departmentsTree={departmentsTree}
            variant='supervisor'
            workspaceBasePath={workspaceBasePath}
            managerSprintsReviewLabel='In Review'
            sprintNavCounts={sprintNavCounts}
            hideSprintReviewTab
            staffNavLabel='Workstream Members'
          />
        )
      }
      if (membership.role === 'workstream_member') {
        return (
          <AppSidebarNav
            departmentsTree={departmentsTree}
            variant='officer'
            workspaceBasePath={workspaceBasePath}
            sprintNavCounts={sprintNavCounts}
            sprintsNavMode='split'
          />
        )
      }
    }

    // Project cookies set but nav context not ready — never fall back to mainstream /manager.
    return (
      <AppSidebarNav
        departmentsTree={departmentsTree}
        variant='manager'
        workspaceBasePath={
          slug && membership
            ? projectRoleToWorkspaceBasePath(slug, membership.role)
            : '/workspace/projects'
        }
        hideSprintReviewTab
      />
    )
  }

  if (useFallbackExplorer) {
    return <AppSidebarNav departmentsTree={departmentsTree} variant='default' />
  }

  if (role === 'commissioner') {
    const email = await getEffectiveViewerEmail()

    const commissionerDepartmentId = email
      ? await client.fetch<string | null>(
          /* groq */ `
            coalesce(
              *[_type == "department" && commissioner->status == "active" && lower(commissioner->email) == $email][0]._id,
              *[_type == "department" && commissioner._ref == *[_type == "staff" && lower(email) == $email && status == "active"][0]._id][0]._id,
              *[_type == "staff" && lower(email) == $email && status == "active" && role == "commissioner"][0].department._ref
            )
          `,
          { email },
        )
      : null

    const commissionerDivisions = commissionerDepartmentId
      ? departmentsTree.find(dept => dept._id === commissionerDepartmentId)?.divisions ?? []
      : []

    return (
      <AppSidebarNav
        departmentsTree={departmentsTree}
        variant='commissioner'
        commissionerDivisions={commissionerDivisions}
      />
    )
  }

  if (role === 'manager') {
    const sprintNavCounts = await getSprintNavCountsForViewer()
    return (
      <AppSidebarNav
        departmentsTree={departmentsTree}
        variant='manager'
        managerSprintsReviewLabel='To Review'
        sprintNavCounts={sprintNavCounts}
        hideSprintReviewTab={hideSprintReviewTab}
      />
    )
  }

  if (role === 'supervisor') {
    const sprintNavCounts = await getSprintNavCountsForViewer()
    return (
      <AppSidebarNav
        departmentsTree={departmentsTree}
        variant='supervisor'
        managerSprintsReviewLabel='In Review'
        sprintNavCounts={sprintNavCounts}
        hideSprintReviewTab={hideSprintReviewTab}
      />
    )
  }

  if (role === 'officer') {
    const sprintNavCounts = await getSprintNavCountsForViewer()
    return (
      <AppSidebarNav
        departmentsTree={departmentsTree}
        variant='officer'
        sprintNavCounts={sprintNavCounts}
      />
    )
  }

  if (role === 'assistant_commissioner') {
    const division = await getAssistantCommissionerDivision()
    const assistantCommissionerSections = division?._id
      ? await client.fetch<SidebarSection[]>(
          /* groq */ `
            *[_type == "section" && division._ref == $divisionId] | order(order asc, name asc) {
              _id,
              name,
              slug
            }
          `,
          { divisionId: division._id },
        )
      : []

    return (
      <AppSidebarNav
        departmentsTree={departmentsTree}
        variant='assistant-commissioner'
        assistantCommissionerSections={assistantCommissionerSections ?? []}
      />
    )
  }

  return <AppSidebarNav departmentsTree={departmentsTree} variant='default' />
}
