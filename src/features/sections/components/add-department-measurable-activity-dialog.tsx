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
import {
  contractsApiBase,
  type ContractsApiResource,
} from '@/lib/contracts-api'

type MeasurableActivityKind = 'core' | 'cross-cutting'

interface AddDepartmentMeasurableActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  departmentContractId: string
  objectiveIndex: number
  initiativeIndex: number
  initiativeCode?: string
  nextOrderForType: (type: MeasurableActivityKind) => number
  contractsApi?: Extract<
    ContractsApiResource,
    | 'department-contracts'
    | 'division-contracts'
    | 'project-contracts'
    | 'deputy-project-contracts'
    | 'supervisor-contracts'
    | 'officer-contracts'
  >
  onSuccess?: () => void
}

export function AddDepartmentMeasurableActivityDialog({
  open,
  onOpenChange,
  departmentContractId,
  objectiveIndex,
  initiativeIndex,
  initiativeCode,
  nextOrderForType,
  contractsApi = 'department-contracts',
  onSuccess,
}: AddDepartmentMeasurableActivityDialogProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [activityType, setActivityType] = React.useState<
    MeasurableActivityKind | ''
  >('')
  const [targetDate, setTargetDate] = React.useState('')
  const apiBase = contractsApiBase(contractsApi)

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
      const res = await fetch(`${apiBase}/${departmentContractId}`, {
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
            targetDate: targetDate || undefined,
          },
        }),
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
              <Label htmlFor='dept-act-title' required>
                Measurable activity
              </Label>
              <Textarea
                id='dept-act-title'
                placeholder='Describe the measurable activity'
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={isCreating}
                required
                rows={4}
                className='min-h-[6rem] resize-y'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='dept-act-type' required>
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
                <SelectTrigger id='dept-act-type'>
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
              <Label htmlFor='dept-act-targetDate'>Due date</Label>
              <DatePicker
                id='dept-act-targetDate'
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
                'Add activity'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
