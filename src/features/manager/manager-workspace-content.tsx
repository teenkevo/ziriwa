'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ChevronsDown,
  ChevronsUp,
  FileText,
  Plus,
  Users,
  Zap,
  Handshake,
  LayoutDashboard,
  FileBarChart,
  Loader2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'
import { flattenInitiatives } from '@/sanity/lib/section-contracts/get-section-contract'
import { SectionDashboardContent } from '@/features/sections/section-dashboard-content'
import { SectionStaffContent } from '@/features/sections/section-staff-content'
import { StakeholderEngagementContent } from '@/features/sections/stakeholder-engagement-content'
import { SectionReportingContent } from '@/features/sections/section-reporting-content'
import { WeeklySprintContent } from '@/features/sections/weekly-sprint-content'
import { ContractTree } from '@/features/sections/components/contract-tree'
import { OnboardContractDialog } from '@/features/sections/components/onboard-contract-dialog'
import { DueTodayThisWeek } from '@/features/sections/components/due-today-this-week'
import type { InitiativeWithActivities } from '@/features/sections/weekly-sprint-content'
import type { SectionPageContentProps } from '@/features/sections/section-page-content'

type WorkspaceData = SectionPageContentProps

type ManagerWorkspaceView =
  | 'dashboard'
  | 'contract'
  | 'sprints'
  | 'stakeholders'
  | 'staff'
  | 'reporting'

type SprintView = 'ready' | 'in-review' | 'draft'
type SprintTabValue = 'ready' | 'to-review' | 'drafts'

type ManagerWorkspaceContentProps = WorkspaceData & {
  view: ManagerWorkspaceView
  sprintView?: SprintView
  sprintReviewLabel?: string
}

