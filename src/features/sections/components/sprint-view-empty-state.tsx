'use client'

import type { LucideIcon } from 'lucide-react'
import {
  CalendarRange,
  ClipboardCheck,
  ShieldCheck,
  Zap,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import type { SprintUiMode } from '@/lib/section-access'

export type SprintEmptySurface = 'draft' | 'in-review' | 'ready'

interface SprintViewEmptyStateProps {
  financialYearLabel: string
  title: string
  description: string
  icon: LucideIcon
  note?: string
  className?: string
}

/**
 * Shared empty surface for weekly sprint views (ready / to-review / drafts).
 * Matches the hierarchy of SprintDraftsEmptyState and contract onboard cards.
 */
export function SprintViewEmptyState({
  financialYearLabel,
  title,
  description,
  icon: Icon,
  note,
  className,
}: SprintViewEmptyStateProps) {
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
          <Icon className='size-6' aria-hidden />
        </div>

        <div className='max-w-lg space-y-2'>
          <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
            {financialYearLabel}
          </p>
          <h2 className='text-xl font-semibold tracking-tight text-foreground sm:text-xl'>
            {title}
          </h2>
          <p className='text-sm leading-relaxed text-muted-foreground'>
            {description}
          </p>
        </div>

        {note ? (
          <p className='max-w-lg rounded-md border border-border/70 bg-background/80 px-3 py-2.5 text-sm text-muted-foreground'>
            {note}
          </p>
        ) : null}
      </div>
    </div>
  )
}

interface SprintRoleEmptyCopy {
  title: string
  description: string
  icon: LucideIcon
  note?: string
}

function managerInReviewCopy(): SprintRoleEmptyCopy {
  return {
    icon: ShieldCheck,
    title: 'Nothing to review right now',
    description:
      'When supervisors submit weekly sprint plans, they land here for your review. Approve tasks or request changes before work moves to Ready.',
  }
}

function managerReadyCopy(): SprintRoleEmptyCopy {
  return {
    icon: Zap,
    title: 'No ready sprint work yet',
    description:
      'Tasks you accept from In review appear here under Ready for the section. Check back after you approve a plan.',
  }
}

function supervisorInReviewCopy(): SprintRoleEmptyCopy {
  return {
    icon: ClipboardCheck,
    title: 'No plans awaiting review',
    description:
      'After you submit a draft, it shows here while your manager reviews the plan. You will see updates when tasks are accepted or need changes.',
  }
}

function supervisorReadyCopy(): SprintRoleEmptyCopy {
  return {
    icon: Zap,
    title: 'No ready tasks yet',
    description:
      'Accepted sprint tasks for your section show up under Ready once the manager approves the plan.',
  }
}

function officerReadyCopy(options: {
  missingStaffMatch: boolean
  unitLabel: string
}): SprintRoleEmptyCopy {
  if (options.missingStaffMatch) {
    return {
      icon: Zap,
      title: 'We could not match your staff profile',
      description: `Your account could not be linked to a staff record for this ${options.unitLabel}. Sprint tasks are assigned to staff emails.`,
      note: 'Ask your supervisor to confirm your sign-in email matches your staff profile.',
    }
  }

  return {
    icon: Zap,
    title: 'No tasks assigned to you yet',
    description:
      'When your supervisor adds you to an accepted sprint task, it appears under Ready so you can track progress and submit your work.',
  }
}

function officerDraftCopy(): SprintRoleEmptyCopy {
  return {
    icon: CalendarRange,
    title: 'Drafts are prepared for you',
    description:
      'Supervisors draft and submit weekly plans. Once tasks are reviewed and assigned to you, they show up under Ready.',
  }
}

function otherInReviewCopy(): SprintRoleEmptyCopy {
  return {
    icon: ClipboardCheck,
    title: 'No sprints in review',
    description: 'Submitted weekly sprint plans will appear here when available.',
  }
}

function otherReadyCopy(): SprintRoleEmptyCopy {
  return {
    icon: Zap,
    title: 'No ready sprints yet',
    description: 'Accepted sprint work will appear here when available.',
  }
}

export function getSprintViewEmptyCopy(options: {
  surface: SprintEmptySurface
  mode: SprintUiMode
  unitLabel?: string
  missingStaffMatch?: boolean
}): SprintRoleEmptyCopy {
  const { surface, mode } = options

  if (surface === 'draft') {
    return officerDraftCopy()
  }

  if (surface === 'in-review') {
    if (mode === 'manager') return managerInReviewCopy()
    if (mode === 'supervisor') return supervisorInReviewCopy()
    return otherInReviewCopy()
  }

  // ready
  if (mode === 'manager') return managerReadyCopy()
  if (mode === 'supervisor') return supervisorReadyCopy()
  if (mode === 'officer') {
    return officerReadyCopy({
      missingStaffMatch: Boolean(options.missingStaffMatch),
      unitLabel: options.unitLabel ?? 'section',
    })
  }
  return otherReadyCopy()
}
