'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
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
  reportReady?: boolean
}

const REPORT_STATUS_SLOT_WIDTH = '5.75rem'

function ReportReadyButton({ ready }: { ready: boolean }) {
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      className={cn(
        'h-6 w-full px-2 text-[10px] font-medium',
        ready ? 'border-primary' : 'border-red-500',
      )}
      onClick={event => event.stopPropagation()}
      onPointerDown={event => event.stopPropagation()}
    >
      {ready ? 'Report ready' : 'Report Not ready'}
    </Button>
  )
}

function SubtitleRow({
  subtitle,
  reportReady,
  weeklyReport,
}: {
  subtitle: string
  reportReady?: boolean
  weeklyReport?: DivisionWeeklyReportPayload
}) {
  return (
    <div className='flex min-h-6 items-center gap-2'>
      <p className='min-w-0 flex-1 text-xs leading-snug text-muted-foreground'>
        {subtitle}
      </p>
      <div
        className='flex h-6 shrink-0 items-center justify-end'
        // style={{ width: REPORT_STATUS_SLOT_WIDTH }}
      >
        {typeof reportReady === 'boolean' && weeklyReport ? (
          <DivisionWeeklyReportStatusButton
            ready={reportReady}
            weeklyReport={weeklyReport}
          />
        ) : typeof reportReady === 'boolean' ? (
          <ReportReadyButton ready={reportReady} />
        ) : null}
      </div>
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
  const header = (
    <div className='flex items-start justify-between gap-3 px-4 pt-4'>
      <span className='text-sm font-medium'>{title}</span>
      <span className='text-sm text-muted-foreground'>{data.periodLabel}</span>
    </div>
  )

  const body = (
    <div className='px-4 pb-4 pt-4'>
      <SubtitleRow
        subtitle={data.subtitle}
        reportReady={data.reportReady}
        weeklyReport={weeklyReport}
      />
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

  const isInteractive = Boolean(href || onCardClick)

  const card = (
    <Card
      className={cn(
        'flex h-full flex-col',
        isInteractive && 'transition-colors hover:border-primary/60',
      )}
    >
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
  data: Pick<
    MonthlyOversightSummary,
    'periodLabel' | 'total' | 'subtitle' | 'reportReady'
  >
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
        reportReady: data.reportReady,
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
