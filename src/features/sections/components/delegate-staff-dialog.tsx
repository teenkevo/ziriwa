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
import type { SectionStaffTableRow } from '@/features/sections/components/section-staff-table'

interface DelegateStaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sectionId: string
  absentStaff: SectionStaffTableRow | null
  candidates: SectionStaffTableRow[]
  onSuccess: () => void
}

export function DelegateStaffDialog({
  open,
  onOpenChange,
  sectionId,
  absentStaff,
  candidates,
  onSuccess,
}: DelegateStaffDialogProps) {
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

  const actingRole =
    absentStaff?.role === 'manager'
      ? 'manager'
      : absentStaff?.role === 'supervisor'
        ? 'supervisor'
        : null

  const eligible = candidates.filter(
    c =>
      c._id !== absentStaff?._id &&
      c.status === 'active' &&
      (c.role === 'supervisor' || c.role === 'officer'),
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!absentStaff || !actingRole || !toStaffId || !startDate || !endDate) {
      toast.error('Complete all required fields')
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch('/api/section-delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId,
          fromStaffId: absentStaff._id,
          toStaffId,
          actingRole,
          startDate,
          endDate,
          note,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create delegation')
      }
      toast.success('Delegation recorded')
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
      <DialogContent className='max-w-md'>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Delegate duties</DialogTitle>
            <DialogDescription>
              {absentStaff
                ? `Cover ${absentStaff.fullName}'s ${actingRole} role while they are away. The acting person keeps their current role (dual role).`
                : 'Select staff to delegate.'}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label>Acting staff</Label>
              <Select value={toStaffId} onValueChange={setToStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder='Select staff member' />
                </SelectTrigger>
                <SelectContent>
                  {eligible.map(c => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.fullName} ({c.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Button type='submit' disabled={isSaving || !actingRole}>
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
