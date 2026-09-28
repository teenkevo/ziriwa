'use client'

import * as React from 'react'
import { ArrowRight, UserRoundPlus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PlanningContractDelegateCtaProps {
  onDelegate: () => void
  disabled?: boolean
  unavailableReason?: string | null
  className?: string
}

/** AC contract-page CTA to hand planning-section contract entry to DIP-Planning. */
export function PlanningContractDelegateCta({
  onDelegate,
  disabled,
  unavailableReason,
  className,
}: PlanningContractDelegateCtaProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border/80 bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className='min-w-0 space-y-0.5'>
        <p className='text-sm font-medium'>Delegate contract onboarding</p>
        <p className='text-xs text-muted-foreground'>
          {unavailableReason ??
            'Ask the DIP-Planning supervisor to help onboard your contact.'}
        </p>
      </div>
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='shrink-0 gap-1.5 border-primary text-primary'
        onClick={onDelegate}
        disabled={disabled}
      >
        <UserRoundPlus className='size-4' aria-hidden />
        Delegate
      </Button>
    </div>
  )
}

interface PlanningContractSupportStatusProps {
  toStaffName: string
  endDate?: string
  onCancel?: () => void
  isCancelling?: boolean
  className?: string
}

/** Shown on the AC contract page while contract support is active. */
export function PlanningContractSupportStatus({
  toStaffName,
  endDate,
  onCancel,
  isCancelling,
  className,
}: PlanningContractSupportStatusProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border/80 bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className='min-w-0 space-y-0.5'>
        <p className='text-sm font-medium'>Contract entry has been delegated</p>
        <p className='text-xs text-muted-foreground'>
          {toStaffName} is supporting your contract entry
          {endDate ? ` until ${endDate}` : ''}. You remain responsible for its accuracy and execution
        </p>
      </div>
      {onCancel ? (
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='shrink-0 gap-1.5 border-destructive bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive'
          onClick={onCancel}
          disabled={isCancelling}
        >
          <X className='size-4' aria-hidden />
          Cancel support
        </Button>
      ) : null}
    </div>
  )
}

interface PlanningContractDelegatedActionProps {
  fromStaffName: string
  endDate?: string
  canRedelegate: boolean
  onWorkOnContract: () => void
  onRedelegate?: () => void
  className?: string
}

/**
 * Action card for a planning supervisor (or officer) who was asked to enter
 * the section contract while covering manager duties.
 */
export function PlanningContractDelegatedAction({
  fromStaffName,
  endDate,
  canRedelegate,
  onWorkOnContract,
  onRedelegate,
  className,
}: PlanningContractDelegatedActionProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-primary/30 bg-primary/[0.04] px-4 py-4 sm:px-5',
        className,
      )}
    >
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0 space-y-1'>
          <p className='text-xs font-medium uppercase tracking-wide text-primary'>
            Action required
          </p>
          <h3 className='text-base font-semibold tracking-tight'>
            Onboard the Assistant Commissioner's contact
          </h3>
          <p className='text-sm text-muted-foreground'>
            {fromStaffName} asked you to help onboard their contact
            {endDate ? ` (until ${endDate})` : ''}.
          </p>
        </div>
        <div className='flex shrink-0 flex-col gap-2 lg:flex-row lg:items-center'>
          <Button
            type='button'
            size='sm'
            className='gap-1.5'
            onClick={onWorkOnContract}
          >
            Work on contract
            <ArrowRight className='size-4' aria-hidden />
          </Button>
          {canRedelegate && onRedelegate ? (
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='gap-1.5'
              onClick={onRedelegate}
            >
              Delegate to officer
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
