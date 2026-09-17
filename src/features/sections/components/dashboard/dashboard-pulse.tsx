'use client'

import * as React from 'react'
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  ListChecks,
  ListTodo,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import type { CurrentWeekSprintPulse } from '@/lib/sprint-dashboard-pulse'

export type DashboardPulseProps = {
  pulse: CurrentWeekSprintPulse
  onOpenSprints?: () => void
}

type PulseCellProps = {
  icon?: React.ComponentType<{ className?: string }>
  label: string
  value: string
  hint?: string
  onClick?: () => void
  tone?: 'default' | 'warn' | 'ok'
}

function PulseCell({
  icon: Icon,
  label,
  value,
  hint,
  onClick,
  tone = 'default',
}: PulseCellProps) {
  const main = (
    <>
      <div className='flex items-center gap-2 text-foreground'>
        {Icon ? (
          <Icon
            className='size-3.5 shrink-0 text-muted-foreground'
            aria-hidden
          />
        ) : null}
        <span className='text-[11px] font-medium uppercase tracking-wide'>
          {label}
        </span>
      </div>
      <p
        className={cn(
          'mt-2 text-2xl font-semibold tabular-nums tracking-tight',
          tone === 'warn' && 'text-destructive',
          tone === 'ok' && 'text-emerald-600 dark:text-emerald-500',
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className='mt-0.5 line-clamp-2 text-xs text-muted-foreground'>
          {hint}
        </p>
      ) : null}
    </>
  )

  return (
    <div className='flex h-full flex-col px-4 py-3.5'>
      {onClick ? (
        <button
          type='button'
          onClick={onClick}
          className='flex flex-1 flex-col text-left transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        >
          {main}
        </button>
      ) : (
        <div className='flex flex-1 flex-col'>{main}</div>
      )}
    </div>
  )
}

function ratioTone(count: number, max: number): 'default' | 'warn' | 'ok' {
  if (max <= 0) return 'default'
  return count >= max ? 'ok' : 'warn'
}

function planStatusLabel(
  status: Extract<CurrentWeekSprintPulse, { role: 'supervisor' }>['planStatus'],
): string {
  if (status === 'none') return '—'
  if (status === 'draft') return 'Draft'
  if (status === 'submitted') return 'Submitted'
  return 'Reviewed'
}

/**
 * Current-week sprint strip under Attention Items.
 * Manager and supervisor see different four-card sets.
 */
export function DashboardPulse({ pulse, onOpenSprints }: DashboardPulseProps) {
  const weekLabel = pulse.weekLabel

  return (
    <section aria-label='Current week sprints' className='space-y-2'>
      <div className='flex items-center justify-between gap-3 px-0.5'>
        <h2 className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
          Sprints
        </h2>
        {weekLabel ? (
          <p className='truncate text-xs text-muted-foreground'>{weekLabel}</p>
        ) : (
          <p className='truncate text-xs text-muted-foreground'>This week</p>
        )}
      </div>

      <div className='grid overflow-hidden rounded-xl border border-border/80 bg-card divide-y sm:grid-cols-2 sm:divide-y-0 sm:divide-x xl:grid-cols-4'>
        {pulse.role === 'manager' ? (
          <ManagerCards pulse={pulse} onOpenSprints={onOpenSprints} />
        ) : (
          <SupervisorCards pulse={pulse} onOpenSprints={onOpenSprints} />
        )}
      </div>
    </section>
  )
}

