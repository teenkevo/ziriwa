'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  contractsApiBase,
  type ContractsApiResource,
} from '@/lib/contracts-api'

interface EditMeasurableActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractId: string
  contractsApi?: ContractsApiResource
  objectiveIndex: number
  initiativeIndex: number
  activityIndex: number
  initialTitle: string
  initialAim?: string
  initialTargetDate?: string
  showAim?: boolean
  requireAim?: boolean
}

function dateInputValue(value: string | undefined): string {
  if (!value) return ''
  return value.split(/[T ]/)[0] ?? ''
}

function EditMeasurableActivityForm({
  onOpenChange,
  onSubmittingChange,
  contractId,
  contractsApi = 'section-contracts',
  objectiveIndex,
  initiativeIndex,
  activityIndex,
  initialTitle,
  initialAim = '',
  initialTargetDate,
  showAim = false,
  requireAim = false,
}: Omit<EditMeasurableActivityDialogProps, 'open'> & {
  onSubmittingChange: (isSubmitting: boolean) => void
}) {
  const router = useRouter()
  const [title, setTitle] = React.useState(initialTitle)
  const [aim, setAim] = React.useState(initialAim)
  const [targetDate, setTargetDate] = React.useState(
    dateInputValue(initialTargetDate),
  )
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    onSubmittingChange(isSaving)
  }, [isSaving, onSubmittingChange])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    if (showAim && requireAim && !aim.trim()) return

    setIsSaving(true)
    try {
      const payload: Record<string, unknown> = {
        objectiveIndex,
        initiativeIndex,
        activityIndex,
        title: title.trim(),
        targetDate: targetDate || undefined,
      }
      if (showAim) payload.aim = aim.trim()

      const res = await fetch(`${contractsApiBase(contractsApi)}/${contractId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'updateActivity', payload }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update measurable activity')
      }
      toast.success('Measurable activity updated')
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to update measurable activity',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className='space-y-4 py-2 pb-4'>
        <div className='space-y-2'>
          <Label htmlFor='edit-activity-title' required>
            Title
          </Label>
          <Input
            id='edit-activity-title'
            value={title}
            onChange={event => setTitle(event.target.value)}
            disabled={isSaving}
            required
          />
        </div>
        {showAim ? (
          <div className='space-y-2'>
            <Label htmlFor='edit-activity-aim' required={requireAim}>
              AIM
            </Label>
            <textarea
              id='edit-activity-aim'
              className='flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
              value={aim}
              onChange={event => setAim(event.target.value)}
              disabled={isSaving}
              required={requireAim}
            />
          </div>
        ) : null}
        <div className='space-y-2'>
          <Label htmlFor='edit-activity-target-date'>Due date</Label>
          <DatePicker
            id='edit-activity-target-date'
            value={targetDate}
            onChange={setTargetDate}
            placeholder='Select due date'
            disabled={isSaving}
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
            isSaving || !title.trim() || (showAim && requireAim && !aim.trim())
          }
        >
          {isSaving ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function EditMeasurableActivityDialog({
  open,
  onOpenChange,
  contractId,
  contractsApi,
  objectiveIndex,
  initiativeIndex,
  activityIndex,
  initialTitle,
  initialAim,
  initialTargetDate,
  showAim,
  requireAim,
}: EditMeasurableActivityDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent disableClose={isSubmitting}>
        <DialogHeader>
          <DialogTitle>Edit measurable activity</DialogTitle>
          <DialogDescription>
            Update the title, aim, or due date.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <EditMeasurableActivityForm
            key={`${contractId}-${objectiveIndex}-${initiativeIndex}-${activityIndex}`}
            onOpenChange={onOpenChange}
            onSubmittingChange={setIsSubmitting}
            contractId={contractId}
            contractsApi={contractsApi}
            objectiveIndex={objectiveIndex}
            initiativeIndex={initiativeIndex}
            activityIndex={activityIndex}
            initialTitle={initialTitle}
            initialAim={initialAim}
            initialTargetDate={initialTargetDate}
            showAim={showAim}
            requireAim={requireAim}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
