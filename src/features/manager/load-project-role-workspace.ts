import 'server-only'

import { notFound, redirect } from 'next/navigation'

import type { WorkContextMode } from '@/lib/section-access'
import { buildSectionAccessForWorkContext } from '@/lib/section-access'
import { getCurrentFinancialYear } from '@/lib/financial-year'
import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import { getActiveOrgDelegationAsDelegatee } from '@/lib/org-role-delegation.server'
import type { ProjectMembership } from '@/lib/project-access.server'
import { getProjectMembershipForViewer } from '@/lib/project-access.server'
import { getUpstreamManagerContractForSection } from '@/lib/project-upstream-contract.server'
import {
  loadSectionWorkspaceData,
  type WorkspaceSection,
} from '@/features/sections/load-section-workspace-data'
import type { SectionPageContentProps } from '@/features/sections/section-page-content'
import type { DelegationCandidate } from '@/lib/role-delegation'
import type { OrgDelegationRecord } from '@/lib/org-role-delegation.server'
import type { ProjectWorkstreamLookup } from '@/sanity/lib/projects/get-project-workstreams-for-viewer'
import { getProjectById } from '@/sanity/lib/projects/get-project-by-id'
import { getProjectWorkstreamsForViewer } from '@/sanity/lib/projects/get-project-workstreams-for-viewer'
import { getProjectContract } from '@/sanity/lib/project-contracts/get-project-contract'
import type { ProjectContract } from '@/sanity/lib/project-contracts/get-project-contract'
import { getDeputyProjectContract } from '@/sanity/lib/project-contracts/get-deputy-project-contract'
import { getProjectMembersRoster } from '@/sanity/lib/projects/get-project-members-roster'
import { getProjectDelegationCandidatesForProjectManager } from '@/lib/project-delegation-candidates.server'
import { getStakeholderEngagementForProject } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement-by-project'
import type { ProjectMemberRosterRow } from '@/sanity/lib/projects/get-project-members-roster'
import { getSprintsByWorkstreamIds } from '@/sanity/lib/weekly-sprints/get-sprints-by-workstreams'
import type { SectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import { getDueItemsFromContract } from '@/sanity/lib/contract-items/get-due-items'
import { getManagersForPicker } from '@/sanity/lib/staff/get-staff-for-picker'
import { getSupervisorContract } from '@/sanity/lib/supervisor-contracts/get-supervisor-contract'
import { getProjectWorkspaceContext } from '@/lib/workspace-mode.server'
import {
  getProjectWorkstreamStaffPickers,
  getProjectWorkstreamStaffRoster,
} from '@/lib/project-member-staff.server'
import type { SectionStaffRoster } from '@/sanity/lib/staff/get-section-staff-roster'

function projectContractAsSectionContract(
  contract: ProjectContract,
  section: WorkspaceSection,
): SectionContract {
  return {
    _id: contract._id,
    section: { _id: section._id, name: section.name },
    financialYearLabel: contract.financialYearLabel,
    manager: contract.projectManager,
    status: contract.status,
    objectives: contract.objectives,
  }
}

function staffOptionsFromProjectMembers(
  members: ProjectMemberRosterRow[],
): { _id: string; fullName?: string; staffId?: string }[] {
  return members
    .filter(m => m.status === 'active')
    .map(m => ({
      _id: m._id,
      fullName: m.fullName,
      staffId: m.staffId,
    }))
}

async function projectMembersToStaffRoster(
  projectId: string,
  projectManagerStaffId: string | null,
): Promise<SectionStaffRoster> {
  const members = await getProjectMembersRoster(projectId)
  const active = members.filter(m => m.status === 'active')
  const managerRow = active.find(m => m.projectRole === 'project_manager')
  const leads = active.filter(m => m.projectRole === 'workstream_lead')
  const memberRows = active.filter(m => m.projectRole === 'workstream_member')

  const toRow = (m: (typeof active)[0]): SectionStaffRoster['supervisors'][0] => ({
    _id: m._id,
    fullName: m.fullName,
    email: m.email,
    role: m.projectRole,
    staffId: m.staffId,
    status: m.status,
    onboardedAt: m.onboardedAt,
  })

  return {
    manager: managerRow
      ? toRow(managerRow)
      : projectManagerStaffId
        ? {
            _id: projectManagerStaffId,
            fullName: 'Project Manager',
            role: 'project_manager',
            status: 'active',
            onboardedAt: '',
          }
        : null,
    supervisors: leads.map(toRow),
    officers: memberRows.map(toRow),
    activeDelegations: [],
    delegationHistory: [],
  }
}

async function loadProjectManagerWorkspace(
  projectId: string,
  membership: ProjectMembership,
  workContext: WorkContextMode,
) {
  const [project, workstreams, viewerStaffId, managers] = await Promise.all([
    getProjectById(projectId),
    getProjectWorkstreamsForViewer(projectId, membership),
    getViewerStaffId(),
    getManagersForPicker(),
  ])
  if (!project) notFound()

  const currentFY = getCurrentFinancialYear()
  const projectContract = await getProjectContract(projectId, currentFY.label)
  const workstreamIds = workstreams.map(w => w._id)
  const primaryWorkstream = workstreams[0]

  const projectManagerId =
    project.projectManager?._id ?? viewerStaffId ?? null

  const sectionAccess = buildSectionAccessForWorkContext(
    {
      viewerStaffId,
      sectionManagerId: projectManagerId,
      supervisorIds: [],
      officerIds: [],
      appRole: null,
      isProjectWorkstream: true,
    },
    workContext,
  )

  const section: WorkspaceSection = primaryWorkstream
    ? {
        _id: primaryWorkstream._id,
        name: project.name,
        slug: primaryWorkstream.slug,
        manager: project.projectManager
          ? {
              _id: project.projectManager._id,
              fullName: undefined,
            }
          : undefined,
      }
    : {
        _id: projectId,
        name: project.name,
        slug: project.slug
          ? { current: project.slug.current ?? projectId }
          : undefined,
        manager: project.projectManager
          ? { _id: project.projectManager._id }
          : undefined,
      }

  const [sprints, stakeholderEngagement, staffRoster, projectMembers] =
    await Promise.all([
      getSprintsByWorkstreamIds(workstreamIds),
      getStakeholderEngagementForProject(projectId),
      projectMembersToStaffRoster(projectId, projectManagerId),
      getProjectMembersRoster(projectId),
    ])
  const staffOptions = staffOptionsFromProjectMembers(projectMembers)

  const today = new Date().toISOString().slice(0, 10)
  const contractForDue = projectContract
  const dueToday = contractForDue
    ? getDueItemsFromContract(contractForDue, d => d === today)
    : []
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() + diffToMonday)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 4)
  const weekStart = startOfWeek.toISOString().slice(0, 10)
  const weekEnd = endOfWeek.toISOString().slice(0, 10)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const monthStart = startOfMonth.toISOString().slice(0, 10)
  const monthEnd = endOfMonth.toISOString().slice(0, 10)
  const quarter = Math.floor(now.getMonth() / 3) + 1
  const startOfQuarter = new Date(now.getFullYear(), (quarter - 1) * 3, 1)
  const endOfQuarter = new Date(now.getFullYear(), quarter * 3, 0)
  const quarterStart = startOfQuarter.toISOString().slice(0, 10)
  const quarterEnd = endOfQuarter.toISOString().slice(0, 10)

  const dueThisWeek = contractForDue
    ? getDueItemsFromContract(
        contractForDue,
        d => d >= weekStart && d <= weekEnd && d !== today,
      )
    : []
  const dueThisMonth = contractForDue
    ? getDueItemsFromContract(
        contractForDue,
        d =>
          d >= monthStart &&
          d <= monthEnd &&
          d !== today &&
          !(d >= weekStart && d <= weekEnd),
      )
    : []
  const dueThisQuarter = contractForDue
    ? getDueItemsFromContract(
        contractForDue,
        d =>
          d >= quarterStart &&
          d <= quarterEnd &&
          d !== today &&
          !(d >= monthStart && d <= monthEnd),
      )
    : []

  const orgActingAsDelegatee = viewerStaffId
    ? await getActiveOrgDelegationAsDelegatee(viewerStaffId)
    : null

  const delegationSectionId = primaryWorkstream?._id ?? null
  const delegationCandidates =
    viewerStaffId && delegationSectionId
      ? await getProjectDelegationCandidatesForProjectManager(
          projectId,
          viewerStaffId,
        )
      : []

  const sectionContract = projectContract
    ? projectContractAsSectionContract(projectContract, section)
    : null

  return {
    section,
    sectionContract,
    projectContract,
    projectId,
    isProjectManagerWorkspace: true as const,
    supervisorContract: null,
    supervisorContractForCascade: null,
    officerContract: null,
    stakeholderEngagement,
    staffOptions,
    supervisors: [],
    officers: [],
    dueToday,
    dueThisWeek,
    dueThisMonth,
    dueThisQuarter,
    today,
    sprints,
    viewerStaffId: viewerStaffId ?? undefined,
    sectionAccess,
    staffRoster,
    managers,
    workContext,
    delegationCandidates,
    orgActingAsDelegatee,
    projectMembership: membership,
    projectWorkstreams: workstreams,
  }
}

