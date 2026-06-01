'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
import {
  contractsApiBase,
  type ContractsApiResource,
} from '@/lib/contracts-api'

interface AddDepartmentMeasurableActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  departmentContractId: string
  objectiveIndex: number
  initiativeIndex: number
  initiativeCode?: string
  nextOrder: number
  contractsApi?: Extract<
    ContractsApiResource,
    | 'department-contracts'
    | 'division-contracts'
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
  nextOrder,
  contractsApi = 'department-contracts',
  onSuccess,
}: AddDepartmentMeasurableActivityDialogProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [targetDate, setTargetDate] = React.useState('')
  const apiBase = contractsApiBase(contractsApi)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
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
            activityType: 'measurable',
            title: title.trim(),
            order: nextOrder,
            targetDate: targetDate || undefined,
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add measurable activity')
      }
      setTitle('')
      setTargetDate('')
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
                Title
              </Label>
              <Input
                id='dept-act-title'
                placeholder='Describe the measurable activity'
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={isCreating}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='dept-act-targetDate'>Due date (optional)</Label>
              <Input
                id='dept-act-targetDate'
                type='date'
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
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
            <Button type='submit' disabled={isCreating || !title.trim()}>
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
