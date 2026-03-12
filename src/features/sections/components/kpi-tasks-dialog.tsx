'use client'

import * as React from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
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

interface KpiTasksDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sectionContractId: string
  objectiveIndex: number
  initiativeIndex: number
  activityIndex: number
  title: string
  activityCode?: string
  tasks: string[]
  onSuccess?: () => void
}

export function KpiTasksDialog({
  open,
  onOpenChange,
  sectionContractId,
  objectiveIndex,
  initiativeIndex,
  activityIndex,
  title,
  activityCode,
  tasks: initialTasks,
  onSuccess,
}: KpiTasksDialogProps) {
  const router = useRouter()
  const [tasks, setTasks] = React.useState<string[]>(initialTasks)
  const [newTask, setNewTask] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setTasks(initialTasks)
      setNewTask('')
    }
  }, [open, initialTasks])

  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, newTask.trim()])
      setNewTask('')
    }
  }

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/section-contracts/${sectionContractId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'updateActivityTasks',
          payload: {
            objectiveIndex,
            initiativeIndex,
            activityIndex,
            tasks,
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save tasks')
      }
      onOpenChange(false)
      router.refresh()
      onSuccess?.()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to save tasks')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detailed Tasks for KPI</DialogTitle>
          <DialogDescription>
            Add bullet tasks for <strong>{activityCode ?? ''}</strong> to break
            down the work.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4 py-2 pb-4'>
          <div
            className={`max-h-[300px] overflow-y-auto rounded-md ${
              tasks.length > 0 ? 'border p-2' : ''
            }`}
          >
            {tasks.length === 0 ? (
              <div></div>
            ) : (
              <ul className='space-y-2'>
                {tasks.map((task, i) => (
                  <li
                    key={i}
                    className='flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm'
                  >
                    <span className='text-muted-foreground'>•</span>
                    <span className='flex-1'>{task}</span>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8 shrink-0'
                      onClick={() => removeTask(i)}
                      disabled={isSaving}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className='flex gap-2'>
            <Input
              placeholder='Add a task...'
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e =>
                e.key === 'Enter' && (e.preventDefault(), addTask())
              }
              disabled={isSaving}
            />
            <Button
              type='button'
              variant='outline'
              size='icon'
              onClick={addTask}
              disabled={isSaving || !newTask.trim()}
            >
              <Plus className='h-4 w-4' />
            </Button>
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
          <Button onClick={handleSave} disabled={isSaving || tasks.length === 0}>
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
      </DialogContent>
    </Dialog>
  )
}
