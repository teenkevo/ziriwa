'use client'

import * as React from 'react'
import { Clock, Timer, CheckCircle2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

function formatDuration(ms: number): string {
  if (ms <= 0) return '0m'

  const totalMinutes = Math.floor(ms / 60_000)
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`)

  return parts.join(' ')
}

function parseLocalDateAtTime(dateStr: string, hour: number, minute = 0): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, hour, minute, 0, 0)
}

type SprintPhase = 'before' | 'active' | 'ended'

function useSprintTimer(weekStart: string, weekEnd: string) {
  const sprintStartTime = React.useMemo(
    () => parseLocalDateAtTime(weekStart, 10, 0),
    [weekStart],
  )

  const sprintEndTime = React.useMemo(
    () => parseLocalDateAtTime(weekEnd, 17, 0),
    [weekEnd],
  )

  const totalMs = sprintEndTime.getTime() - sprintStartTime.getTime()

  const getState = React.useCallback(() => {
    const now = Date.now()
    const startMs = sprintStartTime.getTime()
    const endMs = sprintEndTime.getTime()

    if (now < startMs) {
      return {
        phase: 'before' as SprintPhase,
        progress: 0,
        remainingMs: startMs - now,
      }
    }

    if (now >= endMs) {
      return {
        phase: 'ended' as SprintPhase,
        progress: 100,
        remainingMs: 0,
      }
    }

    const elapsed = now - startMs

    return {
      phase: 'active' as SprintPhase,
      progress: Math.min(100, (elapsed / totalMs) * 100),
      remainingMs: endMs - now,
    }
  }, [sprintStartTime, sprintEndTime, totalMs])

  const [state, setState] = React.useState(getState)

  React.useEffect(() => {
    setState(getState())

    const interval = setInterval(() => {
      const next = getState()
      setState(next)
    }, 1000)

    return () => clearInterval(interval)
  }, [getState])

  return state
}

interface SprintWeekTimerProps {
  weekStart: string
  weekEnd: string
  variant: 'detail' | 'compact'
  submittedAt?: string
}

export function SprintWeekTimer({
  weekStart,
  weekEnd,
  variant,
  submittedAt,
}: SprintWeekTimerProps) {
  const { phase, progress, remainingMs } = useSprintTimer(weekStart, weekEnd)

  if (submittedAt) {
    const sprintStartMs = parseLocalDateAtTime(weekStart, 10, 0).getTime()
    const submittedMs = new Date(submittedAt).getTime()
    const elapsed = Math.max(0, submittedMs - sprintStartMs)

    if (variant === 'compact') {
      return (
        <div className='mt-1 flex items-center gap-2'>
          <Progress value={100} className='h-1 flex-1' />
          <span className='whitespace-nowrap text-[10px] text-muted-foreground'>
            <CheckCircle2 className='-mt-px mr-0.5 inline h-3 w-3' />
            Submitted at {formatDuration(elapsed)}
          </span>
        </div>
      )
    }
  }

  if (variant === 'compact') {
    return (
      <div className='mt-1 flex items-center gap-2'>
        <Progress value={progress} className='h-1 flex-1' />
        <span className='whitespace-nowrap text-[10px] text-muted-foreground'>
          {phase === 'before' && (
            <>
              <Timer className='-mt-px mr-0.5 inline h-3 w-3' />
              Starts in {formatDuration(remainingMs)}
            </>
          )}
          {phase === 'active' && (
            <>
              <Clock className='-mt-px mr-0.5 inline h-3 w-3' />
              {formatDuration(remainingMs)} left
            </>
          )}
          {phase === 'ended' && (
            <>
              <CheckCircle2 className='-mt-px mr-0.5 inline h-3 w-3' />
              Week ended
            </>
          )}
        </span>
      </div>
    )
  }

  return (
    <div className='mt-2 space-y-1.5'>
      <div className='flex items-center justify-between'>
        <span
          className={cn(
            'flex items-center gap-1 text-xs',
            phase === 'before' && 'text-muted-foreground',
            phase === 'active' && 'text-foreground',
            phase === 'ended' && 'text-muted-foreground',
          )}
        >
          {phase === 'before' && (
            <>
              <Timer className='h-3.5 w-3.5' />
              Starts in{' '}
              <span className='font-semibold'>
                {formatDuration(remainingMs)}
              </span>
            </>
          )}
          {phase === 'active' && (
            <>
              <Clock className='h-3.5 w-3.5' />
              <span className='font-semibold'>
                {formatDuration(remainingMs)}
              </span>{' '}
              remaining to deadline
            </>
          )}
          {phase === 'ended' && (
            <>
              <CheckCircle2 className='h-3.5 w-3.5' />
              Week ended
            </>
          )}
        </span>

        <span className='text-[10px] text-muted-foreground'>
          {Math.round(progress)}%
        </span>
      </div>

      <Progress value={progress} className='h-1.5' />
    </div>
  )
}
