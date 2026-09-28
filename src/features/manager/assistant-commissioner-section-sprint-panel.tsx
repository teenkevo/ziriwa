'use client'

import * as React from 'react'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AcSectionSprintMetrics } from './load-assistant-commissioner-dashboard'

function sectionSprintHref(row: AcSectionSprintMetrics) {
  return `/sections/${row.sectionSlug ?? row.sectionId}?tab=weekly-sprint`
}

function MetricCell({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'warn' | 'ok' | 'default'
}) {
  return (
    <div className='min-w-0'>
      <p className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
        {label}
      </p>
      <p
        className={cn(
          'mt-0.5 text-sm font-semibold tabular-nums',
          tone === 'warn' && 'text-destructive',
          tone === 'ok' && 'text-emerald-600 dark:text-emerald-500',
        )}
      >
        {value}
      </p>
    </div>
  )
}

export function AssistantCommissionerSectionSprintPanel({
  rows,
  weekLabel,
}: {
  rows: AcSectionSprintMetrics[]
  weekLabel?: string
}) {
  const sorted = React.useMemo(() => {
    return [...rows].sort((a, b) => {
      if (b.inReview.tasks !== a.inReview.tasks)
        return b.inReview.tasks - a.inReview.tasks
      if (b.atRisk !== a.atRisk) return b.atRisk - a.atRisk
      return a.sectionName.localeCompare(b.sectionName)
    })
  }, [rows])

  return (
    <section
      aria-label='Section sprint metrics'
      className='flex flex-col gap-2'
    >
      <div className='flex items-center justify-between gap-3 px-0.5'>
        <h2 className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
          Section Sprints
        </h2>
        <p className='truncate text-xs text-muted-foreground'>
          {weekLabel || 'This week'}
        </p>
      </div>

      <div className='overflow-hidden rounded-xl border border-border/80 bg-card'>
        <ul className='max-h-[min(32rem,60vh)] divide-y overflow-y-auto'>
          {sorted.map(row => {
            const plannedTone =
              row.planned.max > 0 && row.planned.count < row.planned.max
                ? 'warn'
                : row.planned.count > 0
                  ? 'ok'
                  : 'default'
            const href = sectionSprintHref(row)
            return (
              <li key={row.sectionId}>
                <Link
                  href={href}
                  className='block px-4 py-3 transition-colors hover:bg-muted/40'
                >
                  <div className='flex items-start justify-between gap-2'>
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-semibold'>
                        {row.sectionName}
                      </p>
                      {row.weekLabel ? (
                        <p className='text-[11px] text-muted-foreground'>
                          {row.weekLabel}
                        </p>
                      ) : null}
                    </div>
                    {(row.inReview.tasks > 0 || row.atRisk > 0) && (
                      <Badge
                        variant='outline'
                        className='shrink-0 border-destructive/40 bg-destructive/10 text-[10px] text-destructive'
                      >
                        Needs you
                      </Badge>
                    )}
                  </div>
                  <div className='mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4'>
                    <MetricCell
                      label='Planned'
                      value={`${row.planned.count}/${row.planned.max || '—'}`}
                      tone={plannedTone}
                    />
                    <MetricCell
                      label='In review'
                      value={String(row.inReview.tasks)}
                      tone={row.inReview.tasks > 0 ? 'warn' : 'ok'}
                    />
                    <MetricCell
                      label='Ready'
                      value={`${row.acceptedReady.count}/${row.acceptedReady.max || '—'}`}
                    />
                    <MetricCell
                      label='At risk'
                      value={String(row.atRisk)}
                      tone={row.atRisk > 0 ? 'warn' : 'ok'}
                    />
                  </div>
                  {row.total > 0 ? (
                    <p className='mt-2 text-[11px] text-muted-foreground'>
                      Tasks done {row.done}/{row.total}
                    </p>
                  ) : null}
                </Link>
              </li>
            )
          })}
          {sorted.length === 0 ? (
            <li className='px-4 py-6 text-sm text-muted-foreground'>
              No sections in this division yet.
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  )
}
