'use client'

import * as React from 'react'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
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
import { Textarea } from '@/components/ui/textarea'
import { getCurrentFinancialYear } from '@/lib/financial-year'
import {
  LEAVE_KINDS,
  outsideFinancialYearMessage,
  OWN_LEAVE_TAKEN_MESSAGE,
  parseDateKey,
  RELIEF_ON_LEAVE_MESSAGE,
  staffIdsOnLeave,
  type LeaveKind,
  toDateKey,
  validateLeaveRange,
} from '@/lib/leave/dates'
import {
  annualLeaveDraftError,
  annualLeaveDraftNote,
  type LeaveEntitlement,
} from '@/lib/leave/entitlement'
import type { LeavePlan, LeaveReliefOption } from '@/lib/leave/types'

const ROLE_LABELS: Record<string, string> = {
  commissioner_general: 'Commissioner General',
  commissioner: 'Commissioner',
  assistant_commissioner: 'Assistant Commissioner',
  manager: 'Manager',
  supervisor: 'Supervisor',
  officer: 'Officer',
}

export interface LeavePlanDraft {
  startDate: string
  endDate: string
  kind: LeaveKind
  reliefStaffId: string
  note: string
}

interface LeavePlanDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  initial: LeavePlanDraft
  reliefOptions: LeaveReliefOption[]
  reliefHint: string
  teamPlans: LeavePlan[]
  entitlements: LeaveEntitlement[]
  editingAnnual?: { startDate: string; endDate: string; kind: string } | null
  blockedDates?: string[]
  isSaving: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (draft: LeavePlanDraft) => void
}

function reliefLabel(option: LeaveReliefOption): string {
  const role = ROLE_LABELS[option.role]
  return role ? `${option.name} · ${role}` : option.name
}

export function LeavePlanDialog({
  open,
  mode,
  initial,
  reliefOptions,
  reliefHint,
  teamPlans,
  entitlements,
  editingAnnual = null,
  blockedDates = [],
  isSaving,
  onOpenChange,
  onSubmit,
}: LeavePlanDialogProps) {
  const [draft, setDraft] = React.useState(initial)
  const financialYear = React.useMemo(() => getCurrentFinancialYear(), [])
  const blocked = React.useMemo(() => new Set(blockedDates), [blockedDates])
  const rangeError = validateLeaveRange(draft.startDate, draft.endDate)
  const yearError = outsideFinancialYearMessage(
    draft.startDate,
    draft.endDate,
    financialYear,
  )
  const taken =
    !rangeError &&
    !yearError &&
    blockedDates.some(date => date >= draft.startDate && date <= draft.endDate)
  const reliefOnLeaveIds = staffIdsOnLeave(
    teamPlans,
    draft.startDate,
    draft.endDate,
  )
  const reliefOnLeave = Boolean(
    draft.reliefStaffId && reliefOnLeaveIds.has(draft.reliefStaffId),
  )
  const reliefMissing = !draft.reliefStaffId
  const entitlementError = annualLeaveDraftError({
    startDate: draft.startDate,
    endDate: draft.endDate,
    kind: draft.kind,
    entitlements,
    editing: editingAnnual,
  })
  const entitlementNote = annualLeaveDraftNote(
    draft.startDate,
    draft.endDate,
    draft.kind,
  )
  const formError =
    rangeError ??
    yearError ??
    (taken ? OWN_LEAVE_TAKEN_MESSAGE : null) ??
    (reliefOnLeave ? RELIEF_ON_LEAVE_MESSAGE : null) ??
    entitlementError

  React.useEffect(() => {
    if (open) setDraft(initial)
  }, [open, initial])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Plan leave' : 'Edit leave plan'}
          </DialogTitle>
          <DialogDescription>
            A plan stays tentative until you confirm it.
          </DialogDescription>
        </DialogHeader>
        <form
          className='space-y-4'
          onSubmit={event => {
            event.preventDefault()
            if (formError || reliefMissing) return
            onSubmit(draft)
          }}
        >
          <div className='space-y-2'>
            <Label htmlFor='leave-kind' required>
              Type
            </Label>
            <Select
              value={draft.kind}
              onValueChange={value =>
                setDraft(current => ({ ...current, kind: value as LeaveKind }))
              }
              disabled={isSaving}
            >
              <SelectTrigger id='leave-kind'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_KINDS.map(kind => (
                  <SelectItem key={kind.value} value={kind.value}>
                    {kind.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='leave-relief' required>
              Relief person
            </Label>
            <Select
              value={draft.reliefStaffId || undefined}
              onValueChange={reliefStaffId =>
                setDraft(current => ({ ...current, reliefStaffId }))
              }
              disabled={isSaving || reliefOptions.length === 0}
            >
              <SelectTrigger id='leave-relief'>
                <SelectValue placeholder='Select relief person' />
              </SelectTrigger>
              <SelectContent>
                {reliefOptions.map(option => {
                  const onLeave = reliefOnLeaveIds.has(option.id)
                  return (
                    <SelectItem key={option.id} value={option.id} disabled={onLeave}>
                      {onLeave ? `${reliefLabel(option)} · On leave` : reliefLabel(option)}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <p className='text-xs text-muted-foreground'>
              {reliefOptions.length === 0
                ? reliefHint || 'No one in your reporting line can cover this leave.'
                : reliefHint}
            </p>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='leave-start' required>
                From
              </Label>
              <DatePicker
                id='leave-start'
                value={draft.startDate}
                disabled={isSaving}
                fromDate={parseDateKey(financialYear.startDate)}
                toDate={parseDateKey(financialYear.endDate)}
                disabledDates={date => {
                  const key = toDateKey(date)
                  return (
                    blocked.has(key) ||
                    key < financialYear.startDate ||
                    key > financialYear.endDate
                  )
                }}
                onChange={startDate =>
                  setDraft(current => ({ ...current, startDate }))
                }
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='leave-end' required>
                To
              </Label>
              <DatePicker
                id='leave-end'
                value={draft.endDate}
                disabled={isSaving}
                fromDate={parseDateKey(financialYear.startDate)}
                toDate={parseDateKey(financialYear.endDate)}
                disabledDates={date => {
                  const key = toDateKey(date)
                  return (
                    blocked.has(key) ||
                    key < financialYear.startDate ||
                    key > financialYear.endDate
                  )
                }}
                onChange={endDate =>
                  setDraft(current => ({ ...current, endDate }))
                }
              />
            </div>
          </div>
          {entitlementNote ? (
            <p className='text-sm text-muted-foreground'>{entitlementNote}</p>
          ) : null}
          {formError ? (
            <p className='text-sm text-destructive'>{formError}</p>
          ) : null}
          <div className='space-y-2'>
            <Label htmlFor='leave-note'>Note</Label>
            <Textarea
              id='leave-note'
              value={draft.note}
              maxLength={280}
              disabled={isSaving}
              placeholder='Optional context for the team'
              onChange={event =>
                setDraft(current => ({ ...current, note: event.target.value }))
              }
            />
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={isSaving || Boolean(formError) || reliefMissing}
            >
              {isSaving ? 'Saving…' : mode === 'create' ? 'Save plan' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
