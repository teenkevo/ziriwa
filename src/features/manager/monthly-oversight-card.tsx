'use client'

import Link from 'next/link'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type {
  MonthlyOversightBreakdown,
  MonthlyOversightSummary,
} from '@/lib/monthly-oversight'
import {
  DivisionWeeklyReportStatusButton,
  type DivisionWeeklyReportPayload,
} from './division-weekly-report-status-button'

export type SplitMetricColumn = {
  label: string
  value: number
  href?: string
}

export type SplitMetricCardData = {
  periodLabel: string
  total: number
  subtitle: string
}

function SubtitleRow({
  subtitle,
  weeklyReport,
}: {
  subtitle: string
  weeklyReport?: DivisionWeeklyReportPayload
}) {
  return (
    <div className='flex min-h-6 items-center gap-2'>
      <p className='min-w-0 flex-1 text-xs leading-snug text-muted-foreground'>
        {subtitle}
      </p>
      {weeklyReport ? (
        <div className='flex h-6 shrink-0 items-center justify-end'>
          <DivisionWeeklyReportStatusButton weeklyReport={weeklyReport} />
        </div>
      ) : null}
    </div>
  )
}

function BreakdownColumn({
  label,
  value,
  href,
}: {
  label: string
  value: number
  href?: string
}) {
  const content = (
    <div className='flex flex-col items-center justify-center gap-1 px-3 py-4 text-center'>
      <span className='text-xs font-medium text-muted-foreground'>{label}</span>
      <span className='text-lg font-semibold tabular-nums'>{value}</span>
    </div>
  )

  if (!href) return content

  return (
    <Link
      href={href}
      className='block transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
    >
      {content}
    </Link>
  )
}

export function SplitMetricCard({
  data,
  href,
  onCardClick,
  title,
  columns,
  weeklyReport,
}: {
  data: SplitMetricCardData
  href?: string
  onCardClick?: () => void
  title: string
  columns: SplitMetricColumn[]
  weeklyReport?: DivisionWeeklyReportPayload
}) {
  const columnHasLinks = columns.some(column => Boolean(column.href))
  const isInteractive = Boolean(href || onCardClick || columnHasLinks)

  const header = (
    <div className='flex items-start justify-between gap-3 px-4 pt-4'>
      <span className='text-sm font-medium'>{title}</span>
      <span className='text-sm text-muted-foreground'>{data.periodLabel}</span>
    </div>
  )

  const body = (
    <div className='px-4 pb-4 pt-4'>
      <SubtitleRow subtitle={data.subtitle} weeklyReport={weeklyReport} />
    </div>
  )

  const footer = (
    <div
      className={cn(
        'grid border-t divide-x',
        columns.length === 3 && 'grid-cols-3',
        columns.length === 2 && 'grid-cols-2',
        columns.length === 1 && 'grid-cols-1',
      )}
    >
      {columns.map(column => (
        <BreakdownColumn
          key={column.label}
          label={column.label}
          value={column.value}
          href={column.href}
        />
      ))}
    </div>
  )

  const cardClassName = cn(
    'flex h-full flex-col',
    isInteractive && 'transition-colors hover:border-primary/60',
  )

  if (columnHasLinks) {
    const headerBodyClassName =
      'block w-full rounded-t-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

    return (
      <Card className={cardClassName}>
        <CardContent className='flex flex-1 flex-col p-0'>
          {onCardClick ? (
            <button type='button' onClick={onCardClick} className={headerBodyClassName}>
              {header}
              {body}
            </button>
          ) : href ? (
            <Link href={href} className={headerBodyClassName}>
              {header}
              {body}
            </Link>
          ) : (
            <>
              {header}
              {body}
            </>
          )}
          <div className='mt-auto'>{footer}</div>
        </CardContent>
      </Card>
    )
  }

  const card = (
    <Card className={cardClassName}>
      <CardContent className='flex flex-1 flex-col p-0'>
        {header}
        {body}
        <div className='mt-auto'>{footer}</div>
      </CardContent>
    </Card>
  )

  if (onCardClick) {
    return (
      <button
        type='button'
        onClick={onCardClick}
        className='block h-full w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      >
        {card}
      </button>
    )
  }

  if (!href) return card

  return (
    <Link
      href={href}
      className='block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
    >
      {card}
    </Link>
  )
}

export function MonthlyOversightCard({
  data,
  href,
  onCardClick,
  title = 'Activities This month',
  breakdown,
  breakdownLinks,
  weeklyReport,
}: {
  data: Pick<MonthlyOversightSummary, 'periodLabel' | 'total' | 'subtitle'>
  href?: string
  onCardClick?: () => void
  title?: string
  breakdown: MonthlyOversightBreakdown
  breakdownLinks?: {
    sprints?: string
    engagements?: string
    tasks?: string
  }
  weeklyReport?: DivisionWeeklyReportPayload
}) {
  return (
    <SplitMetricCard
      data={{
        periodLabel: data.periodLabel,
        total: data.total,
        subtitle: data.subtitle,
      }}
      href={href}
      onCardClick={onCardClick}
      title={title}
      weeklyReport={weeklyReport}
      columns={[
        {
          label: 'Sprints',
          value: breakdown.sprints,
          href: breakdownLinks?.sprints,
        },
        {
          label: 'Engagements',
          value: breakdown.engagements,
          href: breakdownLinks?.engagements,
        },
        {
          label: 'Tasks',
          value: breakdown.tasks,
          href: breakdownLinks?.tasks,
        },
      ]}
    />
  )
}
