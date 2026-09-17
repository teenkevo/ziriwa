'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import {
  CalendarClock,
  CalendarDays,
  CalendarX,
  ChevronRight,
  ClipboardList,
  Handshake,
  ListChecks,
  RefreshCcw,
} from 'lucide-react'

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
  AtRiskActivity,
  AtRiskPeriodDeliverable,
  AtRiskSprintTask,
  LateEngagement,
  UpcomingMeasurableActivity,
  UpcomingPeriodDeliverable,
} from '@/lib/section-dashboard-metrics'
import {
  buildSectionSprintReviseHref,
  buildSprintReviseHref,
  isManagerDashboardBasePath,
  isSupervisorDashboardBasePath,
  type WorkspaceBasePath,
} from '@/lib/workspace-paths'
import { SprintRevisionTaskCard } from '@/features/sections/components/dashboard/sprint-revision-task-card'
import { PendingReviewTasksSection } from '@/features/sections/components/dashboard/pending-review-tasks-section'

interface OverduePanelProps {
  upcomingActivities: UpcomingMeasurableActivity[]
  upcomingPeriodDeliverables: UpcomingPeriodDeliverable[]
  overdueActivities: AtRiskActivity[]
  overduePeriodDeliverables: AtRiskPeriodDeliverable[]
  pendingReviewTasks: AtRiskSprintTask[]
  revisionRequestedTasks: AtRiskSprintTask[]
  lateEngagements: LateEngagement[]
  sectionSlug?: string
  onNavigateToTab?: (
    tab: 'contract' | 'stakeholder-engagements' | 'weekly-sprint',
  ) => void
  workspaceBasePath?: WorkspaceBasePath
}

type AttentionTab = 'contract' | 'stakeholder-engagements' | 'weekly-sprint'
type FocusMode = 'action' | 'upcoming'

type CategoryId =
  | 'upcoming-activities'
  | 'upcoming-deliverables'
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
  dateLine: string
  statusPill: string
  statusVariant: 'destructive' | 'secondary' | 'outline'
  /** Days until due for upcoming items — drives urgency color (&lt;10 red, else orange). */
  daysUntilDue?: number
  context?: string
  detailHref?: string
}

const CATEGORIES: {
  id: CategoryId
  mode: FocusMode
  label: string
  shortLabel: string
  icon: React.ComponentType<{ className?: string }>
  countKey:
    | 'upcomingActivities'
    | 'upcomingPeriodDeliverables'
    | 'overdueActivities'
    | 'overduePeriodDeliverables'
    | 'pendingReviewTasks'
    | 'revisionRequestedTasks'
    | 'lateEngagements'
  atRisk?: boolean
}[] = [
  {
    id: 'activities',
    mode: 'action',
    label: 'Overdue detailed tasks',
    shortLabel: 'Overdue tasks',
    icon: CalendarX,
    countKey: 'overdueActivities',
    atRisk: true,
  },
  {
    id: 'deliverables',
    mode: 'action',
    label: 'Overdue period deliverables',
    shortLabel: 'Overdue deliverables',
    icon: ClipboardList,
    countKey: 'overduePeriodDeliverables',
    atRisk: true,
  },
  {
    id: 'engagements',
    mode: 'action',
    label: 'Stakeholder engagements past due',
    shortLabel: 'Late engagements',
    icon: Handshake,
    countKey: 'lateEngagements',
    atRisk: true,
  },
  {
    id: 'review',
    mode: 'action',
    label: 'Sprint tasks awaiting review',
    shortLabel: 'Awaiting review',
    icon: ListChecks,
    countKey: 'pendingReviewTasks',
    atRisk: true,
  },
  {
    id: 'revision',
    mode: 'action',
    label: 'Sprint tasks needing revision',
    shortLabel: 'Needs revision',
    icon: RefreshCcw,
    countKey: 'revisionRequestedTasks',
    atRisk: true,
  },
  {
    id: 'upcoming-activities',
    mode: 'upcoming',
    label: 'Upcoming measurable activities',
    shortLabel: 'Measurable Activities',
    icon: CalendarDays,
    countKey: 'upcomingActivities',
  },
  {
    id: 'upcoming-deliverables',
    mode: 'upcoming',
    label: 'Upcoming periodic deliverables',
    shortLabel: 'Periodic Deliverables',
    icon: CalendarClock,
    countKey: 'upcomingPeriodDeliverables',
  },
]