async function loadDeputyProjectManagerWorkspace(
  projectId: string,
  membership: ProjectMembership,
  workContext: WorkContextMode,
) {
  const [project, workstreams, viewerStaffId, managers] = await Promise.all([
    getProjectById(projectId),
    getProjectWorkstreamsForViewer(projectId, membership),
    getViewerStaffId(),
    getManagersForPicker(),
  ])
  if (!project) notFound()

  const currentFY = getCurrentFinancialYear()
  const [deputyContract, projectContract] = await Promise.all([
    getDeputyProjectContract(projectId, currentFY.label),
    getProjectContract(projectId, currentFY.label),
  ])
  const workstreamIds = workstreams.map(w => w._id)
  const primaryWorkstream = workstreams[0]

  const deputyId =
    project.deputyProjectManager?._id ?? viewerStaffId ?? null

  const sectionAccess = buildSectionAccessForWorkContext(
    {
      viewerStaffId,
      sectionManagerId: deputyId,
      supervisorIds: [],
      officerIds: [],
      appRole: null,
      isProjectWorkstream: true,
    },
    workContext,
  )

  const section: WorkspaceSection = primaryWorkstream
    ? {
        _id: primaryWorkstream._id,
        name: project.name,
        slug: primaryWorkstream.slug,
        manager: project.deputyProjectManager
          ? {
              _id: project.deputyProjectManager._id,
              fullName: project.deputyProjectManager.fullName,
            }
          : undefined,
      }
    : {
        _id: projectId,
        name: project.name,
        slug: project.slug
          ? { current: project.slug.current ?? projectId }
          : undefined,
        manager: project.deputyProjectManager
          ? {
              _id: project.deputyProjectManager._id,
              fullName: project.deputyProjectManager.fullName,
            }
          : undefined,
      }

  const [sprints, stakeholderEngagement, staffRoster, projectMembers] =
    await Promise.all([
      getSprintsByWorkstreamIds(workstreamIds),
      getStakeholderEngagementForProject(projectId),
      projectMembersToStaffRoster(projectId, deputyId),
      getProjectMembersRoster(projectId),
    ])
  const staffOptions = staffOptionsFromProjectMembers(projectMembers)

  const today = new Date().toISOString().slice(0, 10)
  const contractForDue = deputyContract
  const dueToday = contractForDue
    ? getDueItemsFromContract(contractForDue, d => d === today)
    : []
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() + diffToMonday)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 4)
  const weekStart = startOfWeek.toISOString().slice(0, 10)
  const weekEnd = endOfWeek.toISOString().slice(0, 10)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const monthStart = startOfMonth.toISOString().slice(0, 10)
  const monthEnd = endOfMonth.toISOString().slice(0, 10)
  const quarter = Math.floor(now.getMonth() / 3) + 1
  const startOfQuarter = new Date(now.getFullYear(), (quarter - 1) * 3, 1)
  const endOfQuarter = new Date(now.getFullYear(), quarter * 3, 0)
  const quarterStart = startOfQuarter.toISOString().slice(0, 10)
  const quarterEnd = endOfQuarter.toISOString().slice(0, 10)

  const dueThisWeek = contractForDue
    ? getDueItemsFromContract(
        contractForDue,
        d => d >= weekStart && d <= weekEnd && d !== today,
      )
    : []
  const dueThisMonth = contractForDue
    ? getDueItemsFromContract(
        contractForDue,
        d =>
          d >= monthStart &&
          d <= monthEnd &&
          d !== today &&
          !(d >= weekStart && d <= weekEnd),
      )
    : []
  const dueThisQuarter = contractForDue
    ? getDueItemsFromContract(
        contractForDue,
        d =>
          d >= quarterStart &&
          d <= quarterEnd &&
          d !== today &&
          !(d >= monthStart && d <= monthEnd),
      )
    : []

  const orgActingAsDelegatee = viewerStaffId
    ? await getActiveOrgDelegationAsDelegatee(viewerStaffId)
    : null

  const deputyAsSection = deputyContract
    ? projectContractAsSectionContract(
        {
          ...deputyContract,
          projectManager: deputyContract.deputyProjectManager,
        } as ProjectContract,
        section,
      )
    : null

  const upstreamPmContract = projectContract
    ? projectContractAsSectionContract(projectContract, section)
    : null

  return {
    section,
    sectionContract: deputyAsSection,
    projectContract: upstreamPmContract,
    projectId,
    isDeputyProjectManagerWorkspace: true as const,
    supervisorContract: null,
    supervisorContractForCascade: null,
    officerContract: null,
    stakeholderEngagement,
    staffOptions,
    supervisors: [],
    officers: [],
    dueToday,
    dueThisWeek,
    dueThisMonth,
    dueThisQuarter,
    today,
    sprints,
    viewerStaffId: viewerStaffId ?? undefined,
    sectionAccess,
    staffRoster,
    managers,
    workContext,
    delegationCandidates: [],
    orgActingAsDelegatee,
    projectMembership: membership,
    projectWorkstreams: workstreams,
  }
}

