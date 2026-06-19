'use client'

import * as React from 'react'
import { Clock } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  formatTimeRemaining,
  getRemainingMs,
} from '@/lib/assessments/time-limit'

export function useAssessmentRemainingMs(expiresAt?: string) {
  const [remainingMs, setRemainingMs] = React.useState(() =>
    expiresAt ? getRemainingMs(expiresAt) : 0,
  )

  React.useEffect(() => {
    if (!expiresAt) {
      setRemainingMs(0)
      return
    }

    const activeExpiresAt = expiresAt

    function tick() {
      setRemainingMs(getRemainingMs(activeExpiresAt))
    }

    tick()
    const interval = window.setInterval(tick, 250)
    return () => window.clearInterval(interval)
  }, [expiresAt])

  return remainingMs
}

export function useAssessmentTimer({
  expiresAt,
  enabled,
  onExpire,
}: {
  expiresAt?: string
  enabled: boolean
  onExpire: () => void
}) {
  const remainingMs = useAssessmentRemainingMs(enabled ? expiresAt : undefined)
  const hasExpiredRef = React.useRef(false)

  React.useEffect(() => {
    hasExpiredRef.current = false
  }, [expiresAt, enabled])

  React.useEffect(() => {
    if (!enabled || !expiresAt || hasExpiredRef.current) return
    if (remainingMs > 0) return

    hasExpiredRef.current = true
    onExpire()
  }, [enabled, expiresAt, onExpire, remainingMs])

  return remainingMs
}

interface AssessmentTimerProps {
  expiresAt: string
  className?: string
}

export function AssessmentTimer({ expiresAt, className }: AssessmentTimerProps) {
  const remainingMs = useAssessmentRemainingMs(expiresAt)
  const isUrgent = remainingMs <= 5 * 60 * 1_000
  const isCritical = remainingMs <= 60 * 1_000

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium tabular-nums',
        isCritical
          ? 'border-destructive bg-destructive/10 text-destructive'
          : isUrgent
            ? 'border-amber-500 bg-amber-50 text-amber-900'
            : 'border-border bg-muted/40 text-foreground',
        className,
      )}
      role='timer'
      aria-live='polite'
      aria-atomic='true'
    >
      <Clock className='h-3.5 w-3.5 shrink-0' aria-hidden='true' />
      <span>{formatTimeRemaining(remainingMs)} left</span>
    </div>
  )
}
