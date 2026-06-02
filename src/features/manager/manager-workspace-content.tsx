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
import { OnboardSupervisorContractDialog } from '@/features/sections/components/onboard-supervisor-contract-dialog'
import { SupervisorCascadeImportDialog } from '@/features/sections/components/supervisor-cascade-import-dialog'
import { OnboardOfficerContractDialog } from '@/features/sections/components/onboard-officer-contract-dialog'
import { DueTodayThisWeek } from '@/features/sections/components/due-today-this-week'
import { getSprintsPageTitle, type SprintView } from '@/lib/sprint-view-labels'
import type { InitiativeWithActivities } from '@/features/sections/weekly-sprint-content'
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
  workspaceBasePath?: WorkspaceBasePath
}

function flattenInitiativesWithActivities(
  contract:
    | SectionContract
    | SupervisorContract
    | OfficerContract
    | null
    | undefined,
): InitiativeWithActivities[] {
  if (!contract?.objectives) return []
  const out: InitiativeWithActivities[] = []
  for (const obj of contract.objectives) {
    for (const init of obj.initiatives ?? []) {
      const key = init._key
      if (!key || !init.title) continue
      out.push({
        key,
        title: `${init.code ? init.code + ' – ' : ''}${init.title}`,
        activities: (init.measurableActivities ?? [])
          .filter(a => a._key && a.title)
          .map(a => ({ key: a._key, title: a.title })),
      })
    }
  }
  return out
}

const viewConfig: Record<
  ManagerWorkspaceView,
  { title: string; description: string }
> = {
  dashboard: {
    title: 'Dashboard',
    description:
      'Section performance, sprint progress, contract status, and pending work.',
  },
  contract: {
    title: 'Contract',
    description:
      'Manage SSMARTA objectives, initiatives, measurable activities, and deliverables.',
  },
  sprints: {
    title: 'Sprints',
    description: 'Manage weekly sprints and tasks for your section.',
  },
  stakeholders: {
    title: 'Stakeholders',
    description:
      'Maintain stakeholder engagement plans and reports for your section.',
  },
  staff: {
    title: 'Staff',
    description: 'Manage section staff, delegations, and transfers.',
  },
  reporting: {
    title: 'Reporting',
    description: 'Generate weekly reports from completed sprints.',
  },
}

export function ManagerWorkspaceContent({
  view,
  sprintView,
  sprintReviewLabel = 'To Review',
  workspaceBasePath = '/manager',
  section,
  sectionContract,
  supervisorContract = null,
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
  viewerStaffId,
  sectionAccess,
  staffRoster,
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
  const usesOfficerContract =
    workspaceBasePath === '/officer' || shouldUseOfficerContract(sectionAccess)
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
    ? sectionAccess.canManageOfficerContract || workspaceBasePath === '/officer'
    : usesSupervisorContract
      ? sectionAccess.canManageSupervisorContract ||
        sectionAccess.isSectionSupervisor
      : sectionAccess.canManageContract
  const leadershipContractsApi: Extract<
    ContractsApiResource,
    'supervisor-contracts' | 'officer-contracts'
  > = usesOfficerContract ? 'officer-contracts' : 'supervisor-contracts'
  const workspaceRoleLabel = sectionAccess.isSectionManager
    ? 'Manager'
    : sectionAccess.isSectionSupervisor
      ? 'Supervisor'
      : sectionAccess.isSectionOfficer
        ? 'Officer'
        : 'Manager'
  const personalContractDisplayName = usesOfficerContract
    ? (officerContract?.officer?.fullName ?? 'Officer')
    : (supervisorContract?.supervisor?.fullName ?? 'Supervisor')
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

  const activeSprintView: SprintView = usesOfficerContract
    ? 'ready'
    : (sprintView ?? 'ready')

  const pageTitle =
    view === 'sprints' ? getSprintsPageTitle(activeSprintView) : config.title

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
                        Cascade from manager
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
                    contractsApi={leadershipContractsApi}
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
                  onSuccess={() => setOnboardOpen(false)}
                />
                <div className='flex items-center gap-2 text-muted-foreground'>
                  <FileText className='h-5 w-5' />
                  <span>No officer contract for {currentFY}</span>
                </div>
                <p className='text-sm'>
                  Onboard your contract to add SSMARTA objectives, initiatives,
                  and measurable activities.
                </p>
                {sectionAccess.canManageOfficerContract ||
                workspaceBasePath === '/officer' ? (
                  <Button onClick={() => setOnboardOpen(true)}>
                    Onboard Contract
                  </Button>
                ) : null}
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
                  onSuccess={() => setOnboardOpen(false)}
                />
                <div className='flex items-center gap-2 text-muted-foreground'>
                  <FileText className='h-5 w-5' />
                  <span>No supervisor contract for {currentFY}</span>
                </div>
                <p className='text-sm'>
                  Onboard your contract to add SSMARTA objectives, initiatives,
                  and measurable activities.
                </p>
                {canManageActiveContract ? (
                  <Button onClick={() => setOnboardOpen(true)}>
                    Onboard Contract
                  </Button>
                ) : null}
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
                <div className='flex items-center gap-2 text-muted-foreground'>
                  <FileText className='h-5 w-5' />
                  <span>No contract for {currentFY}</span>
                </div>
                <p className='text-sm'>
                  Onboard a contract to add SSMARTA objectives, initiatives, and
                  KPIs.
                </p>
                {sectionAccess.canOnboardContract && hasManager ? (
                  <Button onClick={() => setOnboardOpen(true)}>
                    Onboard Contract
                  </Button>
                ) : sectionAccess.canOnboardContract ? null : (
                  <p className='text-sm text-muted-foreground'>
                    Assign a manager to this section before onboarding a
                    contract.
                  </p>
                )}
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
          officers={officers}
          panelPortalNode={panelPortalNode}
          viewerStaffId={viewerStaffId}
          sectionAccess={sectionAccess}
          presentation='single-view'
          singleView={activeSprintView}
        />
      )
    }

    if (view === 'stakeholders') {
      return (
        <Card>
          <CardContent className='pt-6'>
            <StakeholderEngagementContent
              sectionId={section._id}
              sectionName={section.name}
              engagement={stakeholderEngagement}
              staffOptions={staffOptions}
              initiatives={flattenInitiatives(
                activeContract as SectionContract | null,
              )}
            />
          </CardContent>
        </Card>
      )
    }

    if (view === 'staff') {
      return (
        <SectionStaffContent
          sectionId={section._id}
          sectionName={section.name}
          roster={staffRoster}
          sectionAccess={sectionAccess}
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