async function enrichWorkstreamWorkspace(
  data: Awaited<ReturnType<typeof loadSectionWorkspaceData>>,
  projectId: string,
  membership: ProjectMembership,
  workstreams: Awaited<ReturnType<typeof getProjectWorkstreamsForViewer>>,
) {
  if (!data) return null

  const currentFY = getCurrentFinancialYear()
  const upstream = await getUpstreamManagerContractForSection(data.section._id)
  const upstreamAsSection = upstream
    ? ({
        _id: upstream._id,
        section: { _id: data.section._id, name: data.section.name },
        financialYearLabel: upstream.financialYearLabel,
        objectives: upstream.objectives,
      } as SectionContract)
    : data.sectionContract

  const [staffRoster, staffPickers, projectMembers] = await Promise.all([
    getProjectWorkstreamStaffRoster(data.section._id),
    getProjectWorkstreamStaffPickers(data.section._id),
    getProjectMembersRoster(projectId),
  ])

  const supervisors = staffPickers.supervisors.map(supervisor => ({
    _id: supervisor._id,
    fullName: supervisor.fullName,
    role: supervisor.role,
  }))
  const officers = staffPickers.officers.map(officer => ({
    _id: officer._id,
    fullName: officer.fullName,
    role: officer.role,
  }))

  const workstreamLead = supervisors[0] ?? null

  const fy =
    data.officerContract?.financialYearLabel ??
    data.supervisorContract?.financialYearLabel ??
    currentFY.label
  let supervisorContractForCascade = data.supervisorContractForCascade
  if (
    membership.role === 'workstream_member' &&
    workstreamLead &&
    !supervisorContractForCascade
  ) {
    supervisorContractForCascade = await getSupervisorContract(
      data.section._id,
      workstreamLead._id,
      fy,
    )
  }

  return {
    ...data,
    sectionContract: upstreamAsSection,
    upstreamManagerContractId: upstream?._id ?? null,
    supervisorContractForCascade,
    supervisors,
    officers,
    staffRoster,
    staffOptions: staffOptionsFromProjectMembers(projectMembers),
    projectMemberRoster: projectMembers.map(member => ({
      email: member.email,
      status: member.status,
      workstreamId: member.workstreamId,
    })),
    projectId,
    projectDisplayName: membership.projectName,
    projectMembership: membership,
    projectWorkstreams: workstreams,
    isProjectWorkstreamWorkspace: true as const,
  }
}

