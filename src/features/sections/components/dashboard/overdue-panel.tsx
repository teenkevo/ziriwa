'use client'

import * as React from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import {
  AlertTriangle,
  CalendarX,
  CheckCircle2,
  ClipboardList,
  RefreshCcw,
  ListChecks,
  Handshake,
  ChevronRight,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import type { WorkspaceScopeKind } from '@/lib/project-workspace-copy'
import type {
  AtRiskActivity,
  AtRiskPeriodDeliverable,
  AtRiskSprintTask,
  LateEngagement,
} from '@/lib/section-dashboard-metrics'
import { isProjectSprintScope } from '@/lib/sprint-task-validation'

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
  workspaceScope?: WorkspaceScopeKind
}

type AttentionTab = 'contract' | 'stakeholder-engagements' | 'weekly-sprint'

type CategoryId =
  | 'activities'
  | 'deliverables'
  | 'review'
  | 'revision'
  | 'engagements'

const PROJECT_HIDDEN_CATEGORIES = new Set<CategoryId>(['review', 'revision'])

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
  /** When false, detailed-task style row without initials avatar. */
  showAvatar?: boolean
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
    label: 'Stakeholder engagements past due date',
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
  sectionSlug?: string,
): AttentionRow[] {
  const rows: AttentionRow[] = []

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
    const initiativeLabel =
      item.initiativeCode?.trim() && item.initiativeTitle?.trim()
        ? `${item.initiativeCode.trim()} · ${item.initiativeTitle.trim()}`
        : item.initiativeTitle?.trim() || item.initiativeCode?.trim() || ''
    const activityTypeTag =
      item.activityType === 'kpi'
        ? 'KPI -->'
        : item.activityType === 'cross-cutting'
          ? 'CC -->'
          : ''
    const activityLabel =
      activityTypeTag && item.activityTitle?.trim()
        ? `${activityTypeTag} ${item.activityTitle.trim()}`
        : item.activityTitle?.trim() || activityTypeTag
    rows.push({
      key: `a-${item._key}`,
      categoryId: 'activities',
      tab: 'contract',
      title: item.title,
      initials: initialsFromLabel(item.title),
      dateLine: `Due ${fmtDate(item.targetDate)}`,
      statusPill: daysOverdueLabel(item.daysOverdue),
      statusVariant: 'destructive',
      context: [activityLabel, initiativeLabel].filter(Boolean).join(' --> '),
      showAvatar: false,
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
      showAvatar: false,
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
      showAvatar: false,
    })
  }

  return rows
}

function defaultCategoryId(
  counts: Record<(typeof CATEGORIES)[number]['countKey'], number>,
  categories: typeof CATEGORIES,
  priority: CategoryId[],
): CategoryId {
  for (const id of priority) {
    const cat = categories.find(c => c.id === id)!
    if (counts[cat.countKey] > 0) return id
  }
  return categories[0]?.id ?? 'activities'
}

function categoriesForScope(scope: WorkspaceScopeKind = 'mainstream') {
  if (!isProjectSprintScope(scope)) return CATEGORIES
  return CATEGORIES.filter(cat => !PROJECT_HIDDEN_CATEGORIES.has(cat.id))
}

function categoryPriorityForScope(scope: WorkspaceScopeKind = 'mainstream') {
  if (!isProjectSprintScope(scope)) return CATEGORY_PRIORITY
  return CATEGORY_PRIORITY.filter(id => !PROJECT_HIDDEN_CATEGORIES.has(id))
}

const MAX_CARDS = 8
const MAX_ENGAGEMENT_ROWS = 12

const HML_LABEL: Record<'H' | 'M' | 'L', string> = {
  H: 'High',
  M: 'Medium',
  L: 'Low',
}

