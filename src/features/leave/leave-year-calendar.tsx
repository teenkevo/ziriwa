'use client'

import { addMonths, format, isSameMonth, isToday, startOfMonth } from 'date-fns'

import { cn } from '@/lib/utils'
import type { FinancialYear } from '@/lib/financial-year'
import { monthWeeks, parseDateKey, toDateKey } from '@/lib/leave/dates'
import type { LeavePlan } from '@/lib/leave/types'

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const

interface LeaveYearCalendarProps {
  financialYear: FinancialYear
  plans: LeavePlan[]
  viewerStaffId: string | null
  selectedId: string | null
  onOpenMonth: (month: Date, planId?: string) => void
}

export function LeaveYearCalendar({
  financialYear,
  plans,
  viewerStaffId,
  selectedId,
  onOpenMonth,
}: LeaveYearCalendarProps) {
  const months = Array.from({ length: 12 }, (_, index) =>
    startOfMonth(addMonths(parseDateKey(financialYear.startDate), index)),
  )

  return (
    <div className='grid grid-cols-4 gap-3'>
      {months.map(month => (
        <YearMonth
          key={toDateKey(month)}
          month={month}
          plans={plans}
          yearStart={financialYear.startDate}
          yearEnd={financialYear.endDate}
          viewerStaffId={viewerStaffId}
          selectedId={selectedId}
          onOpenMonth={onOpenMonth}
        />
      ))}
    </div>
  )
}

function YearMonth({
  month,
  plans,
  yearStart,
  yearEnd,
  viewerStaffId,
  selectedId,
  onOpenMonth,
}: {
  month: Date
  plans: LeavePlan[]
  yearStart: string
  yearEnd: string
  viewerStaffId: string | null
  selectedId: string | null
  onOpenMonth: (month: Date, planId?: string) => void
}) {
  const weeks = monthWeeks(month)

  return (
    <section className='rounded-xl border border-border/80 bg-gradient-to-br from-muted/30 via-background to-muted/10 p-2.5'>
      <button
        type='button'
        className='mb-2 w-full rounded-md px-1 py-0.5 text-left text-xs font-semibold hover:bg-muted/60'
        onClick={() => onOpenMonth(month)}
      >
        {format(month, 'MMMM')}
      </button>
      <div className='grid grid-cols-7 gap-y-0.5'>
        {WEEKDAY_LABELS.map((label, index) => (
          <span
            key={`${label}-${index}`}
            className='pb-1 text-center text-[9px] font-medium uppercase text-muted-foreground'
          >
            {label}
          </span>
        ))}
        {weeks.flat().map(day => {
          const dateKey = toDateKey(day)
          const inMonth = isSameMonth(day, month)
          const outsideYear = dateKey < yearStart || dateKey > yearEnd
          const covering = inMonth
            ? plans.filter(plan => plan.startDate <= dateKey && plan.endDate >= dateKey)
            : []
          const closed = !inMonth || outsideYear
          const selected = covering.some(plan => plan.id === selectedId)
          const planId =
            covering.find(plan => plan.staffId === viewerStaffId)?.id ?? covering[0]?.id

          return (
            <button
              key={dateKey}
              type='button'
              disabled={closed}
              title={outsideYear ? 'Outside this financial year' : undefined}
              className={cn(
                'flex h-7 flex-col items-center justify-center rounded-md text-[11px] leading-none',
                !inMonth && 'invisible',
                outsideYear && 'cursor-not-allowed text-muted-foreground/35',
                !closed && 'hover:bg-muted/70',
                selected && 'bg-primary/10',
              )}
              onClick={() => onOpenMonth(month, planId)}
            >
              <span
                className={cn(
                  'flex size-5 items-center justify-center rounded-full',
                  inMonth && isToday(day) && 'bg-primary font-semibold text-primary-foreground',
                )}
              >
                {format(day, 'd')}
              </span>
              <span className='mt-0.5 flex h-1 items-center gap-0.5' aria-hidden>
                {covering.slice(0, 3).map(plan => (
                  <span
                    key={plan.id}
                    className={cn(
                      'size-1 rounded-full',
                      plan.staffId === viewerStaffId
                        ? plan.status === 'confirmed'
                          ? 'bg-primary'
                          : 'bg-primary/45'
                        : plan.status === 'confirmed'
                          ? 'bg-foreground/70'
                          : 'bg-foreground/30',
                    )}
                  />
                ))}
                {covering.length > 3 ? (
                  <span className='text-[8px] leading-none text-muted-foreground'>+</span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
