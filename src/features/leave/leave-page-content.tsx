'use client'

import * as React from 'react'
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns'
import { ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'
import { LeaveMonthCalendar } from '@/features/leave/leave-month-calendar'
import {
  LeavePlanDialog,
  type LeavePlanDraft,
} from '@/features/leave/leave-plan-dialog'
import { cn } from '@/lib/utils'
import {
  getCurrentFinancialYear,
  getFinancialYearForDate,
} from '@/lib/financial-year'
import { countWorkingDays, type LeaveEntitlement } from '@/lib/leave/entitlement'
import {
  datesCoveredByPlans,
  kindLabel,
  outsideFinancialYearMessage,
  OWN_LEAVE_TAKEN_MESSAGE,
  parseDateKey,
  rangeHitsPlans,
  rangesOverlap,
  toDateKey,
  visibleMonthBounds,
  type LeaveKind,
} from '@/lib/leave/dates'
import type { LeavePlan, LeaveReliefOption } from '@/lib/leave/types'

type StatusFilter = 'all' | 'planned' | 'confirmed'

interface LeavePageContentProps {
  viewerStaffId: string | null
  viewerName: string
  initialMonth: string
  initialPlans: LeavePlan[]
  reliefOptions: LeaveReliefOption[]
  reliefHint: string
  initialEntitlements: LeaveEntitlement[]
  reporteeIds: string[]
  initialOwnPlans: LeavePlan[]
}

function formatSpan(startDate: string, endDate: string): string {
  const start = parseDateKey(startDate)
  const end = parseDateKey(endDate)
  if (startDate === endDate) return format(start, 'd MMM yyyy')
  if (format(start, 'MMM yyyy') === format(end, 'MMM yyyy')) {
    return `${format(start, 'd')}–${format(end, 'd MMM yyyy')}`
  }
  return `${format(start, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`
}

function mergeEntitlements(
  current: LeaveEntitlement[],
  next: LeaveEntitlement[] | undefined,
): LeaveEntitlement[] {
  if (!next?.length) return current
  const byLabel = new Map(current.map(item => [item.label, item]))
  for (const item of next) byLabel.set(item.label, item)
  return [...byLabel.values()]
}

async function readError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => ({}))) as { error?: string }
  return data.error || fallback
}

