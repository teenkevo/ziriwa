'use client'

import * as React from 'react'
import { format, parseISO } from 'date-fns'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  ClipboardList,
  RefreshCcw,
  CalendarX,
  HandHelping,
} from 'lucide-react'

import type {
  AtRiskActivity,
  AtRiskPeriodDeliverable,
  AtRiskSprintTask,
  LateEngagement,
} from '@/lib/section-dashboard-metrics'

interface OverduePanelProps {
  overdueActivities: AtRiskActivity[]
  overduePeriodDeliverables: AtRiskPeriodDeliverable[]
  pendingReviewTasks: AtRiskSprintTask[]
  revisionRequestedTasks: AtRiskSprintTask[]
  lateEngagements: LateEngagement[]
}

function GroupHeader({
  icon: Icon,
  label,
  count,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
}) {
  return (
    <div className='flex items-center justify-between gap-2 mb-2'>
      <div className='inline-flex items-center gap-2 text-sm font-medium'>
        <Icon className='h-4 w-4 text-muted-foreground' />
        {label}
      </div>
      <Badge
        variant={count > 0 ? 'destructive' : 'outline'}
        className='tabular-nums'
      >
        {count}
      </Badge>
    </div>
  )
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className='text-xs text-muted-foreground italic'>{children}</p>
  )
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return ''
  try {
    return format(parseISO(iso), 'EEE, MMM d')
  } catch {
    return iso
  }
}

function daysLabel(n: number): string {
  if (n <= 0) return 'today'
  if (n === 1) return '1 day late'
  return `${n} days late`
}

