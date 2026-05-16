'use client'

import * as React from 'react'
import { ArrowRightLeft, Check, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

import type { PendingTransferRow } from '@/app/api/staff-transfer-requests/route'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

export function TransferApprovalInbox() {
  const [requests, setRequests] = React.useState<PendingTransferRow[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [actingId, setActingId] = React.useState<string | null>(null)
  const [commentById, setCommentById] = React.useState<Record<string, string>>(
    {},
  )

  const load = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/staff-transfer-requests')
      if (!res.ok) return
      const data = (await res.json()) as {
        requests: PendingTransferRow[]
        canApprove: boolean
      }
      if (data.canApprove) {
        setRequests(data.requests ?? [])
      } else {
        setRequests([])
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [load])

  async function decide(
    id: string,
    decision: 'approved' | 'rejected',
  ) {
    setActingId(id)
    try {
      const res = await fetch(`/api/staff-transfer-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          comment: commentById[id]?.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Action failed')
      }
      toast.success(
        decision === 'approved' ? 'Transfer approved' : 'Transfer rejected',
      )
      setCommentById(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActingId(null)
    }
  }

  if (requests.length === 0 && !isLoading) {
    return null
  }

  return (
    <DropdownMenu onOpenChange={open => open && load()}>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className='relative h-9 w-9'>
          <ArrowRightLeft className='h-4 w-4' />
          {requests.length > 0 && (
            <Badge
              variant='secondary'
              className='absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 text-[10px] font-medium'
            >
              {requests.length > 9 ? '9+' : requests.length}
            </Badge>
          )}
          <span className='sr-only'>Pending transfer approvals</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-96 max-h-[min(28rem,70vh)] overflow-y-auto'>
        <DropdownMenuLabel className='flex items-center justify-between'>
          Transfer approvals
          {isLoading && (
            <span className='text-xs font-normal text-muted-foreground'>
              Updating…
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {requests.length === 0 ? (
          <p className='px-2 py-4 text-sm text-muted-foreground'>
            No transfers awaiting your approval.
          </p>
        ) : (
          requests.map(req => (
            <div
              key={req._id}
              className='border-b px-2 py-3 last:border-0 space-y-2'
            >
              <p className='text-sm font-medium leading-snug'>
                {req.staff?.fullName ?? 'Staff'} →{' '}
                {req.toSection?.name ?? req.toDivision?.name ?? 'destination'}
              </p>
              <p className='text-xs text-muted-foreground'>
                From {req.fromSection?.name ?? '—'} · Your step:{' '}
                {req.pendingApproverRole?.replace(/_/g, ' ')}
              </p>
              {req.reason && (
                <p className='text-xs text-muted-foreground line-clamp-2'>
                  {req.reason}
                </p>
              )}
              <Textarea
                placeholder='Comment (optional)'
                rows={2}
                className='text-xs min-h-0'
                value={commentById[req._id] ?? ''}
                onChange={e =>
                  setCommentById(prev => ({
                    ...prev,
                    [req._id]: e.target.value,
                  }))
                }
              />
              <div className='flex gap-2'>
                <Button
                  size='sm'
                  className='flex-1 h-8'
                  disabled={actingId === req._id}
                  onClick={() => decide(req._id, 'approved')}
                >
                  {actingId === req._id ? (
                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                  ) : (
                    <>
                      <Check className='h-3.5 w-3.5 mr-1' />
                      Approve
                    </>
                  )}
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  className='flex-1 h-8'
                  disabled={actingId === req._id}
                  onClick={() => decide(req._id, 'rejected')}
                >
                  <X className='h-3.5 w-3.5 mr-1' />
                  Reject
                </Button>
              </div>
            </div>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
