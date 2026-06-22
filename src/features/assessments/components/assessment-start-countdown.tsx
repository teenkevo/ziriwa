'use client'

import * as React from 'react'
import { Clock } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  formatCountdownDuration,
  formatStartsAtLabel,
  getMsUntil,
} from '@/lib/assessments/time-limit'

export function useAssessmentStartCountdown(startsAt?: string) {
  const [remainingMs, setRemainingMs] = React.useState(() =>
    startsAt ? getMsUntil(startsAt) : 0,
  )

  React.useEffect(() => {
    if (!startsAt) {
      setRemainingMs(0)
      return
    }

    const target = startsAt

    function tick() {
      setRemainingMs(getMsUntil(target))
    }

    tick()
    const interval = window.setInterval(tick, 250)
    return () => window.clearInterval(interval)
  }, [startsAt])

  return {
    remainingMs,
    hasStarted: !startsAt || remainingMs <= 0,
  }
}

interface AssessmentStartCountdownProps {
  startsAt: string
  className?: string
  showOpensAt?: boolean
}

export function AssessmentStartCountdown({
  startsAt,
  className,
  showOpensAt = false,
}: AssessmentStartCountdownProps) {
  const { remainingMs, hasStarted } = useAssessmentStartCountdown(startsAt)

  if (hasStarted) return null

  return (
    <div
      className={cn(
        'inline-flex flex-col items-center gap-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-center',
        className,
      )}
      role='timer'
      aria-live='polite'
      aria-atomic='true'
    >
      <div className='inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground'>
        <Clock className='h-3.5 w-3.5 shrink-0' aria-hidden='true' />
        <span>Opens in</span>
      </div>
      <span className='text-lg font-semibold tabular-nums tracking-tight'>
        {formatCountdownDuration(remainingMs)}
      </span>
      {showOpensAt ? (
        <span className='text-[11px] text-muted-foreground'>
          {formatStartsAtLabel(startsAt)}
        </span>
      ) : null}
    </div>
  )
}

interface AssessmentListStartStatusProps {
  startsAt?: string
  compact?: boolean
}

export function AssessmentListStartStatus({
  startsAt,
  compact = false,
}: AssessmentListStartStatusProps) {
  if (!startsAt) {
    return null
  }

  const { remainingMs, hasStarted } = useAssessmentStartCountdown(startsAt)

  if (hasStarted) {
    return (
      <span className='text-sm text-muted-foreground'>
        {formatStartsAtLabel(startsAt)}
      </span>
    )
  }

  if (compact) {
    return (
      <span className='text-sm font-medium tabular-nums'>
        {formatCountdownDuration(remainingMs)}
      </span>
    )
  }

  return (
    <div className='space-y-0.5'>
      <span className='block text-sm font-medium tabular-nums'>
        {formatCountdownDuration(remainingMs)}
      </span>
      <span className='block text-xs text-muted-foreground'>
        {formatStartsAtLabel(startsAt)}
      </span>
    </div>
  )
}