const ACTION_PRIORITY: CategoryId[] = [
  'activities',
  'deliverables',
  'engagements',
  'review',
  'revision',
]

const UPCOMING_PRIORITY: CategoryId[] = [
  'upcoming-activities',
  'upcoming-deliverables',
]

function isCategoryVisibleForDashboard(
  categoryId: CategoryId,
  workspaceBasePath: WorkspaceBasePath,
): boolean {
  if (categoryId === 'review') {
    return isManagerDashboardBasePath(workspaceBasePath)
  }
  if (categoryId === 'revision') {
    return isSupervisorDashboardBasePath(workspaceBasePath)
  }
  return true
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

function daysUntilLabel(n: number): string {
  if (n <= 0) return 'Due today'
  if (n === 1) return 'Due in 1 day'
  return `Due in ${n} days`
}

function buildAttentionRows(
  upcomingActivities: UpcomingMeasurableActivity[],
  upcomingPeriodDeliverables: UpcomingPeriodDeliverable[],
  overdueActivities: AtRiskActivity[],
  overduePeriodDeliverables: AtRiskPeriodDeliverable[],
  sectionSlug?: string,
): AttentionRow[] {
  const rows: AttentionRow[] = []
  const slug = sectionSlug?.trim()

  for (const item of upcomingActivities) {
    const detailHref =
      slug &&
      item.contractId &&
      item.objectiveIndex >= 0 &&
      item.initiativeIndex >= 0 &&
      item.activityIndex >= 0
        ? `/sections/${slug}/activity/${item.contractId}/${item.objectiveIndex}/${item.initiativeIndex}/${item.activityIndex}`
        : undefined
    const initiativeLabel =
      item.initiativeCode?.trim() && item.initiativeTitle?.trim()
        ? `${item.initiativeCode.trim()} · ${item.initiativeTitle.trim()}`
        : item.initiativeTitle?.trim() || item.initiativeCode?.trim() || ''
    const activityTypeTag =
      item.activityType === 'kpi'
        ? 'KPI'
        : item.activityType === 'cross-cutting'
          ? 'CC'
          : ''
    rows.push({
      key: `ua-${item._key}`,
      categoryId: 'upcoming-activities',
      tab: 'contract',
      title: item.title,
      dateLine: `Due ${fmtDate(item.targetDate)}`,
      statusPill: daysUntilLabel(item.daysUntilDue),
      statusVariant: item.daysUntilDue < 10 ? 'destructive' : 'secondary',
      daysUntilDue: item.daysUntilDue,
      context: [activityTypeTag, initiativeLabel].filter(Boolean).join(' · '),
      detailHref,
    })
  }

  for (const item of upcomingPeriodDeliverables) {
    rows.push({
      key: `ud-${item._key}`,
      categoryId: 'upcoming-deliverables',
      tab: 'contract',
      title: item.title,
      dateLine: item.periodLabel,
      statusPill: daysUntilLabel(item.daysUntilDue),
      statusVariant: item.daysUntilDue < 10 ? 'destructive' : 'secondary',
      daysUntilDue: item.daysUntilDue,
      context: item.activityTitle,
    })
  }

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
    const initiativeLabel =
      item.initiativeCode?.trim() && item.initiativeTitle?.trim()
        ? `${item.initiativeCode.trim()} · ${item.initiativeTitle.trim()}`
        : item.initiativeTitle?.trim() || item.initiativeCode?.trim() || ''
    const activityTypeTag =
      item.activityType === 'kpi'
        ? 'KPI'
        : item.activityType === 'cross-cutting'
          ? 'CC'
          : ''
    const activityLabel =
      activityTypeTag && item.activityTitle?.trim()
        ? `${activityTypeTag} · ${item.activityTitle.trim()}`
        : item.activityTitle?.trim() || activityTypeTag
    rows.push({
      key: `a-${item._key}`,
      categoryId: 'activities',
      tab: 'contract',
      title: item.title,
      dateLine: `Due ${fmtDate(item.targetDate)}`,
      statusPill: daysOverdueLabel(item.daysOverdue),
      statusVariant: 'destructive',
      context: [activityLabel, initiativeLabel].filter(Boolean).join(' · '),
      detailHref,
    })
  }

  for (const item of overduePeriodDeliverables) {
    rows.push({
      key: `d-${item._key}`,
      categoryId: 'deliverables',
      tab: 'contract',
      title: item.title,
      dateLine: item.periodLabel,
      statusPill: daysOverdueLabel(item.daysOverdue),
      statusVariant: 'destructive',
      context: item.activityTitle,
    })
  }

  return rows
}

