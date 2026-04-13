'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
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
  Pencil,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  SprintTasksTable,
  type AcceptedSprintTask,
} from './components/sprint-tasks-table'
import { SprintTaskDetailsPanel } from './components/sprint-task-details-panel'
import type { Officer } from './components/officer-switcher'
import type {
  WeeklySprint,
  SprintTask,
} from '@/sanity/lib/weekly-sprints/get-sprints-by-section'
import { Input } from '@/components/ui/input'
import { useAppRole } from '@/hooks/use-app-role'

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
  officers?: Officer[]
  onSprintTabChange?: (tab: string) => void
  panelPortalNode?: HTMLDivElement | null
  /** Sanity staff id for signed-in user in this section — filters accepted tasks for officers. */
  viewerStaffId?: string
}

type WeekOption = {
  label: string
  start: string
  end: string
}

function formatLocalYMD(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

  const firstWeekEnd = new Date(fyStart)
  while (firstWeekEnd.getDay() !== 5 && firstWeekEnd <= fyEnd) {
    firstWeekEnd.setDate(firstWeekEnd.getDate() + 1)
  }

  if (fyStart <= today) {
    weeks.push({
      label: `Week ${weekNum} – ${fmt(fyStart)}-${fmt(firstWeekEnd)}, ${fyStart.getFullYear()}`,
      start: formatLocalYMD(fyStart),
      end: formatLocalYMD(firstWeekEnd),
    })
    weekNum++
  }

  const firstMonday = new Date(firstWeekEnd)
  firstMonday.setDate(firstWeekEnd.getDate() + 3)

  const cursor = new Date(firstMonday)
  while (cursor <= cutoff && cursor <= fyEnd) {
    const monday = new Date(cursor)
    const friday = new Date(cursor)
    friday.setDate(monday.getDate() + 4)

    if (friday > fyEnd) {
      friday.setTime(fyEnd.getTime())
    }

    weeks.push({
      label: `Week ${weekNum} – ${fmt(monday)}-${fmt(friday)}, ${monday.getFullYear()}`,
      start: formatLocalYMD(monday),
      end: formatLocalYMD(friday),
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

// TODO: Allow adding other activity cateogories
const ACTIVITY_CATEGORIES = [
  { label: 'Normal Flow', value: 'normal_flow' },
  { label: 'Compliance', value: 'compliance' },
  { label: 'Staff Development', value: 'staff_development' },
  { label: 'Stakeholder Engagement', value: 'stakeholder_engagement' },
]

type DraftTask = {
  /** Preserved when editing an existing sprint task */
  _key?: string
  description: string
  activityCategory: string
  initiativeKey: string
  activityKey: string
}

function sprintTaskToDraft(t: SprintTask): DraftTask {
  return {
    _key: t._key,
    description: t.description ?? '',
    activityCategory: t.activityCategory ?? '',
    initiativeKey: t.initiativeKey ?? '',
    activityKey: t.activityKey ?? '',
  }
}

const emptyDraftTask: DraftTask = {
  description: '',
  activityCategory: '',
  initiativeKey: '',
  activityKey: '',
}

function isDraftTaskComplete(t: DraftTask): boolean {
  return (
    Boolean(t.description.trim()) &&
    Boolean(t.activityCategory) &&
    Boolean(t.initiativeKey) &&
    Boolean(t.activityKey)
  )
}

export function WeeklySprintContent({
  sectionId,
  sectionName,
  sprints,
  initiatives = [],
  officers = [],
  onSprintTabChange,
  panelPortalNode,
  viewerStaffId,
}: WeeklySprintContentProps) {
  const router = useRouter()
  const { role, isLoaded } = useAppRole()
  const isOfficer = isLoaded && role === 'officer'

  const [createOpen, setCreateOpen] = React.useState(false)
  const [editingSprintId, setEditingSprintId] = React.useState<string | null>(
    null,
  )
  const [isSavingSprint, setIsSavingSprint] = React.useState(false)
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
  const [reviseOpen, setReviseOpen] = React.useState(false)
  const [reviseSprintId, setReviseSprintId] = React.useState('')
  const [reviseTaskDraft, setReviseTaskDraft] =
    React.useState<DraftTask | null>(null)
  const [reviseManagerFeedback, setReviseManagerFeedback] = React.useState('')
  const [isSavingRevise, setIsSavingRevise] = React.useState(false)

  const [sprintTab, setSprintTabInternal] = React.useState('draft')
  const setSprintTab = React.useCallback(
    (tab: string) => {
      setSprintTabInternal(tab)
      onSprintTabChange?.(tab)
    },
    [onSprintTabChange],
  )
  const [selectedTaskKey, setSelectedTaskKey] = React.useState<string | null>(
    null,
  )
  const [isSavingTask, setIsSavingTask] = React.useState(false)
  const [extraTaskOpen, setExtraTaskOpen] = React.useState(false)
  const [extraTaskSprintId, setExtraTaskSprintId] = React.useState('')
  const [extraTaskDraft, setExtraTaskDraft] = React.useState<DraftTask>({
    ...emptyDraftTask,
  })
  const [isSavingExtraTask, setIsSavingExtraTask] = React.useState(false)

  const fyWeeks = React.useMemo(() => getFYWeeks(), [])
  const [selectedWeekIdx, setSelectedWeekIdx] = React.useState('0')

  React.useEffect(() => {
    if (isOfficer) {
      onSprintTabChange?.('accepted')
    }
  }, [isOfficer, onSprintTabChange])

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

  const openNewSprintDialog = () => {
    setEditingSprintId(null)
    setDraftTasks([{ ...emptyDraftTask }])
    setSelectedWeekIdx('0')
    setCreateOpen(true)
  }

  const openEditDraftSprint = (sprint: WeeklySprint) => {
    setEditingSprintId(sprint._id)
    const mapped = (sprint.tasks ?? []).map(sprintTaskToDraft)
    setDraftTasks(mapped.length > 0 ? mapped : [{ ...emptyDraftTask }])
    const idx = fyWeeks.findIndex(
      w => w.start === sprint.weekStart && w.end === sprint.weekEnd,
    )
    setSelectedWeekIdx(idx >= 0 ? String(idx) : '0')
    setCreateOpen(true)
  }

  const handleSaveSprint = async (e: React.FormEvent) => {
    e.preventDefault()
    const validTasks = draftTasks.filter(isDraftTaskComplete)
    const week = fyWeeks[Number(selectedWeekIdx)]
    if (validTasks.length === 0 || !week) return

    setIsSavingSprint(true)
    try {
      const tasksPayload = validTasks.map(t => {
        const init = initiatives.find(i => i.key === t.initiativeKey)
        const act = init?.activities.find(a => a.key === t.activityKey)
        return {
          ...(t._key && { _key: t._key }),
          description: t.description.trim(),
          activityCategory: t.activityCategory,
          initiativeKey: t.initiativeKey,
          initiativeTitle: init?.title,
          activityKey: t.activityKey,
          activityTitle: act?.title,
        }
      })

      if (editingSprintId) {
        const res = await fetch(`/api/weekly-sprints/${editingSprintId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update-draft-sprint',
            weekLabel: week.label,
            weekStart: week.start,
            weekEnd: week.end,
            tasks: tasksPayload,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to update sprint')
        }
      } else {
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
      }

      setDraftTasks([{ ...emptyDraftTask }])
      setSelectedWeekIdx('0')
      setEditingSprintId(null)
      setCreateOpen(false)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to save sprint')
    } finally {
      setIsSavingSprint(false)
    }
  }

  const openReviseDialog = (sprintId: string, task: SprintTask) => {
    setReviseSprintId(sprintId)
    setReviseTaskDraft(sprintTaskToDraft(task))
    setReviseManagerFeedback(task.revisionReason?.trim() ?? '')
    setReviseOpen(true)
  }

  const setReviseField = (field: keyof DraftTask, value: string) => {
    setReviseTaskDraft(prev => {
      if (!prev) return prev
      if (field === 'initiativeKey') {
        return { ...prev, initiativeKey: value, activityKey: '' }
      }
      return { ...prev, [field]: value }
    })
  }

  const handleSaveRevise = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviseTaskDraft?._key || !isDraftTaskComplete(reviseTaskDraft)) return

    const init = initiatives.find(i => i.key === reviseTaskDraft.initiativeKey)
    const act = init?.activities.find(
      a => a.key === reviseTaskDraft.activityKey,
    )

    setIsSavingRevise(true)
    try {
      const res = await fetch(`/api/weekly-sprints/${reviseSprintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revise-task',
          taskKey: reviseTaskDraft._key,
          description: reviseTaskDraft.description.trim(),
          activityCategory: reviseTaskDraft.activityCategory,
          initiativeKey: reviseTaskDraft.initiativeKey,
          initiativeTitle: init?.title,
          activityKey: reviseTaskDraft.activityKey,
          activityTitle: act?.title,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Failed to save revision',
        )
      }
      setReviseOpen(false)
      setReviseTaskDraft(null)
      setReviseSprintId('')
      setReviseManagerFeedback('')
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to save revision')
    } finally {
      setIsSavingRevise(false)
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Failed to submit',
        )
      }
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(
        err instanceof Error
          ? err.message
          : 'Failed to submit sprint for review',
      )
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

  // --- Accepted tasks handlers ---

  /** One group per sprint that has at least one accepted task; latest sprint first. */
  const acceptedSprintGroups = React.useMemo(() => {
    const groups: {
      sprint: WeeklySprint
      tasks: AcceptedSprintTask[]
    }[] = []
    for (const sprint of sprints) {
      const tasks: AcceptedSprintTask[] = []
      for (const task of sprint.tasks ?? []) {
        if (task.status === 'accepted') {
          tasks.push({
            ...task,
            sprintId: sprint._id,
            weekLabel: sprint.weekLabel,
            weekStart: sprint.weekStart,
            weekEnd: sprint.weekEnd,
          })
        }
      }
      if (tasks.length > 0) {
        groups.push({ sprint, tasks })
      }
    }
    groups.sort((a, b) => b.sprint.weekStart.localeCompare(a.sprint.weekStart))
    return groups
  }, [sprints])

  /** Officers only see accepted tasks assigned to them; others see all accepted tasks. */
  const groupsForAcceptedUi = React.useMemo(() => {
    if (!isOfficer) return acceptedSprintGroups
    if (!viewerStaffId) return []
    return acceptedSprintGroups
      .map(g => ({
        ...g,
        tasks: g.tasks.filter(t => t.assignee === viewerStaffId),
      }))
      .filter(g => g.tasks.length > 0)
  }, [acceptedSprintGroups, isOfficer, viewerStaffId])

  const tasksForAcceptedUi = React.useMemo(
    () => groupsForAcceptedUi.flatMap(g => g.tasks),
    [groupsForAcceptedUi],
  )

  const nonDraftSprints = React.useMemo(
    () =>
      [...sprints]
        .filter(s => s.status !== 'draft')
        .sort((a, b) => b.weekStart.localeCompare(a.weekStart)),
    [sprints],
  )

  const selectedAcceptedTask = React.useMemo(
    () => tasksForAcceptedUi.find(t => t._key === selectedTaskKey) ?? null,
    [tasksForAcceptedUi, selectedTaskKey],
  )

  const handleUpdateTask = async (
    sprintId: string,
    taskKey: string,
    updates: Record<string, unknown>,
  ) => {
    setIsSavingTask(true)
    try {
      const res = await fetch(`/api/weekly-sprints/${sprintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-task', taskKey, updates }),
      })
      if (!res.ok) throw new Error('Failed to update task')
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Failed to update task')
    } finally {
      setIsSavingTask(false)
    }
  }

  const handleAddWorkSubmission = async (
    sprintId: string,
    taskKey: string,
    submission: {
      description: string
      outputFile: File
      revenueAssessed?: number
    },
  ) => {
    const formData = new FormData()
    formData.append('file', submission.outputFile)
    const uploadRes = await fetch('/api/sanity/upload', {
      method: 'POST',
      body: formData,
    })
    if (!uploadRes.ok) throw new Error('Upload failed')
    const { id: outputFileId } = await uploadRes.json()

    const res = await fetch(`/api/weekly-sprints/${sprintId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add-work-submission',
        taskKey,
        description: submission.description,
        outputFileId,
        revenueAssessed: submission.revenueAssessed,
      }),
    })
    if (!res.ok) throw new Error('Failed to add work submission')
    router.refresh()
  }

  const handleApproveSubmission = async (
    sprintId: string,
    taskKey: string,
    submissionKey: string,
    message?: string,
  ) => {
    setIsSavingTask(true)
    try {
      const res = await fetch(`/api/weekly-sprints/${sprintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve-work-submission',
          taskKey,
          submissionKey,
          message,
        }),
      })
      if (!res.ok) throw new Error('Failed to approve submission')
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Failed to approve submission')
    } finally {
      setIsSavingTask(false)
    }
  }

  const handleRejectSubmission = async (
    sprintId: string,
    taskKey: string,
    submissionKey: string,
    message: string,
  ) => {
    setIsSavingTask(true)
    try {
      const res = await fetch(`/api/weekly-sprints/${sprintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject-work-submission',
          taskKey,
          submissionKey,
          message,
        }),
      })
      if (!res.ok) throw new Error('Failed to reject submission')
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Failed to reject submission')
    } finally {
      setIsSavingTask(false)
    }
  }

  const handleRespondToSubmissionRejection = async (
    sprintId: string,
    taskKey: string,
    submissionKey: string,
    message: string,
    outputFile?: File,
  ) => {
    let outputFileId: string | undefined
    if (outputFile) {
      const formData = new FormData()
      formData.append('file', outputFile)
      const uploadRes = await fetch('/api/sanity/upload', {
        method: 'POST',
        body: formData,
      })
      if (!uploadRes.ok) throw new Error('Upload failed')
      const data = await uploadRes.json()
      outputFileId = data.id
    }

    const res = await fetch(`/api/weekly-sprints/${sprintId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'respond-to-work-submission-rejection',
        taskKey,
        submissionKey,
        message,
        outputFileId,
      }),
    })
    if (!res.ok) throw new Error('Failed to respond')
    router.refresh()
  }

  const openExtraTaskDialog = () => {
    setExtraTaskDraft({ ...emptyDraftTask })
    setExtraTaskSprintId(nonDraftSprints[0]?._id ?? '')
    setExtraTaskOpen(true)
  }

  const setExtraTaskField = (field: keyof DraftTask, value: string) => {
    setExtraTaskDraft(prev => {
      if (field === 'initiativeKey') {
        return { ...prev, initiativeKey: value, activityKey: '' }
      }
      return { ...prev, [field]: value }
    })
  }

  const handleCreateExtraTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isDraftTaskComplete(extraTaskDraft) || !extraTaskSprintId) return

    const init = initiatives.find(i => i.key === extraTaskDraft.initiativeKey)
    const act = init?.activities.find(a => a.key === extraTaskDraft.activityKey)

    setIsSavingExtraTask(true)
    try {
      const res = await fetch(`/api/weekly-sprints/${extraTaskSprintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-extra-task',
          description: extraTaskDraft.description.trim(),
          activityCategory: extraTaskDraft.activityCategory,
          initiativeKey: extraTaskDraft.initiativeKey,
          initiativeTitle: init?.title,
          activityKey: extraTaskDraft.activityKey,
          activityTitle: act?.title,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Failed to add extra task',
        )
      }
      setExtraTaskOpen(false)
      setExtraTaskDraft({ ...emptyDraftTask })
      setExtraTaskSprintId('')
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to add extra task')
    } finally {
      setIsSavingExtraTask(false)
    }
  }

  const validDraftTasks = draftTasks.filter(isDraftTaskComplete)

  const draftSprints = sprints.filter(s => s.status === 'draft')
  /** Submitted (awaiting / in review) and reviewed (all tasks decided) — both stay visible here. */
  const submittedOrReviewedSprints = sprints.filter(
    s => s.status === 'submitted' || s.status === 'reviewed',
  )

  const detailPanel = (
    <SprintTaskDetailsPanel
      task={selectedAcceptedTask}
      officers={officers}
      sectionId={sectionId}
      onUpdate={handleUpdateTask}
      onAddWorkSubmission={handleAddWorkSubmission}
      onApproveSubmission={handleApproveSubmission}
      onRejectSubmission={handleRejectSubmission}
      onRespondToSubmissionRejection={handleRespondToSubmissionRejection}
      isSaving={isSavingTask}
    />
  )

  return (
    <div className='space-y-4'>
      {!isLoaded ? (
        <div className='space-y-4'>
          <div className='h-9 w-full max-w-lg animate-pulse rounded-md bg-muted/50' />
          <div className='min-h-[200px] rounded-lg border border-dashed border-muted/60 bg-muted/10' />
        </div>
      ) : isOfficer ? (
        <>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
            <Button
              type='button'
              onClick={openExtraTaskDialog}
              variant='outline'
              size='sm'
              className='shrink-0'
              disabled={
                nonDraftSprints.length === 0 || initiatives.length === 0
              }
              title={
                nonDraftSprints.length === 0
                  ? 'No submitted or reviewed sprints yet'
                  : initiatives.length === 0
                    ? 'Add initiatives and measurable activities to the section contract first'
                    : undefined
              }
            >
              <Plus className='h-4 w-4' />
              Add extra task
            </Button>
          </div>
          <div className='mt-4 space-y-4'>
            {groupsForAcceptedUi.length === 0 ? (
              <Card>
                <CardContent className='pt-6'>
                  <p className='text-sm text-muted-foreground'>
                    {!viewerStaffId
                      ? 'Your account could not be matched to a staff record for this section. Ensure your sign-in email matches your staff profile.'
                      : 'No accepted tasks assigned to you yet.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              groupsForAcceptedUi.map(({ sprint, tasks }) => (
                <AcceptedSprintTasksCard
                  key={sprint._id}
                  sprint={sprint}
                  tasks={tasks}
                  officers={officers}
                  sectionId={sectionId}
                  selectedTaskKey={selectedTaskKey}
                  onSelectTask={setSelectedTaskKey}
                  onUpdateTask={handleUpdateTask}
                  isSaving={isSavingTask}
                />
              ))
            )}
            {panelPortalNode && createPortal(detailPanel, panelPortalNode)}
          </div>
        </>
      ) : (
        <Tabs value={sprintTab} onValueChange={setSprintTab}>
          <div className='flex items-center justify-between'>
            <TabsList>
              <TabsTrigger value='draft'>
                In draft
                {draftSprints.length > 0 && (
                  <Badge
                    variant='secondary'
                    className='ml-1.5 text-[10px] px-1.5 py-0'
                  >
                    {draftSprints.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value='in-review'>
                In Review
                {submittedOrReviewedSprints.length > 0 && (
                  <Badge
                    variant='secondary'
                    className='ml-1.5 text-[10px] px-1.5 py-0'
                  >
                    {submittedOrReviewedSprints.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value='accepted'>
                Accepted
                {tasksForAcceptedUi.length > 0 && (
                  <Badge
                    variant='secondary'
                    className='ml-1.5 text-[10px] px-1.5 py-0'
                  >
                    {tasksForAcceptedUi.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            {sprintTab === 'draft' ? (
              <Button onClick={openNewSprintDialog} size='sm'>
                <Plus className='h-4 w-4' />
                New Sprint
              </Button>
            ) : sprintTab === 'accepted' ? (
              <Button
                onClick={openExtraTaskDialog}
                variant='outline'
                type='button'
                size='sm'
                disabled={
                  nonDraftSprints.length === 0 || initiatives.length === 0
                }
                title={
                  nonDraftSprints.length === 0
                    ? 'No submitted or reviewed sprints yet'
                    : initiatives.length === 0
                      ? 'Add initiatives and measurable activities to the section contract first'
                      : undefined
                }
              >
                <Plus className='h-4 w-4' />
                Add extra task
              </Button>
            ) : null}
          </div>

          <TabsContent value='draft' className='space-y-4 mt-4'>
            {draftSprints.length === 0 ? (
              <Card>
                <CardContent className='pt-6'>
                  <p className='text-sm text-muted-foreground'>
                    No draft sprints. Create a new sprint to get started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              draftSprints.map(sprint => (
                <SprintCard
                  key={sprint._id}
                  sprint={sprint}
                  onSubmit={() => handleSubmitSprint(sprint._id)}
                  isSubmitting={isSubmitting === sprint._id}
                  onEditDraft={() => openEditDraftSprint(sprint)}
                  onReviewTask={(task, action) =>
                    openReview(sprint._id, task, action)
                  }
                />
              ))
            )}
          </TabsContent>

          <TabsContent value='in-review' className='space-y-4 mt-4'>
            {submittedOrReviewedSprints.length === 0 ? (
              <Card>
                <CardContent className='pt-6'>
                  <p className='text-sm text-muted-foreground'>
                    No submitted or reviewed sprints yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              submittedOrReviewedSprints.map(sprint => (
                <SprintCard
                  key={sprint._id}
                  sprint={sprint}
                  onSubmit={() => handleSubmitSprint(sprint._id)}
                  isSubmitting={isSubmitting === sprint._id}
                  onReviewTask={(task, action) =>
                    openReview(sprint._id, task, action)
                  }
                  onOpenRevise={task => openReviseDialog(sprint._id, task)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value='accepted' className='mt-4 space-y-4'>
            {groupsForAcceptedUi.length === 0 ? (
              <Card>
                <CardContent className='pt-6'>
                  <p className='text-sm text-muted-foreground'>
                    No accepted tasks yet. Review submitted sprints to accept
                    tasks.
                  </p>
                </CardContent>
              </Card>
            ) : (
              groupsForAcceptedUi.map(({ sprint, tasks }) => (
                <AcceptedSprintTasksCard
                  key={sprint._id}
                  sprint={sprint}
                  tasks={tasks}
                  officers={officers}
                  sectionId={sectionId}
                  selectedTaskKey={selectedTaskKey}
                  onSelectTask={setSelectedTaskKey}
                  onUpdateTask={handleUpdateTask}
                  isSaving={isSavingTask}
                />
              ))
            )}
            {panelPortalNode && createPortal(detailPanel, panelPortalNode)}
          </TabsContent>
        </Tabs>
      )}

      {/* Create Sprint Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={open => {
          setCreateOpen(open)
          if (!open) {
            setEditingSprintId(null)
            setDraftTasks([{ ...emptyDraftTask }])
            setSelectedWeekIdx('0')
          }
        }}
      >
        <DialogContent className='w-full max-w-lg max-h-[85vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>
              {editingSprintId ? 'Edit draft sprint' : 'New Weekly Sprint'}
            </DialogTitle>
            <DialogDescription>
              {editingSprintId
                ? 'Update the week and tasks for this draft. Submit when ready for review.'
                : 'Create a sprint plan for a week in the current financial year.'}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.stopPropagation()
              handleSaveSprint(e)
            }}
          >
            <div className='space-y-4 py-2 pb-4'>
              <div className='space-y-2'>
                <Label required>Week</Label>
                <Select
                  value={selectedWeekIdx}
                  onValueChange={setSelectedWeekIdx}
                  disabled={isSavingSprint}
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
                    <div
                      key={task._key ?? `new-${i}`}
                      className='space-y-2 rounded-md border p-3'
                    >
                      <div className='flex items-center gap-2'>
                        <span className='text-xs font-medium'>
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
                      <Label className='text-xs' required>
                        Description
                      </Label>
                      <Textarea
                        autoFocus={i === 0 && !editingSprintId}
                        className='text-xs'
                        placeholder='Describe the task...'
                        value={task.description}
                        onChange={e =>
                          updateTaskField(i, 'description', e.target.value)
                        }
                        rows={2}
                        disabled={isSavingSprint}
                      />
                      <div className='w-[100%] overflow-hidden space-y-1 p-1'>
                        <Label className='text-xs' required>
                          Activity category
                        </Label>
                        <Select
                          value={task.activityCategory || undefined}
                          onValueChange={v =>
                            updateTaskField(i, 'activityCategory', v)
                          }
                          disabled={isSavingSprint}
                        >
                          <SelectTrigger className='w-[100%] text-xs overflow-hidden'>
                            <SelectValue placeholder='Select activity category' />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTIVITY_CATEGORIES.map(c => (
                              <SelectItem
                                key={c.value}
                                value={c.value}
                                className='text-xs'
                              >
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {initiatives.length > 0 ? (
                        <div className='grid gap-2'>
                          <div className='w-[100%] overflow-hidden space-y-1 p-1'>
                            <Label className='text-xs' required>
                              Related initiative
                            </Label>
                            <Select
                              value={task.initiativeKey || undefined}
                              onValueChange={v =>
                                updateTaskField(i, 'initiativeKey', v)
                              }
                              disabled={isSavingSprint}
                            >
                              <SelectTrigger className='w-[100%] text-xs overflow-hidden'>
                                <SelectValue placeholder='Select related initiative' />
                              </SelectTrigger>
                              <SelectContent className='max-w-[var(--radix-select-trigger-width)]'>
                                {initiatives.map(ini => (
                                  <SelectItem
                                    key={ini.key}
                                    value={ini.key}
                                    className='text-xs truncate'
                                  >
                                    {ini.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className='w-[100%] overflow-hidden space-y-1 p-1'>
                            <Label className='text-xs' required>
                              Related measurable activity
                            </Label>
                            <Select
                              value={task.activityKey || undefined}
                              onValueChange={v =>
                                updateTaskField(i, 'activityKey', v)
                              }
                              disabled={isSavingSprint || !task.initiativeKey}
                            >
                              <SelectTrigger className='w-[100%] text-xs overflow-hidden'>
                                <SelectValue placeholder='Select related measurable activity' />
                              </SelectTrigger>
                              <SelectContent className='max-w-[var(--radix-select-trigger-width)]'>
                                {(selectedInit?.activities ?? []).map(act => (
                                  <SelectItem
                                    key={act.key}
                                    value={act.key}
                                    className='text-xs whitespace-normal break-words'
                                  >
                                    {act.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ) : (
                        <p className='text-xs text-muted-foreground rounded-md border border-dashed p-2'>
                          Add initiatives and measurable activities to the
                          section contract before you can link sprint tasks.
                        </p>
                      )}
                    </div>
                  )
                })}
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={addTask}
                  disabled={isSavingSprint}
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
                disabled={isSavingSprint}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={
                  isSavingSprint ||
                  validDraftTasks.length === 0 ||
                  initiatives.length === 0
                }
              >
                {isSavingSprint ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Saving...
                  </>
                ) : editingSprintId ? (
                  'Save changes'
                ) : (
                  'Create Sprint'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={extraTaskOpen}
        onOpenChange={open => {
          setExtraTaskOpen(open)
          if (!open) {
            setExtraTaskDraft({ ...emptyDraftTask })
            setExtraTaskSprintId('')
          }
        }}
      >
        <DialogContent className='w-full max-w-lg max-h-[85vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Add extra task</DialogTitle>
            <DialogDescription>
              Add an accepted task to an existing sprint week
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateExtraTask}>
            <div className='space-y-3 py-2 pb-4'>
              <div className='space-y-2'>
                <Label required>Week</Label>
                <Select
                  value={extraTaskSprintId}
                  onValueChange={setExtraTaskSprintId}
                  disabled={isSavingExtraTask}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select week' />
                  </SelectTrigger>
                  <SelectContent>
                    {nonDraftSprints.map(s => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.weekLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Label className='text-xs' required>
                Description
              </Label>
              <Textarea
                className='text-xs'
                placeholder='Describe the task...'
                value={extraTaskDraft.description}
                onChange={e => setExtraTaskField('description', e.target.value)}
                rows={3}
                disabled={isSavingExtraTask}
              />
              <div className='w-[100%] overflow-hidden space-y-1 p-1'>
                <Label className='text-xs' required>
                  Activity category
                </Label>
                <Select
                  value={extraTaskDraft.activityCategory || undefined}
                  onValueChange={v => setExtraTaskField('activityCategory', v)}
                  disabled={isSavingExtraTask}
                >
                  <SelectTrigger className='w-[100%] text-xs overflow-hidden'>
                    <SelectValue placeholder='Select activity category' />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_CATEGORIES.map(c => (
                      <SelectItem
                        key={c.value}
                        value={c.value}
                        className='text-xs'
                      >
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {initiatives.length > 0 ? (
                <div className='grid gap-2'>
                  <div className='w-[100%] overflow-hidden space-y-1 p-1'>
                    <Label className='text-xs' required>
                      Related initiative
                    </Label>
                    <Select
                      value={extraTaskDraft.initiativeKey || undefined}
                      onValueChange={v => setExtraTaskField('initiativeKey', v)}
                      disabled={isSavingExtraTask}
                    >
                      <SelectTrigger className='w-[100%] text-xs overflow-hidden'>
                        <SelectValue placeholder='Select related initiative' />
                      </SelectTrigger>
                      <SelectContent className='max-w-[var(--radix-select-trigger-width)]'>
                        {initiatives.map(ini => (
                          <SelectItem
                            key={ini.key}
                            value={ini.key}
                            className='text-xs truncate'
                          >
                            {ini.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='w-[100%] overflow-hidden space-y-1 p-1'>
                    <Label className='text-xs' required>
                      Related measurable activity
                    </Label>
                    <Select
                      value={extraTaskDraft.activityKey || undefined}
                      onValueChange={v => setExtraTaskField('activityKey', v)}
                      disabled={
                        isSavingExtraTask || !extraTaskDraft.initiativeKey
                      }
                    >
                      <SelectTrigger className='w-[100%] text-xs overflow-hidden'>
                        <SelectValue placeholder='Select related measurable activity' />
                      </SelectTrigger>
                      <SelectContent className='max-w-[var(--radix-select-trigger-width)]'>
                        {(
                          initiatives.find(
                            i => i.key === extraTaskDraft.initiativeKey,
                          )?.activities ?? []
                        ).map(act => (
                          <SelectItem
                            key={act.key}
                            value={act.key}
                            className='text-xs whitespace-normal break-words'
                          >
                            {act.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <p className='text-xs text-muted-foreground rounded-md border border-dashed p-2'>
                  Add initiatives to the section contract before linking this
                  task.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setExtraTaskOpen(false)}
                disabled={isSavingExtraTask}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={
                  isSavingExtraTask ||
                  !isDraftTaskComplete(extraTaskDraft) ||
                  !extraTaskSprintId ||
                  initiatives.length === 0
                }
              >
                {isSavingExtraTask ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Saving...
                  </>
                ) : (
                  'Add task'
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

      <Dialog
        open={reviseOpen}
        onOpenChange={open => {
          setReviseOpen(open)
          if (!open) {
            setReviseTaskDraft(null)
            setReviseSprintId('')
            setReviseManagerFeedback('')
          }
        }}
      >
        <DialogContent className='w-full max-w-lg max-h-[85vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Revise task</DialogTitle>
            <DialogDescription>
              Edit this task and resubmit it for manager review.
              {reviseManagerFeedback ? (
                <span className='block mt-3 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900 dark:bg-orange-950/40 dark:border-orange-900/60 dark:text-orange-100'>
                  <span className='font-medium'>Feedback: </span>
                  {reviseManagerFeedback}
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {reviseTaskDraft && (
            <form onSubmit={handleSaveRevise}>
              <div className='space-y-3 py-2 pb-4'>
                <Label className='text-xs' required>
                  Description
                </Label>
                <Textarea
                  className='text-xs'
                  placeholder='Describe the task...'
                  value={reviseTaskDraft.description}
                  onChange={e => setReviseField('description', e.target.value)}
                  rows={3}
                  disabled={isSavingRevise}
                />
                <div className='w-[100%] overflow-hidden space-y-1 p-1'>
                  <Label className='text-xs' required>
                    Activity category
                  </Label>
                  <Select
                    value={reviseTaskDraft.activityCategory || undefined}
                    onValueChange={v => setReviseField('activityCategory', v)}
                    disabled={isSavingRevise}
                  >
                    <SelectTrigger className='w-[100%] text-xs overflow-hidden'>
                      <SelectValue placeholder='Select activity category' />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_CATEGORIES.map(c => (
                        <SelectItem
                          key={c.value}
                          value={c.value}
                          className='text-xs'
                        >
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {initiatives.length > 0 ? (
                  <div className='grid gap-2'>
                    <div className='w-[100%] overflow-hidden space-y-1 p-1'>
                      <Label className='text-xs' required>
                        Related initiative
                      </Label>
                      <Select
                        value={reviseTaskDraft.initiativeKey || undefined}
                        onValueChange={v => setReviseField('initiativeKey', v)}
                        disabled={isSavingRevise}
                      >
                        <SelectTrigger className='w-[100%] text-xs overflow-hidden'>
                          <SelectValue placeholder='Select related initiative' />
                        </SelectTrigger>
                        <SelectContent className='max-w-[var(--radix-select-trigger-width)]'>
                          {initiatives.map(ini => (
                            <SelectItem
                              key={ini.key}
                              value={ini.key}
                              className='text-xs truncate'
                            >
                              {ini.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className='w-[100%] overflow-hidden space-y-1 p-1'>
                      <Label className='text-xs' required>
                        Related measurable activity
                      </Label>
                      <Select
                        value={reviseTaskDraft.activityKey || undefined}
                        onValueChange={v => setReviseField('activityKey', v)}
                        disabled={
                          isSavingRevise || !reviseTaskDraft.initiativeKey
                        }
                      >
                        <SelectTrigger className='w-[100%] text-xs overflow-hidden'>
                          <SelectValue placeholder='Select related measurable activity' />
                        </SelectTrigger>
                        <SelectContent className='max-w-[var(--radix-select-trigger-width)]'>
                          {(
                            initiatives.find(
                              i => i.key === reviseTaskDraft.initiativeKey,
                            )?.activities ?? []
                          ).map(act => (
                            <SelectItem
                              key={act.key}
                              value={act.key}
                              className='text-xs whitespace-normal break-words'
                            >
                              {act.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <p className='text-xs text-muted-foreground rounded-md border border-dashed p-2'>
                    Add initiatives to the section contract before linking this
                    task.
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setReviseOpen(false)}
                  disabled={isSavingRevise}
                >
                  Cancel
                </Button>
                <Button
                  type='submit'
                  disabled={
                    isSavingRevise ||
                    !reviseTaskDraft ||
                    !isDraftTaskComplete(reviseTaskDraft) ||
                    initiatives.length === 0
                  }
                >
                  {isSavingRevise ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Saving...
                    </>
                  ) : (
                    'Resubmit for review'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AcceptedSprintTasksCard({
  sprint,
  tasks,
  officers,
  sectionId,
  selectedTaskKey,
  onSelectTask,
  onUpdateTask,
  isSaving,
}: {
  sprint: WeeklySprint
  tasks: AcceptedSprintTask[]
  officers: Officer[]
  sectionId: string
  selectedTaskKey: string | null
  onSelectTask: (key: string | null) => void
  onUpdateTask: (
    sprintId: string,
    taskKey: string,
    updates: Record<string, unknown>,
  ) => void
  isSaving: boolean
}) {
  const [open, setOpen] = React.useState(true)

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between gap-2'>
            <div className='space-y-1 min-w-0'>
              <CardTitle className='text-base'>{sprint.weekLabel}</CardTitle>
              <p className='text-xs text-muted-foreground'>
                {sprint.supervisor?.fullName &&
                  `By ${sprint.supervisor.fullName} · `}
                {tasks.length} accepted task{tasks.length === 1 ? '' : 's'}
              </p>
            </div>
            <CollapsibleTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                className='h-8 w-8 p-0 shrink-0'
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className='pt-0'>
            <SprintTasksTable
              tasks={tasks}
              officers={officers}
              sectionId={sectionId}
              selectedTaskKey={selectedTaskKey}
              onSelectTask={onSelectTask}
              onUpdateTask={onUpdateTask}
              isSaving={isSaving}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

function SprintCard({
  sprint,
  onSubmit,
  onEditDraft,
  isSubmitting,
  onReviewTask,
  onOpenRevise,
}: {
  sprint: WeeklySprint
  onSubmit: () => void
  onEditDraft?: () => void
  isSubmitting: boolean
  onReviewTask: (task: SprintTask, action: string) => void
  /** Open dialog to edit this task and resubmit for manager review. */
  onOpenRevise?: (task: SprintTask) => void
}) {
  const [open, setOpen] = React.useState(true)
  const tasks = sprint.tasks || []
  const accepted = tasks.filter(t => t.status === 'accepted').length
  const total = tasks.length

  const hasRevisionsRequested = tasks.some(
    t => t.status === 'revisions_requested',
  )

  const sprintStatusBadge =
    sprint.status !== 'draft' && hasRevisionsRequested
      ? { label: 'Review in progress', variant: 'default' as const }
      : {
          draft: { label: 'Draft', variant: 'secondary' as const },
          submitted: {
            label: 'Submitted for Review',
            variant: 'default' as const,
          },
          reviewed: { label: 'Review complete', variant: 'outline' as const },
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
                <>
                  {onEditDraft && (
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={onEditDraft}
                      disabled={isSubmitting}
                    >
                      <Pencil className='h-4 w-4' />
                      Edit
                    </Button>
                  )}
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
                </>
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
                const config = STATUS_CONFIG[task.status] ?? {
                  label: task.status ?? 'Unknown',
                  variant: 'secondary' as const,
                }
                const canReview =
                  sprint.status === 'submitted' && task.status === 'pending'
                const canRevise =
                  task.status === 'revisions_requested' &&
                  (sprint.status === 'submitted' ||
                    sprint.status === 'reviewed') &&
                  Boolean(onOpenRevise)
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
                      {task.status === 'rejected' && (
                        <p className='text-xs text-destructive mt-1'>
                          Rejected — not included in this sprint plan.
                        </p>
                      )}
                      {task.status === 'revisions_requested' &&
                        task.revisionReason && (
                          <p className='text-xs text-orange-600 dark:text-orange-400 mt-1'>
                            Revision reason: {task.revisionReason}
                          </p>
                        )}
                    </div>
                    <div className='flex flex-col items-end gap-1.5 shrink-0'>
                      {canRevise && (
                        <Button
                          type='button'
                          size='sm'
                          variant='secondary'
                          className='h-8'
                          onClick={() => onOpenRevise?.(task)}
                        >
                          Revise
                        </Button>
                      )}
                      {canReview && (
                        <div className='flex items-center gap-1'>
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
