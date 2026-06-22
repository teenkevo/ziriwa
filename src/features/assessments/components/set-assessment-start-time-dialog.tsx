'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { isAssessmentStartsAtValid } from '@/lib/assessments/publish-requirements'

interface SetAssessmentStartTimeDialogProps {
  assessmentId: string
  assessmentTitle: string
  currentStartsAt?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SetAssessmentStartTimeDialog({
  assessmentId,
  assessmentTitle,
  currentStartsAt,
  open,
  onOpenChange,
}: SetAssessmentStartTimeDialogProps) {
  const router = useRouter()
  const [startsAt, setStartsAt] = React.useState<string | undefined>()
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setStartsAt(currentStartsAt)
  }, [open, currentStartsAt])

  const canSave = isAssessmentStartsAtValid(startsAt)

  async function handleSave() {
    if (!startsAt) {
      toast.error('Select a start date and time')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/assessments/${assessmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startsAt }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to update start time')

      toast.success('Start time updated')
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to update start time',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-sm'>
        <DialogHeader>
          <DialogTitle>
            {currentStartsAt ? 'Edit start time' : 'Set start time'}
          </DialogTitle>
          <DialogDescription>
            Officers cannot start the assessment until the set time.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-2 py-2'>
          <Label htmlFor='assessment-starts-at' required>
            Start date and time
          </Label>
          <DateTimePicker
            id='assessment-starts-at'
            value={startsAt}
            onChange={setStartsAt}
            placeholder='Select start date and time'
            disabled={isSaving}
          />
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
          <Button type='button' onClick={handleSave} disabled={isSaving || !canSave}>
            {isSaving ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
