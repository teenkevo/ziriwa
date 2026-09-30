'use client'

import * as React from 'react'
import { format, isSameMonth, isToday } from 'date-fns'

import { cn } from '@/lib/utils'
import {
  clampBeforeLockedDate,
  datesCoveredByPlans,
  inclusiveDays,
  kindLabel,
  monthWeeks,
  normalizeRange,
  parseDateKey,
  rangeHitsPlans,
  shiftDateKey,
  toDateKey,
  validateLeaveRange,
} from '@/lib/leave/dates'
import type { LeavePlan } from '@/lib/leave/types'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const TONES = [
  {
    planned:
      'border-sky-700/35 bg-sky-500/15 text-sky-950 dark:border-sky-200/45 dark:text-sky-50',
    confirmed: 'border-sky-700 bg-sky-600 text-white',
  },
  {
    planned:
      'border-violet-700/35 bg-violet-500/15 text-violet-950 dark:border-violet-200/45 dark:text-violet-50',
    confirmed: 'border-violet-700 bg-violet-600 text-white',
  },
  {
    planned:
      'border-emerald-700/35 bg-emerald-500/15 text-emerald-950 dark:border-emerald-200/45 dark:text-emerald-50',
    confirmed: 'border-emerald-700 bg-emerald-600 text-white',
  },
  {
    planned:
      'border-amber-700/40 bg-amber-500/15 text-amber-950 dark:border-amber-200/50 dark:text-amber-50',
    confirmed: 'border-amber-700 bg-amber-600 text-white',
  },
  {
    planned:
      'border-rose-700/35 bg-rose-500/15 text-rose-950 dark:border-rose-200/45 dark:text-rose-50',
    confirmed: 'border-rose-700 bg-rose-600 text-white',
  },
  {
    planned:
      'border-cyan-700/35 bg-cyan-500/15 text-cyan-950 dark:border-cyan-200/45 dark:text-cyan-50',
    confirmed: 'border-cyan-700 bg-cyan-600 text-white',
  },
  {
    planned:
      'border-fuchsia-700/35 bg-fuchsia-500/15 text-fuchsia-950 dark:border-fuchsia-200/45 dark:text-fuchsia-50',
    confirmed: 'border-fuchsia-700 bg-fuchsia-600 text-white',
  },
  {
    planned:
      'border-lime-700/40 bg-lime-500/15 text-lime-950 dark:border-lime-200/50 dark:text-lime-50',
    confirmed: 'border-lime-800 bg-lime-600 text-white',
  },
] as const

interface Segment {
  plan: LeavePlan
  startCol: number
  endCol: number
  lane: number
  continuesBefore: boolean
  continuesAfter: boolean
}

type Interaction =
  | {
      kind: 'create'
      pointerId: number
      anchor: string
      current: string
      moved: boolean
    }
  | {
      kind: 'move' | 'resize-start' | 'resize-end'
      pointerId: number
      planId: string
      originStart: string
      originEnd: string
      grabOffset: number
      moved: boolean
    }

interface LeaveMonthCalendarProps {
  month: Date
  plans: LeavePlan[]
  ownPlans: LeavePlan[]
  viewerStaffId: string | null
  selectedId: string | null
  yearStart: string
  yearEnd: string
  canCreate: boolean
  onSelect: (planId: string | null) => void
  onCreateRange: (startDate: string, endDate: string) => void
  onShiftPlan: (planId: string, startDate: string, endDate: string) => void
}

function toneFor(staffId: string) {
  let hash = 0
  for (let index = 0; index < staffId.length; index += 1) {
    hash = (hash * 31 + staffId.charCodeAt(index)) >>> 0
  }
  return TONES[hash % TONES.length] ?? TONES[0]
}

function dateUnderPointer(x: number, y: number): string | null {
  const stack = document.elementsFromPoint(x, y)
  for (const node of stack) {
    if (!(node instanceof Element)) continue
    const cell = node.closest('[data-leave-date]')
    const value = cell?.getAttribute('data-leave-date')
    if (value) return value
  }
  return null
}