function hmlCell(v?: 'H' | 'M' | 'L') {
  if (!v) {
    return <span className='text-muted-foreground'>—</span>
  }
  return (
    <span
      className='inline-flex min-w-[1.75rem] justify-center rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-xs font-semibold tabular-nums'
      title={HML_LABEL[v]}
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
  overflow,
  onNavigateToTab,
}: {
  items: LateEngagement[]
  overflow: number
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
    <div className='space-y-2'>
      <div className='overflow-hidden rounded-lg border border-border/80 bg-card shadow-sm'>
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
              <TableHead className=' whitespace-nowrap pr-3 text-right' />
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
                <TableCell className=''>
                  {fmtDate(entry.proposedDate)}
                </TableCell>
                <TableCell className='pr-3 text-right'>
                  <Badge
                    variant='destructive'
                    className='rounded-full px-2 py-0 text-[11px] font-semibold tabular-nums'
                  >
                    {daysLateLabel(entry.daysLate)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {overflow > 0 ? (
        <p className='text-xs text-muted-foreground'>
          +{overflow} more in this category
        </p>
      ) : null}
    </div>
  )
}

function AllClearState({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 text-center',
        compact ? 'px-4 py-8' : 'px-6 py-12',
      )}
    >
      <CheckCircle2
        className={cn(
          'text-emerald-600 dark:text-emerald-500',
          compact ? 'h-8 w-8' : 'h-10 w-10',
        )}
        aria-hidden
      />
      <p
        className={cn(
          'mt-3 font-medium text-foreground',
          compact ? 'text-sm' : 'text-base',
        )}
      >
        All good
      </p>
      <p className='mt-1 max-w-sm text-xs text-muted-foreground'>
        {compact
          ? 'Nothing needs attention in this category.'
          : 'Nothing is overdue or blocked right now.'}
      </p>
    </div>
  )
}

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
      {row.showAvatar !== false ? (
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
      ) : null}
      <div className='min-w-0 flex-1'>
        <div className='text-sm font-medium text-foreground'>{row.title}</div>
        {row.context ? (
          <span className='text-xs text-muted-foreground'>{row.context}</span>
        ) : null}
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
  workspaceScope = 'mainstream',
}: OverduePanelProps) {
  const visibleCategories = React.useMemo(
    () => categoriesForScope(workspaceScope),
    [workspaceScope],
  )
  const visibleCategoryPriority = React.useMemo(
    () => categoryPriorityForScope(workspaceScope),
    [workspaceScope],
  )

  const counts = {
    overdueActivities: overdueActivities.length,
    overduePeriodDeliverables: overduePeriodDeliverables.length,
    pendingReviewTasks: pendingReviewTasks.length,
    revisionRequestedTasks: revisionRequestedTasks.length,
    lateEngagements: lateEngagements.length,
  }

  const totalAtRisk = visibleCategories.reduce(
    (sum, cat) => sum + counts[cat.countKey],
    0,
  )

  const attentionRows = React.useMemo(() => {
    const rows = buildAttentionRows(
      overdueActivities,
      overduePeriodDeliverables,
      pendingReviewTasks,
      revisionRequestedTasks,
      sectionSlug,
    )
    if (!isProjectSprintScope(workspaceScope)) return rows
    return rows.filter(row => !PROJECT_HIDDEN_CATEGORIES.has(row.categoryId))
  }, [
    overdueActivities,
    overduePeriodDeliverables,
    pendingReviewTasks,
    revisionRequestedTasks,
    sectionSlug,
    workspaceScope,
  ])

  const [selectedCategoryId, setSelectedCategoryId] =
    React.useState<CategoryId>(() =>
      defaultCategoryId(counts, visibleCategories, visibleCategoryPriority),
    )

  React.useEffect(() => {
    if (totalAtRisk === 0) return
    setSelectedCategoryId(prev => {
      if (
        !visibleCategories.some(cat => cat.id === prev) ||
        counts[visibleCategories.find(c => c.id === prev)!.countKey] === 0
      ) {
        return defaultCategoryId(
          counts,
          visibleCategories,
          visibleCategoryPriority,
        )
      }
      return prev
    })
  }, [
    totalAtRisk,
    visibleCategories,
    visibleCategoryPriority,
    counts.overdueActivities,
    counts.overduePeriodDeliverables,
    counts.pendingReviewTasks,
    counts.revisionRequestedTasks,
    counts.lateEngagements,
  ])

  const selectedCategory =
    visibleCategories.find(c => c.id === selectedCategoryId) ??
    visibleCategories[0]
  const selectedLabel = selectedCategory?.label ?? ''
  const selectedCount = selectedCategory
    ? counts[selectedCategory.countKey]
    : 0

  const filteredRows = attentionRows.filter(
    r => r.categoryId === selectedCategoryId,
  )
  const isEngagements = selectedCategoryId === 'engagements'
  const visibleEngagements = isEngagements
    ? lateEngagements.slice(0, MAX_ENGAGEMENT_ROWS)
    : []
  const engagementOverflow = isEngagements
    ? Math.max(0, lateEngagements.length - visibleEngagements.length)
    : 0
  const visibleCards = isEngagements ? [] : filteredRows.slice(0, MAX_CARDS)
  const overflow = isEngagements
    ? engagementOverflow
    : filteredRows.length - visibleCards.length

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
        <div className='flex flex-col gap-6 lg:flex-row lg:gap-0'>
          <nav
            aria-label='At-risk categories'
            className='flex shrink-0 flex-col gap-0.5 border-b border-border pb-4 lg:w-96 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-5'
          >
            {visibleCategories.map(cat => {
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
                    className={cn('h-4 w-4 shrink-0', 'text-muted-foreground')}
                  />
                  <span className='min-w-0 flex-1 text-sm leading-snug'>
                    {cat.label}
                  </span>
                  <Badge
                    variant='outline'
                    className={cn(
                      'shrink-0 tabular-nums',
                      n > 0 && 'border-destructive',
                    )}
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
                {totalAtRisk === 0 ? 'Status' : 'Top priority'}
              </h3>
              <p className='mt-0.5 text-xs text-muted-foreground'>
                {totalAtRisk === 0
                  ? 'All categories are clear'
                  : selectedCount > 0
                    ? `${selectedLabel} — ${selectedCount} ${selectedCount === 1 ? 'item' : 'items'}`
                    : selectedLabel}
              </p>
            </div>

            {totalAtRisk === 0 ? (
              <AllClearState />
            ) : selectedCount === 0 ? (
              <AllClearState compact />
            ) : isEngagements ? (
              <StakeholderLateTable
                items={visibleEngagements}
                overflow={engagementOverflow}
                onNavigateToTab={onNavigateToTab}
              />
            ) : (
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
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
