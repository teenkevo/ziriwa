'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Plus,
  Send,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronDown,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  WeeklySprint,
  SprintTask,
} from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

export type InitiativeWithActivities = {
  key: string
  title: string
  activities: { key: string; title: string }[]
}

interface WeeklySprintContentProps {
  sectionId: string
  sectionName: string
  sprints: WeeklySprint[]
  initiatives?: InitiativeWithActivities[]
}

type WeekOption = {
  label: string
  start: string
  end: string
}

function getFYWeeks(): WeekOption[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const fyStartYear = month >= 7 ? year : year - 1
  const fyStart = new Date(fyStartYear, 6, 1) // July 1
  const fyEnd = new Date(fyStartYear + 1, 5, 30) // June 30
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() + 7) // include next week
  if (cutoff > fyEnd) cutoff.setTime(fyEnd.getTime())

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const weeks: WeekOption[] = []
  let weekNum = 1

  // Week 1 starts on July 1 and ends on the nearest Friday
  const startDay = fyStart.getDay() // 0=Sun .. 6=Sat
  const daysToFriday = startDay <= 5 ? 5 - startDay : 0
  const firstFriday = new Date(fyStart)
  firstFriday.setDate(fyStart.getDate() + daysToFriday)

  if (fyStart <= today) {
    weeks.push({
      label: `Week ${weekNum} – ${fmt(fyStart)}-${fmt(firstFriday)}, ${fyStart.getFullYear()}`,
      start: fyStart.toISOString().slice(0, 10),
      end: firstFriday.toISOString().slice(0, 10),
    })
    weekNum++
  }

  // Subsequent weeks run Monday to Friday
  const nextMonday = new Date(firstFriday)
  nextMonday.setDate(firstFriday.getDate() + 3) // Friday + 3 = Monday

  const cursor = new Date(nextMonday)
  while (cursor <= cutoff) {
    const friday = new Date(cursor)
    friday.setDate(cursor.getDate() + 4)

    weeks.push({
      label: `Week ${weekNum} – ${fmt(cursor)}-${fmt(friday)}, ${cursor.getFullYear()}`,
      start: cursor.toISOString().slice(0, 10),
      end: friday.toISOString().slice(0, 10),
    })

    cursor.setDate(cursor.getDate() + 7)
    weekNum++
  }

  return weeks.reverse()
}

const STATUS_CONFIG: Record<
  SprintTask['status'],
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
  }