function pickCategory(
  counts: Record<(typeof CATEGORIES)[number]['countKey'], number>,
  categories: typeof CATEGORIES,
  priority: CategoryId[],
): CategoryId {
  for (const id of priority) {
    const cat = categories.find(c => c.id === id)
    if (cat && counts[cat.countKey] > 0) return id
  }
  return categories[0]?.id ?? 'activities'
}

function hmlCell(v?: 'H' | 'M' | 'L') {
  if (!v) {
    return <span className='text-muted-foreground'>—</span>
  }
  return (
    <span
      className='inline-flex min-w-[1.75rem] justify-center rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-xs font-semibold tabular-nums'
      title={v === 'H' ? 'High' : v === 'M' ? 'Medium' : 'Low'}
    >
      {v}
    </span>
  )
}

function formatEngagementMode(mode?: string): string {
  if (!mode?.trim()) return ''
  return mode.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function StakeholderLateTable({
  items,
  onNavigateToTab,
}: {
  items: LateEngagement[]
  onNavigateToTab?: (
    tab: 'contract' | 'stakeholder-engagements' | 'weekly-sprint',
  ) => void
}) {
  if (items.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>
        No stakeholder engagements in this list.
      </p>
    )
  }

  return (
    <div className='overflow-hidden rounded-lg border border-border/70'>
      <Table>
        <TableHeader>
          <TableRow className='border-b hover:bg-transparent'>
            <TableHead className='pl-3'>Stakeholder</TableHead>
            <TableHead className='w-[1%] whitespace-nowrap text-center'>
              Power
            </TableHead>
            <TableHead className='w-[1%] whitespace-nowrap text-center'>
              Interest
            </TableHead>
            <TableHead className='w-[1%] whitespace-nowrap text-center'>
              Priority
            </TableHead>
            <TableHead className='whitespace-nowrap'>Mode</TableHead>
            <TableHead className='whitespace-nowrap'>Proposed date</TableHead>
            <TableHead className='whitespace-nowrap pr-3 text-right' />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(entry => (
            <TableRow
              key={entry._key}
              className={cn(onNavigateToTab && 'cursor-pointer')}
              onClick={
                onNavigateToTab
                  ? () => onNavigateToTab('stakeholder-engagements')
                  : undefined
              }
            >
              <TableCell className='pl-3'>
                <div className='font-medium leading-snug text-foreground'>
                  {entry.name}
                </div>
                {entry.designation?.trim() ? (
                  <div className='mt-0.5 text-xs text-muted-foreground'>
                    {entry.designation}
                  </div>
                ) : null}
              </TableCell>
              <TableCell className='text-center'>
                {hmlCell(entry.power)}
              </TableCell>
              <TableCell className='text-center'>
                {hmlCell(entry.interest)}
              </TableCell>
              <TableCell className='text-center'>
                {hmlCell(entry.priority)}
              </TableCell>
              <TableCell className='max-w-[10rem] text-sm'>
                {formatEngagementMode(entry.modeOfEngagement) || '—'}
              </TableCell>
              <TableCell>{fmtDate(entry.proposedDate)}</TableCell>
              <TableCell className='pr-3 text-right'>
                <Badge
                  variant='destructive'
                  className='rounded-md px-2 py-0 text-[11px] font-semibold tabular-nums'
                >
                  {daysLateLabel(entry.daysLate)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function FocusRow({
  row,
  onNavigateToTab,
}: {
  row: AttentionRow
  onNavigateToTab?: (
    tab: 'contract' | 'stakeholder-engagements' | 'weekly-sprint',
  ) => void
}) {
  const isUpcoming = row.daysUntilDue != null

  const inner = (
    <>
      <div className='min-w-0 flex-1 space-y-1'>
        <span className='text-sm font-medium text-foreground'>{row.title}</span>
        {row.context ? (
          <p className='truncate text-xs text-muted-foreground'>
            {row.context}
          </p>
        ) : null}
      </div>
      <div className='flex shrink-0 items-center gap-2'>
        <div className='flex min-w-[7.5rem] flex-col items-end gap-0.5 text-right'>
          <span
            className={cn(
              'text-sm font-semibold tabular-nums',
              isUpcoming && row.daysUntilDue! < 10 && 'text-destructive',
              isUpcoming &&
                row.daysUntilDue! >= 10 &&
                'text-amber-600 dark:text-amber-500',
              !isUpcoming &&
                row.statusVariant === 'destructive' &&
                'text-destructive',
              !isUpcoming &&
                row.statusVariant !== 'destructive' &&
                'text-muted-foreground',
            )}
          >
            {row.statusPill}
          </span>
          <span className='text-[10px] text-muted-foreground'>
            {row.dateLine}
          </span>
        </div>
        <ChevronRight className='h-4 w-4 text-muted-foreground/70' />
      </div>
    </>
  )

  const className =
    'flex w-full items-center gap-3 border-b border-border/60 px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'

  if (row.detailHref) {
    return (
      <Link href={row.detailHref} prefetch={false} className={className}>
        {inner}
      </Link>
    )
  }

  if (onNavigateToTab) {
    return (
      <button
        type='button'
        onClick={() => onNavigateToTab(row.tab)}
        className={className}
      >
        {inner}
      </button>
    )
  }

  return <div className={cn(className, 'cursor-default')}>{inner}</div>
}

const LIST_MAX_HEIGHT = 'max-h-[min(28rem,55vh)] lg:max-h-[min(32rem,60vh)]'

export function OverduePanel({
  upcomingActivities,
  upcomingPeriodDeliverables,
  overdueActivities,
  overduePeriodDeliverables,
  pendingReviewTasks,
  revisionRequestedTasks,
  lateEngagements,
  sectionSlug,
  onNavigateToTab,
  workspaceBasePath = '/manager',
}: OverduePanelProps) {
  const pathname = usePathname()

  const buildReviseTaskHref = React.useCallback(
    (sprintId: string, taskKey: string) => {
      if (pathname.startsWith('/sections/')) {
        return buildSectionSprintReviseHref(pathname, sprintId, taskKey)
      }
      return buildSprintReviseHref(workspaceBasePath, sprintId, taskKey)
    },
    [pathname, workspaceBasePath],
  )

  const visibleCategories = React.useMemo(
    () =>
      CATEGORIES.filter(cat =>
        isCategoryVisibleForDashboard(cat.id, workspaceBasePath),
      ),
    [workspaceBasePath],
  )

  const counts = {
    upcomingActivities: upcomingActivities.length,
    upcomingPeriodDeliverables: upcomingPeriodDeliverables.length,
    overdueActivities: overdueActivities.length,
    overduePeriodDeliverables: overduePeriodDeliverables.length,
    pendingReviewTasks: pendingReviewTasks.length,
    revisionRequestedTasks: revisionRequestedTasks.length,
    lateEngagements: lateEngagements.length,
  }

  const actionCategories = visibleCategories.filter(c => c.mode === 'action')
  const upcomingCategories = visibleCategories.filter(
    c => c.mode === 'upcoming',
  )

  const totalAtRisk = actionCategories.reduce(
    (sum, cat) => sum + counts[cat.countKey],
    0,
  )
  const totalUpcoming = upcomingCategories.reduce(
    (sum, cat) => sum + counts[cat.countKey],
    0,
  )

  const attentionRows = React.useMemo(() => {
    const rows = buildAttentionRows(
      upcomingActivities,
      upcomingPeriodDeliverables,
      overdueActivities,
      overduePeriodDeliverables,
      sectionSlug,
    )
    return rows.filter(row =>
      isCategoryVisibleForDashboard(row.categoryId, workspaceBasePath),
    )
  }, [
    upcomingActivities,
    upcomingPeriodDeliverables,
    overdueActivities,
    overduePeriodDeliverables,
    sectionSlug,
    workspaceBasePath,
  ])

  const [mode, setMode] = React.useState<FocusMode>(() =>
    totalAtRisk > 0 ? 'action' : 'upcoming',
  )

  const modeCategories =
    mode === 'action' ? actionCategories : upcomingCategories
  const modePriority = mode === 'action' ? ACTION_PRIORITY : UPCOMING_PRIORITY
  const modeTotal = mode === 'action' ? totalAtRisk : totalUpcoming

  const [selectedCategoryId, setSelectedCategoryId] =
    React.useState<CategoryId>(() =>
      pickCategory(
        counts,
        totalAtRisk > 0 ? actionCategories : upcomingCategories,
        totalAtRisk > 0 ? ACTION_PRIORITY : UPCOMING_PRIORITY,
      ),
    )

  React.useEffect(() => {
    const cats = mode === 'action' ? actionCategories : upcomingCategories
    const priority = mode === 'action' ? ACTION_PRIORITY : UPCOMING_PRIORITY
    setSelectedCategoryId(prev => {
      const match = cats.find(c => c.id === prev)
      if (match && counts[match.countKey] > 0) return prev
      return pickCategory(counts, cats, priority)
    })
    // Counts + mode drive reselection; category arrays are derived from workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    counts.upcomingActivities,
    counts.upcomingPeriodDeliverables,
    counts.overdueActivities,
    counts.overduePeriodDeliverables,
    counts.pendingReviewTasks,
    counts.revisionRequestedTasks,
    counts.lateEngagements,
    workspaceBasePath,
  ])

  function selectMode(next: FocusMode) {
    setMode(next)
    const cats = next === 'action' ? actionCategories : upcomingCategories
    const priority = next === 'action' ? ACTION_PRIORITY : UPCOMING_PRIORITY
    setSelectedCategoryId(pickCategory(counts, cats, priority))
  }

  const selectedCount = (() => {
    const cat =
      modeCategories.find(c => c.id === selectedCategoryId) ?? modeCategories[0]
    return cat ? counts[cat.countKey] : 0
  })()

  const filteredRows = attentionRows.filter(
    r => r.categoryId === selectedCategoryId,
  )
  const isEngagements = selectedCategoryId === 'engagements'
  const isRevisionTasks = selectedCategoryId === 'revision'
  const isPendingReviewTasks = selectedCategoryId === 'review'

  return (
    <section className='relative overflow-hidden rounded-xl border border-border/80 bg-gradient-to-br from-muted/30 via-background to-muted/10'>
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-20 -top-24 size-56 rounded-full',
          totalAtRisk > 0 ? 'bg-destructive/[0.07]' : 'bg-primary/[0.06]',
        )}
      />

      <div className='relative space-y-5 p-5 sm:p-6'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <h2 className='text-xl font-semibold tracking-tight sm:text-xl'>
            Focus Items
          </h2>

          <div
            className='inline-flex rounded-lg border border-border/80 bg-background/80 p-1 shadow-sm'
            role='tablist'
            aria-label='Attention items mode'
          >
            <button
              type='button'
              role='tab'
              aria-selected={mode === 'action'}
              onClick={() => selectMode('action')}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                mode === 'action'
                  ? totalAtRisk > 0
                    ? 'bg-destructive text-destructive-foreground shadow-sm'
                    : 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Needs action
              <span className='ml-1.5 tabular-nums opacity-80'>
                {totalAtRisk}
              </span>
            </button>
            <button
              type='button'
              role='tab'
              aria-selected={mode === 'upcoming'}
              onClick={() => selectMode('upcoming')}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                mode === 'upcoming'
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Coming up
              <span className='ml-1.5 tabular-nums opacity-80'>
                {totalUpcoming}
              </span>
            </button>
          </div>
        </div>

        {modeTotal === 0 ? (
          <AllClearState
            title={
              mode === 'action' ? 'Nothing needs action' : 'Nothing coming up'
            }
            description={
              mode === 'action'
                ? totalUpcoming > 0
                  ? 'Switch to Coming up to see what is due next.'
                  : 'Contract and sprint items are clear right now.'
                : 'No upcoming activities or period deliverables with dates ahead.'
            }
          />
        ) : (
          <div className='space-y-4'>
            <div
              className='flex flex-wrap gap-2'
              role='tablist'
              aria-label={
                mode === 'action' ? 'Action categories' : 'Upcoming categories'
              }
            >
              {modeCategories.map(cat => {
                const n = counts[cat.countKey]
                const selected = selectedCategoryId === cat.id
                const Icon = cat.icon
                return (
                  <button
                    key={cat.id}
                    type='button'
                    role='tab'
                    aria-selected={selected}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                      selected
                        ? cat.atRisk
                          ? 'border-destructive/40 bg-destructive/10 text-foreground'
                          : 'border-primary/40 bg-primary/10 text-foreground'
                        : 'border-border/70 bg-background/70 text-muted-foreground hover:border-border hover:text-foreground',
                      n === 0 && !selected && 'opacity-50',
                    )}
                  >
                    <Icon className='size-3.5 shrink-0' />
                    {cat.shortLabel}
                    <span className='tabular-nums opacity-80'>{n}</span>
                  </button>
                )
              })}
            </div>

            <div className='overflow-hidden rounded-lg border border-border/70 bg-background/80 shadow-sm'>
              <div
                className={cn(
                  'overflow-y-auto overscroll-contain',
                  selectedCount > 0 && LIST_MAX_HEIGHT,
                )}
              >
                {selectedCount === 0 ? (
                  <div className='p-4'>
                    <AllClearState
                      compact
                      description='Nothing in this filter right now.'
                    />
                  </div>
                ) : isEngagements ? (
                  <div className='p-3'>
                    <StakeholderLateTable
                      items={lateEngagements}
                      onNavigateToTab={onNavigateToTab}
                    />
                  </div>
                ) : isRevisionTasks ? (
                  <ul className='space-y-4 p-3'>
                    {revisionRequestedTasks.map(task => (
                      <li key={`${task.sprintId}-${task._key}`}>
                        <SprintRevisionTaskCard
                          task={task}
                          reviseHref={buildReviseTaskHref(
                            task.sprintId,
                            task._key,
                          )}
                        />
                      </li>
                    ))}
                  </ul>
                ) : isPendingReviewTasks ? (
                  <div className='p-3'>
                    <PendingReviewTasksSection tasks={pendingReviewTasks} />
                  </div>
                ) : (
                  <ul>
                    {filteredRows.map(row => (
                      <li key={row.key}>
                        <FocusRow row={row} onNavigateToTab={onNavigateToTab} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
