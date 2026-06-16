'use client'

import * as React from 'react'
import { ChevronsDown, ChevronsUp, FileText, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'
import { flattenInitiatives } from '@/sanity/lib/section-contracts/get-section-contract'
import { SectionDashboardContent } from '@/features/sections/section-dashboard-content'
import { SectionStaffContent } from '@/features/sections/section-staff-content'
import { StakeholderEngagementContent } from '@/features/sections/stakeholder-engagement-content'
import { SectionReportingContent } from '@/features/sections/section-reporting-content'
import { WeeklySprintContent } from '@/features/sections/weekly-sprint-content'
import { ContractTree } from '@/features/sections/components/contract-tree'
import { DepartmentContractTree } from '@/features/sections/components/department-contract-tree'
import { OnboardContractDialog } from '@/features/sections/components/onboard-contract-dialog'
import { OnboardProjectContractDialog } from '@/features/sections/components/onboard-project-contract-dialog'
import { OnboardDeputyProjectContractDialog } from '@/features/sections/components/onboard-deputy-project-contract-dialog'
import { ContractOnboardEmptyState } from '@/features/sections/components/contract-onboard-empty-state'
import { OnboardSupervisorContractDialog } from '@/features/sections/components/onboard-supervisor-contract-dialog'
import { SupervisorCascadeImportDialog } from '@/features/sections/components/supervisor-cascade-import-dialog'
import { OfficerCascadeImportDialog } from '@/features/sections/components/officer-cascade-import-dialog'
import { OnboardOfficerContractDialog } from '@/features/sections/components/onboard-officer-contract-dialog'
import { DueTodayThisWeek } from '@/features/sections/components/due-today-this-week'
import { getSprintsPageTitle, type SprintView } from '@/lib/sprint-view-labels'
import type { InitiativeWithActivities } from '@/lib/flatten-initiatives-with-activities'
import { flattenInitiativesWithActivities } from '@/lib/flatten-initiatives-with-activities'
import type { SectionPageContentProps } from '@/features/sections/section-page-content'
import {
  scopeSprintsForViewer,
  shouldScopeSprintsToOfficer,
  shouldScopeSprintsToSupervisor,
  shouldUseOfficerContract,
} from '@/lib/sprint-workspace-scope'
import {
  getWorkspacePaths,
  type WorkspaceBasePath,
} from '@/lib/workspace-paths'
import { isOfficerLikeWorkspaceBasePath } from '@/lib/project-workspace-paths'
import {
  getManagerWorkspaceViewConfig,
  resolveWorkspaceScopeLabels,
} from '@/lib/project-workspace-copy'
import type { ContractsApiResource } from '@/lib/contracts-api'
import type { SectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import type { SupervisorContract } from '@/sanity/lib/supervisor-contracts/get-supervisor-contract'
import type { OfficerContract } from '@/sanity/lib/officer-contracts/get-officer-contract'
import { ContractExportDownloadButton } from '@/features/sections/components/contract-export-download-button'

type ManagerWorkspaceView =
  | 'dashboard'
  | 'contract'
  | 'sprints'
  | 'stakeholders'
  | 'staff'
  | 'reporting'

type WorkspaceData = SectionPageContentProps

type ManagerWorkspaceContentProps = WorkspaceData & {
  view: ManagerWorkspaceView
  sprintView?: SprintView
  sprintReviewLabel?: string
  hideSprintReviewTab?: boolean
  workspaceBasePath?: WorkspaceBasePath
}

export function ManagerWorkspaceContent({
  view,
  sprintView,
  sprintReviewLabel = 'To Review',
  workspaceBasePath = '/manager',
  section,
  isProjectManagerWorkspace = false,
  isDeputyProjectManagerWorkspace = false,
  isProjectWorkstreamWorkspace = false,
  projectId,
  projectDisplayName,
  sectionContract,
  supervisorContract = null,
  supervisorContractForCascade = null,
  officerContract = null,
  stakeholderEngagement,
  staffOptions,
  supervisors,
  officers,
  dueToday,
  dueThisWeek,
  dueThisMonth,
  dueThisQuarter,
  today,
  sprints,
  supervisorSprintInitiativesByStaffId = {},
  viewerStaffId,
  sectionAccess,
  staffRoster,
  projectMemberRoster,
}: ManagerWorkspaceContentProps) {
  const safeSprints = sprints ?? []
  const scopedSprints = React.useMemo(
    () => scopeSprintsForViewer(safeSprints, sectionAccess),
    [safeSprints, sectionAccess],
  )
  const paths = React.useMemo(
    () => getWorkspacePaths(workspaceBasePath),
    [workspaceBasePath],
  )
  const scopeLabels = React.useMemo(
    () =>
      resolveWorkspaceScopeLabels({
        workspaceBasePath,
        isProjectManagerWorkspace,
        isDeputyProjectManagerWorkspace,
        isProjectWorkstreamWorkspace,
      }),
    [
      workspaceBasePath,
      isProjectManagerWorkspace,
      isDeputyProjectManagerWorkspace,
      isProjectWorkstreamWorkspace,
    ],
  )
  const viewConfig = React.useMemo(
    () => getManagerWorkspaceViewConfig(scopeLabels),
    [scopeLabels],
  )
  const scopeLabel =
    scopeLabels.kind === 'mainstream' ? 'Section' : scopeLabels.unitTitle
  const usesOfficerContract =
    isOfficerLikeWorkspaceBasePath(workspaceBasePath) ||
    shouldUseOfficerContract(sectionAccess)
  const usesSupervisorContract =
    shouldScopeSprintsToSupervisor(sectionAccess) ||
    Boolean(
      sectionAccess.viewerStaffId &&
        supervisors.some(s => s._id === sectionAccess.viewerStaffId),
    )
  const usesLeadershipContract = usesSupervisorContract || usesOfficerContract
  const activeContract = usesOfficerContract
    ? officerContract
    : usesSupervisorContract
      ? supervisorContract
      : sectionContract
  const canManageActiveContract = usesOfficerContract
    ? sectionAccess.canManageOfficerContract ||
      isOfficerLikeWorkspaceBasePath(workspaceBasePath)
    : usesSupervisorContract
      ? sectionAccess.canManageSupervisorContract ||
        sectionAccess.isSectionSupervisor
      : sectionAccess.canManageContract
  const leadershipContractsApi: Extract<
    ContractsApiResource,
    'supervisor-contracts' | 'officer-contracts'
  > = usesOfficerContract ? 'officer-contracts' : 'supervisor-contracts'
  const workspaceRoleLabel = isProjectManagerWorkspace
    ? 'Project Manager'
    : isDeputyProjectManagerWorkspace
      ? 'Deputy Project Manager'
      : isProjectWorkstreamWorkspace && sectionAccess.isSectionSupervisor
        ? 'Workstream Lead'
        : isProjectWorkstreamWorkspace && sectionAccess.isSectionOfficer
          ? 'Workstream Member'
          : sectionAccess.isSectionManager
            ? 'Manager'
            : sectionAccess.isSectionSupervisor
              ? 'Supervisor'
              : sectionAccess.isSectionOfficer
                ? 'Officer'
                : 'Manager'
  const viewerSupervisor = supervisors.find(
    s => s._id === sectionAccess.viewerStaffId,
  )
  const viewerOfficer = officers.find(
    o => o._id === sectionAccess.viewerStaffId,
  )
  const rosterSupervisor = staffRoster.supervisors.find(
    s => s._id === sectionAccess.viewerStaffId,
  )
  const rosterOfficer = staffRoster.officers.find(
    o => o._id === sectionAccess.viewerStaffId,
  )
  const personalContractDisplayName = usesOfficerContract
    ? (officerContract?.officer?.fullName ??
      viewerOfficer?.fullName ??
      rosterOfficer?.fullName ??
      'Officer')
    : (supervisorContract?.supervisor?.fullName ??
      viewerSupervisor?.fullName ??
      rosterSupervisor?.fullName ??
      'Supervisor')
  const contractResponsibilityCenter = usesOfficerContract
    ? 'Officer'
    : usesSupervisorContract
      ? 'Supervisor'
      : 'Manager'
  const config = viewConfig[view]
  const [panelPortalNode, setPanelPortalNode] =
    React.useState<HTMLDivElement | null>(null)
  const [onboardOpen, setOnboardOpen] = React.useState(false)
  const [cascadeImportOpen, setCascadeImportOpen] = React.useState(false)
  const [expandAllSignal, setExpandAllSignal] = React.useState(0)
  const [collapseAllSignal, setCollapseAllSignal] = React.useState(0)
  const [treeBulkExpanded, setTreeBulkExpanded] = React.useState(false)
  const [addObjectiveSignal, setAddObjectiveSignal] = React.useState(0)

  const activeSprintView: SprintView =
    isProjectManagerWorkspace || isDeputyProjectManagerWorkspace
      ? 'ready'
      : usesOfficerContract && !isProjectWorkstreamWorkspace
        ? 'ready'
        : (sprintView ?? 'ready')

  const pageTitle =
    view === 'sprints'
      ? isProjectManagerWorkspace || isDeputyProjectManagerWorkspace
        ? 'Sprints'
        : getSprintsPageTitle(activeSprintView)
      : config.title

  const breadcrumbs = React.useMemo(
    () => [
      { label: workspaceRoleLabel, href: paths.dashboard },
      { label: pageTitle },
    ],
    [pageTitle, workspaceRoleLabel, paths.dashboard],
  )
  useRegisterPageBreadcrumbs(breadcrumbs)

  const currentFY =
    activeContract?.financialYearLabel ??
    sectionContract?.financialYearLabel ??
    'current FY'
  const manager = section.manager
  const hasManager = !!manager?._id
  const showRightRail = view === 'contract' || view === 'sprints'
  const actingAssignment = sectionAccess.delegation.assignmentAsDelegatee
  const title =
    sectionAccess.workContext === 'acting' && actingAssignment
      ? `${pageTitle} (acting for ${actingAssignment.fromStaffName})`
      : pageTitle

  const content = (() => {
    if (view === 'dashboard') {
      return (
        <SectionDashboardContent
          sectionName={section.name}
          sectionSlug={section.slug?.current}
          contract={activeContract as SectionContract | null}
          sprints={safeSprints}
          sectionAccess={sectionAccess}
          workspaceBasePath={workspaceBasePath}
          workspaceScope={scopeLabels.kind}
          engagement={stakeholderEngagement}
          dueToday={dueToday}
          dueThisWeek={dueThisWeek}
          dueThisMonth={dueThisMonth}
          dueThisQuarter={dueThisQuarter}
          today={today}
        />
      )
    }

    if (view === 'contract') {
      return (
        <Card>
          <CardContent className='pt-6'>
            {activeContract ? (
              <div className='space-y-4'>
                {usesSupervisorContract && sectionContract ? (
                  <SupervisorCascadeImportDialog
                    open={cascadeImportOpen}
                    onOpenChange={setCascadeImportOpen}
                    sectionId={section._id}
                    supervisorContractId={activeContract._id}
                    supervisorId={sectionAccess.viewerStaffId ?? undefined}
                    isProjectWorkstream={isProjectWorkstreamWorkspace}
                  />
                ) : null}
                {usesOfficerContract &&
                supervisorContractForCascade &&
                activeContract ? (
                  <OfficerCascadeImportDialog
                    open={cascadeImportOpen}
                    onOpenChange={setCascadeImportOpen}
                    sectionId={section._id}
                    officerContractId={activeContract._id}
                    supervisorContractId={supervisorContractForCascade._id}
                    isProjectWorkstream={isProjectWorkstreamWorkspace}
                  />
                ) : null}
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  <div className='text-sm flex items-center gap-2 min-w-0'>
                    <FileText className='h-5 w-5 shrink-0' />
                    <span className='truncate'>{currentFY}</span>
                  </div>
                  <div className='flex flex-wrap items-center gap-2 sm:shrink-0'>
                    {canManageActiveContract ? (
                      <Button
                        type='button'
                        size='sm'
                        onClick={() => setAddObjectiveSignal(s => s + 1)}
                      >
                        <Plus className='h-4 w-4 mr-2' />
                        Add SSMARTA objective
                      </Button>
                    ) : null}
                    {usesSupervisorContract &&
                    canManageActiveContract &&
                    sectionContract ? (
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        onClick={() => setCascadeImportOpen(true)}
                      >
                        {isProjectWorkstreamWorkspace
                          ? 'Cascade from project manager'
                          : 'Cascade from manager'}
                      </Button>
                    ) : null}
                    {usesOfficerContract &&
                    canManageActiveContract &&
                    supervisorContractForCascade &&
                    activeContract ? (
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        onClick={() => setCascadeImportOpen(true)}
                      >
                        {isProjectWorkstreamWorkspace
                          ? 'Cascade from workstream lead'
                          : 'Cascade from supervisor'}
                      </Button>
                    ) : null}
                    {activeContract ? (
                      <ContractExportDownloadButton
                        sectionName={section.name}
                        financialYearLabel={currentFY}
                        objectives={activeContract.objectives}
                        responsibilityCenter={contractResponsibilityCenter}
                      />
                    ) : null}
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      onClick={() => {
                        if (treeBulkExpanded) {
                          setCollapseAllSignal(s => s + 1)
                          setExpandAllSignal(0)
                          setTreeBulkExpanded(false)
                        } else {
                          setExpandAllSignal(s => s + 1)
                          setTreeBulkExpanded(true)
                        }
                      }}
                    >
                      {treeBulkExpanded ? (
                        <ChevronsUp className='h-4 w-4' />
                      ) : (
                        <ChevronsDown className='h-4 w-4' />
                      )}
                    </Button>
                  </div>
                </div>
                {usesLeadershipContract ? (
                  <DepartmentContractTree
                    departmentContract={
                      activeContract as SupervisorContract | OfficerContract
                    }
                    sectionSlug={section.slug?.current ?? ''}
                    contractsApi={leadershipContractsApi}
                    canManageContract={canManageActiveContract}
                    expandAllSignal={expandAllSignal}
                    collapseAllSignal={collapseAllSignal}
                    addObjectiveSignal={addObjectiveSignal}
                    onAddObjectiveRequestConsumed={() =>
                      setAddObjectiveSignal(0)
                    }
                  />
                ) : (isProjectManagerWorkspace ||
                    isDeputyProjectManagerWorkspace) &&
                  sectionContract ? (
                  <DepartmentContractTree
                    departmentContract={sectionContract}
                    contractsApi={
                      isDeputyProjectManagerWorkspace
                        ? 'deputy-project-contracts'
                        : 'project-contracts'
                    }
                    canManageContract={canManageActiveContract}
                    expandAllSignal={expandAllSignal}
                    collapseAllSignal={collapseAllSignal}
                    addObjectiveSignal={addObjectiveSignal}
                    onAddObjectiveRequestConsumed={() =>
                      setAddObjectiveSignal(0)
                    }
                  />
                ) : (
                  <ContractTree
                    sectionContract={sectionContract!}
                    sectionSlug={section.slug?.current ?? ''}
                    canManageContract={canManageActiveContract}
                    expandAllSignal={expandAllSignal}
                    collapseAllSignal={collapseAllSignal}
                    addObjectiveSignal={addObjectiveSignal}
                    onAddObjectiveRequestConsumed={() =>
                      setAddObjectiveSignal(0)
                    }
                  />
                )}
              </div>
            ) : usesOfficerContract ? (
              <div className='space-y-4'>
                <OnboardOfficerContractDialog
                  open={onboardOpen}
                  onOpenChange={setOnboardOpen}
                  sectionId={section._id}
                  officerId={sectionAccess.viewerStaffId ?? undefined}
                  sectionName={section.name}
                  officerName={personalContractDisplayName}
                  scopeLabel={scopeLabel}
                  roleLabel={
                    isProjectWorkstreamWorkspace
                      ? 'Workstream Member'
                      : 'Officer'
                  }
                  upstreamRoleLabel={
                    isProjectWorkstreamWorkspace ? 'Workstream Lead' : undefined
                  }
                  upstreamName={
                    isProjectWorkstreamWorkspace
                      ? (supervisors[0]?.fullName ??
                        staffRoster.supervisors[0]?.fullName)
                      : undefined
                  }
                  onSuccess={() => setOnboardOpen(false)}
                />
                <ContractOnboardEmptyState
                  financialYearLabel={currentFY}
                  description={
                    scopeLabels.kind === 'workstream'
                      ? 'Add objectives and activities, then cascade from your workstream lead.'
                      : 'Add objectives and activities, then cascade from your supervisor.'
                  }
                  canOnboard={
                    sectionAccess.canManageOfficerContract ||
                    isOfficerLikeWorkspaceBasePath(workspaceBasePath)
                  }
                  onOnboard={() => setOnboardOpen(true)}
                />
              </div>
            ) : usesSupervisorContract ? (
              <div className='space-y-4'>
                <OnboardSupervisorContractDialog
                  open={onboardOpen}
                  onOpenChange={setOnboardOpen}
                  sectionId={section._id}
                  supervisorId={sectionAccess.viewerStaffId ?? undefined}
                  sectionName={section.name}
                  supervisorName={personalContractDisplayName}
                  hasManagerContract={Boolean(sectionContract)}
                  isProjectWorkstream={isProjectWorkstreamWorkspace}
                  scopeLabel={scopeLabel}
                  roleLabel={
                    isProjectWorkstreamWorkspace
                      ? 'Workstream Lead'
                      : 'Supervisor'
                  }
                  onSuccess={() => setOnboardOpen(false)}
                />
                <ContractOnboardEmptyState
                  financialYearLabel={currentFY}
                  description={
                    scopeLabels.kind === 'workstream'
                      ? 'Onboard your contract to add activities or cascade from the project manager.'
                      : 'Onboard your contract and cascade to other project members.'
                  }
                  canOnboard={canManageActiveContract}
                  onOnboard={() => setOnboardOpen(true)}
                />
              </div>
            ) : isDeputyProjectManagerWorkspace ? (
              <div className='space-y-4'>
                <OnboardDeputyProjectContractDialog
                  open={onboardOpen}
                  onOpenChange={setOnboardOpen}
                  projectId={projectId ?? section._id}
                  deputyProjectManagerId={manager?._id ?? viewerStaffId ?? ''}
                  projectName={section.name}
                  deputyProjectManagerName={
                    manager?.fullName ?? 'Deputy Project Manager'
                  }
                  onSuccess={() => setOnboardOpen(false)}
                />
                <ContractOnboardEmptyState
                  financialYearLabel={currentFY}
                  description='Onboard your contract and cascade to other project members.'
                  canOnboard={
                    sectionAccess.canOnboardContract &&
                    Boolean(hasManager || viewerStaffId)
                  }
                  onOnboard={() => setOnboardOpen(true)}
                  missingAssigneeMessage={
                    sectionAccess.canOnboardContract &&
                    !hasManager &&
                    !viewerStaffId
                      ? 'Assign a deputy project manager before onboarding a contract.'
                      : undefined
                  }
                />
              </div>
            ) : isProjectManagerWorkspace ? (
              <div className='space-y-4'>
                <OnboardProjectContractDialog
                  open={onboardOpen}
                  onOpenChange={setOnboardOpen}
                  projectId={projectId ?? section._id}
                  projectManagerId={manager?._id ?? viewerStaffId ?? ''}
                  projectName={section.name}
                  projectManagerName={manager?.fullName ?? 'Project Manager'}
                  onSuccess={() => setOnboardOpen(false)}
                />
                <ContractOnboardEmptyState
                  financialYearLabel={currentFY}
                  description='Onboard your contract and cascade to other project members'
                  canOnboard={
                    sectionAccess.canOnboardContract &&
                    Boolean(hasManager || viewerStaffId)
                  }
                  onOnboard={() => setOnboardOpen(true)}
                  missingAssigneeMessage={
                    sectionAccess.canOnboardContract &&
                    !hasManager &&
                    !viewerStaffId
                      ? 'Assign a project manager before onboarding a contract.'
                      : undefined
                  }
                />
              </div>
            ) : (
              <div className='space-y-4'>
                <OnboardContractDialog
                  open={onboardOpen}
                  onOpenChange={setOnboardOpen}
                  sectionId={section._id}
                  managerId={manager?._id ?? ''}
                  sectionName={section.name}
                  managerName={manager?.fullName ?? '—'}
                  onSuccess={() => setOnboardOpen(false)}
                />
                <ContractOnboardEmptyState
                  financialYearLabel={currentFY}
                  description='Add SSMARTA objectives, initiatives, and KPIs.'
                  canOnboard={sectionAccess.canOnboardContract && hasManager}
                  onOnboard={() => setOnboardOpen(true)}
                  missingAssigneeMessage={
                    sectionAccess.canOnboardContract && !hasManager
                      ? `Assign a manager to this ${scopeLabels.unit} before onboarding a contract.`
                      : undefined
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>
      )
    }

    if (view === 'sprints') {
      return (
        <WeeklySprintContent
          sectionId={section._id}
          sectionName={section.name}
          sprints={scopedSprints}
          initiatives={flattenInitiativesWithActivities(activeContract)}
          supervisorSprintInitiativesByStaffId={
            supervisorSprintInitiativesByStaffId
          }
          officers={officers}
          panelPortalNode={panelPortalNode}
          viewerStaffId={viewerStaffId}
          stakeholderEngagement={stakeholderEngagement}
          sectionAccess={sectionAccess}
          workspaceScope={scopeLabels.kind}
          presentation='single-view'
          singleView={activeSprintView}
        />
      )
    }

    if (view === 'stakeholders') {
      const usesProjectStakeholderMatrix =
        scopeLabels.kind === 'project' || scopeLabels.kind === 'workstream'
      const stakeholderScopeName = usesProjectStakeholderMatrix
        ? (stakeholderEngagement?.project?.name ??
          projectDisplayName ??
          section.name)
        : section.name

      return (
        <Card>
          <CardContent className='pt-6'>
            <StakeholderEngagementContent
              sectionId={usesProjectStakeholderMatrix ? undefined : section._id}
              projectId={usesProjectStakeholderMatrix ? projectId : undefined}
              scopeName={stakeholderScopeName}
              scopeUnit={usesProjectStakeholderMatrix ? 'project' : 'section'}
              canBootstrapEngagement={scopeLabels.kind !== 'workstream'}
              engagement={stakeholderEngagement}
              staffOptions={staffOptions}
              viewerStaffId={viewerStaffId}
              sprints={sprints}
              initiatives={flattenInitiatives(
                (isProjectWorkstreamWorkspace
                  ? sectionContract
                  : activeContract) as SectionContract | null,
              )}
            />
          </CardContent>
        </Card>
      )
    }

    if (view === 'staff') {
      const projectWorkstreamMemberAdd =
        isProjectWorkstreamWorkspace &&
        projectId &&
        sectionAccess.canManageWorkstreamStaff
          ? {
              projectId,
              workstreamId: section._id,
              workstreamName: section.name,
              memberRoster: projectMemberRoster ?? [],
            }
          : undefined

      return (
        <SectionStaffContent
          sectionId={section._id}
          sectionName={section.name}
          roster={staffRoster}
          sectionAccess={sectionAccess}
          staffScopeTitle={
            scopeLabels.kind === 'workstream' ? 'Workstream' : 'Section'
          }
          staffPageTitle={
            scopeLabels.kind === 'workstream' ? 'Members' : undefined
          }
          staffPageDescription={
            scopeLabels.kind === 'workstream' ? `` : undefined
          }
          addStaffLabel={projectWorkstreamMemberAdd ? 'Add member' : undefined}
          projectWorkstreamMemberAdd={projectWorkstreamMemberAdd}
        />
      )
    }

    return (
      <SectionReportingContent
        sectionName={section.name}
        sprints={scopedSprints}
      />
    )
  })()

  return (
    <div className='flex min-h-0 w-full flex-1 flex-col overflow-hidden lg:flex-row'>
      <div className='flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-4 pt-6 md:p-8'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-2xl font-bold'>{title}</h1>
          <p className='max-w-3xl text-sm text-muted-foreground'>
            {config.description}
          </p>
        </div>

        {content}
      </div>

      {showRightRail ? (
        <div className='hidden h-full min-h-0 shrink-0 border-l bg-muted/20 lg:flex'>
          {view === 'sprints' && activeSprintView === 'ready' ? (
            <div
              ref={setPanelPortalNode}
              className='flex h-full min-h-0 w-full flex-col overflow-y-auto overscroll-contain lg:w-[24rem]'
            />
          ) : (
            <aside className='flex h-full min-h-0 w-full flex-col overflow-y-auto overscroll-contain lg:w-72'>
              <div className='p-4 md:p-6'>
                <DueTodayThisWeek
                  dueToday={dueToday}
                  dueThisWeek={dueThisWeek}
                  dueThisMonth={dueThisMonth}
                  dueThisQuarter={dueThisQuarter}
                />
              </div>
            </aside>
          )}
        </div>
      ) : null}
    </div>
  )
}
