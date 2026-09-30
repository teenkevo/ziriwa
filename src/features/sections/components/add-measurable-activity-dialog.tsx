'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type MeasurableActivityKind = 'core' | 'cross-cutting'

interface AddMeasurableActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sectionContractId: string
  objectiveIndex: number
  initiativeIndex: number
  initiativeCode?: string
  nextOrderForType: (type: MeasurableActivityKind) => number
  onSuccess?: () => void
}

export function AddMeasurableActivityDialog({
  open,
  onOpenChange,
  sectionContractId,
  objectiveIndex,
  initiativeIndex,
  initiativeCode,
  nextOrderForType,
  onSuccess,
}: AddMeasurableActivityDialogProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [activityType, setActivityType] = React.useState<
    MeasurableActivityKind | ''
  >('')
  const [targetDate, setTargetDate] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setTitle('')
    setActivityType('')
    setTargetDate('')
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    if (activityType !== 'core' && activityType !== 'cross-cutting') return
    setIsCreating(true)
    try {
      const payload: Record<string, unknown> = {
        objectiveIndex,
        initiativeIndex,
        activityType,
        title: title.trim(),
        order: nextOrderForType(activityType),
        targetDate: targetDate || undefined,
      }
      const res = await fetch(`/api/section-contracts/${sectionContractId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'addMeasurableActivity', payload }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add measurable activity')
      }
      onOpenChange(false)
      router.refresh()
      onSuccess?.()
    } catch (err) {
      console.error(err)
      alert(
        err instanceof Error
          ? err.message
          : 'Failed to add measurable activity',
      )
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent disableClose={isCreating}>
        <DialogHeader>
          <DialogTitle>Add measurable activity</DialogTitle>
          <DialogDescription>
            For initiative {initiativeCode ?? initiativeIndex}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='space-y-4 py-2 pb-4'>
            <div className='space-y-2'>
              <Label htmlFor='title' required>
                Measurable activity
              </Label>
              <Textarea
                id='title'
                placeholder='e.g. Submit completed forms to HR and confirm they were received'
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={isCreating}
                required
                rows={4}
                className='min-h-[6rem] max-h-40 resize-y overflow-y-auto'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='activity-type' required>
                Type
              </Label>
              <Select
                value={activityType || undefined}
                onValueChange={value =>
                  setActivityType(
                    value === 'cross-cutting' ? 'cross-cutting' : 'core',
                  )
                }
                disabled={isCreating}
              >
                <SelectTrigger id='activity-type'>
                  <SelectValue placeholder='Select type' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='core'>Core</SelectItem>
                  <SelectItem value='cross-cutting'>Cross-cutting</SelectItem>
                </SelectContent>
              </Select>
              <p className='text-xs text-muted-foreground'>
                Choose from Core or Cross-cutting.
              </p>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='targetDate'>Due Date</Label>
              <DatePicker
                id='targetDate'
                value={targetDate}
                onChange={setTargetDate}
                placeholder='Select due date'
                disabled={isCreating}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={
                isCreating ||
                !title.trim() ||
                (activityType !== 'core' && activityType !== 'cross-cutting')
              }
            >
              {isCreating ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Adding...
                </>
              ) : (
                'Add Activity'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
