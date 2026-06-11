'use client'

import * as React from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { StakeholderEntry } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'

type StaffOption = { _id: string; fullName?: string; staffId?: string }

interface ActionPointDraft {
  _key?: string
  description: string
  assignee: string
  dueDate: string
}

interface AssignActionPointsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: StakeholderEntry | null
  stakeholderIndex: number | null
  engagementId: string
  staffOptions: StaffOption[]
  onSuccess: () => void
}

function emptyActionPoint(): ActionPointDraft {
  return { description: '', assignee: '', dueDate: '' }
}

function entryToDrafts(entry: StakeholderEntry | null): ActionPointDraft[] {
  const existing = entry?.actionPoints ?? []
  if (existing.length === 0) return [emptyActionPoint()]
  return existing.map(ap => ({
    _key: ap._key,
    description: ap.description ?? '',
    assignee: ap.assignee?._id ?? '',
    dueDate: ap.dueDate ?? '',
  }))
}

function isDraftComplete(draft: ActionPointDraft): boolean {
  return Boolean(
    draft.description.trim() && draft.assignee.trim() && draft.dueDate.trim(),
  )
}

export function AssignActionPointsDialog({
  open,
  onOpenChange,
  entry,
  stakeholderIndex,
  engagementId,
  staffOptions,
  onSuccess,
}: AssignActionPointsDialogProps) {
  const [drafts, setDrafts] = React.useState<ActionPointDraft[]>([
    emptyActionPoint(),
  ])
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setDrafts(entryToDrafts(entry))
    }
  }, [open, entry])

  const updateDraft = (
    index: number,
    patch: Partial<ActionPointDraft>,
  ) => {
    setDrafts(prev =>
      prev.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)),
    )
  }

  const addDraft = () => {
    setDrafts(prev => [...prev, emptyActionPoint()])
  }

  const removeDraft = (index: number) => {
    setDrafts(prev => {
      if (prev.length === 1) return [emptyActionPoint()]
      return prev.filter((_, i) => i !== index)
    })
  }

  const completedDrafts = drafts.filter(isDraftComplete)
  const hasIncompleteDraft = drafts.some(
    draft =>
      draft.description.trim() ||
      draft.assignee.trim() ||
      draft.dueDate.trim()
        ? !isDraftComplete(draft)
        : false,
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (stakeholderIndex === null || hasIncompleteDraft) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/stakeholder-engagement/${engagementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'setActionPoints',
          payload: {
            stakeholderIndex,
            actionPoints: completedDrafts.map(draft => ({
              _key: draft._key,
              description: draft.description.trim(),
              assignee: draft.assignee,
              dueDate: draft.dueDate,
            })),
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save action points')
      }
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to save action points')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        disableClose={isSaving}
        className='max-w-2xl max-h-[90vh] flex flex-col'
      >
        <DialogHeader>
          <DialogTitle>Assign action points</DialogTitle>
          <DialogDescription>
            {entry
              ? `Follow-up actions for ${entry.name}${entry.designation ? ` (${entry.designation})` : ''}`
              : 'Create follow-up actions from this engagement.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='flex min-h-0 flex-1 flex-col'>
          <div className='flex-1 space-y-4 overflow-y-auto py-2'>
            {drafts.map((draft, index) => (
              <div
                key={draft._key ?? `draft-${index}`}
                className='space-y-3 rounded-lg border p-4'
              >
                <div className='flex items-center justify-between gap-2'>
                  <p className='text-sm font-medium'>Action point {index + 1}</p>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 text-destructive hover:text-destructive'
                    onClick={() => removeDraft(index)}
                    disabled={isSaving}
                    aria-label={`Remove action point ${index + 1}`}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor={`action-description-${index}`} required>
                    Description
                  </Label>
                  <Textarea
                    id={`action-description-${index}`}
                    value={draft.description}
                    onChange={e =>
                      updateDraft(index, { description: e.target.value })
                    }
                    placeholder='Describe the follow-up action'
                    rows={2}
                    disabled={isSaving}
                    required={Boolean(
                      draft.assignee || draft.dueDate || draft.description,
                    )}
                  />
                </div>

                <div className='grid gap-3 sm:grid-cols-2'>
                  <div className='space-y-2'>
                    <Label htmlFor={`action-assignee-${index}`} required>
                      Assignee
                    </Label>
                    <Select
                      value={draft.assignee}
                      onValueChange={value =>
                        updateDraft(index, { assignee: value })
                      }
                      disabled={isSaving}
                    >
                      <SelectTrigger id={`action-assignee-${index}`}>
                        <SelectValue placeholder='Select assignee' />
                      </SelectTrigger>
                      <SelectContent>
                        {staffOptions.map(staff => (
                          <SelectItem key={staff._id} value={staff._id}>
                            {staff.fullName}
                            {staff.staffId ? ` (${staff.staffId})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor={`action-due-date-${index}`} required>
                      Due date
                    </Label>
                    <Input
                      id={`action-due-date-${index}`}
                      type='date'
                      value={draft.dueDate}
                      onChange={e =>
                        updateDraft(index, { dueDate: e.target.value })
                      }
                      disabled={isSaving}
                      required={Boolean(
                        draft.assignee || draft.dueDate || draft.description,
                      )}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={addDraft}
              disabled={isSaving}
            >
              <Plus className='mr-2 h-4 w-4' />
              Add action point
            </Button>
          </div>

          <DialogFooter className='pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={isSaving || hasIncompleteDraft}
            >
              {isSaving ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Saving...
                </>
              ) : (
                'Save action points'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
