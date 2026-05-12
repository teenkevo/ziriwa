'use client'

import * as React from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import {
  AlertTriangle,
  CalendarX,
  ClipboardList,
  RefreshCcw,
  ListChecks,
  Handshake,
  ChevronRight,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

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
  /** Section slug for deep links to measurable activity + task (e.g. overdue detailed tasks). */
  sectionSlug?: string
  /** Switch parent section tabs when a row has no deep link. */
  onNavigateToTab?: (
    tab: 'contract' | 'stakeholder-engagements' | 'weekly-sprint',
  ) => void
}

type AttentionTab = 'contract' | 'stakeholder-engagements' | 'weekly-sprint'

type CategoryId =
  | 'activities'
  | 'deliverables'
  | 'review'
  | 'revision'
  | 'engagements'

type AttentionRow = {
  key: string
  categoryId: CategoryId
  tab: AttentionTab
  title: string
  initials: string
  dateLine: string
  statusPill: string
  statusVariant: 'destructive' | 'secondary' | 'outline'
  context?: string
  avatarPeople?: boolean
  /** Full path including query when row should navigate outside the dashboard. */
  detailHref?: string
}

const CATEGORIES: {
  id: CategoryId
  label: string
  icon: React.ComponentType<{ className?: string }>
  countKey:
    | 'overdueActivities'
    | 'overduePeriodDeliverables'
    | 'pendingReviewTasks'
    | 'revisionRequestedTasks'
    | 'lateEngagements'
}[] = [
  {
    id: 'engagements',
    label: 'Stakeholder Engagements past due date',
    icon: Handshake,
    countKey: 'lateEngagements',
  },
  {
    id: 'activities',
    label: 'Overdue detailed tasks',
    icon: CalendarX,
    countKey: 'overdueActivities',
  },
  {
    id: 'deliverables',
    label: 'Overdue period deliverables',
    icon: ClipboardList,
    countKey: 'overduePeriodDeliverables',
  },
  {
    id: 'review',
    label: 'Sprint tasks awaiting review',
    icon: ListChecks,
    countKey: 'pendingReviewTasks',
  },
  {
    id: 'revision',
    label: 'Tasks needing revision',
    icon: RefreshCcw,
    countKey: 'revisionRequestedTasks',
  },
]

/** First category with items (engagements first — usually highest visibility). */
const CATEGORY_PRIORITY: CategoryId[] = [
  'engagements',
  'activities',
  'deliverables',
  'review',
  'revision',
]

function initialsFromLabel(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return ''
  try {
    return format(parseISO(iso), 'EEE, MMM d')
  } catch {
    return iso
  }
}

function daysLateLabel(n: number): string {
  if (n <= 0) return 'Due today'
  if (n === 1) return '1 day late'
  return `${n} days late`
}

function daysOverdueLabel(n: number): string {
  if (n <= 0) return 'Due today'
  if (n === 1) return '1 day overdue'
  return `${n} days overdue`
}

function buildAttentionRows(
  overdueActivities: AtRiskActivity[],
  overduePeriodDeliverables: AtRiskPeriodDeliverable[],
  pendingReviewTasks: AtRiskSprintTask[],
  revisionRequestedTasks: AtRiskSprintTask[],
  lateEngagements: LateEngagement[],
  sectionSlug?: string,
): AttentionRow[] {
  const rows: AttentionRow[] = []

  for (const item of lateEngagements) {
    const mode = item.modeOfEngagement
      ? item.modeOfEngagement.replace(/_/g, ' ')
      : undefined
    rows.push({
      key: `e-${item._key}`,
      categoryId: 'engagements',
      tab: 'stakeholder-engagements',
      title: item.name,
      initials: initialsFromLabel(item.name),
      dateLine: `Proposed ${fmtDate(item.proposedDate)}`,
      statusPill: daysLateLabel(item.daysLate),
      statusVariant: 'destructive',
      context: mode ? capitalizeWords(mode) : undefined,
      avatarPeople: true,
    })
  }

  const slug = sectionSlug?.trim()
  for (const item of overdueActivities) {
    const detailHref =
      slug &&
      item.contractId &&
      item.taskKey &&
      item.objectiveIndex >= 0 &&
      item.initiativeIndex >= 0 &&
      item.activityIndex >= 0
        ? `/sections/${slug}/activity/${item.contractId}/${item.objectiveIndex}/${item.initiativeIndex}/${item.activityIndex}?taskKey=${encodeURIComponent(item.taskKey)}`
        : undefined
    rows.push({
      key: `a-${item._key}`,
      categoryId: 'activities',
      tab: 'contract',
      title: item.title,
      initials: initialsFromLabel(item.title),
      dateLine: `Due ${fmtDate(item.targetDate)}`,
      statusPill: daysOverdueLabel(item.daysOverdue),
      statusVariant: 'destructive',
      context: [item.activityTitle, item.initiativeTitle]
        .filter(Boolean)
        .join(' · '),
      detailHref,
    })
  }

  for (const item of overduePeriodDeliverables) {
    rows.push({
      key: `d-${item._key}`,
      categoryId: 'deliverables',
      tab: 'contract',
      title: item.title,
      initials: initialsFromLabel(item.title),
      dateLine: item.periodLabel,
      statusPill: daysOverdueLabel(item.daysOverdue),
      statusVariant: 'destructive',
      context: item.activityTitle,
    })
  }

  for (const item of pendingReviewTasks) {
    rows.push({
      key: `pr-${item.sprintId}-${item._key}`,
      categoryId: 'review',
      tab: 'weekly-sprint',
      title: item.title,
      initials: initialsFromLabel(item.title),
      dateLine: item.sprintWeekLabel ?? 'Sprint task',
      statusPill: 'Awaiting review',
      statusVariant: 'secondary',
      context: item.assigneeName ?? undefined,
    })
  }

  for (const item of revisionRequestedTasks) {
    rows.push({
      key: `rr-${item.sprintId}-${item._key}`,
      categoryId: 'revision',
      tab: 'weekly-sprint',
      title: item.title,
      initials: initialsFromLabel(item.title),
      dateLine: item.sprintWeekLabel ?? 'Sprint task',
      statusPill: 'Needs revision',
      statusVariant: 'secondary',
      context: item.assigneeName ?? undefined,
    })
  }

  return rows
}