function flattenInitiativesWithActivities(
  contract: WorkspaceData['sectionContract'],
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
  {
    title: string
    description: string
    icon: React.ComponentType<{ className?: string }>
  }
> = {
  dashboard: {
    title: 'Dashboard',
    description:
      'Section performance, sprint progress, contract status, and pending work.',
    icon: LayoutDashboard,
  },
  contract: {
    title: 'Contract',
    description:
      'Manage SSMARTA objectives, initiatives, measurable activities, and deliverables.',
    icon: FileText,
  },
  sprints: {
    title: 'Sprints',
    description:
      'Track ready work, review submitted sprint plans, and manage drafts.',
    icon: Zap,
  },
  stakeholders: {
    title: 'Stakeholders',
    description:
      'Maintain stakeholder engagement plans and reports for your section.',
    icon: Handshake,
  },
  staff: {
    title: 'Staff',
    description: 'Manage section staff, delegations, and transfers.',
    icon: Users,
  },
  reporting: {
    title: 'Reporting',
    description: 'Generate weekly sprint reports from section sprint data.',
    icon: FileBarChart,
  },
}

function sprintViewTitle(view?: SprintView, reviewLabel = 'To Review') {
  if (view === 'ready') return 'Ready Sprints'
  if (view === 'draft') return 'Draft Sprints'
  if (view === 'in-review') return reviewLabel
  return 'Sprints'
}

function sprintTabValue(view?: SprintView): SprintTabValue {
  if (view === 'in-review') return 'to-review'
  if (view === 'draft') return 'drafts'
  return 'ready'
}

function isModifiedClick(event: React.MouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey
}

export function ManagerWorkspaceContent({
  view,
  sprintView,
  sprintReviewLabel = 'To Review',
  section,
  sectionContract,
  stakeholderEngagement,
  staffOptions,
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
  const config = viewConfig[view]
  const Icon = config.icon
  const [panelPortalNode, setPanelPortalNode] =
    React.useState<HTMLDivElement | null>(null)
  const [onboardOpen, setOnboardOpen] = React.useState(false)
  const [expandAllSignal, setExpandAllSignal] = React.useState(0)
  const [collapseAllSignal, setCollapseAllSignal] = React.useState(0)
  const [treeBulkExpanded, setTreeBulkExpanded] = React.useState(false)
  const [addObjectiveSignal, setAddObjectiveSignal] = React.useState(0)
  const activeSprintTab = sprintTabValue(sprintView)
  const [pendingSprintTab, setPendingSprintTab] =
    React.useState<SprintTabValue | null>(null)

  React.useEffect(() => {
    setPendingSprintTab(null)
  }, [activeSprintTab])

  const handleSprintTabClick = React.useCallback(
    (
      tab: SprintTabValue,
      event: React.MouseEvent<HTMLAnchorElement>,
    ) => {
      if (event.defaultPrevented || isModifiedClick(event)) return
      if (tab === activeSprintTab) return
      setPendingSprintTab(tab)
    },
    [activeSprintTab],
  )

  const breadcrumbs = React.useMemo(
    () => [
      { label: 'Manager', href: '/manager/dashboard' },
      { label: config.title },
    ],
    [config.title],
  )
  useRegisterPageBreadcrumbs(breadcrumbs)

  const currentFY = sectionContract?.financialYearLabel ?? 'current FY'
  const manager = section.manager
  const hasManager = !!manager?._id
  const showRightRail = view === 'contract' || view === 'sprints'
  const title =
    view === 'sprints'
      ? sprintViewTitle(sprintView, sprintReviewLabel)
      : config.title

  const content = (() => {
    if (view === 'dashboard') {
      return (
        <SectionDashboardContent
          sectionName={section.name}
          sectionSlug={section.slug?.current}
          contract={sectionContract}
          sprints={safeSprints}
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
            {sectionContract ? (
              <div className='space-y-4'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  <div className='text-sm flex items-center gap-2 min-w-0'>
                    <FileText className='h-5 w-5 shrink-0' />
                    <span className='truncate'>{currentFY}</span>
                  </div>
                  <div className='flex flex-wrap items-center gap-2 sm:shrink-0'>
                    {sectionAccess.canManageContract ? (
                      <Button
                        type='button'
                        size='sm'
                        onClick={() => setAddObjectiveSignal(s => s + 1)}
                      >
                        <Plus className='h-4 w-4 mr-2' />
                        Add SSMARTA objective
                      </Button>
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
                <ContractTree
                  sectionContract={sectionContract}
                  sectionSlug={section.slug?.current ?? ''}
                  canManageContract={sectionAccess.canManageContract}
                  expandAllSignal={expandAllSignal}
                  collapseAllSignal={collapseAllSignal}
                  addObjectiveSignal={addObjectiveSignal}
                  onAddObjectiveRequestConsumed={() => setAddObjectiveSignal(0)}
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
                <div className='flex items-center gap-2 text-muted-foreground'>
                  <FileText className='h-5 w-5' />
                  <span>No contract for {currentFY}</span>
                </div>
                <p className='text-sm'>
                  Onboard a contract to add SSMARTA objectives, initiatives, and
                  KPIs.
                </p>
                {hasManager && sectionAccess.canManageContract ? (
                  <Button onClick={() => setOnboardOpen(true)}>
                    Onboard Contract
                  </Button>
                ) : hasManager ? null : (
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
          sprints={safeSprints}
          initiatives={flattenInitiativesWithActivities(sectionContract)}
          officers={officers}
          panelPortalNode={panelPortalNode}
          viewerStaffId={viewerStaffId}
          sectionAccess={sectionAccess}
          presentation='single-view'
          singleView={sprintView ?? 'ready'}
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
              initiatives={flattenInitiatives(sectionContract)}
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
        sprints={safeSprints}
      />
    )
  })()

  return (
    <div className='flex min-h-0 w-full flex-1 flex-col overflow-hidden lg:flex-row'>
      <div className='flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-4 pt-6 md:p-8'>
        <div className='flex flex-col gap-2 border-b pb-5'>
          <h1 className='text-2xl font-bold'>{title}</h1>
          <p className='max-w-3xl text-sm text-muted-foreground'>
            {view === 'sprints' ? config.description : config.description}
          </p>
          {view === 'sprints' ? (
            <Tabs value={activeSprintTab} className='mt-2'>
              <TabsList aria-busy={pendingSprintTab ? true : undefined}>
                <TabsTrigger value='ready' asChild>
                  <Link
                    href='/manager/sprints?tab=ready'
                    onClick={event => handleSprintTabClick('ready', event)}
                  >
                    Ready
                    {pendingSprintTab === 'ready' ? (
                      <Loader2 className='ml-2 h-3.5 w-3.5 animate-spin' />
                    ) : null}
                  </Link>
                </TabsTrigger>
                <TabsTrigger value='to-review' asChild>
                  <Link
                    href='/manager/sprints?tab=to-review'
                    onClick={event => handleSprintTabClick('to-review', event)}
                  >
                    {sprintReviewLabel}
                    {pendingSprintTab === 'to-review' ? (
                      <Loader2 className='ml-2 h-3.5 w-3.5 animate-spin' />
                    ) : null}
                  </Link>
                </TabsTrigger>
                <TabsTrigger value='drafts' asChild>
                  <Link
                    href='/manager/sprints?tab=drafts'
                    onClick={event => handleSprintTabClick('drafts', event)}
                  >
                    Drafts
                    {pendingSprintTab === 'drafts' ? (
                      <Loader2 className='ml-2 h-3.5 w-3.5 animate-spin' />
                    ) : null}
                  </Link>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}
        </div>

        {content}
      </div>

      {showRightRail ? (
        <div className='hidden h-full min-h-0 shrink-0 border-l bg-muted/20 lg:flex'>
          {view === 'sprints' && (sprintView ?? 'ready') === 'ready' ? (
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
