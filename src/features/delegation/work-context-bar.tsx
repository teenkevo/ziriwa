'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CalendarClock, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import type { SectionDelegationRecord } from '@/lib/section-delegation.server'
import type { WorkContextMode } from '@/lib/section-access'

interface WorkContextBarProps {
  workContext: WorkContextMode
  assignmentAsDelegatee: SectionDelegationRecord | null
  assignmentAsAbsent: SectionDelegationRecord | null
  onOpenDelegate: () => void
  canSelfServiceDelegate: boolean
}

function buildHref(
  pathname: string,
  workContext: WorkContextMode,
  current: URLSearchParams,
) {
  const params = new URLSearchParams(current.toString())
  if (workContext === 'acting') params.set('workContext', 'acting')
  else params.delete('workContext')
  const qs = params.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

export function WorkContextBar({
  workContext,
  assignmentAsDelegatee,
  assignmentAsAbsent,
  onOpenDelegate,
  canSelfServiceDelegate,
}: WorkContextBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isCancelling, setIsCancelling] = React.useState(false)

  const hasActing = Boolean(assignmentAsDelegatee)
  const showSwitcher = hasActing

  async function cancelDelegation(id: string) {
    setIsCancelling(true)
    try {
      const res = await fetch(`/api/section-delegations/${id}`, {
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

  if (!showSwitcher && !assignmentAsAbsent && !canSelfServiceDelegate) {
    return null
  }

  return (
    <div className='border-b bg-muted/40 px-4 py-2 md:px-8'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex flex-wrap items-center gap-2 text-sm'>
          {showSwitcher ? (
            <>
              <span className='text-muted-foreground'>Work context:</span>
              <Button
                variant={workContext === 'own' ? 'secondary' : 'ghost'}
                size='sm'
                asChild
              >
                <Link href={buildHref(pathname, 'own', searchParams)}>
                  My work
                </Link>
              </Button>
              <Button
                variant={workContext === 'acting' ? 'secondary' : 'ghost'}
                size='sm'
                asChild
              >
                <Link href={buildHref(pathname, 'acting', searchParams)}>
                  Acting for {assignmentAsDelegatee?.fromStaffName} (
                  {assignmentAsDelegatee?.actingRole})
                </Link>
              </Button>
            </>
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
                disabled={isCancelling}
                onClick={() => cancelDelegation(assignmentAsAbsent._id)}
              >
                <X className='h-3.5 w-3.5' />
                Cancel
              </Button>
            </span>
          ) : null}
        </div>

        {canSelfServiceDelegate && !assignmentAsAbsent ? (
          <Button variant='outline' size='sm' onClick={onOpenDelegate}>
            Delegate while on leave
          </Button>
        ) : null}
      </div>
    </div>
  )
}