function ManagerCards({
  pulse,
  onOpenSprints,
}: {
  pulse: Extract<CurrentWeekSprintPulse, { role: 'manager' }>
  onOpenSprints?: () => void
}) {
  const { planned, inReview, acceptedReady, atRisk } = pulse

  return (
    <>
      <PulseCell
        icon={CalendarRange}
        label='Sprints planned by supervisors'
        value={`${planned.count}/${planned.max}`}
        hint={
          planned.max <= 0
            ? 'No supervisors in this section yet'
            : `${planned.count} of ${planned.max} supervisors have a sprint this week`
        }
        tone={ratioTone(planned.count, planned.max)}
        onClick={onOpenSprints}
      />
      <PulseCell
        icon={ClipboardList}
        label='In review'
        value={String(inReview.tasks)}
        hint={
          inReview.tasks === 0
            ? 'No plan tasks awaiting your review'
            : `${inReview.sprints} sprint${inReview.sprints === 1 ? '' : 's'} · ${inReview.tasks} task${inReview.tasks === 1 ? '' : 's'} pending`
        }
        tone={inReview.tasks > 0 ? 'warn' : 'ok'}
        onClick={onOpenSprints}
      />
      <PulseCell
        icon={CheckCircle2}
        label='Accepted / ready'
        value={`${acceptedReady.count}/${acceptedReady.max}`}
        hint={
          acceptedReady.max <= 0
            ? 'No supervisors in this section yet'
            : 'Submitted or reviewed sprint plans this week'
        }
        tone={ratioTone(acceptedReady.count, acceptedReady.max)}
        onClick={onOpenSprints}
      />
      <PulseCell
        icon={AlertTriangle}
        label='At risk'
        value={String(atRisk)}
        hint={
          atRisk === 0
            ? 'No revisions or stalled tasks mid-week'
            : 'Revisions requested or still to-do mid-week'
        }
        tone={atRisk > 0 ? 'warn' : 'ok'}
        onClick={onOpenSprints}
      />
    </>
  )
}

function SupervisorCards({
  pulse,
  onOpenSprints,
}: {
  pulse: Extract<CurrentWeekSprintPulse, { role: 'supervisor' }>
  onOpenSprints?: () => void
}) {
  const { planned, planStatus, tasksDone, awaitingYou } = pulse
  const awaitingTotal =
    awaitingYou.evidenceReview + awaitingYou.planRevisions
  const doneTone =
    tasksDone.total === 0
      ? 'default'
      : tasksDone.done >= tasksDone.total
        ? 'ok'
        : 'default'
  const planTone =
    planStatus === 'reviewed'
      ? 'ok'
      : planStatus === 'submitted'
        ? 'default'
        : planStatus === 'draft'
          ? 'warn'
          : 'default'

  return (
    <>
      <PulseCell
        icon={CalendarRange}
        label='Sprints planned'
        value={`${planned.count}/${planned.max}`}
        hint={
          planned.count > 0
            ? 'Sprint plan in place for this week'
            : 'No sprint planned for this week yet'
        }
        tone={ratioTone(planned.count, planned.max)}
        onClick={onOpenSprints}
      />
      <PulseCell
        icon={ListChecks}
        label='Plan status'
        value={planStatusLabel(planStatus)}
        hint={
          planStatus === 'none'
            ? 'Create a sprint for this week'
            : planStatus === 'draft'
              ? 'Still a draft — submit when ready'
              : planStatus === 'submitted'
                ? 'Awaiting manager review'
                : 'Plan reviewed for this week'
        }
        tone={planTone}
        onClick={onOpenSprints}
      />
      <PulseCell
        icon={ListTodo}
        label='Tasks done'
        value={`${tasksDone.done}/${tasksDone.total}`}
        hint={
          tasksDone.total === 0
            ? 'No tasks on this week\'s sprint yet'
            : 'Completed of planned sprint tasks'
        }
        tone={doneTone}
        onClick={onOpenSprints}
      />
      <PulseCell
        icon={AlertTriangle}
        label='Awaiting you'
        value={String(awaitingTotal)}
        hint={
          awaitingTotal === 0
            ? 'No evidence reviews or plan revisions waiting'
            : [
                awaitingYou.evidenceReview > 0
                  ? `${awaitingYou.evidenceReview} evidence review${awaitingYou.evidenceReview === 1 ? '' : 's'}`
                  : null,
                awaitingYou.planRevisions > 0
                  ? `${awaitingYou.planRevisions} plan revision${awaitingYou.planRevisions === 1 ? '' : 's'}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')
        }
        tone={awaitingTotal > 0 ? 'warn' : 'ok'}
        onClick={onOpenSprints}
      />
    </>
  )
}
