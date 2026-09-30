'use client'

import * as React from 'react'
import { addMonths, format, startOfMonth } from 'date-fns'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'
import { LeaveMonthCalendar } from '@/features/leave/leave-month-calendar'
import { LeaveYearCalendar } from '@/features/leave/leave-year-calendar'
import {
  LeavePlanDialog,
  type LeavePlanDraft,
} from '@/features/leave/leave-plan-dialog'
import { cn } from '@/lib/utils'
import { getCurrentFinancialYear } from '@/lib/financial-year'
import { countWorkingDays, type LeaveEntitlement } from '@/lib/leave/entitlement'
import {
  datesCoveredByPlans,
  kindLabel,
  outsideFinancialYearMessage,
  OWN_LEAVE_TAKEN_MESSAGE,
  parseDateKey,
  rangeHitsPlans,
  rangesOverlap,
  staffIdsOnLeave,
  toDateKey,
  visibleMonthBounds,
  type LeaveKind,
} from '@/lib/leave/dates'
import type { LeavePlan, LeaveReliefOption } from '@/lib/leave/types'

type CalendarView = 'month' | 'year'

interface LeavePageContentProps {
  viewerStaffId: string | null
  viewerName: string
  initialMonth: string
  initialPlans: LeavePlan[]
  reliefOptions: LeaveReliefOption[]
  reliefHint: string
  initialEntitlements: LeaveEntitlement[]
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
  initialOwnPlans,
}: LeavePageContentProps) {
  useRegisterPageBreadcrumbs([{ label: 'Leave Management' }])
  const financialYear = React.useMemo(() => getCurrentFinancialYear(), [])
  const firstMonth = startOfMonth(parseDateKey(financialYear.startDate))
  const lastMonth = startOfMonth(parseDateKey(financialYear.endDate))
  const [month, setMonth] = React.useState(() => startOfMonth(parseDateKey(initialMonth)))
  const [plans, setPlans] = React.useState(initialPlans)
  const [ownPlans, setOwnPlans] = React.useState(initialOwnPlans)
  const [entitlements, setEntitlements] = React.useState(initialEntitlements)
  const [calendarView, setCalendarView] = React.useState<CalendarView>('month')
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [editor, setEditor] = React.useState<
    | { mode: 'create'; draft: LeavePlanDraft }
    | { mode: 'edit'; planId: string; draft: LeavePlanDraft }
    | null
  >(null)

  const loadedKey = React.useRef('')
  const requestId = React.useRef(0)

  const loadBounds = React.useCallback(async (from: string, to: string) => {
    if (!viewerStaffId) return
    const request = requestId.current + 1
    requestId.current = request
    setIsLoading(true)
    try {
      const response = await fetch(`/api/leave-plans?from=${from}&to=${to}`)
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
    const key = `year:${financialYear.label}`
    if (loadedKey.current === key) return
    loadedKey.current = key
    void loadBounds(financialYear.startDate, financialYear.endDate)
  }, [
    financialYear.endDate,
    financialYear.label,
    financialYear.startDate,
    loadBounds,
  ])

  const bounds = visibleMonthBounds(month)
  const monthPlans = plans.filter(plan =>
    rangesOverlap(plan.startDate, plan.endDate, bounds.from, bounds.to),
  )
  const visiblePlans = calendarView === 'year' ? plans : monthPlans
  const selected =
    plans.find(plan => plan.id === selectedId) ??
    ownPlans.find(plan => plan.id === selectedId) ??
    null
  const plannedOwn = ownPlans.filter(plan => plan.status === 'planned')
  const confirmedOwn = ownPlans.filter(plan => plan.status === 'confirmed')
  const currentEntitlement =
    entitlements.find(item => item.label === financialYear.label) ?? null

  function replaceOwnPlan(plan: LeavePlan) {
    setOwnPlans(current => {
      const next = current.some(item => item.id === plan.id)
        ? current.map(item => (item.id === plan.id ? plan : item))
        : [...current, plan]
      return next.sort((left, right) => left.startDate.localeCompare(right.startDate))
    })
  }

  function openMonth(nextMonth: Date, planId?: string) {
    setCalendarView('month')
    setMonth(startOfMonth(nextMonth))
    if (planId) setSelectedId(planId)
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

  async function setRelief(planId: string, reliefStaffId: string) {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/leave-plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reliefStaffId }),
      })
      if (!response.ok) {
        throw new Error(await readError(response, 'Failed to set the relief person'))
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
      toast.success('Relief person set')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to set the relief person',
      )
    } finally {
      setIsSaving(false)
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
          <h1 className='text-2xl font-bold'>Leave Management</h1>
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

      <div className='grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]'>
        <div className='space-y-2'>
          <div className='grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2'>
            <p className='text-xl font-normal leading-none'>
              {calendarView === 'year' ? financialYear.label : format(month, 'MMMM yyyy')}
            </p>
            {calendarView === 'month' ? (
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
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => openMonth(new Date())}
                >
                  Today
                </Button>
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
            ) : (
              <div />
            )}
            <div className='justify-self-end'>
              <FilterGroup
                value={calendarView}
                options={[
                  { value: 'month', label: 'Month' },
                  { value: 'year', label: 'Year' },
                ]}
                onChange={setCalendarView}
              />
            </div>
          </div>
          <div className='relative'>
            {calendarView === 'year' ? (
              <LeaveYearCalendar
                financialYear={financialYear}
                plans={visiblePlans}
                viewerStaffId={viewerStaffId}
                selectedId={selectedId}
                onOpenMonth={openMonth}
              />
            ) : (
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
            )}
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
            {calendarView === 'year'
              ? 'The year runs from July to June. Select a month or a marked day to open it.'
              : 'Drag across open days to plan. Days you already have leave on stay closed for you. Drag a planned bar to move it, or drag either end to change the length. Confirmed leave stays fixed.'}
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
                {plannedOwn.length === 0 ? (
                  <PlannedLeaveEmpty entitlement={currentEntitlement} />
                ) : (
                <OwnLeaveList
                  plans={plannedOwn}
                  selectedId={selectedId}
                  emptyLabel='No planned leave yet.'
                  isSaving={isSaving}
                  reliefOptions={reliefOptions}
                  reliefHint={reliefHint}
                  teamPlans={plans}
                  onSelect={selectOwnPlan}
                  onSetRelief={(plan, reliefStaffId) => void setRelief(plan.id, reliefStaffId)}
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
                )}
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
        teamPlans={plans}
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
  reliefOptions = [],
  reliefHint = '',
  teamPlans = [],
  onSelect,
  onSetRelief,
  onConfirm,
  onEdit,
  onRemove,
}: {
  plans: LeavePlan[]
  selectedId: string | null
  emptyLabel: string
  isSaving?: boolean
  reliefOptions?: LeaveReliefOption[]
  reliefHint?: string
  teamPlans?: LeavePlan[]
  onSelect: (plan: LeavePlan) => void
  onSetRelief?: (plan: LeavePlan, reliefStaffId: string) => void
  onConfirm?: (plan: LeavePlan) => void
  onEdit?: (plan: LeavePlan) => void
  onRemove?: (plan: LeavePlan) => void
}) {
  if (plans.length === 0) {
    return <p className='mt-4 text-sm text-muted-foreground'>{emptyLabel}</p>
  }
  return (
    <ul className='max-h-[28rem] space-y-2 overflow-y-auto pr-0.5'>
      {plans.map(plan => {
        const workingDays = countWorkingDays(plan.startDate, plan.endDate)
        const reliefName = plan.reliefStaffName?.trim() || null
        const canSetRelief = Boolean(onSetRelief) && !reliefName
        const reliefOnLeaveIds = staffIdsOnLeave(teamPlans, plan.startDate, plan.endDate)
        const availableRelief = reliefOptions.filter(
          option => !reliefOnLeaveIds.has(option.id),
        )
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
                {canSetRelief ? null : (
                  <div className='mt-3 flex items-center gap-2'>
                    <ReliefAvatar assigned={Boolean(reliefName)} />
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
                )}
                {plan.note ? (
                  <p className='mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground'>
                    {plan.note}
                  </p>
                ) : null}
              </button>
              {canSetRelief ? (
                <div className='space-y-1.5 px-3 pb-2.5'>
                  <span className='block text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
                    Relief
                  </span>
                  <Select
                    value={plan.reliefStaffId || undefined}
                    onValueChange={reliefStaffId => onSetRelief?.(plan, reliefStaffId)}
                    disabled={isSaving || reliefOptions.length === 0}
                  >
                    <SelectTrigger className='h-8 text-xs' aria-label='Select relief person'>
                      <SelectValue placeholder='Select relief person' />
                    </SelectTrigger>
                    <SelectContent>
                      {reliefOptions.map(option => {
                        const onLeave = reliefOnLeaveIds.has(option.id)
                        return (
                          <SelectItem key={option.id} value={option.id} disabled={onLeave}>
                            {onLeave ? `${option.name} · On leave` : option.name}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  {reliefOptions.length === 0 ? (
                    <p className='text-[11px] text-muted-foreground'>
                      {reliefHint || 'No one in your reporting line can cover this leave.'}
                    </p>
                  ) : availableRelief.length === 0 ? (
                    <p className='text-[11px] text-muted-foreground'>
                      Everyone who can cover you is also on leave for these dates.
                    </p>
                  ) : null}
                </div>
              ) : null}
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

function PlannedLeaveEmpty({
  entitlement,
}: {
  entitlement: LeaveEntitlement | null
}) {
  const remaining = entitlement?.remaining ?? null
  const allowance = entitlement?.allowance ?? 0
  const leftShare =
    allowance > 0 && remaining != null ? Math.min(remaining / allowance, 1) : 0

  return (
    <div className='mt-4 space-y-4'>
      <p className='text-sm text-muted-foreground'>No planned leave yet.</p>
      {remaining == null ? null : (
        <div className='rounded-2xl border border-border/80 bg-gradient-to-b from-muted/50 via-background to-background px-4 py-6 text-center'>
          <p className='text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground'>
            Remaining entitlement
          </p>
          <p className='mt-3 text-6xl font-semibold tabular-nums leading-none tracking-tight'>
            {remaining}
          </p>
          <p className='mt-3 text-sm text-muted-foreground'>
            of {allowance} working days
          </p>
          <div
            className='mx-auto mt-4 h-1.5 w-full max-w-[12rem] overflow-hidden rounded-full bg-muted'
            role='img'
            aria-label={`${remaining} of ${allowance} working days left`}
          >
            <div
              className='h-full rounded-full bg-foreground/80'
              style={{ width: `${leftShare * 100}%` }}
            />
          </div>
          <p className='mt-3 text-[11px] text-muted-foreground'>{entitlement?.label}</p>
        </div>
      )}
    </div>
  )
}

function ReliefAvatar({ assigned }: { assigned: boolean }) {
  const gradientId = React.useId().replace(/:/g, '')
  return (
    <span
      className={cn(
        'relative size-7 shrink-0 overflow-hidden rounded-full',
        assigned
          ? 'bg-gradient-to-b from-slate-200 to-white dark:from-white/30 dark:to-white/5'
          : 'bg-gradient-to-b from-amber-100 to-amber-50 dark:from-amber-100/25 dark:to-amber-100/5',
        '[--avatar-top:#334155] [--avatar-bottom:#94a3b8]',
        'dark:[--avatar-top:#ffffff] dark:[--avatar-bottom:#ffffff73]',
      )}
      aria-hidden
    >
      <svg viewBox='0 0 32 32' className='size-full'>
        <defs>
          <linearGradient
            id={gradientId}
            x1='16'
            y1='6'
            x2='16'
            y2='32'
            gradientUnits='userSpaceOnUse'
          >
            <stop offset='0%' stopColor='var(--avatar-top)' />
            <stop offset='100%' stopColor='var(--avatar-bottom)' />
          </linearGradient>
        </defs>
        <g fill={`url(#${gradientId})`}>
          <circle cx='16' cy='11.5' r='5.2' />
          <path d='M4.2 26.4C6 21.2 10.2 18.4 16 18.4s10 2.8 11.8 8V34H4.2Z' />
        </g>
      </svg>
    </span>
  )
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