export function LeavePageContent({
  viewerStaffId,
  viewerName: _viewerName,
  initialMonth,
  initialPlans,
  reliefOptions,
  reliefHint,
  initialEntitlements,
  reporteeIds,
  initialOwnPlans,
}: LeavePageContentProps) {
  useRegisterPageBreadcrumbs([{ label: 'Leave' }])
  const financialYear = React.useMemo(() => getCurrentFinancialYear(), [])
  const firstMonth = startOfMonth(parseDateKey(financialYear.startDate))
  const lastMonth = startOfMonth(parseDateKey(financialYear.endDate))
  const [month, setMonth] = React.useState(() => startOfMonth(parseDateKey(initialMonth)))
  const [plans, setPlans] = React.useState(initialPlans)
  const [ownPlans, setOwnPlans] = React.useState(initialOwnPlans)
  const [entitlements, setEntitlements] = React.useState(initialEntitlements)
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all')
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [editor, setEditor] = React.useState<
    | { mode: 'create'; draft: LeavePlanDraft }
    | { mode: 'edit'; planId: string; draft: LeavePlanDraft }
    | null
  >(null)

  const monthKey = toDateKey(month)
  const loadedKey = React.useRef(monthKey)
  const requestId = React.useRef(0)

  const loadMonth = React.useCallback(async (nextMonth: Date) => {
    if (!viewerStaffId) return
    const bounds = visibleMonthBounds(nextMonth)
    const request = requestId.current + 1
    requestId.current = request
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/leave-plans?from=${bounds.from}&to=${bounds.to}`,
      )
      if (!response.ok) {
        throw new Error(await readError(response, 'Failed to load leave'))
      }
      const data = (await response.json()) as {
        plans: LeavePlan[]
        entitlements?: LeaveEntitlement[]
      }
      if (requestId.current !== request) return
      setPlans(data.plans)
      if (data.entitlements) setEntitlements(data.entitlements)
    } catch (error) {
      if (requestId.current !== request) return
      toast.error(error instanceof Error ? error.message : 'Failed to load leave')
    } finally {
      if (requestId.current === request) setIsLoading(false)
    }
  }, [viewerStaffId])

  React.useEffect(() => {
    if (loadedKey.current === monthKey) return
    loadedKey.current = monthKey
    void loadMonth(month)
  }, [loadMonth, month, monthKey])

  const bounds = visibleMonthBounds(month)
  const monthPlans = plans.filter(plan =>
    rangesOverlap(plan.startDate, plan.endDate, bounds.from, bounds.to),
  )
  const visiblePlans = monthPlans.filter(plan => {
    if (statusFilter !== 'all' && plan.status !== statusFilter) return false
    return true
  })
  const selected =
    plans.find(plan => plan.id === selectedId) ??
    ownPlans.find(plan => plan.id === selectedId) ??
    null
  const monthEntitlement = entitlements.find(
    item => item.label === getFinancialYearForDate(month).label,
  )
  const reporteeIdSet = React.useMemo(() => new Set(reporteeIds), [reporteeIds])
  const monthStart = toDateKey(startOfMonth(month))
  const monthEnd = toDateKey(endOfMonth(month))
  const reporteePlans = plans.filter(
    plan =>
      reporteeIdSet.has(plan.staffId) &&
      rangesOverlap(plan.startDate, plan.endDate, monthStart, monthEnd),
  )
  const plannedCount = reporteePlans.filter(plan => plan.status === 'planned').length
  const confirmedCount = reporteePlans.filter(plan => plan.status === 'confirmed').length
  const plannedOwn = ownPlans.filter(plan => plan.status === 'planned')
  const confirmedOwn = ownPlans.filter(plan => plan.status === 'confirmed')

  function replaceOwnPlan(plan: LeavePlan) {
    setOwnPlans(current => {
      const next = current.some(item => item.id === plan.id)
        ? current.map(item => (item.id === plan.id ? plan : item))
        : [...current, plan]
      return next.sort((left, right) => left.startDate.localeCompare(right.startDate))
    })
  }

  function selectOwnPlan(plan: LeavePlan) {
    setSelectedId(plan.id)
    if (plan.endDate < financialYear.startDate || plan.startDate > financialYear.endDate) {
      return
    }
    const visibleStart =
      plan.startDate < financialYear.startDate
        ? financialYear.startDate
        : plan.startDate
    const planMonth = startOfMonth(parseDateKey(visibleStart))
    if (toDateKey(planMonth) !== toDateKey(startOfMonth(month))) {
      setMonth(planMonth)
    }
  }

  function openCreate(startDate: string, endDate: string) {
    if (!viewerStaffId) {
      toast.error('A staff profile is required before you can plan leave.')
      return
    }
    const yearError = outsideFinancialYearMessage(startDate, endDate, financialYear)
    if (yearError) {
      toast.error(yearError)
      return
    }
    if (rangeHitsPlans(startDate, endDate, ownPlans)) {
      toast.error(OWN_LEAVE_TAKEN_MESSAGE)
      return
    }
    setEditor({
      mode: 'create',
      draft: { startDate, endDate, kind: 'annual', reliefStaffId: '', note: '' },
    })
  }

  async function saveDraft(draft: LeavePlanDraft) {
    setIsSaving(true)
    try {
      if (editor?.mode === 'edit') {
        const response = await fetch(`/api/leave-plans/${editor.planId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        })
        if (!response.ok) {
          throw new Error(await readError(response, 'Failed to update leave'))
        }
        const data = (await response.json()) as {
          plan: LeavePlan
          entitlements?: LeaveEntitlement[]
        }
        setPlans(current =>
          current.map(plan => (plan.id === data.plan.id ? data.plan : plan)),
        )
        replaceOwnPlan(data.plan)
        setEntitlements(current => mergeEntitlements(current, data.entitlements))
        setSelectedId(data.plan.id)
        toast.success('Leave plan updated')
      } else {
        const response = await fetch('/api/leave-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...draft, status: 'planned' }),
        })
        if (!response.ok) {
          throw new Error(await readError(response, 'Failed to save leave'))
        }
        const data = (await response.json()) as {
          plan: LeavePlan
          entitlements?: LeaveEntitlement[]
        }
        setPlans(current => [...current, data.plan])
        replaceOwnPlan(data.plan)
        setEntitlements(current => mergeEntitlements(current, data.entitlements))
        setSelectedId(data.plan.id)
        toast.success('Leave plan saved')
      }
      setEditor(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save leave')
    } finally {
      setIsSaving(false)
    }
  }

  async function shiftPlan(planId: string, startDate: string, endDate: string) {
    const currentPlan = plans.find(plan => plan.id === planId)
    if (
      !currentPlan ||
      currentPlan.staffId !== viewerStaffId ||
      currentPlan.status === 'confirmed'
    ) {
      return
    }
    const previous = plans
    const previousOwn = ownPlans
    setPlans(current =>
      current.map(plan =>
        plan.id === planId ? { ...plan, startDate, endDate } : plan,
      ),
    )
    setOwnPlans(current =>
      current
        .map(plan => (plan.id === planId ? { ...plan, startDate, endDate } : plan))
        .sort((left, right) => left.startDate.localeCompare(right.startDate)),
    )
    try {
      const response = await fetch(`/api/leave-plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      })
      if (!response.ok) {
        throw new Error(await readError(response, 'Failed to move leave'))
      }
      const data = (await response.json()) as {
        plan: LeavePlan
        entitlements?: LeaveEntitlement[]
      }
      setPlans(current =>
        current.map(plan => (plan.id === data.plan.id ? data.plan : plan)),
      )
      replaceOwnPlan(data.plan)
      setEntitlements(current => mergeEntitlements(current, data.entitlements))
    } catch (error) {
      setPlans(previous)
      setOwnPlans(previousOwn)
      toast.error(error instanceof Error ? error.message : 'Failed to move leave')
    }
  }

  async function setStatus(planId: string, status: 'planned' | 'confirmed') {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/leave-plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) {
        throw new Error(await readError(response, 'Failed to update leave'))
      }
      const data = (await response.json()) as {
        plan: LeavePlan
        entitlements?: LeaveEntitlement[]
      }
      setPlans(current =>
        current.map(plan => (plan.id === data.plan.id ? data.plan : plan)),
      )
      replaceOwnPlan(data.plan)
      setEntitlements(current => mergeEntitlements(current, data.entitlements))
      toast.success(status === 'confirmed' ? 'Leave confirmed' : 'Moved back to planned')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update leave')
    } finally {
      setIsSaving(false)
    }
  }

  async function removePlan(planId: string) {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/leave-plans/${planId}`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error(await readError(response, 'Failed to remove leave'))
      }
      const data = (await response.json()) as { entitlements?: LeaveEntitlement[] }
      setPlans(current => current.filter(plan => plan.id !== planId))
      setOwnPlans(current => current.filter(plan => plan.id !== planId))
      setEntitlements(current => mergeEntitlements(current, data.entitlements))
      setSelectedId(null)
      setDeleteOpen(false)
      toast.success('Leave plan removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove leave')
    } finally {
      setIsSaving(false)
    }
  }

  const dialogReliefOptions = React.useMemo(() => {
    const currentId = editor?.draft.reliefStaffId
    if (!currentId || reliefOptions.some(option => option.id === currentId)) {
      return reliefOptions
    }
    const current = plans.find(plan => plan.reliefStaffId === currentId)
    return [
      {
        id: currentId,
        name: current?.reliefStaffName || 'Current relief',
        role: '',
      },
      ...reliefOptions,
    ]
  }, [editor, plans, reliefOptions])

  const editorInitial = editor?.draft ?? {
    startDate: toDateKey(new Date()),
    endDate: toDateKey(new Date()),
    kind: 'annual' as LeaveKind,
    reliefStaffId: '',
    note: '',
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 pt-6 md:p-8'>
      <div className='mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-bold'>Leave</h1>
          <p className='max-w-2xl text-sm text-muted-foreground'>
            Manage your leave
          </p>
        </div>
        <Button
          type='button'
          className='self-start'
          disabled={!viewerStaffId}
          onClick={() => openCreate(toDateKey(new Date()), toDateKey(new Date()))}
        >
          <Plus className='h-4 w-4' />
          Plan leave
        </Button>
      </div>

      {!viewerStaffId ? (
        <p className='mb-4 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm text-muted-foreground'>
          Your account is not linked to a staff profile, so leave cannot be planned yet.
        </p>
      ) : null}

      <div className='mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between'>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => setMonth(startOfMonth(new Date()))}
          >
            Today
          </Button>
          <div className='flex items-center gap-1'>
            <Button
              type='button'
              variant='outline'
              size='icon'
              className='h-8 w-8'
              aria-label='Previous month'
              disabled={startOfMonth(month) <= firstMonth}
              onClick={() =>
                setMonth(current => {
                  const next = addMonths(current, -1)
                  return next < firstMonth ? firstMonth : next
                })
              }
            >
              <ChevronLeft className='h-4 w-4' />
            </Button>
            <p className='min-w-40 text-center text-sm font-semibold'>
              {format(month, 'MMMM yyyy')}
            </p>
            <Button
              type='button'
              variant='outline'
              size='icon'
              className='h-8 w-8'
              aria-label='Next month'
              disabled={startOfMonth(month) >= lastMonth}
              onClick={() =>
                setMonth(current => {
                  const next = addMonths(current, 1)
                  return next > lastMonth ? lastMonth : next
                })
              }
            >
              <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
          <p className='text-xs text-muted-foreground'>
            {plannedCount} planned · {confirmedCount} confirmed below you
          </p>
          {monthEntitlement ? (
            <p className='text-xs text-muted-foreground'>
              {monthEntitlement.label}: {monthEntitlement.remaining} of{' '}
              {monthEntitlement.allowance} working days left
            </p>
          ) : null}
        </div>
        <div className='flex flex-wrap gap-2'>
          <FilterGroup
            value={statusFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'planned', label: 'Planned' },
              { value: 'confirmed', label: 'Confirmed' },
            ]}
            onChange={setStatusFilter}
          />
        </div>
      </div>

      <div className='grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]'>
        <div className='space-y-2'>
          <div className='relative'>
            <LeaveMonthCalendar
              month={month}
              plans={visiblePlans}
              ownPlans={ownPlans}
              viewerStaffId={viewerStaffId}
              selectedId={selectedId}
              yearStart={financialYear.startDate}
              yearEnd={financialYear.endDate}
              canCreate={Boolean(viewerStaffId) && !isLoading}
              onSelect={setSelectedId}
              onCreateRange={openCreate}
              onShiftPlan={(planId, startDate, endDate) => {
                void shiftPlan(planId, startDate, endDate)
              }}
            />
            {isLoading ? (
              <div
                className='absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-background/55'
                role='status'
                aria-live='polite'
              >
                <Loader2 className='size-6 animate-spin text-foreground' />
                <span className='sr-only'>Loading leave</span>
              </div>
            ) : null}
          </div>
          <p className='text-xs text-muted-foreground'>
            Drag across open days to plan. Days you already have leave on stay closed
            for you. Drag a planned bar to move it, or drag either end to change the
            length. Confirmed leave stays fixed.
          </p>
        </div>

        <aside className='space-y-4 rounded-xl border border-border/80 bg-gradient-to-br from-muted/30 via-background to-muted/10 p-4'>
          <section className='space-y-3'>
            <h2 className='text-sm font-semibold'>Your leave</h2>
            <Tabs defaultValue='planned'>
              <TabsList className='grid h-auto w-full grid-cols-2'>
                <TabsTrigger value='planned' className='text-xs'>
                  Planned ({plannedOwn.length})
                </TabsTrigger>
                <TabsTrigger value='confirmed' className='text-xs'>
                  Confirmed ({confirmedOwn.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value='planned'>
                <OwnLeaveList
                  plans={plannedOwn}
                  selectedId={selectedId}
                  emptyLabel='No planned leave yet.'
                  isSaving={isSaving}
                  onSelect={selectOwnPlan}
                  onConfirm={plan => void setStatus(plan.id, 'confirmed')}
                  onEdit={plan =>
                    setEditor({
                      mode: 'edit',
                      planId: plan.id,
                      draft: {
                        startDate: plan.startDate,
                        endDate: plan.endDate,
                        kind: plan.kind,
                        reliefStaffId: plan.reliefStaffId ?? '',
                        note: plan.note,
                      },
                    })
                  }
                  onRemove={plan => {
                    setSelectedId(plan.id)
                    setDeleteOpen(true)
                  }}
                />
              </TabsContent>
              <TabsContent value='confirmed'>
                <OwnLeaveList
                  plans={confirmedOwn}
                  selectedId={selectedId}
                  emptyLabel='No confirmed leave yet.'
                  onSelect={selectOwnPlan}
                />
              </TabsContent>
            </Tabs>
          </section>
        </aside>
      </div>

      <LeavePlanDialog
        open={editor != null}
        mode={editor?.mode ?? 'create'}
        initial={editorInitial}
        reliefOptions={dialogReliefOptions}
        reliefHint={reliefHint}
        entitlements={entitlements}
        editingAnnual={
          editor?.mode === 'edit'
            ? (plans.find(plan => plan.id === editor.planId) ?? null)
            : null
        }
        blockedDates={datesCoveredByPlans(
          ownPlans,
          editor?.mode === 'edit' ? editor.planId : undefined,
        )}
        isSaving={isSaving}
        onOpenChange={open => {
          if (!open) setEditor(null)
        }}
        onSubmit={draft => void saveDraft(draft)}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this leave plan?</AlertDialogTitle>
            <AlertDialogDescription>
              It disappears from the calendar for everyone. You can plan it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSaving || !selected}
              onClick={event => {
                event.preventDefault()
                if (selected) void removePlan(selected.id)
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function OwnLeaveList({
  plans,
  selectedId,
  emptyLabel,
  isSaving = false,
  onSelect,
  onConfirm,
  onEdit,
  onRemove,
}: {
  plans: LeavePlan[]
  selectedId: string | null
  emptyLabel: string
  isSaving?: boolean
  onSelect: (plan: LeavePlan) => void
  onConfirm?: (plan: LeavePlan) => void
  onEdit?: (plan: LeavePlan) => void
  onRemove?: (plan: LeavePlan) => void
}) {
  if (plans.length === 0) {
    return <p className='text-sm text-muted-foreground'>{emptyLabel}</p>
  }
  return (
    <ul className='max-h-[28rem] space-y-2 overflow-y-auto pr-0.5'>
      {plans.map(plan => {
        const workingDays = countWorkingDays(plan.startDate, plan.endDate)
        const reliefName = plan.reliefStaffName?.trim() || null
        const selected = selectedId === plan.id
        return (
          <li key={plan.id}>
            <article
              className={cn(
                'overflow-hidden rounded-xl border bg-background/80 shadow-sm transition-colors',
                selected
                  ? 'border-primary/50 ring-1 ring-primary/25'
                  : 'border-border/70 hover:border-border',
              )}
            >
              <button
                type='button'
                className='w-full px-3 py-2.5 text-left'
                onClick={() => onSelect(plan)}
              >
                <div className='flex items-start justify-between gap-2'>
                  <p className='text-sm font-semibold leading-snug'>
                    {formatSpan(plan.startDate, plan.endDate)}
                  </p>
                  <span className='shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
                    {kindLabel(plan.kind)}
                  </span>
                </div>
                <p className='mt-1 text-[11px] text-muted-foreground'>
                  {workingDays === 0
                    ? 'No working days'
                    : `${workingDays} working ${workingDays === 1 ? 'day' : 'days'}`}
                </p>
                <div className='mt-3 flex items-center gap-2'>
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                      reliefName
                        ? 'bg-primary/15 text-primary'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-200',
                    )}
                    aria-hidden
                  >
                    {reliefInitials(reliefName)}
                  </span>
                  <span className='min-w-0'>
                    <span className='block text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
                      Relief
                    </span>
                    <span
                      className={cn(
                        'block truncate text-xs',
                        reliefName
                          ? 'font-medium text-foreground'
                          : 'text-amber-700 dark:text-amber-200',
                      )}
                    >
                      {reliefName ?? 'Not set'}
                    </span>
                  </span>
                </div>
                {plan.note ? (
                  <p className='mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground'>
                    {plan.note}
                  </p>
                ) : null}
              </button>
              {onConfirm && onEdit && onRemove ? (
                <div className='flex items-center gap-1 border-t border-border/60 px-2 py-1.5'>
                  <Button
                    type='button'
                    size='sm'
                    className='h-7 flex-1 text-xs'
                    disabled={isSaving || !plan.reliefStaffId}
                    title={
                      plan.reliefStaffId
                        ? 'Confirm this leave'
                        : 'Choose a relief person before you confirm.'
                    }
                    onClick={() => onConfirm(plan)}
                  >
                    Confirm
                  </Button>
                  <Button
                    type='button'
                    size='icon'
                    variant='ghost'
                    className='size-7'
                    disabled={isSaving}
                    aria-label='Edit leave'
                    onClick={() => onEdit(plan)}
                  >
                    <Pencil className='size-3.5' />
                  </Button>
                  <Button
                    type='button'
                    size='icon'
                    variant='ghost'
                    className='size-7 text-destructive hover:text-destructive'
                    disabled={isSaving}
                    aria-label='Remove leave'
                    onClick={() => onRemove(plan)}
                  >
                    <Trash2 className='size-3.5' />
                  </Button>
                </div>
              ) : null}
            </article>
          </li>
        )
      })}
    </ul>
  )
}

function reliefInitials(name: string | null): string {
  if (!name) return '?'
  const letters = name
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('')
  return letters || '?'
}

function FilterGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className='inline-flex rounded-lg border border-border/80 bg-background/80 p-1'>
      {options.map(option => (
        <button
          key={option.value}
          type='button'
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            value === option.value
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
