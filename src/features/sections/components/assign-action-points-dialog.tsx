'use client'

import * as React from 'react'
import { format, parseISO } from 'date-fns'
import {
  Calendar,
  ChevronDown,
  Loader2,
  Plus,
  Trash2,
  User,
} from 'lucide-react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
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

function createDraftKey(): string {
  return `draft-${crypto.randomUUID()}`
}

function emptyActionPoint(): ActionPointDraft {
  return {
    _key: createDraftKey(),
    description: '',
    assignee: '',
    dueDate: '',
  }
}

function entryToDrafts(entry: StakeholderEntry | null): ActionPointDraft[] {
  const existing = entry?.actionPoints ?? []
  if (existing.length === 0) return [emptyActionPoint()]
  return existing.map(ap => ({
    _key: ap._key ?? createDraftKey(),
    description: ap.description ?? '',
    assignee: ap.assignee?._id ?? '',
    dueDate: ap.dueDate ?? '',
  }))
}

function formatDueDate(value: string): string | null {
  if (!value.trim()) return null

  const parsed = parseISO(value)
  if (Number.isNaN(parsed.getTime())) return value

  return format(parsed, 'd MMM yyyy')
}

function getAssigneeName(
  draft: ActionPointDraft,
  staffOptions: StaffOption[],
): string | null {
  const name = staffOptions.find(
    staff => staff._id === draft.assignee,
  )?.fullName
  return name?.trim() || null
}

interface ActionPointAccordionSummaryProps {
  draft: ActionPointDraft
  index: number
  staffOptions: StaffOption[]
  isOpen: boolean
  actions: React.ReactNode
}