function segmentsForWeek(plans: LeavePlan[], week: Date[]): Segment[] {
  const weekStart = toDateKey(week[0] ?? new Date())
  const weekEnd = toDateKey(week[6] ?? new Date())
  const rough = plans.flatMap(plan => {
    if (plan.endDate < weekStart || plan.startDate > weekEnd) return []
    const startCol = Math.max(
      0,
      Math.round(
        (parseDateKey(plan.startDate).getTime() -
          parseDateKey(weekStart).getTime()) /
          86_400_000,
      ),
    )
    const endCol = Math.min(
      6,
      Math.round(
        (parseDateKey(plan.endDate).getTime() -
          parseDateKey(weekStart).getTime()) /
          86_400_000,
      ),
    )
    return [
      {
        plan,
        startCol,
        endCol,
        lane: 0,
        continuesBefore: plan.startDate < weekStart,
        continuesAfter: plan.endDate > weekEnd,
      },
    ]
  })

  rough.sort(
    (a, b) => a.startCol - b.startCol || b.endCol - b.startCol - (a.endCol - a.startCol),
  )
  const laneEnds: number[] = []
  for (const segment of rough) {
    const openLane = laneEnds.findIndex(endCol => endCol < segment.startCol)
    if (openLane === -1) {
      segment.lane = laneEnds.length
      laneEnds.push(segment.endCol)
    } else {
      segment.lane = openLane
      laneEnds[openLane] = segment.endCol
    }
  }
  return rough
}

