import {
  getDepartmentsWithDivisionsForSidebar,
  getSidebarDivisionsForDepartment,
} from '@/sanity/lib/departments/get-departments-with-divisions-for-sidebar'
import type { SidebarDepartmentWithDivisions } from '@/sanity/lib/departments/get-departments-with-divisions-for-sidebar'
import { AppSidebarNav } from '@/components/app-sidebar-nav'
import type { SidebarSection } from '@/components/app-sidebar-nav'
import { getAssistantCommissionerDivision } from '@/lib/assistant-commissioner.server'
import { getAppRole } from '@/lib/clerk-app-role.server'
import { canUseSuperadminPowers } from '@/lib/impersonation/viewer-context.server'
import { getCommissionerDepartmentIdForViewer } from '@/lib/commissioner-department.server'
import { client } from '@/sanity/lib/client'
import { getProjectMembershipForViewer } from '@/lib/project-access.server'
import { getSprintNavCountsForViewer } from '@/lib/sprint-nav-counts.server'
import { buildProjectAdminBasePath } from '@/lib/project-workspace-paths'
import { projectRoleToWorkspaceBasePath } from '@/lib/project-role'
import { getProjectWorkspaceContext } from '@/lib/workspace-mode.server'
import { getProjectSlugById } from '@/sanity/lib/projects/get-project-by-id'
import { viewerHasActiveFyContract } from '@/lib/viewer-active-fy-contract.server'

const EMPTY_DEPARTMENTS_TREE: SidebarDepartmentWithDivisions[] = []

