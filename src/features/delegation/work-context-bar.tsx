'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CalendarClock, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import type { DelegationBarRecord } from '@/features/delegation/delegation-bar-types'
import { useWorkContextNavigationOptional } from '@/contexts/work-context-navigation-context'
import type { WorkContextMode } from '@/lib/section-access'

interface WorkContextBarProps {
  workContext: WorkContextMode
  assignmentAsDelegatee: DelegationBarRecord | null
  assignmentAsAbsent: DelegationBarRecord | null
  cancelApiBase?: string
  crossWorkspaceActingHref?: string | null
  crossWorkspaceActingLabel?: string | null
}

export function WorkContextBar({
  workContext: serverWorkContext,
  assignmentAsDelegatee,
  assignmentAsAbsent,
  cancelApiBase = '/api/section-delegations',
  crossWorkspaceActingHref,
  crossWorkspaceActingLabel,
}: WorkContextBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const navigation = useWorkContextNavigationOptional()
  const [isCancelling, setIsCancelling] = React.useState(false)

  const workContext = navigation?.displayContext ?? serverWorkContext
  const isSwitching = navigation?.isSwitching ?? false

  const hasActing = Boolean(assignmentAsDelegatee)
  const showSwitcher = hasActing

  function switchContext(mode: WorkContextMode) {
    if (navigation) {
      navigation.navigateToWorkContext(mode)
      return
    }
    const params = new URLSearchParams(searchParams.toString())
    if (mode === 'acting') params.set('workContext', 'acting')
    else params.delete('workContext')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  function openCrossWorkspace() {
    if (!crossWorkspaceActingHref) return
    if (navigation) {
      navigation.navigateToHref(
        crossWorkspaceActingHref,
        crossWorkspaceActingLabel ?? 'Opening acting workspace…',
      )
      return
    }
    router.push(crossWorkspaceActingHref)
  }

  async function cancelDelegation(id: string) {
    setIsCancelling(true)
    try {
      const res = await fetch(`${cancelApiBase}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to cancel')
      }
      toast.success('Delegation cancelled')
      const params = new URLSearchParams(searchParams.toString())
      params.delete('workContext')
      router.push(params.size ? `${pathname}?${params}` : pathname)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel')
    } finally {
      setIsCancelling(false)
    }
  }

  if (!showSwitcher && !assignmentAsAbsent && !crossWorkspaceActingHref) {
    return null
  }

  return (
    <div className='relative z-30 shrink-0 border-b bg-muted/40 px-4 py-2 md:px-8'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex flex-wrap items-center gap-2 text-sm'>
          {showSwitcher ? (
            <>
              <span className='text-muted-foreground'>Work context:</span>
              <Button
                type='button'
                variant={workContext === 'own' ? 'secondary' : 'ghost'}
                size='sm'
                disabled={isSwitching}
                aria-pressed={workContext === 'own'}
                onClick={() => switchContext('own')}
              >
                My work
              </Button>
              <Button
                type='button'
                variant={workContext === 'acting' ? 'secondary' : 'ghost'}
                size='sm'
                disabled={isSwitching}
                aria-pressed={workContext === 'acting'}
                onClick={() => switchContext('acting')}
              >
                Acting for {assignmentAsDelegatee?.fromStaffName} (
                {assignmentAsDelegatee?.actingRole})
              </Button>
              {isSwitching ? (
                <span className='inline-flex items-center gap-1.5 text-xs text-muted-foreground'>
                  <Loader2 className='h-3.5 w-3.5 animate-spin' />
                  Switching…
                </span>
              ) : null}
            </>
          ) : null}

          {crossWorkspaceActingHref && workContext === 'own' ? (
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={isSwitching}
              onClick={openCrossWorkspace}
            >
              {crossWorkspaceActingLabel ?? 'Open acting workspace'}
            </Button>
          ) : null}

          {assignmentAsAbsent ? (
            <span className='inline-flex items-center gap-1.5 text-muted-foreground'>
              <CalendarClock className='h-4 w-4 shrink-0' />
              {assignmentAsAbsent.toStaffName} is acting as your{' '}
              {assignmentAsAbsent.actingRole} until {assignmentAsAbsent.endDate}
              <Button
                variant='ghost'
                size='sm'
                className='h-7 px-2'
                disabled={isCancelling || isSwitching}
                onClick={() => cancelDelegation(assignmentAsAbsent._id)}
              >
                <X className='h-3.5 w-3.5' />
                Cancel
              </Button>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
