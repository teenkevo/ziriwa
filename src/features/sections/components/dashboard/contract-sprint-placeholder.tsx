'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, FileStack } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const RELEASED_CONTRACT_STATUSES = new Set(['finalized', 'active', 'completed'])

export type ContractSprintPlaceholderMode = 'finalize' | 'prepare'

export function contractSprintPlaceholder(contract: {
  status?: string | null
  cascadeHoldMessage?: string | null
} | null | undefined): {
  mode: ContractSprintPlaceholderMode
  detail: string
} | null {
  if (contract?.status && RELEASED_CONTRACT_STATUSES.has(contract.status)) {
    return null
  }
  if (contract?.cascadeHoldMessage) {
    return {
      mode: 'prepare',
      detail: contract.cascadeHoldMessage,
    }
  }
  if (!contract) {
    return {
      mode: 'prepare',
      detail: 'Sprint metrics appear here after you prepare your contract.',
    }
  }
  return {
    mode: 'finalize',
    detail: 'Sprint metrics appear here once you finalize your contract.',
  }
}

interface ContractSprintPlaceholderProps {
  mode: ContractSprintPlaceholderMode
  detail: string
  onOpenContract?: () => void
  contractHref?: string
}

/** Replaces sprint metrics until the viewer's contract is finalized. */
export function ContractSprintPlaceholder({
  mode,
  detail,
  onOpenContract,
  contractHref,
}: ContractSprintPlaceholderProps) {
  const isFinalize = mode === 'finalize'
  const title = isFinalize
    ? 'Finalize your contract'
    : 'Prepare your contract'
  const actionLabel = isFinalize ? 'Finalize contract' : 'Prepare contract'
  const Icon = isFinalize ? CheckCircle2 : FileStack

  const actionClassName = cn(
    'h-10 w-full gap-1.5 shadow-sm',
    !isFinalize &&
      'border-amber-600/30 bg-amber-600 text-white hover:bg-amber-600/90',
  )

  const action = onOpenContract ? (
    <Button type='button' className={actionClassName} onClick={onOpenContract}>
      {actionLabel}
      <ArrowRight aria-hidden />
    </Button>
  ) : contractHref ? (
    <Button className={actionClassName} asChild>
      <Link href={contractHref}>
        {actionLabel}
        <ArrowRight aria-hidden />
      </Link>
    </Button>
  ) : null

  return (
    <section aria-label='Sprints' className='flex w-full flex-col gap-2 self-start'>
      <div className='h-4 px-0.5' aria-hidden />
      <div
        className={cn(
          'relative flex flex-col overflow-hidden rounded-xl border px-4 py-5',
          isFinalize
            ? 'border-primary/40 bg-gradient-to-b from-primary/[0.12] via-card to-card ring-1 ring-inset ring-primary/20'
            : 'border-amber-500/40 bg-gradient-to-b from-amber-500/15 via-card to-card dark:from-amber-500/10',
        )}
      >
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute -right-10 -top-10 size-28 rounded-full',
            isFinalize ? 'bg-primary/15' : 'bg-amber-500/20',
          )}
        />
        <div className='relative flex flex-col gap-4'>
          <span
            className={cn(
              'flex size-10 items-center justify-center rounded-lg text-white shadow-sm',
              isFinalize ? 'bg-primary' : 'bg-amber-600',
            )}
          >
            <Icon className='size-5' aria-hidden />
          </span>
          <div className='min-w-0 space-y-1.5'>
            <p className='text-base font-semibold tracking-tight'>{title}</p>
            <p className='text-sm leading-relaxed text-muted-foreground'>
              {detail}
            </p>
          </div>
          {action}
        </div>
      </div>
    </section>
  )
}
