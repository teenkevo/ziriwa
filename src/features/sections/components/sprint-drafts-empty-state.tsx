'use client'

import { ArrowRight, CalendarRange } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SprintDraftsEmptyStateProps {
  financialYearLabel: string
  canCreate: boolean
  onCreate: () => void
  className?: string
}

/**
 * Empty drafts surface before any weekly sprint plans exist for the FY.
 * Mirrors the contract onboard empty-state hierarchy, adapted for sprints.
 */
export function SprintDraftsEmptyState({
  financialYearLabel,
  canCreate,
  onCreate,
  className,
}: SprintDraftsEmptyStateProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-dashed border-border/90 bg-gradient-to-br from-muted/40 via-background to-muted/20',
        className,
      )}
    >
      <div
        aria-hidden
        className='pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/[0.06]'
      />
      <div
        aria-hidden
        className='pointer-events-none absolute -bottom-20 -left-10 size-40 rounded-full bg-primary/[0.04]'
      />

      <div className='relative flex flex-col items-start gap-5 px-6 py-8 sm:px-8 sm:py-10'>
        <div className='flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm'>
          <CalendarRange className='size-6' aria-hidden />
        </div>

        <div className='max-w-lg space-y-2'>
          <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
            {financialYearLabel}
          </p>
          <h2 className='text-xl font-semibold tracking-tight text-foreground sm:text-xl'>
            Plan your first weekly sprint
          </h2>
          <p className='text-xs leading-relaxed text-muted-foreground'>
            Drafts are where you shape the week before marking a sprint ready
            for review by your manager. Pick a week, add tasks from your
            contract, then submit to manager when the plan is set.
          </p>
        </div>

        {canCreate ? (
          <Button size='lg' className='mt-1 gap-2' onClick={onCreate}>
            New sprint
            <ArrowRight className='size-4' aria-hidden />
          </Button>
        ) : (
          <p className='max-w-lg rounded-md border border-border/70 bg-background/80 px-3 py-2.5 text-sm text-muted-foreground'>
            You do not have permission to create sprint drafts. Check back when
            a plan has been prepared for you.
          </p>
        )}
      </div>
    </div>
  )
}
