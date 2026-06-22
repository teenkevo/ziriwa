'use client'

import * as React from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseTimeLimitMinutes } from '@/lib/assessments/time-limit'
import {
  formatScheduleBlockersMessage,
  getAssessmentScheduleBlockers,
  isAssessmentScheduleComplete,
} from '@/lib/assessments/publish-requirements'
import type { AssessmentQuestion } from '@/lib/assessments/types'

interface PublishAssessmentDialogProps {
  assessmentId: string
  assessmentTitle: string
  questions: AssessmentQuestion[]
  initialStartsAt?: string
  initialTimeLimitMinutes?: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onPublished: () => void
  onPublishingChange?: (isPublishing: boolean) => void
}

export function PublishAssessmentDialog({
  assessmentId,
  assessmentTitle,
  questions,
  initialStartsAt,
  initialTimeLimitMinutes,
  open,
  onOpenChange,
  onPublished,
  onPublishingChange,
}: PublishAssessmentDialogProps) {
  const [startsAt, setStartsAt] = React.useState<string | undefined>()
  const [minutes, setMinutes] = React.useState('')
  const [isPublishing, setIsPublishing] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setStartsAt(initialStartsAt)
    setMinutes(
      initialTimeLimitMinutes != null && initialTimeLimitMinutes > 0
        ? String(initialTimeLimitMinutes)
        : '',
    )
  }, [open, initialStartsAt, initialTimeLimitMinutes])

  React.useEffect(() => {
    onPublishingChange?.(isPublishing)
  }, [isPublishing, onPublishingChange])

  const canPublish = React.useMemo(
    () =>
      isAssessmentScheduleComplete({
        startsAt,
        timeLimitMinutes: minutes,
      }),
    [startsAt, minutes],
  )

  async function handlePublish() {
    const timeLimitMinutes = parseTimeLimitMinutes(minutes)
    const scheduleBlockers = getAssessmentScheduleBlockers({
      startsAt,
      timeLimitMinutes,
    })
    if (scheduleBlockers.length > 0) {
      toast.error(formatScheduleBlockersMessage(scheduleBlockers))
      return
    }

    setIsPublishing(true)
    try {
      const res = await fetch(`/api/assessments/${assessmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish',
          startsAt,
          timeLimitMinutes,
          questions,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to publish assessment')

      onPublished()
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to publish assessment',
      )
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={openState => !isPublishing && onOpenChange(openState)}
    >
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Publish assessment</DialogTitle>
          <DialogDescription>
            Start date and time and time limit are required to publish{' '}
            {assessmentTitle}.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <div className='space-y-2'>
            <Label htmlFor='publish-starts-at' required>
              Start date and time
            </Label>
            <DateTimePicker
              id='publish-starts-at'
              value={startsAt}
              onChange={setStartsAt}
              placeholder='Select start date and time'
              disabled={isPublishing}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='publish-time-limit' required>
              Time limit (minutes)
            </Label>
            <Input
              id='publish-time-limit'
              type='number'
              min={1}
              step={1}
              value={minutes}
              onChange={event => setMinutes(event.target.value)}
              placeholder='e.g. 30'
              disabled={isPublishing}
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isPublishing}
          >
            Cancel
          </Button>
          <Button
            type='button'
            onClick={handlePublish}
            disabled={isPublishing || !canPublish}
          >
            {isPublishing ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              'Publish'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
