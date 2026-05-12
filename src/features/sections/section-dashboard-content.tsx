'use client'

import * as React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, FileText, User2 } from 'lucide-react'

import { computeSectionDashboardMetrics } from '@/lib/section-dashboard-metrics'
import type { SectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import type { WeeklySprint } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'
import type { StakeholderEngagement } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'

import { KpiTiles } from './components/dashboard/kpi-tiles'
import { OverduePanel } from './components/dashboard/overdue-panel'
import { ContractSummary } from './components/dashboard/contract-summary'
import { SprintSummary } from './components/dashboard/sprint-summary'
import { StakeholderSummary } from './components/dashboard/stakeholder-summary'
import type { DueItem } from './components/due-today-this-week'
import { Calendar, CalendarClock } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface SectionDashboardContentProps {
  sectionName: string
  contract: SectionContract | null
  /** Opens the matching section tab when the user picks an at-risk row. */
  onNavigateToTab?: (
    tab: 'contract' | 'stakeholder-engagements' | 'weekly-sprint',
  ) => void
  sprints: WeeklySprint[]
  engagement: StakeholderEngagement | null
  dueToday: DueItem[]
  dueThisWeek: DueItem[]
  dueThisMonth: DueItem[]
  dueThisQuarter: DueItem[]
  today: string
}

function statusBadgeVariant(
  status?: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default'
    case 'completed':
      return 'secondary'
    case 'draft':
      return 'outline'
    default:
      return 'outline'
  }
}

export function SectionDashboardContent({
  sectionName,
  contract,
  sprints,
  engagement,
  dueToday,
  dueThisWeek,
  dueThisMonth,
  dueThisQuarter,
  today,
  onNavigateToTab,
}: SectionDashboardContentProps) {
  const metrics = React.useMemo(
    () =>
      computeSectionDashboardMetrics({
        contract,
        sprints,
        engagement,
        today,
      }),
    [contract, sprints, engagement, today],
  )

  if (!contract) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <FileText className='h-4 w-4' />
            No contract yet
          </CardTitle>
          <CardDescription>
            Onboard a performance contract from the Contract tab to start seeing
            dashboard metrics for {sectionName}.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-x-6 gap-y-2 text-sm'>
        <div className='inline-flex items-center gap-2'>
          <FileText className='h-4 w-4 text-muted-foreground' />
          <span className='font-medium'>{metrics.fyLabel ?? '—'}</span>
        </div>

        {metrics.lastSprintWeekLabel && (
          <div className='inline-flex items-center gap-2'>
            <CalendarDays className='h-4 w-4 text-muted-foreground' />
            <span className='text-muted-foreground'>Last sprint</span>
            <span className='font-medium'>{metrics.lastSprintWeekLabel}</span>
            {metrics.lastSprintStatus && (
              <Badge variant='outline' className='capitalize'>
                {metrics.lastSprintStatus.replace('_', ' ')}
              </Badge>
            )}
          </div>
        )}
      </div>

      <KpiTiles metrics={metrics} />

      <OverduePanel
        overdueActivities={metrics.overdueActivities}
        overduePeriodDeliverables={metrics.overduePeriodDeliverables}
        pendingReviewTasks={metrics.pendingReviewTasks}
        revisionRequestedTasks={metrics.revisionRequestedTasks}
        lateEngagements={metrics.lateEngagements}
        onNavigateToTab={onNavigateToTab}
      />

      <ContractSummary metrics={metrics} />

      <div className='grid grid-cols-1 gap-4 xl:grid-cols-3'>
        <div className='xl:col-span-2'>
          <SprintSummary metrics={metrics} />
        </div>
        <StakeholderSummary metrics={metrics} />
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
          <Badge
            variant={
              items.length === 0
                ? 'outline'
                : highlight
                  ? 'default'
                  : 'secondary'
            }
            className='ml-auto tabular-nums'
          >
            {items.length}
          </Badge>
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
                className={`text-sm border-l-2 pl-2 ${highlight ? 'border-primary' : 'border-muted-foreground/30'}`}
              >
                <div className='font-medium truncate'>{item.title}</div>
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
