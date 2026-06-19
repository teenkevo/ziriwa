'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseTimeLimitMinutes } from '@/lib/assessments/time-limit'

interface SetAssessmentTimeLimitDialogProps {
  assessmentId: string
  assessmentTitle: string
  currentMinutes?: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SetAssessmentTimeLimitDialog({
  assessmentId,
  assessmentTitle,
  currentMinutes,
  open,
  onOpenChange,
}: SetAssessmentTimeLimitDialogProps) {
  const router = useRouter()
  const [minutes, setMinutes] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setMinutes(
      currentMinutes != null && currentMinutes > 0
        ? String(currentMinutes)
        : '',
    )
  }, [open, currentMinutes])

  async function handleSave() {
    const timeLimitMinutes = parseTimeLimitMinutes(minutes)
    if (!timeLimitMinutes) {
      toast.error('Enter a time limit of at least 1 minute')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/assessments/${assessmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeLimitMinutes }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Failed to update time limit')

      toast.success('Time limit updated')
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to update time limit',
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
            {currentMinutes ? 'Edit time limit' : 'Set time limit'}
          </DialogTitle>
          <DialogDescription>
            Officers will have this long to complete {assessmentTitle} once they
            start. The timer cannot be paused.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-2 py-2'>
          <Label htmlFor='time-limit-minutes'>Time limit (minutes)</Label>
          <Input
            id='time-limit-minutes'
            type='number'
            min={1}
            step={1}
            value={minutes}
            onChange={event => setMinutes(event.target.value)}
            placeholder='e.g. 30'
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
          <Button type='button' onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
