'use client'

import * as React from 'react'
import { format, parseISO } from 'date-fns'

import { cn } from '@/lib/utils'
import { AllClearState } from '@/components/all-clear-state'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type {
  SectionDashboardMetrics,
  StakeholderActionTrackerItem,
} from '@/lib/section-dashboard-metrics'

type ActionStatusFilter = 'all' | 'overdue' | 'due_soon'

interface DashboardInsightsProps {
  metrics: SectionDashboardMetrics
  onOpenStakeholders?: () => void
}

function fmt(iso?: string): string {
  if (!iso) return ''
  try {
    return format(parseISO(iso), 'EEE, MMM d')
  } catch {
    return iso
  }
}

function statusOf(
  item: StakeholderActionTrackerItem,
): 'overdue' | 'due_soon' | 'upcoming' {
  if (item.isOverdue) return 'overdue'
  if (item.daysUntilDue <= 7) return 'due_soon'
  return 'upcoming'
}

function statusLabel(status: 'overdue' | 'due_soon' | 'upcoming'): string {
  if (status === 'overdue') return 'Overdue'
  if (status === 'due_soon') return 'Due soon'
  return 'Upcoming'
}

function dueTimingLabel(item: StakeholderActionTrackerItem): string {
  if (item.isOverdue) {
    const days = Math.abs(item.daysUntilDue)
    if (days <= 0) return 'Due today'
    return days === 1 ? '1 day overdue' : `${days} days overdue`
  }
  if (item.daysUntilDue <= 0) return 'Due today'
  if (item.daysUntilDue === 1) return 'Due in 1 day'
  return `Due in ${item.daysUntilDue} days`
}

const FILTERS: {
  id: ActionStatusFilter
  label: string
}[] = [
  { id: 'all', label: 'All' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'due_soon', label: 'Due soon' },
]

/**
 * Action tracker for stakeholder engagement follow-ups assigned in the section.
 */
export function DashboardInsights({
  metrics,
  onOpenStakeholders,
}: DashboardInsightsProps) {
  const items = metrics.actionTracker.items
  const [statusFilter, setStatusFilter] =
    React.useState<ActionStatusFilter>('all')

  const counts = React.useMemo(() => {
    let overdue = 0
    let dueSoon = 0
    for (const item of items) {
      const s = statusOf(item)
      if (s === 'overdue') overdue++
      else if (s === 'due_soon') dueSoon++
    }
    return {
      all: items.length,
      overdue,
      due_soon: dueSoon,
    }
  }, [items])

  const filtered = React.useMemo(() => {
    if (statusFilter === 'all') return items
    return items.filter(item => statusOf(item) === statusFilter)
  }, [items, statusFilter])

  return (
    <section className='space-y-3'>
      <div className='space-y-3'>
        <div>
          <h2 className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
            Action tracker
          </h2>
        </div>
        <div
          className='inline-flex flex-wrap gap-1 rounded-lg border border-border/80 bg-background/80 p-1 shadow-sm'
          role='tablist'
          aria-label='Action status filter'
        >
          {FILTERS.map(filter => {
            const n = counts[filter.id]
            const selected = statusFilter === filter.id
            return (
              <button
                key={filter.id}
                type='button'
                role='tab'
                aria-selected={selected}
                onClick={() => setStatusFilter(filter.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  selected
                    ? filter.id === 'overdue' && n > 0
                      ? 'bg-destructive text-destructive-foreground shadow-sm'
                      : 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {filter.label}
                {n > 0 ? (
                  <span className='tabular-nums opacity-80'>{n}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      <div className='overflow-hidden rounded-xl border border-border/80 bg-card'>
        {filtered.length === 0 ? (
          <div className='p-4 sm:p-6'>
            {items.length === 0 ? (
              <AllClearState />
            ) : (
              <AllClearState
                compact
                description='No actions in this status.'
              />
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className='hover:bg-transparent'>
                <TableHead className='pl-4'>Action</TableHead>
                <TableHead>Stakeholder</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className='pr-4'>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => {
                const status = statusOf(item)
                return (
                  <TableRow
                    key={item._key}
                    className={cn(onOpenStakeholders && 'cursor-pointer')}
                    onClick={
                      onOpenStakeholders
                        ? () => onOpenStakeholders()
                        : undefined
                    }
                  >
                    <TableCell className='max-w-[18rem] pl-4 font-medium'>
                      <span className='line-clamp-2'>{item.description}</span>
                    </TableCell>
                    <TableCell className='max-w-[10rem]'>
                      <span className='line-clamp-2 text-sm'>
                        {item.stakeholderName}
                      </span>
                    </TableCell>
                    <TableCell className='whitespace-nowrap text-sm'>
                      {item.assigneeName?.trim() || '—'}
                    </TableCell>
                    <TableCell className='whitespace-nowrap'>
                      <div className='text-sm'>{fmt(item.dueDate)}</div>
                      <div
                        className={cn(
                          'text-[11px] tabular-nums',
                          status === 'overdue'
                            ? 'text-destructive'
                            : status === 'due_soon'
                              ? 'text-amber-600 dark:text-amber-500'
                              : 'text-muted-foreground',
                        )}
                      >
                        {dueTimingLabel(item)}
                      </div>
                    </TableCell>
                    <TableCell className='pr-4'>
                      <Badge
                        variant='outline'
                        className={cn(
                          'rounded-md px-1.5 py-0 text-[10px] font-semibold',
                          status === 'overdue' &&
                            'border-destructive/40 bg-destructive/10 text-destructive',
                          status === 'due_soon' &&
                            'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
                          status === 'upcoming' &&
                            'border-border bg-muted/40 text-muted-foreground',
                        )}
                      >
                        {statusLabel(status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  )
}