export type ProjectRoleWorkspaceData = SectionPageContentProps & {
  workContext: WorkContextMode
  delegationCandidates: DelegationCandidate[]
  orgActingAsDelegatee?: OrgDelegationRecord | null
  projectMembership: ProjectMembership
  projectWorkstreams: ProjectWorkstreamLookup[]
}

export async function loadProjectRoleWorkspaceData(options?: {
  workContext?: WorkContextMode
}): Promise<ProjectRoleWorkspaceData | null> {
  const { projectId } = await getProjectWorkspaceContext()
  if (!projectId) redirect('/workspace/projects')

  const membership = await getProjectMembershipForViewer(projectId)
  if (!membership) redirect('/workspace/projects')

  const workContext = options?.workContext ?? 'own'
  const workstreams = await getProjectWorkstreamsForViewer(
    projectId,
    membership,
  )

  if (membership.role === 'project_manager') {
    return loadProjectManagerWorkspace(projectId, membership, workContext)
  }

  if (membership.role === 'deputy_project_manager') {
    return loadDeputyProjectManagerWorkspace(projectId, membership, workContext)
  }

  const workstream = workstreams[0]
  if (!workstream) return null

  const sectionKey = workstream.slug?.current ?? workstream._id
  const data = await loadSectionWorkspaceData(sectionKey, {
    workContext,
  })
  if (!data) notFound()

  const viewerStaffId = await getViewerStaffId()
  const orgActingAsDelegatee = viewerStaffId
    ? await getActiveOrgDelegationAsDelegatee(viewerStaffId)
    : null

  const enriched = await enrichWorkstreamWorkspace(
    data,
    projectId,
    membership,
    workstreams,
  )
  if (!enriched) return null

  return {
    ...enriched,
    orgActingAsDelegatee,
  } as ProjectRoleWorkspaceData
}
