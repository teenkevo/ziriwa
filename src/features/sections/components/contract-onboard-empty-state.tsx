'use client'

import { ArrowRight, FileStack } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ContractOnboardEmptyStateProps {
  financialYearLabel: string
  description: string
  canOnboard: boolean
  onOnboard: () => void
  missingAssigneeMessage?: string
  /** Defaults to "Onboard contract". */
  ctaLabel?: string
  className?: string
}

/**
 * Empty contract surface before a FY contract exists.
 * Clear hierarchy: year → action headline → support copy → CTA.
 */
export function ContractOnboardEmptyState({
  financialYearLabel,
  description,
  canOnboard,
  onOnboard,
  missingAssigneeMessage,
  ctaLabel = 'Onboard contract',
  className,
}: ContractOnboardEmptyStateProps) {
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
          <FileStack className='size-6' aria-hidden />
        </div>

        <div className='max-w-lg space-y-2'>
          <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
            {financialYearLabel}
          </p>
          <h2 className='text-xl font-semibold tracking-tight text-foreground sm:text-2xl'>
            Set up this financial year&apos;s contract
          </h2>
          <p className='text-sm leading-relaxed text-muted-foreground'>
            {description}
          </p>
        </div>

        {canOnboard ? (
          <Button size='lg' className='mt-1 gap-2' onClick={onOnboard}>
            {ctaLabel}
            <ArrowRight className='size-4' aria-hidden />
          </Button>
        ) : (
          <p className='max-w-lg rounded-md border border-border/70 bg-background/80 px-3 py-2.5 text-sm text-muted-foreground'>
            {missingAssigneeMessage?.trim() ||
              'You do not have permission to onboard a contract for this financial year.'}
          </p>
        )}
      </div>
    </div>
  )
}
