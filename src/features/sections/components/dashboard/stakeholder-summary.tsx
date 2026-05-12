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
import { cn } from '@/lib/utils'

import type { SectionDashboardMetrics } from '@/lib/section-dashboard-metrics'

interface StakeholderSummaryProps {
  metrics: SectionDashboardMetrics
}

const QUADRANT_DEFINITIONS = [
  {
    key: 'manageClosely',
    label: 'Manage closely',
    hint: 'High power, high interest',
    accent: 'border-l-destructive',
  },
  {
    key: 'keepSatisfied',
    label: 'Keep satisfied',
    hint: 'High power, low interest',
    accent: 'border-l-amber-500',
  },
  {
    key: 'keepInformed',
    label: 'Keep informed',
    hint: 'Low power, high interest',
    accent: 'border-l-blue-500',
  },
  {
    key: 'monitor',
    label: 'Monitor',
    hint: 'Low power, low interest',
    accent: 'border-l-muted-foreground/40',
  },
] as const

function fmt(iso?: string): string {
  if (!iso) return ''
  try {
    return format(parseISO(iso), 'EEE, MMM d')
  } catch {
    return iso
  }
}

export function StakeholderSummary({ metrics }: StakeholderSummaryProps) {
  const quadrants = metrics.stakeholderQuadrants
  const pr = metrics.stakeholderPriorityMix
  const totalPriority = pr.H + pr.M + pr.L + pr.unknown
  const totalEntries = metrics.stakeholderEngagement.total

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-base'>Stakeholders</CardTitle>
        <CardDescription>
          {totalEntries === 0
            ? 'No stakeholders captured for this FY.'
            : `${totalEntries} stakeholder${totalEntries === 1 ? '' : 's'} mapped, ${metrics.stakeholderEngagement.withReport} with a filed report.`}
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-5'>
        <div>
          {/* <div className='text-sm font-medium mb-2'>
            Power x Interest distribution
          </div> */}
          <div className='grid grid-cols-2 gap-2'>
            {QUADRANT_DEFINITIONS.map(q => (
              <div
                key={q.key}
                className={cn(
                  'rounded-md border bg-muted/30 px-3 py-2 border-l-4',
                  q.accent,
                )}
              >
                <div className='flex items-baseline justify-between gap-2'>
                  <div className='text-sm font-medium truncate'>{q.label}</div>
                  <div className='text-lg font-semibold tabular-nums'>
                    {quadrants[q.key]}
                  </div>
                </div>
                <div className='text-xs text-muted-foreground'>{q.hint}</div>
              </div>
            ))}
          </div>
          {quadrants.uncategorized > 0 && (
            <p className='mt-2 text-xs text-muted-foreground'>
              {quadrants.uncategorized} stakeholder
              {quadrants.uncategorized === 1 ? '' : 's'} with mixed (M) power or
              interest not shown above.
            </p>
          )}
        </div>

        <div>
          <div className='text-sm font-medium mb-2'>Priority mix</div>
          {totalPriority === 0 ? (
            <p className='text-xs text-muted-foreground italic'>
              No priority assigned.
            </p>
          ) : (
            <div className='space-y-4'>
              <PriorityBar
                label='High'
                value={pr.H}
                total={totalPriority}
                accent='bg-destructive'
              />
              <PriorityBar
                label='Medium'
                value={pr.M}
                total={totalPriority}
                accent='bg-amber-500'
              />
              <PriorityBar
                label='Low'
                value={pr.L}
                total={totalPriority}
                accent='bg-blue-500'
              />
              {pr.unknown > 0 && (
                <PriorityBar
                  label='Unset'
                  value={pr.unknown}
                  total={totalPriority}
                  accent='bg-muted-foreground/40'
                />
              )}
            </div>
          )}
        </div>

        <div>
          <div className='text-sm font-medium mb-2'>
            Upcoming engagements (next 30 days)
          </div>
          {metrics.upcomingEngagements.length === 0 ? (
            <p className='text-xs text-muted-foreground italic'>
              Nothing scheduled in the next 30 days.
            </p>
          ) : (
            <ul className='space-y-2'>
              {metrics.upcomingEngagements.slice(0, 6).map(item => (
                <li
                  key={item._key}
                  className='text-sm border-l-2 border-primary/60 pl-2'
                >
                  <div className='font-medium truncate'>{item.name}</div>
                  <div className='text-xs text-muted-foreground'>
                    {fmt(item.proposedDate)}
                    {item.modeOfEngagement && (
                      <span className='capitalize'>
                        {' · '}
                        {item.modeOfEngagement.replace(/_/g, ' ')}
                      </span>
                    )}
                    {item.designation && ` · ${item.designation}`}
                  </div>
                </li>
              ))}
              {metrics.upcomingEngagements.length > 6 && (
                <li className='text-xs text-muted-foreground'>
                  +{metrics.upcomingEngagements.length - 6} more
                </li>
              )}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function PriorityBar({
  label,
  value,
  total,
  accent,
}: {
  label: string
  value: number
  total: number
  accent: string
}) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100)
  return (
    <div className='space-y-2'>
      <div className='flex items-baseline justify-between text-xs'>
        <span className='text-muted-foreground'>{label}</span>
        <span className='tabular-nums'>
          {value} · {pct}%
        </span>
      </div>
      <div className='h-1.5 w-full overflow-hidden rounded-full bg-muted'>
        <div
          className={cn('h-full transition-all', accent)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