function capitalizeWords(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase())
}

function defaultCategoryId(
  counts: Record<(typeof CATEGORIES)[number]['countKey'], number>,
): CategoryId {
  for (const id of CATEGORY_PRIORITY) {
    const cat = CATEGORIES.find(c => c.id === id)!
    if (counts[cat.countKey] > 0) return id
  }
  return 'activities'
}

const MAX_CARDS = 8

function PriorityCard({
  row,
  onNavigateToTab,
}: {
  row: AttentionRow
  onNavigateToTab?: (
    tab: 'contract' | 'stakeholder-engagements' | 'weekly-sprint',
  ) => void
}) {
  const inner = (
    <>
      <Avatar className='h-11 w-11 shrink-0'>
        <AvatarFallback
          className={cn(
            'text-xs font-semibold',
            row.avatarPeople
              ? 'border border-pink-200 bg-pink-100 text-pink-800 dark:border-pink-900 dark:bg-pink-950 dark:text-pink-200'
              : 'border border-border bg-muted text-muted-foreground',
          )}
        >
          {row.initials}
        </AvatarFallback>
      </Avatar>
      <div className='min-w-0 flex-1'>
        <div className='font-medium leading-snug text-foreground'>
          {row.title}
        </div>
        <div className='mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground'>
          <span>{row.dateLine}</span>
          <Badge
            variant={row.statusVariant}
            className={cn(
              'rounded-full px-2 py-0 text-[11px] font-semibold',
              row.statusVariant === 'secondary' &&
                'bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-100',
            )}
          >
            {row.statusPill}
          </Badge>
          {row.context ? (
            <span className='capitalize text-muted-foreground'>
              {row.context}
            </span>
          ) : null}
        </div>
      </div>
      <ChevronRight className='h-4 w-4 shrink-0 text-muted-foreground' />
    </>
  )

  const cardClass =
    'rounded-lg border border-border/80 bg-card p-4 shadow-sm transition-colors'
  const interactiveClass =
    'flex w-full items-start gap-3 text-left hover:border-primary/30 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  if (row.detailHref) {
    return (
      <Link
        href={row.detailHref}
        prefetch={false}
        className={cn(cardClass, interactiveClass)}
      >
        {inner}
      </Link>
    )
  }

  if (onNavigateToTab) {
    return (
      <button
        type='button'
        onClick={() => onNavigateToTab(row.tab)}
        className={cn(cardClass, interactiveClass)}
      >
        {inner}
      </button>
    )
  }

  return <div className={cn(cardClass, 'flex items-start gap-3')}>{inner}</div>
}