> = {
  pending: { label: 'Pending Review', variant: 'secondary' },
  accepted: { label: 'Accepted', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  revisions_requested: { label: 'Revisions Requested', variant: 'outline' },
}

type DraftTask = {
  description: string
  initiativeKey: string
  activityKey: string
}

const emptyDraftTask: DraftTask = {
  description: '',
  initiativeKey: '',
  activityKey: '',
}

export function WeeklySprintContent({
  sectionId,
  sectionName,
  sprints,
  initiatives = [],
}: WeeklySprintContentProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)
  const [draftTasks, setDraftTasks] = React.useState<DraftTask[]>([
    { ...emptyDraftTask },
  ])

  const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false)
  const [reviewingSprintId, setReviewingSprintId] = React.useState('')
  const [reviewingTask, setReviewingTask] = React.useState<SprintTask | null>(
    null,
  )
  const [reviewAction, setReviewAction] = React.useState<string>('')
  const [revisionReason, setRevisionReason] = React.useState('')
  const [isReviewing, setIsReviewing] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState<string | null>(null)

  const fyWeeks = React.useMemo(() => getFYWeeks(), [])
  const [selectedWeekIdx, setSelectedWeekIdx] = React.useState('0')

  const addTask = () => setDraftTasks(prev => [...prev, { ...emptyDraftTask }])

  const removeTask = (index: number) =>
    setDraftTasks(prev => prev.filter((_, i) => i !== index))

  const updateTaskField = (
    index: number,
    field: keyof DraftTask,
    value: string,
  ) =>
    setDraftTasks(prev =>
      prev.map((t, i) => {
        if (i !== index) return t
        if (field === 'initiativeKey') {
          return { ...t, initiativeKey: value, activityKey: '' }
        }
        return { ...t, [field]: value }
      }),
    )

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const validTasks = draftTasks.filter(t => t.description.trim())
    const week = fyWeeks[Number(selectedWeekIdx)]
    if (validTasks.length === 0 || !week) return

    setIsCreating(true)
    try {
      const tasksPayload = validTasks.map(t => {
        const init = initiatives.find(i => i.key === t.initiativeKey)
        const act = init?.activities.find(a => a.key === t.activityKey)
        return {
          description: t.description,
          initiativeKey: t.initiativeKey || undefined,
          initiativeTitle: init?.title || undefined,
          activityKey: t.activityKey || undefined,
          activityTitle: act?.title || undefined,
        }
      })
      const res = await fetch('/api/weekly-sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId,
          weekLabel: week.label,
          weekStart: week.start,
          weekEnd: week.end,
          tasks: tasksPayload,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create sprint')
      }
      setDraftTasks([{ ...emptyDraftTask }])
      setSelectedWeekIdx('0')
      setCreateOpen(false)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to create sprint')
    } finally {
      setIsCreating(false)
    }
  }

  const handleSubmitSprint = async (sprintId: string) => {
    setIsSubmitting(sprintId)
    try {
      const res = await fetch(`/api/weekly-sprints/${sprintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit' }),
      })
      if (!res.ok) throw new Error('Failed to submit')
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Failed to submit sprint for review')
    } finally {
      setIsSubmitting(null)
    }
  }

  const openReview = (sprintId: string, task: SprintTask, action: string) => {
    setReviewingSprintId(sprintId)
    setReviewingTask(task)
    setReviewAction(action)
    setRevisionReason('')
    setReviewDialogOpen(true)
  }

  const handleReview = async () => {
    if (!reviewingTask || !reviewAction) return
    if (reviewAction === 'revisions_requested' && !revisionReason.trim()) return

    setIsReviewing(true)
    try {
      const res = await fetch(`/api/weekly-sprints/${reviewingSprintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review-task',
          taskKey: reviewingTask._key,
          reviewStatus: reviewAction,
          revisionReason:
            reviewAction === 'revisions_requested'
              ? revisionReason.trim()
              : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to review task')
      }
      setReviewDialogOpen(false)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to review task')
    } finally {
      setIsReviewing(false)
    }
  }

  const validDraftTasks = draftTasks.filter(t => t.description.trim())

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <p className='text-base font-medium'>Weekly sprints for the Section</p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className='h-4 w-4' />
          New Sprint
        </Button>
      </div>

      {sprints.length === 0 && (
        <Card>
          <CardContent className='pt-6'>
            <p className='text-sm text-muted-foreground'>
              No weekly sprints yet. Create the first sprint plan to get
              started.
            </p>
          </CardContent>
        </Card>
      )}

      {sprints.map(sprint => (
        <SprintCard
          key={sprint._id}
          sprint={sprint}
          onSubmit={() => handleSubmitSprint(sprint._id)}
          isSubmitting={isSubmitting === sprint._id}
          onReviewTask={(task, action) => openReview(sprint._id, task, action)}
        />
      ))}

      {/* Create Sprint Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='max-w-lg max-h-[85vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>New Weekly Sprint</DialogTitle>
            <DialogDescription>
              Create a sprint plan for a week in the current financial year.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.stopPropagation()
              handleCreate(e)
            }}
          >
            <div className='space-y-4 py-2 pb-4'>
              <div className='space-y-2'>
                <Label required>Week</Label>
                <Select
                  value={selectedWeekIdx}
                  onValueChange={setSelectedWeekIdx}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select week' />
                  </SelectTrigger>
                  <SelectContent>
                    {fyWeeks.map((w, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {w.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-3'>
                <Label required>Tasks</Label>
                {draftTasks.map((task, i) => {
                  const selectedInit = initiatives.find(
                    ini => ini.key === task.initiativeKey,
                  )
                  return (
                    <div key={i} className='space-y-2 rounded-md border p-3'>
                      <div className='flex items-center gap-2'>
                        <span className='text-xs text-muted-foreground font-medium'>
                          Task {i + 1}
                        </span>
                        {draftTasks.length > 1 && (
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            className='ml-auto h-6 w-6 p-0'
                            onClick={() => removeTask(i)}
                          >
                            <Trash2 className='h-3 w-3' />
                          </Button>
                        )}
                      </div>
                      <Textarea
                        placeholder='Describe the task...'
                        value={task.description}
                        onChange={e =>
                          updateTaskField(i, 'description', e.target.value)
                        }
                        rows={2}
                        disabled={isCreating}
                      />
                      {initiatives.length > 0 && (
                        <div className='space-y-2'>
                          <Select
                            value={task.initiativeKey}
                            onValueChange={v =>
                              updateTaskField(i, 'initiativeKey', v)
                            }
                            disabled={isCreating}
                          >
                            <SelectTrigger className='text-xs'>
                              <SelectValue placeholder='Select related initiative' />
                            </SelectTrigger>
                            <SelectContent>
                              {initiatives.map(ini => (
                                <SelectItem
                                  key={ini.key}
                                  value={ini.key}
                                  className='text-xs'
                                >
                                  {ini.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={task.activityKey}
                            onValueChange={v =>
                              updateTaskField(i, 'activityKey', v)
                            }
                            disabled={isCreating || !task.initiativeKey}
                          >
                            <SelectTrigger className='text-xs'>
                              <SelectValue placeholder='Select related measurable activity' />
                            </SelectTrigger>
                            <SelectContent>
                              {(selectedInit?.activities ?? []).map(act => (
                                <SelectItem
                                  key={act.key}
                                  value={act.key}
                                  className='text-xs'
                                >
                                  {act.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )
                })}
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={addTask}
                  disabled={isCreating}
                >
                  <Plus className='h-4 w-4' />
                  Add Task
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setCreateOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={isCreating || validDraftTasks.length === 0}
              >
                {isCreating ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Creating...
                  </>
                ) : (
                  'Create Sprint'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review Task Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'accepted' && 'Accept Task'}
              {reviewAction === 'rejected' && 'Reject Task'}
              {reviewAction === 'revisions_requested' && 'Request Revisions'}
            </DialogTitle>
            <DialogDescription>{reviewingTask?.description}</DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            {reviewAction === 'revisions_requested' && (
              <div className='space-y-2'>
                <Label required>Reason for Revisions</Label>
                <Textarea
                  placeholder='Explain what changes are needed...'
                  value={revisionReason}
                  onChange={e => setRevisionReason(e.target.value)}
                  rows={3}
                  disabled={isReviewing}
                />
              </div>
            )}
            {reviewAction === 'accepted' && (
              <p className='text-sm text-muted-foreground'>
                Are you sure you want to accept this task?
              </p>
            )}
            {reviewAction === 'rejected' && (
              <p className='text-sm text-muted-foreground'>
                Are you sure you want to reject this task?
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setReviewDialogOpen(false)}
              disabled={isReviewing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={
                isReviewing ||
                (reviewAction === 'revisions_requested' &&
                  !revisionReason.trim())
              }
              variant={reviewAction === 'rejected' ? 'destructive' : 'default'}
            >
              {isReviewing ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Reviewing...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SprintCard({
  sprint,
  onSubmit,
  isSubmitting,
  onReviewTask,
}: {
  sprint: WeeklySprint
  onSubmit: () => void
  isSubmitting: boolean
  onReviewTask: (task: SprintTask, action: string) => void
}) {
  const [open, setOpen] = React.useState(true)
  const tasks = sprint.tasks || []
  const accepted = tasks.filter(t => t.status === 'accepted').length
  const total = tasks.length

  const sprintStatusBadge = {
    draft: { label: 'Draft', variant: 'secondary' as const },
    submitted: { label: 'Submitted for Review', variant: 'default' as const },
    reviewed: { label: 'Reviewed', variant: 'outline' as const },
  }[sprint.status]

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <div className='space-y-1'>
              <CardTitle className='text-base'>{sprint.weekLabel}</CardTitle>
              <p className='text-xs text-muted-foreground'>
                {sprint.supervisor?.fullName &&
                  `By ${sprint.supervisor.fullName} · `}
                {accepted}/{total} accepted
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <Badge variant={sprintStatusBadge.variant}>
                {sprintStatusBadge.label}
              </Badge>
              {sprint.status === 'draft' && (
                <Button
                  size='sm'
                  variant='outline'
                  onClick={onSubmit}
                  disabled={isSubmitting || tasks.length === 0}
                >
                  {isSubmitting ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <>
                      <Send className='h-4 w-4' />
                      Submit
                    </>
                  )}
                </Button>
              )}
              <CollapsibleTrigger asChild>
                <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className='pt-0'>
            <div className='space-y-2'>
              {tasks.map((task, i) => {
                const config = STATUS_CONFIG[task.status]
                const canReview =
                  sprint.status === 'submitted' && task.status === 'pending'
                return (
                  <div
                    key={task._key || i}
                    className='flex items-start gap-3 rounded-md border p-3'
                  >
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-start gap-2 mb-1'>
                        <span className='text-sm'>{task.description}</span>
                        <Badge
                          variant={config.variant}
                          className='text-[10px] px-1.5 py-0 shrink-0'
                        >
                          {config.label}
                        </Badge>
                      </div>
                      {(task.initiativeTitle || task.activityTitle) && (
                        <p className='text-xs text-muted-foreground'>
                          {task.initiativeTitle}
                          {task.activityTitle && ` → ${task.activityTitle}`}
                        </p>
                      )}
                      {task.status === 'revisions_requested' &&
                        task.revisionReason && (
                          <p className='text-xs text-orange-600 dark:text-orange-400 mt-1'>
                            Revision reason: {task.revisionReason}
                          </p>
                        )}
                    </div>
                    {canReview && (
                      <div className='flex items-center gap-1 shrink-0'>
                        <Button
                          size='sm'
                          variant='ghost'
                          className='h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50'
                          title='Accept'
                          onClick={() => onReviewTask(task, 'accepted')}
                        >
                          <CheckCircle2 className='h-4 w-4' />
                        </Button>
                        <Button
                          size='sm'
                          variant='ghost'
                          className='h-7 w-7 p-0 text-orange-500 hover:text-orange-600 hover:bg-orange-50'
                          title='Request Revisions'
                          onClick={() =>
                            onReviewTask(task, 'revisions_requested')
                          }
                        >
                          <RotateCcw className='h-4 w-4' />
                        </Button>
                        <Button
                          size='sm'
                          variant='ghost'
                          className='h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50'
                          title='Reject'
                          onClick={() => onReviewTask(task, 'rejected')}
                        >
                          <XCircle className='h-4 w-4' />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
              {tasks.length === 0 && (
                <p className='text-sm text-muted-foreground py-2'>
                  No tasks in this sprint.
                </p>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
