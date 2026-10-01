'use client'

import * as React from 'react'
import { addDays, startOfDay } from 'date-fns'
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

function todayLocal(): Date {
  return startOfDay(new Date())
}

function maxDate(a: Date, b: Date): Date {
  return a > b ? a : b
}

export interface ContractSupportWindow {
  startDate: string
  endDate: string
}

interface PlanningContractSupportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidates: DelegationCandidate[]
  sectionId: string
  /** AC → supervisor vs supervisor → officer. */
  mode: 'ac-to-supervisor' | 'supervisor-to-officer'
  /**
   * AC support window. Required for supervisor → officer: dates must stay
   * inside this range.
   */
  parentWindow?: ContractSupportWindow | null
  onSuccess: () => void
}

export function PlanningContractSupportDialog({
  open,
  onOpenChange,
  candidates,
  sectionId,
  mode,
  parentWindow = null,
  onSuccess,
}: PlanningContractSupportDialogProps) {
  const [toStaffId, setToStaffId] = React.useState('')
  const [startDate, setStartDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')
  const [note, setNote] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)

  const isRedelegate = mode === 'supervisor-to-officer'
  const parentStart = parentWindow?.startDate
    ? parseDateAsLocal(parentWindow.startDate)
    : null
  const parentEnd = parentWindow?.endDate
    ? parseDateAsLocal(parentWindow.endDate)
    : null

  const title = isRedelegate
    ? 'Delegate contract entry to officer'
    : 'Delegate contract entry'
  const description = isRedelegate
    ? parentWindow
      ? "Choose a planning officer to help onboard the Assistant Commissioner's contract"
      : ''
    : `Ask the DIP-Planning supervisor to help onboard your contract for up to ${DELEGATION_MAX_DAYS} days.`

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
    if (isRedelegate && parentWindow) {
      if (
        startDate < parentWindow.startDate ||
        endDate > parentWindow.endDate ||
        endDate < startDate
      ) {
        setEndDate('')
      }
      return
    }
    if (!isDelegationWithinMaxDays(startDate, endDate)) {
      setEndDate('')
    }
  }, [startDate, endDate, isRedelegate, parentWindow])

  React.useEffect(() => {
    if (!startDate) return
    const start = parseDateAsLocal(startDate)
    if (start < todayLocal()) {
      setStartDate('')
      setEndDate('')
      return
    }
    if (parentStart && start < parentStart) {
      setStartDate('')
      setEndDate('')
      return
    }
    if (parentEnd && start > parentEnd) {
      setStartDate('')
      setEndDate('')
    }
  }, [startDate, parentStart, parentEnd])

  const today = todayLocal()
  const startDateValue = startDate ? parseDateAsLocal(startDate) : undefined
  const earliestStart = parentStart ? maxDate(today, parentStart) : today
  const maxEndForPicker = isRedelegate
    ? parentEnd
    : startDateValue
      ? addDays(startDateValue, DELEGATION_MAX_DAYS - 1)
      : undefined

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!toStaffId || !startDate || !endDate) {
      toast.error('Complete all required fields')
      return
    }
    if (parseDateAsLocal(startDate) < todayLocal()) {
      toast.error('Support from cannot be in the past')
      return
    }
    if (isRedelegate && parentWindow) {
      if (
        startDate < parentWindow.startDate ||
        endDate > parentWindow.endDate
      ) {
        toast.error(
          `Support dates must fall within ${parentWindow.startDate} → ${parentWindow.endDate}`,
        )
        return
      }
    }
    setIsSaving(true)
    try {
      const res = await fetch('/api/section-delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId,
          toStaffId,
          startDate,
          endDate,
          note,
          purpose: 'contract_support',
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delegate contract work')
      }
      toast.success(
        isRedelegate
          ? 'Contract work handed to planning officer'
          : 'Contract work handed to planning supervisor',
      )
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delegate contract work',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const redelegateWindowMissing = isRedelegate && !parentWindow

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent disableClose={isSaving} className='max-w-md'>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label required>
                {isRedelegate ? 'Planning officer' : 'Planning supervisor'}
              </Label>
              <Select value={toStaffId} onValueChange={setToStaffId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isRedelegate
                        ? 'Select planning officer'
                        : 'Select planning supervisor'
                    }
                  />
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
                  {isRedelegate
                    ? 'No planning officers available in this section.'
                    : 'No planning supervisor available in DIP-Planning.'}
                </p>
              ) : null}
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-2'>
                <Label htmlFor='contract-support-start' required>
                  Support from
                </Label>
                <DatePicker
                  id='contract-support-start'
                  value={startDate}
                  onChange={setStartDate}
                  placeholder='Select start date'
                  disabled={isSaving || redelegateWindowMissing}
                  disabledDates={date => {
                    const day = startOfDay(date)
                    if (day < earliestStart) return true
                    if (parentEnd && day > parentEnd) return true
                    return false
                  }}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='contract-support-end' required>
                  Support until
                </Label>
                <DatePicker
                  id='contract-support-end'
                  value={endDate}
                  onChange={setEndDate}
                  placeholder='Select end date'
                  disabled={isSaving || !startDate || redelegateWindowMissing}
                  disabledDates={date => {
                    const day = startOfDay(date)
                    if (day < today) return true
                    if (!startDateValue) return false
                    if (day < startDateValue) return true
                    if (maxEndForPicker && day > maxEndForPicker) return true
                    return false
                  }}
                />
              </div>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='contract-support-note'>Note</Label>
              <Input
                id='contract-support-note'
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder='e.g. Help onboard FY contract objectives'
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
                candidates.length === 0 ||
                redelegateWindowMissing
              }
            >
              {isSaving ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                'Delegate contract entry'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