export function OverduePanel({
  overdueActivities,
  overduePeriodDeliverables,
  pendingReviewTasks,
  revisionRequestedTasks,
  lateEngagements,
  sectionSlug,
  onNavigateToTab,
}: OverduePanelProps) {
  const counts = {
    overdueActivities: overdueActivities.length,
    overduePeriodDeliverables: overduePeriodDeliverables.length,
    pendingReviewTasks: pendingReviewTasks.length,
    revisionRequestedTasks: revisionRequestedTasks.length,
    lateEngagements: lateEngagements.length,
  }

  const totalAtRisk =
    counts.overdueActivities +
    counts.overduePeriodDeliverables +
    counts.pendingReviewTasks +
    counts.revisionRequestedTasks +
    counts.lateEngagements

  const attentionRows = React.useMemo(
    () =>
      buildAttentionRows(
        overdueActivities,
        overduePeriodDeliverables,
        pendingReviewTasks,
        revisionRequestedTasks,
        lateEngagements,
        sectionSlug,
      ),
    [
      overdueActivities,
      overduePeriodDeliverables,
      pendingReviewTasks,
      revisionRequestedTasks,
      lateEngagements,
      sectionSlug,
    ],
  )

  const [selectedCategoryId, setSelectedCategoryId] =
    React.useState<CategoryId>(() => defaultCategoryId(counts))

  React.useEffect(() => {
    if (totalAtRisk === 0) return
    setSelectedCategoryId(prev => {
      const countFor = (id: CategoryId) => {
        const c = CATEGORIES.find(x => x.id === id)!
        switch (c.countKey) {
          case 'overdueActivities':
            return overdueActivities.length
          case 'overduePeriodDeliverables':
            return overduePeriodDeliverables.length
          case 'pendingReviewTasks':
            return pendingReviewTasks.length
          case 'revisionRequestedTasks':
            return revisionRequestedTasks.length
          case 'lateEngagements':
            return lateEngagements.length
        }
      }
      if (countFor(prev) > 0) return prev
      return defaultCategoryId({
        overdueActivities: overdueActivities.length,
        overduePeriodDeliverables: overduePeriodDeliverables.length,
        pendingReviewTasks: pendingReviewTasks.length,
        revisionRequestedTasks: revisionRequestedTasks.length,
        lateEngagements: lateEngagements.length,
      })
    })
  }, [
    totalAtRisk,
    overdueActivities.length,
    overduePeriodDeliverables.length,
    pendingReviewTasks.length,
    revisionRequestedTasks.length,
    lateEngagements.length,
  ])

  const selectedLabel =
    CATEGORIES.find(c => c.id === selectedCategoryId)?.label ?? ''
  const selectedCount =
    counts[CATEGORIES.find(c => c.id === selectedCategoryId)!.countKey]

  const filteredRows = attentionRows.filter(
    r => r.categoryId === selectedCategoryId,
  )
  const visibleCards = filteredRows.slice(0, MAX_CARDS)
  const overflow = filteredRows.length - visibleCards.length

  return (
    <Card>
      <CardHeader className='pb-3'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0 space-y-1'>
            <CardTitle className='flex items-center gap-2'>
              <div className='flex items-center gap-2'>
                <AlertTriangle className='h-10 w-10 shrink-0 text-destructive' />
                <div className='flex flex-col'>
                  <p className='text-base font-semibold'>Overdue / At risk</p>
                  <p className='text-sm text-muted-foreground font-normal'>
                    Items that need attention now.
                  </p>
                </div>
              </div>
            </CardTitle>
          </div>
          <div className='flex shrink-0 flex-col items-center gap-0.5 sm:items-end'>
            <div
              className={cn(
                'flex h-10 min-w-10 items-center justify-center rounded-md px-2 text-lg font-semibold tabular-nums shadow-sm',
                totalAtRisk > 0
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {totalAtRisk}
            </div>
            <span className='text-[11px] font-medium text-muted-foreground'>
              Total at risk
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {totalAtRisk === 0 ? (
          <p className='text-sm text-muted-foreground'>
            Nothing is overdue or blocked right now.
          </p>
        ) : (
          <div className='flex flex-col gap-6 lg:flex-row lg:gap-0'>
            <nav
              aria-label='At-risk categories'
              className='flex shrink-0 flex-col gap-0.5 border-b border-border pb-4 lg:w-96 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-5'
            >
              {CATEGORIES.map(cat => {
                const n = counts[cat.countKey]
                const selected = selectedCategoryId === cat.id
                const Icon = cat.icon
                return (
                  <button
                    key={cat.id}
                    type='button'
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-2.5 text-left text-sm transition-colors',
                      selected
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        n > 0 ? 'text-destructive' : 'text-muted-foreground',
                      )}
                    />
                    <span className='min-w-0 text-sm flex-1 leading-snug'>
                      {cat.label}
                    </span>
                    <Badge
                      variant={n > 0 ? 'destructive' : 'outline'}
                      className='tabular-nums shrink-0'
                    >
                      {n}
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
                  {selectedCount > 0
                    ? `${selectedLabel} — ${selectedCount} ${selectedCount === 1 ? 'item' : 'items'}`
                    : `${selectedLabel}`}
                </p>
              </div>

              <ul className='space-y-3'>
                {visibleCards.map(row => (
                  <li key={row.key}>
                    <PriorityCard row={row} onNavigateToTab={onNavigateToTab} />
                  </li>
                ))}
                {overflow > 0 ? (
                  <li className='text-xs text-muted-foreground'>
                    +{overflow} more in this category
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
