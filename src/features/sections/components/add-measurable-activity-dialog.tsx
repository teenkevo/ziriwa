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
import { SupervisorSwitcher } from '@/features/sections/components/supervisor-switcher'

interface AddMeasurableActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sectionContractId: string
  sectionId: string
  supervisors: { _id: string; fullName: string; staffId?: string }[]
  objectiveIndex: number
  initiativeIndex: number
  initiativeCode?: string
  activityType: 'kpi' | 'cross-cutting'
  nextOrder: number
  onSuccess?: () => void
}

export function AddMeasurableActivityDialog({
  open,
  onOpenChange,
  sectionContractId,
  sectionId,
  supervisors,
  objectiveIndex,
  initiativeIndex,
  initiativeCode,
  activityType,
  nextOrder,
  onSuccess,
}: AddMeasurableActivityDialogProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [aim, setAim] = React.useState('')
  const [targetDate, setTargetDate] = React.useState('')
  const [supervisorId, setSupervisorId] = React.useState<string>(
    supervisors[0]?._id ?? '',
  )

  const isKPI = activityType === 'kpi'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    if (isKPI && !aim.trim()) {
      alert('AIM is required for KPI measurable activities')
      return
    }
    setIsCreating(true)
    try {
      const payload: Record<string, unknown> = {
        objectiveIndex,
        initiativeIndex,
        activityType,
        title: title.trim(),
        order: nextOrder,
        targetDate: targetDate || undefined,
      }
      if (isKPI && aim.trim()) {
        payload.aim = aim.trim()
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
      setTitle('')
      setAim('')
      setTargetDate('')
      onOpenChange(false)
      await router.refresh()
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Add {isKPI ? 'KPI' : 'Cross-cutting'} Measurable Activity
          </DialogTitle>
          <DialogDescription>
            {isKPI
              ? `For initiative ${initiativeCode ?? initiativeIndex}`
              : `For initiative ${initiativeCode ?? initiativeIndex}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='space-y-4 py-2 pb-4'>
            <div className='space-y-2'>
              <Label htmlFor='title' required>
                Title
              </Label>
              <Input
                id='title'
                placeholder='e.g. Submit completed forms to HR'
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={isCreating}
                required
              />
            </div>
            {isKPI && (
              <div className='space-y-2'>
                <Label htmlFor='aim' required>
                  AIM
                </Label>
                <textarea
                  id='aim'
                  className='flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                  placeholder='Scope, design, and validate...'
                  value={aim}
                  onChange={e => setAim(e.target.value)}
                  disabled={isCreating}
                />
              </div>
            )}
            <div className='space-y-2'>
              <Label required>Supervisor for this activity</Label>
              <SupervisorSwitcher
                supervisors={supervisors}
                value={supervisorId}
                onChange={setSupervisorId}
                disabled={isCreating}
                sectionId={sectionId}
                placeholder='Select or create supervisor'
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
              disabled={isCreating || !title.trim() || (isKPI && !aim.trim())}
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
