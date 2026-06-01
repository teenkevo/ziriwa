'use client'

import * as React from 'react'
import {
  AlertTriangle,
  CalendarX,
  ClipboardList,
  FileText,
  Landmark,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { CommissionerDashboardData } from './load-commissioner-dashboard'

type CategoryId =
  | 'stakeholder-engagements'
  | 'period-deliverables'
  | 'board-actions'
  | 'memos'

export function CommissionerOverduePanel({
  overdue,
}: {
  overdue: CommissionerDashboardData['overdue']
}) {
  const categories = React.useMemo(
    () => [
      {
        id: 'stakeholder-engagements' as const,
        label: 'Stakeholder engagements past due date',
        count: overdue.stakeholderEngagements.length,
        icon: CalendarX,
      },
      {
        id: 'period-deliverables' as const,
        label: 'Overdue period deliverables',
        count: overdue.periodDeliverables.length,
        icon: ClipboardList,
      },
      {
        id: 'board-actions' as const,
        label: 'Overdue board actions',
        count: overdue.boardActions.length,
        icon: Landmark,
      },
      {
        id: 'memos' as const,
        label: 'Overdue memos',
        count: overdue.memos.length,
        icon: FileText,
      },
    ],
    [overdue],
  )
  const categoryMap = React.useMemo(
    () =>
      Object.fromEntries(categories.map(c => [c.id, c])) as Record<
        CategoryId,
        (typeof categories)[number]
      >,
    [categories],
  )
  const totalAtRisk = categories.reduce((sum, c) => sum + c.count, 0)
  const [selectedCategory, setSelectedCategory] = React.useState<CategoryId>(
    'stakeholder-engagements',
  )

  React.useEffect(() => {
    const firstNonZero = categories.find(c => c.count > 0)
    if (firstNonZero) setSelectedCategory(firstNonZero.id)
  }, [categories])

  return (
    <Card>
      <CardHeader className='pb-3'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0 space-y-1'>
            <CardTitle className='flex items-center gap-2 text-base'>
              <AlertTriangle className='h-8 w-8 text-destructive' />
              Overdue / At risk
            </CardTitle>
            <CardDescription>Items that need attention now.</CardDescription>
          </div>
          <div className='flex shrink-0 flex-col items-center gap-0.5 sm:items-end'>
            <div
              className={cn(
                'flex h-10 min-w-10 items-center justify-center gap-1 rounded-md px-2 text-lg font-semibold tabular-nums shadow-sm',
                totalAtRisk > 0
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {totalAtRisk}
            </div>
            <span className='text-[11px] font-medium text-muted-foreground'>
              Things at risk
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className='flex flex-col gap-6 lg:flex-row lg:gap-0'>
          <nav
            aria-label='At-risk categories'
            className='flex shrink-0 flex-col gap-0.5 border-b border-border pb-4 lg:w-96 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-5'
          >
            {categories.map(cat => {
              const Icon = cat.icon
              const isSelected = selectedCategory === cat.id
              return (
                <button
                  key={cat.id}
                  type='button'
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-2.5 text-left text-sm transition-colors',
                    isSelected
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  <Icon className='h-4 w-4 shrink-0' />
                  <span className='min-w-0 flex-1 leading-snug'>{cat.label}</span>
                  <Badge
                    variant='outline'
                    className={
                      cat.count > 0
                        ? 'border-destructive tabular-nums'
                        : 'tabular-nums'
                    }
                  >
                    {cat.count}
                  </Badge>
                </button>
              )
            })}
          </nav>

          <div className='min-w-0 flex-1 space-y-3 lg:pl-6'>
            <div>
              <h3 className='text-base font-semibold tracking-tight'>
                Top priority
              </h3>
              <p className='mt-0.5 text-xs text-muted-foreground'>
                {categoryMap[selectedCategory].label}
              </p>
            </div>

            {categoryMap[selectedCategory].count === 0 ? (
              <div className='text-xs text-muted-foreground'>All good here!</div>
            ) : (
              <div className='space-y-2'>
                {selectedCategory === 'stakeholder-engagements' && (
                  <SimpleList
                    rows={overdue.stakeholderEngagements.map(item => ({
                      key: item._key,
                      title: item.name,
                      meta: `${item.designation ?? 'Stakeholder'} • ${item.daysLate} days late`,
                    }))}
                    empty='No overdue stakeholder engagements.'
                  />
                )}

                {selectedCategory === 'period-deliverables' && (
                  <SimpleList
                    rows={overdue.periodDeliverables.map(item => ({
                      key: item._key,
                      title: item.title,
                      meta: `${item.periodLabel} • ${item.daysOverdue} days overdue`,
                    }))}
                    empty='No overdue period deliverables.'
                  />
                )}

                {selectedCategory === 'board-actions' && (
                  <SimpleList
                    rows={overdue.boardActions.map(item => ({
                      key: item._key,
                      title: item.title,
                      meta: `${item.daysOverdue} days overdue`,
                    }))}
                    empty='No overdue board actions.'
                  />
                )}

                {selectedCategory === 'memos' && (
                  <SimpleList
                    rows={overdue.memos.map(item => ({
                      key: item._key,
                      title: item.title,
                      meta: `${item.daysOverdue} days overdue`,
                    }))}
                    empty='No overdue memos.'
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SimpleList({
  rows,
  empty,
}: {
  rows: { key: string; title: string; meta: string }[]
  empty: string
}) {
  if (rows.length === 0)
    return <p className='text-sm text-muted-foreground'>{empty}</p>
  return (
    <ul className='space-y-2'>
      {rows.slice(0, 10).map(row => (
        <li key={row.key} className='rounded-md border px-3 py-2'>
          <p className='text-sm font-medium'>{row.title}</p>
          <p className='text-xs text-muted-foreground'>{row.meta}</p>
        </li>
      ))}
      {rows.length > 10 && (
        <li className='text-xs text-muted-foreground'>
          +{rows.length - 10} more
        </li>
      )}
    </ul>
  )
}
