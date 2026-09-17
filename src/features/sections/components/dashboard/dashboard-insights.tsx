'use client'

import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { WorkspaceScopeKind } from '@/lib/project-workspace-copy'
import type { SectionDashboardMetrics } from '@/lib/section-dashboard-metrics'
import { getDashboardActivityCategoryKeys } from '@/lib/sprint-task-validation'

interface DashboardInsightsProps {
  metrics: SectionDashboardMetrics
  showStakeholders: boolean
  workspaceScope?: WorkspaceScopeKind
  onOpenContract?: () => void
  onOpenSprints?: () => void
  onOpenStakeholders?: () => void
}

const TREND_CONFIG: ChartConfig = {
  doneTasks: { label: 'Done', color: 'hsl(142 71% 45%)' },
  acceptedTasks: { label: 'Accepted', color: 'hsl(217 91% 60%)' },
}

function fmt(iso?: string): string {
  if (!iso) return ''
  try {
    return format(parseISO(iso), 'EEE, MMM d')
  } catch {
    return iso
  }
}

/**
 * Secondary analytics — progress and trend without dominating first paint.
 */
export function DashboardInsights({
  metrics,
  showStakeholders,
  workspaceScope = 'mainstream',
  onOpenContract,
  onOpenSprints,
  onOpenStakeholders,
}: DashboardInsightsProps) {
  const topObjectives = React.useMemo(
    () =>
      [...metrics.objectiveProgress]
        .sort((a, b) => a.percent - b.percent)
        .slice(0, 4),
    [metrics.objectiveProgress],
  )

  const trendData = React.useMemo(
    () =>
      metrics.weeklyTrend.map(p => ({
        weekShort:
          p.weekLabel.replace(/Week\s+/i, 'W').replace(/\s+\d{4}$/, '') ||
          p.weekLabel,
        weekLabel: p.weekLabel,
        doneTasks: p.doneTasks,
        acceptedTasks: p.acceptedTasks,
      })),
    [metrics.weeklyTrend],
  )

  const statusParts = React.useMemo(() => {
    const b = metrics.activityStatusBreakdown
    const total = b.not_started + b.in_progress + b.completed
    if (total === 0) return []
    return [
      {
        key: 'completed',
        label: 'Done',
        value: b.completed,
        className: 'bg-emerald-500',
      },
      {
        key: 'in_progress',
        label: 'In progress',
        value: b.in_progress,
        className: 'bg-sky-500',
      },
      {
        key: 'not_started',
        label: 'Not started',
        value: b.not_started,
        className: 'bg-muted-foreground/35',
      },
    ].filter(p => p.value > 0)
  }, [metrics.activityStatusBreakdown])

  const statusTotal = statusParts.reduce((s, p) => s + p.value, 0)

  const categoryKeys = React.useMemo(
    () => getDashboardActivityCategoryKeys(workspaceScope),
    [workspaceScope],
  )

  const topCategories = React.useMemo(() => {
    return categoryKeys
      .map(key => ({
        key,
        value:
          metrics.activityCategoryBreakdown[
            key as keyof typeof metrics.activityCategoryBreakdown
          ] ?? 0,
      }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 4)
  }, [categoryKeys, metrics.activityCategoryBreakdown])

  const pr = metrics.stakeholderPriorityMix
  const totalPriority = pr.H + pr.M + pr.L + pr.unknown

  return (
    <section className='space-y-3'>
      <div className='flex items-end justify-between gap-3 px-0.5'>
        <div>
          <h2 className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
            Insights
          </h2>
          <p className='mt-0.5 text-sm text-muted-foreground'>
            Progress and load behind the attention list.
          </p>
        </div>
      </div>

      <div
        className={cn(
          'grid gap-3',
          showStakeholders
            ? 'lg:grid-cols-3'
            : 'lg:grid-cols-2',
        )}
      >
        {/* Contract */}
        <div className='rounded-xl border border-border/80 bg-card p-4'>
          <button
            type='button'
            onClick={onOpenContract}
            disabled={!onOpenContract}
            className={cn(
              'flex w-full items-baseline justify-between gap-2 text-left',
              onOpenContract && 'hover:opacity-80',
            )}
          >
            <h3 className='text-sm font-semibold'>Contract</h3>
            <span className='text-xs tabular-nums text-muted-foreground'>
              {metrics.totals.activities} activities
            </span>
          </button>

          {statusTotal > 0 ? (
            <div className='mt-3 space-y-2'>
              <div className='flex h-2 overflow-hidden rounded-full bg-muted'>
                {statusParts.map(part => (
                  <div
                    key={part.key}
                    className={cn('h-full', part.className)}
                    style={{
                      width: `${Math.round((part.value / statusTotal) * 100)}%`,
                    }}
                    title={`${part.label}: ${part.value}`}
                  />
                ))}
              </div>
              <div className='flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground'>
                {statusParts.map(part => (
                  <span key={part.key} className='inline-flex items-center gap-1.5'>
                    <span
                      className={cn('size-1.5 rounded-full', part.className)}
                    />
                    {part.label}{' '}
                    <span className='tabular-nums text-foreground'>
                      {part.value}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className='mt-3 text-xs text-muted-foreground'>
              No measurable activities yet.
            </p>
          )}

          <div className='mt-4 space-y-2.5'>
            <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
              Objectives needing lift
            </p>
            {topObjectives.length === 0 ? (
              <p className='text-xs text-muted-foreground'>No objectives yet.</p>
            ) : (
              <ul className='space-y-2.5'>
                {topObjectives.map(obj => (
                  <li key={obj._key} className='space-y-1'>
                    <div className='flex items-baseline justify-between gap-2 text-xs'>
                      <span className='min-w-0 truncate font-medium'>
                        {obj.code ? (
                          <span className='mr-1.5 font-mono text-muted-foreground'>
                            {obj.code}
                          </span>
                        ) : null}
                        {obj.title}
                      </span>
                      <span className='shrink-0 tabular-nums text-muted-foreground'>
                        {obj.percent}%
                      </span>
                    </div>
                    <Progress value={obj.percent} className='h-1' />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Sprints */}
        <div className='rounded-xl border border-border/80 bg-card p-4'>
          <button
            type='button'
            onClick={onOpenSprints}
            disabled={!onOpenSprints}
            className={cn(
              'flex w-full items-baseline justify-between gap-2 text-left',
              onOpenSprints && 'hover:opacity-80',
            )}
          >
            <h3 className='text-sm font-semibold'>Sprints</h3>
            <span className='text-xs tabular-nums text-muted-foreground'>
              {metrics.weeklyTrend.length} week
              {metrics.weeklyTrend.length === 1 ? '' : 's'}
            </span>
          </button>

          <div className='mt-3'>
            {trendData.length === 0 ? (
              <p className='text-xs text-muted-foreground'>
                No sprints submitted yet.
              </p>
            ) : (
              <ChartContainer
                config={TREND_CONFIG}
                className='h-[140px] w-full'
              >
                <BarChart data={trendData} margin={{ top: 4, right: 4, left: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray='3 3' />
                  <XAxis
                    dataKey='weekShort'
                    tickLine={false}
                    axisLine={false}
                    tickMargin={6}
                    fontSize={10}
                  />
                  <YAxis hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey='acceptedTasks'
                    fill='var(--color-acceptedTasks)'
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey='doneTasks'
                    fill='var(--color-doneTasks)'
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </div>

          {metrics.officerLoad.length > 0 ? (
            <div className='mt-3 space-y-1.5 border-t border-border/60 pt-3'>
              <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                Officer load
              </p>
              <ul className='space-y-1'>
                {metrics.officerLoad.slice(0, 4).map(o => (
                  <li
                    key={o.staffId}
                    className='flex items-center justify-between gap-2 text-xs'
                  >
                    <span className='truncate'>{o.fullName}</span>
                    <span className='shrink-0 tabular-nums text-muted-foreground'>
                      {o.active} active · {o.doneThisMonth} done
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : topCategories.length > 0 ? (
            <div className='mt-3 space-y-1.5 border-t border-border/60 pt-3'>
              <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                Top categories
              </p>
              <ul className='space-y-1'>
                {topCategories.map(c => (
                  <li
                    key={c.key}
                    className='flex items-center justify-between gap-2 text-xs'
                  >
                    <span className='truncate capitalize'>
                      {c.key.replace(/_/g, ' ')}
                    </span>
                    <span className='tabular-nums text-muted-foreground'>
                      {c.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Stakeholders */}
        {showStakeholders ? (
          <div className='rounded-xl border border-border/80 bg-card p-4'>
            <button
              type='button'
              onClick={onOpenStakeholders}
              disabled={!onOpenStakeholders}
              className={cn(
                'flex w-full items-baseline justify-between gap-2 text-left',
                onOpenStakeholders && 'hover:opacity-80',
              )}
            >
              <h3 className='text-sm font-semibold'>Stakeholders</h3>
              <span className='text-xs tabular-nums text-muted-foreground'>
                {metrics.stakeholderEngagement.total} mapped
              </span>
            </button>

            {metrics.stakeholderEngagement.total === 0 ? (
              <p className='mt-3 text-xs text-muted-foreground'>
                No stakeholders captured for this FY.
              </p>
            ) : (
              <>
                <div className='mt-3 grid grid-cols-2 gap-2'>
                  {(
                    [
                      ['manageClosely', 'Manage closely'],
                      ['keepSatisfied', 'Keep satisfied'],
                      ['keepInformed', 'Keep informed'],
                      ['monitor', 'Monitor'],
                    ] as const
                  ).map(([key, label]) => (
                    <div
                      key={key}
                      className='rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2'
                    >
                      <p className='text-[10px] text-muted-foreground'>{label}</p>
                      <p className='text-lg font-semibold tabular-nums'>
                        {metrics.stakeholderQuadrants[key]}
                      </p>
                    </div>
                  ))}
                </div>

                {totalPriority > 0 ? (
                  <div className='mt-3 flex h-1.5 overflow-hidden rounded-full bg-muted'>
                    {pr.H > 0 ? (
                      <div
                        className='bg-destructive'
                        style={{
                          width: `${Math.round((pr.H / totalPriority) * 100)}%`,
                        }}
                      />
                    ) : null}
                    {pr.M > 0 ? (
                      <div
                        className='bg-amber-500'
                        style={{
                          width: `${Math.round((pr.M / totalPriority) * 100)}%`,
                        }}
                      />
                    ) : null}
                    {pr.L > 0 ? (
                      <div
                        className='bg-sky-500'
                        style={{
                          width: `${Math.round((pr.L / totalPriority) * 100)}%`,
                        }}
                      />
                    ) : null}
                  </div>
                ) : null}

                <div className='mt-3 space-y-1.5 border-t border-border/60 pt-3'>
                  <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                    Next 30 days
                  </p>
                  {metrics.upcomingEngagements.length === 0 ? (
                    <p className='text-xs text-muted-foreground'>
                      Nothing scheduled.
                    </p>
                  ) : (
                    <ul className='space-y-1.5'>
                      {metrics.upcomingEngagements.slice(0, 4).map(item => (
                        <li key={item._key} className='text-xs'>
                          <span className='font-medium'>{item.name}</span>
                          <span className='text-muted-foreground'>
                            {' · '}
                            {fmt(item.proposedDate)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}
