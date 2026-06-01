'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { DELEGATION_MAX_DAYS } from '@/lib/role-delegation'
import type { DelegationCandidate } from '@/lib/role-delegation'

interface SelfServiceDelegationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  actingRoleLabel: string
  candidates: DelegationCandidate[]
  createPayload: Record<string, string>
  apiPath?: string
  onSuccess: () => void
}

export function SelfServiceDelegationDialog({
  open,
  onOpenChange,
  actingRoleLabel,
  candidates,
  createPayload,
  apiPath = '/api/section-delegations',
  onSuccess,
}: SelfServiceDelegationDialogProps) {
  const [toStaffId, setToStaffId] = React.useState('')
  const [startDate, setStartDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')
  const [note, setNote] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setToStaffId('')
      setStartDate('')
      setEndDate('')
      setNote('')
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!toStaffId || !startDate || !endDate) {
      toast.error('Complete all required fields')
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createPayload,
          toStaffId,
          startDate,
          endDate,
          note,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create delegation')
      }
      toast.success('Leave delegation saved')
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delegate')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent disableClose={isSaving} className='max-w-md'>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Delegate while on leave</DialogTitle>
            <DialogDescription>
              Choose a colleague to cover your {actingRoleLabel} duties for up to{' '}
              {DELEGATION_MAX_DAYS} days. You keep your own role and can continue
              your regular work.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label>Acting colleague</Label>
              <Select value={toStaffId} onValueChange={setToStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder='Select staff member' />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map(c => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.fullName} ({c.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {candidates.length === 0 ? (
                <p className='text-xs text-muted-foreground'>
                  No eligible colleagues available.
                </p>
              ) : null}
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-2'>
                <Label htmlFor='delegation-start'>Start date</Label>
                <Input
                  id='delegation-start'
                  type='date'
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='delegation-end'>End date</Label>
                <Input
                  id='delegation-end'
                  type='date'
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='delegation-note'>Note (optional)</Label>
              <Input
                id='delegation-note'
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder='e.g. Annual leave'
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={isSaving || !toStaffId || candidates.length === 0}
            >
              {isSaving ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                'Save delegation'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