function ActionPointAccordionSummary({
  draft,
  index,
  staffOptions,
  isOpen,
  actions,
}: ActionPointAccordionSummaryProps) {
  const description = draft.description.trim()
  const assigneeName = getAssigneeName(draft, staffOptions)
  const dueDateLabel = formatDueDate(draft.dueDate)
  const title = description || `Action point ${index + 1}`
  const showMeta = !isOpen && (assigneeName || dueDateLabel)

  return (
    <div className='w-full text-left'>
      <div className='flex w-full items-center justify-between gap-3'>
        <span className='min-w-0 truncate text-sm font-medium leading-snug'>
          {title}
        </span>
        <div className='flex shrink-0 items-center gap-0.5'>{actions}</div>
      </div>
      {showMeta ? (
        <div className='mt-1.5 flex flex-wrap items-center gap-2'>
          {assigneeName ? (
            <span className='inline-flex max-w-full items-center gap-1 rounded-md bg-muted/70 px-2 py-0.5 text-xs text-muted-foreground'>
              <User className='h-3 w-3 shrink-0' />
              <span className='truncate'>{assigneeName}</span>
            </span>
          ) : null}
          {dueDateLabel ? (
            <span className='inline-flex items-center gap-1 rounded-md bg-muted/70 px-2 py-0.5 text-xs text-muted-foreground'>
              <Calendar className='h-3 w-3 shrink-0' />
              <span>Due {dueDateLabel}</span>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function isDraftEmpty(draft: ActionPointDraft): boolean {
  return (
    !draft.description.trim() &&
    !draft.assignee.trim() &&
    !draft.dueDate.trim()
  )
}

function isDraftComplete(draft: ActionPointDraft): boolean {
  return Boolean(
    draft.description.trim() && draft.assignee.trim() && draft.dueDate.trim(),
  )
}

function isDraftPartial(draft: ActionPointDraft): boolean {
  return !isDraftEmpty(draft) && !isDraftComplete(draft)
}

function canSaveActionPoints(
  drafts: ActionPointDraft[],
  hadExistingActionPoints: boolean,
): boolean {
  if (drafts.some(isDraftPartial)) return false
  if (drafts.every(isDraftComplete)) return true
  if (drafts.every(isDraftEmpty) && hadExistingActionPoints) return true
  return false
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
  const [openAccordion, setOpenAccordion] = React.useState<string>('')
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      const nextDrafts = entryToDrafts(entry)
      setDrafts(nextDrafts)
      setOpenAccordion(nextDrafts[0]?._key ?? '')
    }
  }, [open, entry])

  const updateDraft = (index: number, patch: Partial<ActionPointDraft>) => {
    setDrafts(prev =>
      prev.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)),
    )
  }

  const addDraft = () => {
    const nextDraft = emptyActionPoint()
    setDrafts(prev => [...prev, nextDraft])
    setOpenAccordion(nextDraft._key!)
  }

  const removeDraft = (index: number) => {
    if (drafts.length === 1) {
      const replacement = emptyActionPoint()
      setDrafts([replacement])
      setOpenAccordion(replacement._key!)
      return
    }

    const removedKey = drafts[index]?._key
    const next = drafts.filter((_, i) => i !== index)
    setDrafts(next)

    if (removedKey && openAccordion === removedKey) {
      const nextOpenIndex = Math.min(index, next.length - 1)
      setOpenAccordion(next[nextOpenIndex]?._key ?? '')
    }
  }

  const completedDrafts = drafts.filter(isDraftComplete)
  const hadExistingActionPoints = (entry?.actionPoints?.length ?? 0) > 0
  const canSave = canSaveActionPoints(drafts, hadExistingActionPoints)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (stakeholderIndex === null || !canSave) return

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
        layout='scrollable'
        className='max-w-2xl sm:max-w-2xl'
      >
        <form onSubmit={handleSubmit} className='flex min-h-0 flex-1 flex-col'>
          <DialogHeader className='shrink-0 pr-8'>
            <DialogTitle>Assign action points</DialogTitle>
            <DialogDescription>
              {entry
                ? `Follow-up actions for ${entry.name}${entry.designation ? ` (${entry.designation})` : ''}`
                : 'Create follow-up actions from this engagement.'}
            </DialogDescription>
          </DialogHeader>

          <div className='min-h-0 flex-1 overflow-y-auto py-2'>
            <Accordion
              type='single'
              collapsible
              value={openAccordion}
              onValueChange={setOpenAccordion}
              className='w-full rounded-lg border'
            >
              {drafts.map((draft, index) => {
                const isOpen = openAccordion === draft._key

                return (
                  <AccordionItem
                    key={draft._key}
                    value={draft._key!}
                    className='border-b px-4 last:border-b-0'
                  >
                    <AccordionTrigger className='w-full items-stretch py-3 hover:no-underline'>
                      <ActionPointAccordionSummary
                        draft={draft}
                        index={index}
                        staffOptions={staffOptions}
                        isOpen={isOpen}
                        actions={
                          <>
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                                isOpen && 'rotate-180',
                              )}
                            />
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8 text-destructive hover:text-destructive'
                              onMouseDown={event => event.stopPropagation()}
                              onClick={event => {
                                event.preventDefault()
                                event.stopPropagation()
                                removeDraft(index)
                              }}
                              disabled={isSaving}
                              aria-label={`Remove action point ${index + 1}`}
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </>
                        }
                      />
                    </AccordionTrigger>

                    <AccordionContent className='space-y-3 pb-4 px-0.5'>
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
                            draft.assignee ||
                              draft.dueDate ||
                              draft.description,
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
                          <DatePicker
                            id={`action-due-date-${index}`}
                            value={draft.dueDate}
                            onChange={value =>
                              updateDraft(index, { dueDate: value })
                            }
                            placeholder='Pick due date'
                            disabled={isSaving}
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>

            <Button
              type='button'
              variant='outline'
              size='sm'
              className='mt-3'
              onClick={addDraft}
              disabled={isSaving}
            >
              <Plus className='mr-2 h-4 w-4' />
              Add action point
            </Button>
          </div>

          <DialogFooter className='shrink-0 border-t pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isSaving || !canSave}>
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
