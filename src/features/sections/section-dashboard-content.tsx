'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText } from 'lucide-react'
import { format, parseISO } from 'date-fns'

import type { SectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import type { WeeklySprint } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'
import type { StakeholderEngagement } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'
import {
  buildSectionContractOversightSummary,
  buildSectionMonthlyOversightSummary,
  buildSectionWeeklyOversightSummary,
  buildSectionWeeklyReportPayload,
  buildStakeholderOversightSummary,
} from '@/lib/section-oversight'
import {
  MonthlyOversightCard,
  SplitMetricCard,
} from '@/features/manager/monthly-oversight-card'

import { OverduePanel } from './components/dashboard/overdue-panel'
import { ContractSummary } from './components/dashboard/contract-summary'
import { SprintSummary } from './components/dashboard/sprint-summary'
import { StakeholderSummary } from './components/dashboard/stakeholder-summary'
import type { DueItem } from './components/due-today-this-week'
import { Calendar, CalendarClock } from 'lucide-react'
import { computeSectionDashboardMetrics } from '@/lib/section-dashboard-metrics'
import type { SectionAccess } from '@/lib/section-access'
import { scopeSprintsForViewer } from '@/lib/sprint-workspace-scope'
import type { WorkspaceScopeKind } from '@/lib/project-workspace-copy'
import {
  getWorkspacePaths,
  type WorkspaceBasePath,
} from '@/lib/workspace-paths'

interface SectionDashboardContentProps {
  sectionName: string
  /** Used for overdue detailed task links to activity pages. */
  sectionSlug?: string
  contract: SectionContract | null
  /** Opens the matching section tab when the user picks an at-risk row. */
  onNavigateToTab?: (
    tab: 'contract' | 'stakeholder-engagements' | 'weekly-sprint',
  ) => void
  sprints: WeeklySprint[]
  /** When set, sprint metrics and weekly report use only this viewer's sprints. */
  sectionAccess?: SectionAccess
  engagement: StakeholderEngagement | null
  dueToday: DueItem[]
  dueThisWeek: DueItem[]
  dueThisMonth: DueItem[]
  dueThisQuarter: DueItem[]
  today: string
  workspaceBasePath?: WorkspaceBasePath
  workspaceScope?: WorkspaceScopeKind
}

export function SectionDashboardContent({
  sectionName,
  sectionSlug,
  contract,
  sprints,
  sectionAccess,
  engagement,
  dueToday,
  dueThisWeek,
  dueThisMonth,
  dueThisQuarter,
  today,
  onNavigateToTab,
  workspaceBasePath = '/manager',
  workspaceScope = 'mainstream',
}: SectionDashboardContentProps) {
  const paths = React.useMemo(
    () => getWorkspacePaths(workspaceBasePath),
    [workspaceBasePath],
  )
  const isOfficerWorkspace = workspaceBasePath === '/officer'
  const officerStaffId =
    isOfficerWorkspace && sectionAccess?.viewerStaffId
      ? sectionAccess.viewerStaffId
      : undefined

  const oversightSprints = React.useMemo(
    () => (sectionAccess ? scopeSprintsForViewer(sprints, sectionAccess) : sprints),
    [sprints, sectionAccess],
  )
  const oversightSprintSource = officerStaffId ? sprints : oversightSprints

  const metrics = React.useMemo(
    () =>
      computeSectionDashboardMetrics({
        contract,
        sprints: oversightSprints,
        engagement,
        today,
      }),
    [contract, oversightSprints, engagement, today],
  )

  const contractOversight = React.useMemo(
    () => buildSectionContractOversightSummary(contract, today),
    [contract, today],
  )

  const weeklyOversight = React.useMemo(
    () =>
      buildSectionWeeklyOversightSummary({
        contract,
        sprints: oversightSprintSource,
        engagement,
        today,
        officerStaffId,
      }),
    [contract, oversightSprintSource, engagement, today, officerStaffId],
  )

  const monthlyOversight = React.useMemo(
    () =>
      buildSectionMonthlyOversightSummary({
        contract,
        sprints: oversightSprintSource,
        engagement,
        today,
        officerStaffId,
      }),
    [contract, oversightSprintSource, engagement, today, officerStaffId],
  )

  const stakeholderOversight = React.useMemo(
    () =>
      buildStakeholderOversightSummary(
        engagement,
        contract?.financialYearLabel,
      ),
    [engagement, contract?.financialYearLabel],
  )

  const weeklyReport = React.useMemo(
    () =>
      buildSectionWeeklyReportPayload({
        sectionName,
        sprints: oversightSprints,
        today,
        weekLabel: weeklyOversight.periodLabel,
      }),
    [sectionName, oversightSprints, today, weeklyOversight.periodLabel],
  )

  const contractHref = onNavigateToTab ? undefined : paths.contract
  const sprintsHref = onNavigateToTab ? undefined : paths.sprintsReady
  const stakeholdersHref = onNavigateToTab ? undefined : paths.stakeholders
  const onContractClick = onNavigateToTab
    ? () => onNavigateToTab('contract')
    : undefined
  const onSprintsClick = onNavigateToTab
    ? () => onNavigateToTab('weekly-sprint')
    : undefined
  const onStakeholdersClick = onNavigateToTab
    ? () => onNavigateToTab('stakeholder-engagements')
    : undefined

  const contractCard = (
    <SplitMetricCard
      href={contractHref}
      onCardClick={onContractClick}
      title='Contract'
      data={{
        periodLabel: contractOversight.periodLabel,
        total: contractOversight.total,
        subtitle: contractOversight.subtitle,
      }}
      columns={[
        {
          label: 'Activities At Risk',
          value: contractOversight.breakdown.atRisk,
        },
        {
          label: 'Activities On Track',
          value: contractOversight.breakdown.onTrack,
        },
      ]}
    />
  )

  const weeklyCard = (
    <MonthlyOversightCard
      href={sprintsHref}
      onCardClick={onSprintsClick}
      data={weeklyOversight}
      breakdown={weeklyOversight.breakdown}
      title='Activities This week'
      weeklyReport={weeklyReport}
      breakdownLinks={{
        sprints: sprintsHref,
        engagements: stakeholdersHref,
        tasks: sprintsHref,
      }}
    />
  )

  const monthlyCard = (
    <MonthlyOversightCard
      data={monthlyOversight}
      breakdown={monthlyOversight.breakdown}
      href={stakeholdersHref}
      onCardClick={onStakeholdersClick}
      title='Activities This month'
      breakdownLinks={{
        sprints: sprintsHref,
        engagements: stakeholdersHref,
        tasks: sprintsHref,
      }}
    />
  )

  const stakeholdersCard = (
    <SplitMetricCard
      href={stakeholdersHref}
      onCardClick={onStakeholdersClick}
      title='Stakeholders'
      data={{
        periodLabel: stakeholderOversight.periodLabel,
        total: stakeholderOversight.total,
        subtitle: stakeholderOversight.subtitle,
      }}
      columns={[
        {
          label: 'Total',
          value: stakeholderOversight.breakdown.total,
        },
        {
          label: 'Reported',
          value: stakeholderOversight.breakdown.reported,
        },
        {
          label: 'Pending',
          value: stakeholderOversight.breakdown.pending,
        },
      ]}
    />
  )

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-x-6 gap-y-2 text-sm'>
        <div className='inline-flex items-center gap-2'>
          <FileText className='h-4 w-4 text-muted-foreground' />
          <span className='font-medium'>{metrics.fyLabel ?? '—'}</span>
        </div>
      </div>

      <div className='grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        {contractCard}
        {weeklyCard}
        {monthlyCard}
        {!isOfficerWorkspace ? stakeholdersCard : null}
      </div>

      <OverduePanel
        overdueActivities={metrics.overdueActivities}
        overduePeriodDeliverables={metrics.overduePeriodDeliverables}
        pendingReviewTasks={metrics.pendingReviewTasks}
        revisionRequestedTasks={metrics.revisionRequestedTasks}
        lateEngagements={metrics.lateEngagements}
        sectionSlug={sectionSlug}
        onNavigateToTab={onNavigateToTab}
        workspaceScope={workspaceScope}
      />

      <ContractSummary metrics={metrics} />

      <div className='grid grid-cols-1 gap-4 xl:grid-cols-3'>
        <div className='xl:col-span-2'>
          <SprintSummary
            metrics={metrics}
            workspaceScope={workspaceScope}
          />
        </div>
        {!isOfficerWorkspace ? (
          <StakeholderSummary metrics={metrics} />
        ) : null}
      </div>

      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <DueCard
          title='Due today'
          icon={Calendar}
          items={dueToday}
          emptyMessage='Nothing due today.'
          highlight
        />
        <DueCard
          title='Due this week'
          icon={CalendarClock}
          items={dueThisWeek}
          emptyMessage='Nothing due this week.'
        />
        <DueCard
          title='Due this month'
          icon={CalendarClock}
          items={dueThisMonth}
          emptyMessage='Nothing due this month.'
        />
        <DueCard
          title='Due this quarter'
          icon={CalendarClock}
          items={dueThisQuarter}
          emptyMessage='Nothing due this quarter.'
        />
      </div>
    </div>
  )
}

function DueCard({
  title,
  icon: Icon,
  items,
  emptyMessage,
  highlight,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: DueItem[]
  emptyMessage: string
  highlight?: boolean
}) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='flex items-center gap-2 text-sm font-medium'>
          <Icon className='h-4 w-4 text-muted-foreground' />
          {title}
          <span className='ml-auto tabular-nums text-sm text-muted-foreground'>
            {items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className='text-xs text-muted-foreground'>{emptyMessage}</p>
        ) : (
          <ul className='space-y-2'>
            {items.slice(0, 4).map(item => (
              <li
                key={item._key}
                className={`border-l-2 pl-2 text-sm ${highlight ? 'border-primary' : 'border-muted-foreground/30'}`}
              >
                <div className='truncate font-medium'>{item.title}</div>
                <div className='text-xs text-muted-foreground'>
                  {(() => {
                    if (!item.targetDate) return ''
                    try {
                      return format(parseISO(item.targetDate), 'EEE, MMM d')
                    } catch {
                      return item.targetDate
                    }
                  })()}
                  {item.activityTitle && ` · ${item.activityTitle}`}
                </div>
              </li>
            ))}
            {items.length > 4 && (
              <li className='text-xs text-muted-foreground'>
                +{items.length - 4} more
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
