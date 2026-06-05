'use client'

import * as React from 'react'
import { addDays } from 'date-fns'
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
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { parseDateAsLocal } from '@/lib/reporting-periods'
import {
  DELEGATION_MAX_DAYS,
  isDelegationWithinMaxDays,
} from '@/lib/role-delegation'
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

  React.useEffect(() => {
    if (!startDate || !endDate) return
    if (!isDelegationWithinMaxDays(startDate, endDate)) {
      setEndDate('')
    }
  }, [startDate, endDate])

  const startDateValue = startDate ? parseDateAsLocal(startDate) : undefined
  const maxEndDate = startDateValue
    ? addDays(startDateValue, DELEGATION_MAX_DAYS - 1)
    : undefined

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
              Choose an eligible colleague to cover your {actingRoleLabel}{' '}
              duties for a maximum of {DELEGATION_MAX_DAYS} days.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label required>Acting colleague</Label>
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
                <Label htmlFor='delegation-start' required>
                  Start date
                </Label>
                <DatePicker
                  id='delegation-start'
                  value={startDate}
                  onChange={setStartDate}
                  placeholder='Select start date'
                  disabled={isSaving}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='delegation-end' required>
                  End date
                </Label>
                <DatePicker
                  id='delegation-end'
                  value={endDate}
                  onChange={setEndDate}
                  placeholder='Select end date'
                  disabled={isSaving || !startDate}
                  disabledDates={date => {
                    if (!startDateValue) return false
                    if (date < startDateValue) return true
                    return maxEndDate ? date > maxEndDate : false
                  }}
                />
              </div>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='delegation-note'>Note</Label>
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
              disabled={
                isSaving ||
                !toStaffId ||
                !startDate ||
                !endDate ||
                candidates.length === 0
              }
            >
              {isSaving ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                'Delegate'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