export function LeaveMonthCalendar({
  month,
  plans,
  ownPlans,
  viewerStaffId,
  selectedId,
  yearStart,
  yearEnd,
  canCreate,
  onSelect,
  onCreateRange,
  onShiftPlan,
}: LeaveMonthCalendarProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const interactionRef = React.useRef<Interaction | null>(null)
  const [preview, setPreview] = React.useState<{
    id: string
    startDate: string
    endDate: string
  } | null>(null)
  const [createRange, setCreateRange] = React.useState<{
    startDate: string
    endDate: string
  } | null>(null)
  const lockedDates = React.useMemo(() => {
    return new Set(
      datesCoveredByPlans(
        ownPlans,
        preview?.id,
      ),
    )
  }, [ownPlans, preview?.id])
  const weeks = React.useMemo(() => monthWeeks(month), [month])

  const displayPlans = React.useMemo(
    () =>
      plans.map(plan =>
        preview && preview.id === plan.id
          ? { ...plan, startDate: preview.startDate, endDate: preview.endDate }
          : plan,
      ),
    [plans, preview],
  )

  function applyPointer(event: React.PointerEvent | PointerEvent) {
    const interaction = interactionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId) return
    const pointerDate = dateUnderPointer(event.clientX, event.clientY)
    if (!pointerDate) return

    if (interaction.kind === 'create') {
      const bounded =
        pointerDate < yearStart
          ? yearStart
          : pointerDate > yearEnd
            ? yearEnd
            : pointerDate
      const nextDate = clampBeforeLockedDate(
        interaction.anchor,
        bounded,
        lockedDates,
      )
      interaction.current = nextDate
      interaction.moved = interaction.moved || nextDate !== interaction.anchor
      setCreateRange(normalizeRange(interaction.anchor, nextDate))
      return
    }

    const originDays = inclusiveDays(interaction.originStart, interaction.originEnd)
    let startDate = interaction.originStart
    let endDate = interaction.originEnd
    if (interaction.kind === 'move') {
      startDate = shiftDateKey(pointerDate, -interaction.grabOffset)
      endDate = shiftDateKey(startDate, originDays - 1)
      if (startDate < yearStart) {
        startDate = yearStart
        endDate = shiftDateKey(startDate, originDays - 1)
      }
      if (endDate > yearEnd) {
        endDate = yearEnd
        startDate = shiftDateKey(endDate, -(originDays - 1))
      }
    } else if (interaction.kind === 'resize-start') {
      const nextStart =
        pointerDate <= interaction.originEnd ? pointerDate : interaction.originEnd
      startDate = nextStart < yearStart ? yearStart : nextStart
    } else {
      const nextEnd =
        pointerDate >= interaction.originStart ? pointerDate : interaction.originStart
      endDate = nextEnd > yearEnd ? yearEnd : nextEnd
    }
    if (startDate < yearStart || endDate > yearEnd) return

    if (validateLeaveRange(startDate, endDate)) return
    if (rangeHitsPlans(startDate, endDate, ownPlans, interaction.planId)) return
    interaction.moved =
      interaction.moved ||
      startDate !== interaction.originStart ||
      endDate !== interaction.originEnd
    setPreview({ id: interaction.planId, startDate, endDate })
  }

  function finishPointer(event: React.PointerEvent | PointerEvent) {
    const interaction = interactionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId) return
    interactionRef.current = null
    rootRef.current?.releasePointerCapture?.(event.pointerId)

    if (interaction.kind === 'create') {
      const range = normalizeRange(interaction.anchor, interaction.current)
      setCreateRange(null)
      if (!rangeHitsPlans(range.startDate, range.endDate, ownPlans)) {
        onCreateRange(range.startDate, range.endDate)
      }
      return
    }

    const next = preview
    setPreview(null)
    if (!interaction.moved || !next) {
      onSelect(interaction.planId)
      return
    }
    onShiftPlan(interaction.planId, next.startDate, next.endDate)
  }

  function beginInteraction(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    const target = event.target instanceof Element ? event.target : null
    const planId = target?.closest('[data-leave-plan]')?.getAttribute('data-leave-plan')
    const handle = target
      ?.closest('[data-leave-handle]')
      ?.getAttribute('data-leave-handle')
    const date = target?.closest('[data-leave-date]')?.getAttribute('data-leave-date')

    if (planId) {
      const plan = plans.find(item => item.id === planId)
      if (!plan) return
      if (plan.staffId !== viewerStaffId || plan.status === 'confirmed') {
        onSelect(planId)
        return
      }
      const pointerDate =
        dateUnderPointer(event.clientX, event.clientY) ?? plan.startDate
      const grabOffset = Math.max(
        0,
        Math.round(
          (parseDateKey(pointerDate).getTime() -
            parseDateKey(plan.startDate).getTime()) /
            86_400_000,
        ),
      )
      interactionRef.current = {
        kind:
          handle === 'start'
            ? 'resize-start'
            : handle === 'end'
              ? 'resize-end'
              : 'move',
        pointerId: event.pointerId,
        planId,
        originStart: plan.startDate,
        originEnd: plan.endDate,
        grabOffset: handle ? 0 : grabOffset,
        moved: false,
      }
      event.preventDefault()
      rootRef.current?.setPointerCapture(event.pointerId)
      return
    }

    if (!date || !canCreate || lockedDates.has(date)) return
    if (date < yearStart || date > yearEnd) return
    interactionRef.current = {
      kind: 'create',
      pointerId: event.pointerId,
      anchor: date,
      current: date,
      moved: false,
    }
    setCreateRange({ startDate: date, endDate: date })
    onSelect(null)
    event.preventDefault()
    rootRef.current?.setPointerCapture(event.pointerId)
  }

  return (
    <div
      ref={rootRef}
      className='overflow-hidden rounded-xl border border-border/80 bg-gradient-to-br from-muted/30 via-background to-muted/10'
      onPointerDown={beginInteraction}
      onPointerMove={applyPointer}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
    >
      <div className='grid grid-cols-7 border-b border-border/70'>
        {WEEKDAYS.map(day => (
          <div
            key={day}
            className='px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground'
          >
            {day}
          </div>
        ))}
      </div>
      <div className='divide-y divide-border/70'>
        {weeks.map(week => {
          const weekKey = toDateKey(week[0] ?? month)
          const segments = segmentsForWeek(displayPlans, week)
          const laneCount = segments.reduce(
            (max, segment) => Math.max(max, segment.lane + 1),
            0,
          )
          return (
            <div
              key={weekKey}
              className='relative grid grid-cols-7'
              style={{
                minHeight: `${Math.max(5.75, 2.6 + laneCount * 1.7)}rem`,
              }}
            >
              {week.map(day => {
                const dateKey = toDateKey(day)
                const inRange =
                  createRange != null &&
                  dateKey >= createRange.startDate &&
                  dateKey <= createRange.endDate
                const inMonth = isSameMonth(day, month)
                const locked = lockedDates.has(dateKey)
                const outsideYear = dateKey < yearStart || dateKey > yearEnd
                return (
                  <div
                    key={dateKey}
                    data-leave-date={outsideYear ? undefined : dateKey}
                    title={
                      outsideYear
                        ? 'Outside this financial year'
                        : locked
                          ? 'Already on your leave'
                          : undefined
                    }
                    className={cn(
                      'border-r border-border/50 px-1.5 py-1 last:border-r-0',
                      !inMonth && 'bg-muted/25 text-muted-foreground',
                      outsideYear &&
                        'cursor-not-allowed bg-muted/60 text-muted-foreground/40',
                      locked && !outsideYear && 'cursor-not-allowed bg-muted/40',
                      inRange && !outsideYear && 'bg-primary/15',
                      !locked && !outsideYear && canCreate && 'cursor-cell',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex size-6 items-center justify-center rounded-full text-xs',
                        isToday(day) &&
                          'bg-primary font-semibold text-primary-foreground',
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>
                )
              })}
              {laneCount > 0 ? (
                <div
                  className='pointer-events-none absolute inset-x-0 top-8 grid grid-cols-7 gap-y-1 px-0.5'
                  style={{ gridColumn: '1 / -1' }}
                >
                  {segments.map(segment => {
                    const mine = segment.plan.staffId === viewerStaffId
                    const canDrag = mine && segment.plan.status !== 'confirmed'
                    const tone = toneFor(segment.plan.staffId)
                    const selected = selectedId === segment.plan.id
                    const label = `${mine ? 'You' : segment.plan.staffName.split(' ')[0]} · ${kindLabel(segment.plan.kind)}`
                    return (
                      <div
                        key={`${segment.plan.id}-${weekKey}`}
                        role='button'
                        tabIndex={0}
                        data-leave-plan={segment.plan.id}
                        title={`${segment.plan.staffName} · ${kindLabel(segment.plan.kind)} · ${segment.plan.status === 'confirmed' ? 'Confirmed' : 'Planned'}${segment.plan.reliefStaffName ? ` · Relief ${segment.plan.reliefStaffName}` : ''}`}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            onSelect(segment.plan.id)
                          }
                        }}
                        className={cn(
                          'pointer-events-auto relative z-10 mx-0.5 flex h-6 min-w-0 items-center truncate rounded-md border px-2 text-[11px] font-medium',
                          segment.plan.status === 'confirmed'
                            ? tone.confirmed
                            : cn(tone.planned, 'border-dashed'),
                          segment.continuesBefore && 'rounded-l-none border-l-0',
                          segment.continuesAfter && 'rounded-r-none border-r-0',
                          canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                          selected && 'ring-2 ring-primary',
                        )}
                        style={{
                          gridColumn: `${segment.startCol + 1} / ${segment.endCol + 2}`,
                          gridRow: segment.lane + 1,
                        }}
                      >
                        {canDrag && !segment.continuesBefore ? (
                          <span
                            data-leave-plan={segment.plan.id}
                            data-leave-handle='start'
                            className='absolute inset-y-0 left-0 w-2 cursor-ew-resize'
                          />
                        ) : null}
                        <span className='pointer-events-none truncate'>
                          {label}
                        </span>
                        {canDrag && !segment.continuesAfter ? (
                          <span
                            data-leave-plan={segment.plan.id}
                            data-leave-handle='end'
                            className='absolute inset-y-0 right-0 w-2 cursor-ew-resize'
                          />
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