export async function AppSidebarNavWrapper() {
  const [role, useFallbackExplorer, workspace] = await Promise.all([
    getAppRole(),
    canUseSuperadminPowers(),
    getProjectWorkspaceContext(),
  ])
  const { isProjects, projectId } = workspace
  const hideSprintReviewTab = isProjects

  if (isProjects && projectId) {
    const slug = await getProjectSlugById(projectId)
    if (slug && useFallbackExplorer) {
      return (
        <AppSidebarNav
          departmentsTree={EMPTY_DEPARTMENTS_TREE}
          variant='project-admin'
          workspaceBasePath={buildProjectAdminBasePath(slug)}
        />
      )
    }

    const [membership, sprintNavCounts, contractUnlocked] = await Promise.all([
      getProjectMembershipForViewer(projectId),
      getSprintNavCountsForViewer(),
      viewerHasActiveFyContract(),
    ])

    if (membership && slug) {
      const workspaceBasePath = projectRoleToWorkspaceBasePath(
        slug,
        membership.role,
      )
      if (membership.role === 'project_manager') {
        return (
          <AppSidebarNav
            departmentsTree={EMPTY_DEPARTMENTS_TREE}
            variant='manager'
            workspaceBasePath={workspaceBasePath}
            managerSprintsReviewLabel='In review'
            sprintNavCounts={sprintNavCounts}
            hideSprintReviewTab
            showWorkstreamsNav
            useProjectMembersNav
            sprintsNavMode='ready-only'
            contractUnlocked={contractUnlocked}
          />
        )
      }
      if (membership.role === 'deputy_project_manager') {
        return (
          <AppSidebarNav
            departmentsTree={EMPTY_DEPARTMENTS_TREE}
            variant='manager'
            workspaceBasePath={workspaceBasePath}
            managerSprintsReviewLabel='In review'
            sprintNavCounts={sprintNavCounts}
            hideSprintReviewTab
            showWorkstreamsNav
            useProjectMembersNav
            sprintsNavMode='ready-only'
            contractUnlocked={contractUnlocked}
          />
        )
      }
      if (membership.role === 'workstream_lead') {
        return (
          <AppSidebarNav
            departmentsTree={EMPTY_DEPARTMENTS_TREE}
            variant='supervisor'
            workspaceBasePath={workspaceBasePath}
            managerSprintsReviewLabel='In review'
            sprintNavCounts={sprintNavCounts}
            hideSprintReviewTab
            staffNavLabel='Workstream Members'
            contractUnlocked={contractUnlocked}
          />
        )
      }
      if (membership.role === 'workstream_member') {
        return (
          <AppSidebarNav
            departmentsTree={EMPTY_DEPARTMENTS_TREE}
            variant='officer'
            workspaceBasePath={workspaceBasePath}
            sprintNavCounts={sprintNavCounts}
            sprintsNavMode='split'
            contractUnlocked={contractUnlocked}
          />
        )
      }
    }

    // Project cookies set but nav context not ready — never fall back to mainstream /manager.
    return (
      <AppSidebarNav
        departmentsTree={EMPTY_DEPARTMENTS_TREE}
        variant='manager'
        workspaceBasePath={
          slug && membership
            ? projectRoleToWorkspaceBasePath(slug, membership.role)
            : '/workspace/projects'
        }
        hideSprintReviewTab
        contractUnlocked={contractUnlocked}
      />
    )
  }

  if (useFallbackExplorer) {
    const departmentsTree = await getDepartmentsWithDivisionsForSidebar()
    return <AppSidebarNav departmentsTree={departmentsTree} variant='default' />
  }

  if (role === 'commissioner') {
    const commissionerDepartmentId =
      await getCommissionerDepartmentIdForViewer()
    const [contractUnlocked, commissionerDivisions] = await Promise.all([
      viewerHasActiveFyContract(),
      commissionerDepartmentId
        ? getSidebarDivisionsForDepartment(commissionerDepartmentId)
        : Promise.resolve([]),
    ])

    return (
      <AppSidebarNav
        departmentsTree={EMPTY_DEPARTMENTS_TREE}
        variant='commissioner'
        commissionerDivisions={commissionerDivisions}
        contractUnlocked={contractUnlocked}
      />
    )
  }

  if (role === 'manager') {
    const [sprintNavCounts, contractUnlocked] = await Promise.all([
      getSprintNavCountsForViewer(),
      viewerHasActiveFyContract(),
    ])
    return (
      <AppSidebarNav
        departmentsTree={EMPTY_DEPARTMENTS_TREE}
        variant='manager'
        managerSprintsReviewLabel='In review'
        sprintNavCounts={sprintNavCounts}
        hideSprintReviewTab={hideSprintReviewTab}
        contractUnlocked={contractUnlocked}
      />
    )
  }

  if (role === 'supervisor') {
    const [sprintNavCounts, contractUnlocked] = await Promise.all([
      getSprintNavCountsForViewer(),
      viewerHasActiveFyContract(),
    ])
    return (
      <AppSidebarNav
        departmentsTree={EMPTY_DEPARTMENTS_TREE}
        variant='supervisor'
        managerSprintsReviewLabel='In review'
        sprintNavCounts={sprintNavCounts}
        hideSprintReviewTab={hideSprintReviewTab}
        contractUnlocked={contractUnlocked}
      />
    )
  }

  if (role === 'officer') {
    const [sprintNavCounts, contractUnlocked] = await Promise.all([
      getSprintNavCountsForViewer(),
      viewerHasActiveFyContract(),
    ])
    return (
      <AppSidebarNav
        departmentsTree={EMPTY_DEPARTMENTS_TREE}
        variant='officer'
        sprintNavCounts={sprintNavCounts}
        contractUnlocked={contractUnlocked}
      />
    )
  }

  if (role === 'assistant_commissioner') {
    const [division, contractUnlocked] = await Promise.all([
      getAssistantCommissionerDivision(),
      viewerHasActiveFyContract(),
    ])
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
        departmentsTree={EMPTY_DEPARTMENTS_TREE}
        variant='assistant-commissioner'
        assistantCommissionerSections={assistantCommissionerSections ?? []}
        contractUnlocked={contractUnlocked}
      />
    )
  }

  const departmentsTree = await getDepartmentsWithDivisionsForSidebar()
  return <AppSidebarNav departmentsTree={departmentsTree} variant='default' />
}
