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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  contractsApiBase,
  type ContractsApiResource,
} from '@/lib/contracts-api'

type PmsActivityType = 'core' | 'cross-cutting'

interface AddPmsMeasurableActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractId: string
  contractsApi: ContractsApiResource
  objectiveIndex: number
  initiativeIndex: number
  initiativeCode?: string
  nextOrderForType: (type: PmsActivityType) => number
  onSuccess?: () => void
}

export function AddPmsMeasurableActivityDialog({
  open,
  onOpenChange,
  contractId,
  contractsApi,
  objectiveIndex,
  initiativeIndex,
  initiativeCode,
  nextOrderForType,
  onSuccess,
}: AddPmsMeasurableActivityDialogProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [activityType, setActivityType] = React.useState<PmsActivityType | ''>(
    '',
  )
  const [targetDate, setTargetDate] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setTitle('')
    setActivityType('')
    setTargetDate('')
  }, [open])

  const canSubmit =
    Boolean(title.trim()) &&
    (activityType === 'core' || activityType === 'cross-cutting') &&
    Boolean(targetDate)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    if (activityType !== 'core' && activityType !== 'cross-cutting') return

    setIsCreating(true)
    try {
      const res = await fetch(
        `${contractsApiBase(contractsApi)}/${contractId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            op: 'addMeasurableActivity',
            payload: {
              objectiveIndex,
              initiativeIndex,
              activityType,
              title: title.trim(),
              order: nextOrderForType(activityType),
              targetDate,
            },
          }),
        },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to add measurable activity')
      }
      onOpenChange(false)
      toast.success('Measurable activity created')
      router.refresh()
      onSuccess?.()
    } catch (err) {
      toast.error(
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
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='space-y-4 py-2 pb-4'>
            <div className='space-y-2'>
              <Label htmlFor='pms-activity-title' required>
                Measurable activity
              </Label>
              <Textarea
                id='pms-activity-title'
                placeholder='e.g. Complete quarterly performance review and submit evidence to the supervisor'
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={isCreating}
                required
                rows={4}
                className='min-h-[6rem] resize-y'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='pms-activity-type' required>
                Type
              </Label>
              <Select
                value={activityType || undefined}
                onValueChange={v =>
                  setActivityType(
                    v === 'cross-cutting' ? 'cross-cutting' : 'core',
                  )
                }
                disabled={isCreating}
              >
                <SelectTrigger id='pms-activity-type'>
                  <SelectValue placeholder='Select type' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='core'>Core</SelectItem>
                  <SelectItem value='cross-cutting'>Cross-cutting</SelectItem>
                </SelectContent>
              </Select>
              <p className='text-xs text-muted-foreground'>
                Choose Core or Cross-cutting.
              </p>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='pms-activity-due' required>
                Due date
              </Label>
              <DatePicker
                id='pms-activity-due'
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
            <Button type='submit' disabled={isCreating || !canSubmit}>
              {isCreating ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Adding…
                </>
              ) : (
                'Add activity'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