export function OverduePanel({
  overdueActivities,
  overduePeriodDeliverables,
  pendingReviewTasks,
  revisionRequestedTasks,
  lateEngagements,
}: OverduePanelProps) {
  const totalAtRisk =
    overdueActivities.length +
    overduePeriodDeliverables.length +
    pendingReviewTasks.length +
    revisionRequestedTasks.length +
    lateEngagements.length

  return (
    <Card>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <CardTitle className='flex items-center gap-2 text-base'>
              <AlertTriangle className='h-4 w-4 text-destructive' />
              Overdue / At risk
            </CardTitle>
            <CardDescription>
              Items that need attention now: missed deadlines, work waiting on
              review, or stakeholder engagements past their date.
            </CardDescription>
          </div>
          <Badge
            variant={totalAtRisk > 0 ? 'destructive' : 'secondary'}
            className='tabular-nums'
          >
            {totalAtRisk}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
          <div>
            <GroupHeader
              icon={CalendarX}
              label='Overdue activities'
              count={overdueActivities.length}
            />
            {overdueActivities.length === 0 ? (
              <EmptyHint>Nothing overdue.</EmptyHint>
            ) : (
              <ul className='space-y-2'>
                {overdueActivities.slice(0, 5).map(item => (
                  <li
                    key={item._key}
                    className='text-sm border-l-2 border-destructive/60 pl-2'
                  >
                    <div className='font-medium truncate'>{item.title}</div>
                    <div className='text-xs text-muted-foreground'>
                      Due {fmtDate(item.targetDate)} · {daysLabel(item.daysOverdue)}
                    </div>
                    {item.initiativeTitle && (
                      <div className='text-xs text-muted-foreground truncate'>
                        {item.initiativeTitle}
                      </div>
                    )}
                  </li>
                ))}
                {overdueActivities.length > 5 && (
                  <li className='text-xs text-muted-foreground'>
                    +{overdueActivities.length - 5} more
                  </li>
                )}
              </ul>
            )}
          </div>

          <div>
            <GroupHeader
              icon={ClipboardList}
              label='Overdue period deliverables'
              count={overduePeriodDeliverables.length}
            />
            {overduePeriodDeliverables.length === 0 ? (
              <EmptyHint>No missed reporting periods.</EmptyHint>
            ) : (
              <ul className='space-y-2'>
                {overduePeriodDeliverables.slice(0, 5).map(item => (
                  <li
                    key={item._key}
                    className='text-sm border-l-2 border-destructive/60 pl-2'
                  >
                    <div className='font-medium truncate'>{item.title}</div>
                    <div className='text-xs text-muted-foreground'>
                      {item.periodLabel} · {daysLabel(item.daysOverdue)}
                    </div>
                    {item.activityTitle && (
                      <div className='text-xs text-muted-foreground truncate'>
                        {item.activityTitle}
                      </div>
                    )}
                  </li>
                ))}
                {overduePeriodDeliverables.length > 5 && (
                  <li className='text-xs text-muted-foreground'>
                    +{overduePeriodDeliverables.length - 5} more
                  </li>
                )}
              </ul>
            )}
          </div>

          <div>
            <GroupHeader
              icon={ClipboardList}
              label='Sprint tasks awaiting review'
              count={pendingReviewTasks.length}
            />
            {pendingReviewTasks.length === 0 ? (
              <EmptyHint>All submitted sprint tasks reviewed.</EmptyHint>
            ) : (
              <ul className='space-y-2'>
                {pendingReviewTasks.slice(0, 5).map(item => (
                  <li
                    key={`${item.sprintId}-${item._key}`}
                    className='text-sm border-l-2 border-amber-500/60 pl-2'
                  >
                    <div className='font-medium truncate'>{item.title}</div>
                    <div className='text-xs text-muted-foreground'>
                      {item.sprintWeekLabel}
                      {item.assigneeName && ` · ${item.assigneeName}`}
                    </div>
                  </li>
                ))}
                {pendingReviewTasks.length > 5 && (
                  <li className='text-xs text-muted-foreground'>
                    +{pendingReviewTasks.length - 5} more
                  </li>
                )}
              </ul>
            )}
          </div>

          <div>
            <GroupHeader
              icon={RefreshCcw}
              label='Tasks needing revision'
              count={revisionRequestedTasks.length}
            />
            {revisionRequestedTasks.length === 0 ? (
              <EmptyHint>No revision requests outstanding.</EmptyHint>
            ) : (
              <ul className='space-y-2'>
                {revisionRequestedTasks.slice(0, 5).map(item => (
                  <li
                    key={`${item.sprintId}-${item._key}`}
                    className='text-sm border-l-2 border-amber-500/60 pl-2'
                  >
                    <div className='font-medium truncate'>{item.title}</div>
                    <div className='text-xs text-muted-foreground'>
                      {item.sprintWeekLabel}
                      {item.assigneeName && ` · ${item.assigneeName}`}
                    </div>
                  </li>
                ))}
                {revisionRequestedTasks.length > 5 && (
                  <li className='text-xs text-muted-foreground'>
                    +{revisionRequestedTasks.length - 5} more
                  </li>
                )}
              </ul>
            )}
          </div>

          <div className='md:col-span-2 xl:col-span-1'>
            <GroupHeader
              icon={HandHelping}
              label='Stakeholder engagements past date'
              count={lateEngagements.length}
            />
            {lateEngagements.length === 0 ? (
              <EmptyHint>All proposed engagements still upcoming.</EmptyHint>
            ) : (
              <ul className='space-y-2'>
                {lateEngagements.slice(0, 5).map(item => (
                  <li
                    key={item._key}
                    className='text-sm border-l-2 border-destructive/60 pl-2'
                  >
                    <div className='font-medium truncate'>{item.name}</div>
                    <div className='text-xs text-muted-foreground'>
                      Proposed {fmtDate(item.proposedDate)} ·{' '}
                      {daysLabel(item.daysLate)}
                    </div>
                    {item.modeOfEngagement && (
                      <div className='text-xs text-muted-foreground capitalize'>
                        {item.modeOfEngagement.replace(/_/g, ' ')}
                      </div>
                    )}
                  </li>
                ))}
                {lateEngagements.length > 5 && (
                  <li className='text-xs text-muted-foreground'>
                    +{lateEngagements.length - 5} more
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
