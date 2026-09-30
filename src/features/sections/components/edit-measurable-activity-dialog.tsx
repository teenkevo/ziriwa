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

type MeasurableActivityKind = 'core' | 'cross-cutting'

interface EditMeasurableActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractId: string
  contractsApi?: ContractsApiResource
  objectiveIndex: number
  initiativeIndex: number
  activityIndex: number
  initialTitle: string
  initialActivityType?: string
  initialTargetDate?: string
  /** Core activities that already have assignees cannot become cross-cutting. */
  hasAssignees?: boolean
}

function dateInputValue(value: string | undefined): string {
  if (!value) return ''
  return value.split(/[T ]/)[0] ?? ''
}

function initialKind(type: string | undefined): MeasurableActivityKind | '' {
  if (type === 'cross-cutting') return 'cross-cutting'
  if (type === 'core') return 'core'
  return ''
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
  initialActivityType,
  initialTargetDate,
  hasAssignees = false,
}: Omit<EditMeasurableActivityDialogProps, 'open'> & {
  onSubmittingChange: (isSubmitting: boolean) => void
}) {
  const router = useRouter()
  const [title, setTitle] = React.useState(initialTitle)
  const [activityType, setActivityType] = React.useState<
    MeasurableActivityKind | ''
  >(initialKind(initialActivityType))
  const [targetDate, setTargetDate] = React.useState(
    dateInputValue(initialTargetDate),
  )
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    onSubmittingChange(isSaving)
  }, [isSaving, onSubmittingChange])

  const canSubmit =
    Boolean(title.trim()) &&
    (activityType === 'core' || activityType === 'cross-cutting')
  const crossCuttingLocked = hasAssignees && activityType !== 'cross-cutting'

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    if (activityType !== 'core' && activityType !== 'cross-cutting') return

    setIsSaving(true)
    try {
      const res = await fetch(
        `${contractsApiBase(contractsApi)}/${contractId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            op: 'updateActivity',
            payload: {
              objectiveIndex,
              initiativeIndex,
              activityIndex,
              title: title.trim(),
              activityType,
              targetDate: targetDate || undefined,
            },
          }),
        },
      )
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
            Measurable activity
          </Label>
          <Textarea
            id='edit-activity-title'
            placeholder='e.g. Complete quarterly performance review and submit evidence to the supervisor'
            value={title}
            onChange={event => setTitle(event.target.value)}
            disabled={isSaving}
            required
            rows={4}
            className='min-h-[6rem] max-h-40 resize-y overflow-y-auto'
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='edit-activity-type' required>
            Type
          </Label>
          <Select
            value={activityType || undefined}
            onValueChange={value =>
              setActivityType(
                value === 'cross-cutting' ? 'cross-cutting' : 'core',
              )
            }
            disabled={isSaving || crossCuttingLocked}
          >
            <SelectTrigger id='edit-activity-type'>
              <SelectValue placeholder='Select type' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='core'>Core</SelectItem>
              <SelectItem value='cross-cutting'>Cross-cutting</SelectItem>
            </SelectContent>
          </Select>
          <p className='text-xs text-muted-foreground'>
            {crossCuttingLocked
              ? 'Remove assignees before changing this activity type.'
              : 'Choose from Core or Cross-cutting.'}
          </p>
        </div>
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
        <Button type='submit' disabled={isSaving || !canSubmit}>
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
  initialActivityType,
  initialTargetDate,
  hasAssignees,
}: EditMeasurableActivityDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent disableClose={isSubmitting}>
        <DialogHeader>
          <DialogTitle>Edit measurable activity</DialogTitle>
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
            initialActivityType={initialActivityType}
            initialTargetDate={initialTargetDate}
            hasAssignees={hasAssignees}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
