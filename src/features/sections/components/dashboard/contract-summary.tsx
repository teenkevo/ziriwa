'use client'

import * as React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { StatusDonut, type DonutSlice } from './status-donut'

import type { SectionDashboardMetrics } from '@/lib/section-dashboard-metrics'

const ACTIVITY_STATUS_COLORS: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Not started', color: 'hsl(215 16% 65%)' },
  in_progress: { label: 'In progress', color: 'hsl(217 91% 60%)' },
  completed: { label: 'Completed', color: 'hsl(142 71% 45%)' },
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  'n/a': 'Not periodic',
}

interface ContractSummaryProps {
  metrics: SectionDashboardMetrics
  onOpenContract?: () => void
}

export function ContractSummary({ metrics }: ContractSummaryProps) {
  const statusSlices: DonutSlice[] = React.useMemo(
    () =>
      (
        Object.entries(metrics.activityStatusBreakdown) as [
          keyof typeof metrics.activityStatusBreakdown,
          number,
        ][]
      )
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({
          key: k,
          label: ACTIVITY_STATUS_COLORS[k]?.label ?? k,
          value: v,
          color: ACTIVITY_STATUS_COLORS[k]?.color ?? 'hsl(220 14% 75%)',
        })),
    [metrics.activityStatusBreakdown],
  )

  const topObjectives = React.useMemo(
    () =>
      [...metrics.objectiveProgress]
        .sort((a, b) => b.percent - a.percent)
        .slice(0, 5),
    [metrics.objectiveProgress],
  )

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-base'>Contract execution</CardTitle>
        <CardDescription>
          Status across {metrics.totals.activities} measurable activit
          {metrics.totals.activities === 1 ? 'y' : 'ies'} in{' '}
          {metrics.totals.objectives} SSMARTA objective
          {metrics.totals.objectives === 1 ? '' : 's'}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
          <div className='space-y-2'>
            <div className='text-sm font-medium'>Activity status</div>
            <StatusDonut
              slices={statusSlices}
              totalLabel='activities'
              totalValue={metrics.totals.activities}
            />
          </div>

          <div className='space-y-3 lg:col-span-2'>
            <div className='text-sm font-medium'>Objectives by progress</div>
            {topObjectives.length === 0 ? (
              <p className='text-xs text-muted-foreground italic'>
                No objectives yet.
              </p>
            ) : (
              <ul className='space-y-3'>
                {topObjectives.map(obj => (
                  <li key={obj._key} className='space-y-1'>
                    <div className='flex items-baseline justify-between gap-3 text-sm'>
                      <span className='truncate'>
                        {obj.code && (
                          <span className='font-mono text-xs text-muted-foreground mr-2'>
                            {obj.code}
                          </span>
                        )}
                        <span className='font-medium'>{obj.title}</span>
                      </span>
                      <span className='shrink-0 tabular-nums text-xs text-muted-foreground'>
                        {obj.completed}/{obj.total} · {obj.percent}%
                      </span>
                    </div>
                    <Progress value={obj.percent} className='h-1.5' />
                  </li>
                ))}
              </ul>
            )}

            <div className='grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4'>
              <Stat label='Initiatives' value={metrics.totals.initiatives} />
              <Stat label='KPIs' value={metrics.totals.kpiActivities} />
              <Stat
                label='Cross-cutting'
                value={metrics.totals.crossCuttingActivities}
              />
              <Stat
                label='Reported periodically'
                value={
                  metrics.totals.activities -
                  metrics.reportingFrequencyMix['n/a']
                }
              />
            </div>

            <div className='pt-1'>
              <div className='text-xs font-medium text-muted-foreground mb-1'>
                Reporting frequency
              </div>
              <div className='flex flex-wrap gap-2'>
                {(
                  Object.entries(metrics.reportingFrequencyMix) as [
                    keyof typeof metrics.reportingFrequencyMix,
                    number,
                  ][]
                ).map(([k, v]) => (
                  <span
                    key={k}
                    className='inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-0.5 text-xs'
                  >
                    <span className='text-muted-foreground'>
                      {FREQUENCY_LABELS[k] ?? k}
                    </span>
                    <span className='font-semibold tabular-nums'>{v}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className='rounded-md border border-border/60 bg-muted/40 px-3 py-2'>
      <div className='text-xs text-muted-foreground'>{label}</div>
      <div className='text-lg font-semibold tabular-nums'>{value}</div>
    </div>
  )
}
