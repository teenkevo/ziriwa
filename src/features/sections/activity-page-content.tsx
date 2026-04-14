'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { endOfMonth, endOfQuarter, endOfWeek, format } from 'date-fns'
import {
  CalendarIcon,
  Check,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { measurableActivityNumber } from '@/lib/contract-numbering'
import {
  getExpectedPeriodsForTask,
  getPeriodInfo,
  type ReportingFrequency,
} from '@/lib/reporting-periods'
import { cn } from '@/lib/utils'
import type {
  SectionContract,
  DetailedTask as DetailedTaskType,
} from '@/sanity/lib/section-contracts/get-section-contract'
import type { MeasurableActivity } from '@/sanity/lib/section-contracts/get-section-contract'
import type { Officer } from '@/features/sections/components/officer-switcher'
import {
  DetailedTasksTable,
  type TaskRow,
} from '@/features/sections/components/detailed-tasks-table'
import { TaskDetailsPanel } from '@/features/sections/components/task-details-panel'
import { SubmitForReviewDialog } from '@/features/sections/components/submit-for-review-dialog'
import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'

type Section = {
  _id: string
  name: string
  slug?: { current: string }
  division?: { _id: string; name: string; slug?: { current: string } }
}

function normalizeTasks(
  raw: (DetailedTaskType | string)[] | undefined,
): TaskRow[] {
  if (!raw?.length) return []
  return raw.map((t, i) => {
    const mapStatus = (s: string | undefined) => {
      const status = s ?? 'to_do'
      const legacy: Record<string, string> = {
        not_started: 'to_do',
        completed: 'done',
      }
      return legacy[status] ?? status
    }
    if (typeof t === 'string') {
      return {
        _key: `task-${i}`,
        task: t,
        priority: 'medium',
        assignee: null,
        status: 'to_do',
        targetDate: undefined,
        reportingFrequency: 'n/a' as const,
        periodDeliverables: [],
        deliverable: [],
        inputsReviewThread: [],
        deliverableReviewThread: [],
      }
    }
    return {
      _key: t._key ?? `task-${i}`,
      task: t.task ?? '',
      priority: t.priority ?? 'medium',
      assignee: t.assignee?._id ?? null,
      inputs: t.inputs ?? undefined,
      inputsReviewThread: t.inputsReviewThread ?? [],
      deliverableReviewThread: t.deliverableReviewThread ?? [],
      status: mapStatus(t.status),
      targetDate: t.targetDate ?? undefined,
      reportingFrequency: (t.reportingFrequency ?? 'n/a') as
        | 'weekly'
        | 'monthly'
        | 'quarterly'
        | 'n/a',
      expectedDeliverable: t.expectedDeliverable ?? undefined,
      reportingPeriodStart: t.reportingPeriodStart ?? undefined,
      periodDeliverables: t.periodDeliverables ?? [],
      deliverable: t.deliverable ?? [],
    }
  })
}

function tasksToPayload(rows: TaskRow[]) {
  return rows.map(r => ({
    _key: r._key,
    task: r.task,
    priority: r.priority,
    assignee: r.assignee,
    inputs:
      r.inputs?.file?.asset?._id
        ? {
            file: { asset: { _ref: r.inputs.file.asset._id } },
            submittedAt: r.inputs.submittedAt ?? new Date().toISOString(),
          }
        : undefined,
    inputsReviewThread: (r.inputsReviewThread ?? []).map(entry => {
      const assetId = entry.file?.asset?._id
      const authorId =
        typeof entry.author === 'string'
          ? entry.author
          : entry.author?._id
      return {
        _key: entry._key,
        author: authorId,
        role: entry.role,
        action: entry.action,
        message: entry.message,
        createdAt: entry.createdAt,
        ...(assetId && {
          file: { asset: { _ref: assetId } },
        }),
      }
    }),
    deliverableReviewThread: (r.deliverableReviewThread ?? []).map(entry => {
      const assetId = entry.file?.asset?._id
      const authorId =
        typeof entry.author === 'string'
          ? entry.author
          : entry.author?._id
      return {
        _key: entry._key,
        author: authorId,
        role: entry.role,
        action: entry.action,
        message: entry.message,
        createdAt: entry.createdAt,
        ...(assetId && {
          file: { asset: { _ref: assetId } },
        }),
      }
    }),
    status: r.status,
    targetDate: r.targetDate,
    reportingFrequency: r.reportingFrequency ?? 'n/a',
    expectedDeliverable: r.expectedDeliverable,
    reportingPeriodStart: r.reportingPeriodStart,
    periodDeliverables: (r.periodDeliverables ?? []).map(pd => ({
      _key: pd._key,
      periodKey: pd.periodKey,
      status: pd.status,
      submittedAt: pd.submittedAt,
      deliverable: (pd.deliverable ?? [])
        .filter(e => e.file?.asset?._id)
        .map(e => ({
          _key: e._key,
          file: { asset: { _ref: e.file!.asset!._id } },
          tag: e.tag === 'main' ? 'main' : 'support',
          locked: e.locked ?? false,
        })),
      deliverableReviewThread: (pd.deliverableReviewThread ?? []).map(
        entry => {
          const assetId = entry.file?.asset?._id
          const authorId =
            typeof entry.author === 'string'
              ? entry.author
              : entry.author?._id
          return {
            _key: entry._key,
            author: authorId
              ? { _type: 'reference' as const, _ref: authorId }
              : undefined,
            role: entry.role,
            action: entry.action,
            message: entry.message,
            createdAt: entry.createdAt,
            ...(assetId && {
              file: { asset: { _ref: assetId } },
            }),
          }
        },
      ),
    })),
    deliverable: (r.deliverable ?? [])
      .filter(e => e.file?.asset?._id)
      .map(e => ({
        _key: e._key,
        file: { asset: { _ref: e.file!.asset!._id } },
        tag: e.tag === 'main' ? 'main' : 'support',
        locked: e.locked ?? false,
      })),
  }))
}

interface ActivityPageContentProps {
  section: Section
  sectionContract: SectionContract
  activity: MeasurableActivity
  objectiveIndex: number
  initiativeIndex: number
  activityIndex: number
  officers: Officer[]
}

export function ActivityPageContent({
  section,
  sectionContract,
  activity,
  objectiveIndex,
  initiativeIndex,
  activityIndex,
  officers,
}: ActivityPageContentProps) {
  const router = useRouter()
  const sectionSlug = section.slug?.current ?? ''
  const sectionHref = `/sections/${sectionSlug}`

  const activityCode = measurableActivityNumber(
    sectionContract.objectives?.[objectiveIndex]?.initiatives?.[initiativeIndex]
      ?.code ??
      `${sectionContract.objectives?.[objectiveIndex]?.code ?? String(objectiveIndex + 1)}.${initiativeIndex + 1}`,
    activity.activityType,
    (
      sectionContract.objectives?.[objectiveIndex]?.initiatives?.[
        initiativeIndex
      ]?.measurableActivities ?? []
    )
      .slice(0, activityIndex)
      .filter(a => a.activityType === activity.activityType).length + 1,
  )

  const isKPI = activity.activityType === 'kpi'

  const [title, setTitle] = React.useState(activity.title)
  const [aim, setAim] = React.useState(activity.aim ?? '')
  const [targetDate, setTargetDate] = React.useState(activity.targetDate ?? '')
  const [status, setStatus] = React.useState(activity.status ?? 'not_started')
  const [reportingFrequency, setReportingFrequency] = React.useState<
    'weekly' | 'monthly' | 'quarterly' | 'n/a'
  >(activity.reportingFrequency ?? 'n/a')
  const [tasks, setTasks] = React.useState<TaskRow[]>(() =>
    normalizeTasks(activity.tasks),
  )
  const [newTask, setNewTask] = React.useState('')
  const [isSavingActivity, setIsSavingActivity] = React.useState(false)
  const [isSavingTasks, setIsSavingTasks] = React.useState(false)
  const [isAddingTask, setIsAddingTask] = React.useState(false)
  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [titleBeforeEdit, setTitleBeforeEdit] = React.useState('')
  const [isEditingAim, setIsEditingAim] = React.useState(false)
  const [aimBeforeEdit, setAimBeforeEdit] = React.useState('')
  const [datePopoverOpen, setDatePopoverOpen] = React.useState(false)
  const [isSavingDate, setIsSavingDate] = React.useState(false)
  const [isSavingStatus, setIsSavingStatus] = React.useState(false)
  const [isSavingReportingFrequency, setIsSavingReportingFrequency] =
    React.useState(false)
  const titleEditRef = React.useRef<HTMLDivElement>(null)
  const aimEditRef = React.useRef<HTMLDivElement>(null)

  const breadcrumbItems = React.useMemo(() => {
    const out: { label: string; href?: string }[] = [
      { label: 'Departments', href: '/departments' },
    ]
    const divSlug = section.division?.slug?.current
    if (divSlug) {
      out.push({
        label: section.division?.name ?? 'Division',
        href: `/divisions/${divSlug}`,
      })
    }
    out.push({ label: section.name, href: sectionHref })
    out.push({
      label: title.trim() || activity.title || 'Activity',
    })
    return out
  }, [
    section.division,
    section.name,
    sectionHref,
    title,
    activity.title,
  ])

  useRegisterPageBreadcrumbs(breadcrumbItems)

  const handleConfirmTitle = React.useCallback(async () => {
    if (!title.trim()) return
    setIsSavingActivity(true)
    try {
      const res = await fetch(`/api/section-contracts/${sectionContract._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'updateActivity',
          payload: {
            objectiveIndex,
            initiativeIndex,
            activityIndex,
            title: title.trim(),
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }
      router.refresh()
      setIsEditingTitle(false)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSavingActivity(false)
    }
  }, [
    title,
    sectionContract._id,
    objectiveIndex,
    initiativeIndex,
    activityIndex,
    router,
  ])

  const handleCancelTitle = React.useCallback(() => {
    setTitle(titleBeforeEdit)
    setIsEditingTitle(false)
  }, [titleBeforeEdit])

  const handleConfirmAim = React.useCallback(async () => {
    setIsSavingActivity(true)
    try {
      const res = await fetch(`/api/section-contracts/${sectionContract._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'updateActivity',
          payload: {
            objectiveIndex,
            initiativeIndex,
            activityIndex,
            aim: aim.trim(),
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }
      router.refresh()
      setIsEditingAim(false)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSavingActivity(false)
    }
  }, [
    aim,
    sectionContract._id,
    objectiveIndex,
    initiativeIndex,
    activityIndex,
    router,
  ])

  const handleCancelAim = React.useCallback(() => {
    setAim(aimBeforeEdit)
    setIsEditingAim(false)
  }, [aimBeforeEdit])

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        isEditingTitle &&
        titleEditRef.current &&
        !titleEditRef.current.contains(target)
      ) {
        handleCancelTitle()
      }
      if (
        isEditingAim &&
        aimEditRef.current &&
        !aimEditRef.current.contains(target)
      ) {
        handleCancelAim()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isEditingTitle, isEditingAim, handleCancelTitle, handleCancelAim])

  const handleTargetDateChange = React.useCallback(
    async (date: Date | undefined) => {
      const newDate = date ? format(date, 'yyyy-MM-dd') : ''
      setTargetDate(newDate)
      setDatePopoverOpen(false)
      if (!date) return
      setIsSavingDate(true)
      setIsSavingActivity(true)
      try {
        const res = await fetch(
          `/api/section-contracts/${sectionContract._id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              op: 'updateActivity',
              payload: {
                objectiveIndex,
                initiativeIndex,
                activityIndex,
                targetDate: newDate,
              },
            }),
          },
        )
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to save')
        }
        router.refresh()
      } catch (err) {
        console.error(err)
        setTargetDate(targetDate)
        alert(err instanceof Error ? err.message : 'Failed to save')
      } finally {
        setIsSavingDate(false)
        setIsSavingActivity(false)
      }
    },
    [
      sectionContract._id,
      objectiveIndex,
      initiativeIndex,
      activityIndex,
      router,
      targetDate,
    ],
  )

  const handleStatusChange = React.useCallback(
    async (value: string) => {
      setStatus(value as 'not_started' | 'in_progress' | 'completed')
      setIsSavingStatus(true)
      setIsSavingActivity(true)
      try {
        const res = await fetch(
          `/api/section-contracts/${sectionContract._id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              op: 'updateActivity',
              payload: {
                objectiveIndex,
                initiativeIndex,
                activityIndex,
                status: value,
              },
            }),
          },
        )
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to save')
        }
        router.refresh()
      } catch (err) {
        console.error(err)
        setStatus(status)
        alert(err instanceof Error ? err.message : 'Failed to save')
      } finally {
        setIsSavingStatus(false)
        setIsSavingActivity(false)
      }
    },
    [
      sectionContract._id,
      objectiveIndex,
      initiativeIndex,
      activityIndex,
      router,
      status,
    ],
  )

  const handleReportingFrequencyChange = React.useCallback(
    async (value: string) => {
      const v = value as 'weekly' | 'monthly' | 'quarterly' | 'n/a'
      setReportingFrequency(v)
      setIsSavingReportingFrequency(true)
      setIsSavingActivity(true)
      try {
        const res = await fetch(
          `/api/section-contracts/${sectionContract._id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              op: 'updateActivity',
              payload: {
                objectiveIndex,
                initiativeIndex,
                activityIndex,
                reportingFrequency: v,
              },
            }),
          },
        )
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to save')
        }
        router.refresh()
      } catch (err) {
        console.error(err)
        setReportingFrequency(reportingFrequency)
        alert(err instanceof Error ? err.message : 'Failed to save')
      } finally {
        setIsSavingReportingFrequency(false)
        setIsSavingActivity(false)
      }
    },
    [
      sectionContract._id,
      objectiveIndex,
      initiativeIndex,
      activityIndex,
      router,
      reportingFrequency,
    ],
  )

  const handlePeriodicReportingToggle = React.useCallback(
    async (checked: boolean) => {
      const newValue: 'weekly' | 'monthly' | 'quarterly' | 'n/a' = checked
        ? 'monthly'
        : 'n/a'
      setReportingFrequency(newValue)
      setIsSavingReportingFrequency(true)
      setIsSavingActivity(true)
      try {
        const res = await fetch(
          `/api/section-contracts/${sectionContract._id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              op: 'updateActivity',
              payload: {
                objectiveIndex,
                initiativeIndex,
                activityIndex,
                reportingFrequency: newValue,
              },
            }),
          },
        )
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to save')
        }
        router.refresh()
      } catch (err) {
        console.error(err)
        setReportingFrequency(reportingFrequency)
        alert(err instanceof Error ? err.message : 'Failed to save')
      } finally {
        setIsSavingReportingFrequency(false)
        setIsSavingActivity(false)
      }
    },
    [
      sectionContract._id,
      objectiveIndex,
      initiativeIndex,
      activityIndex,
      router,
      reportingFrequency,
    ],
  )

  const saveTasks = React.useCallback(
    async (tasksToSave: TaskRow[]) => {
      setIsSavingTasks(true)
      try {
        const payload = tasksToPayload(tasksToSave)
        const res = await fetch(
          `/api/section-contracts/${sectionContract._id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              op: 'updateActivityTasks',
              payload: {
                objectiveIndex,
                initiativeIndex,
                activityIndex,
                tasks: payload,
              },
            }),
          },
        )
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to save tasks')
        }
        router.refresh()
      } catch (err) {
        console.error(err)
        alert(err instanceof Error ? err.message : 'Failed to save tasks')
        throw err
      } finally {
        setIsSavingTasks(false)
      }
    },
    [
      sectionContract._id,
      objectiveIndex,
      initiativeIndex,
      activityIndex,
      router,
    ],
  )

  const saveTimeoutRef = React.useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined)
  const isInitialMount = React.useRef(true)
  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      saveTasks(tasks).catch(() => {})
    }, 500)
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [tasks, saveTasks])

  const [selectedTaskKey, setSelectedTaskKey] = React.useState<string | null>(
    null,
  )
  const [pendingSubmitForReviewTaskKey, setPendingSubmitForReviewTaskKey] =
    React.useState<string | null>(null)

  const selectedTask = React.useMemo(
    () => tasks.find(t => (t._key ?? '') === selectedTaskKey) ?? null,
    [tasks, selectedTaskKey],
  )

  const updateTaskByKey = React.useCallback(
    (key: string, updates: Partial<TaskRow>) => {
      setTasks(prev =>
        prev.map(row =>
          (row._key ?? '') === key ? { ...row, ...updates } : row,
        ),
      )
    },
    [],
  )

  const handleAddDeliverable = React.useCallback(
    async (file: File, tag: 'support' | 'main') => {
      if (!selectedTaskKey) return
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/sanity/upload', {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Upload failed')
      }
      const data = (await res.json()) as {
        id: string
        url?: string
        originalFilename?: string
        size?: number
        mimeType?: string
      }
      const newEv = {
        _key: `ev-${Date.now()}`,
        file: {
          asset: {
            _id: data.id,
            url: data.url,
            originalFilename: data.originalFilename,
            size: data.size,
            mimeType: data.mimeType ?? 'application/pdf',
          },
        },
        tag,
      }
      const existing = selectedTask?.deliverable ?? []
      const updated =
        tag === 'main'
          ? [...existing.filter(e => (e.tag ?? 'support') !== 'main'), newEv]
          : [...existing, newEv]
      const isMainAndInProgress =
        tag === 'main' && selectedTask?.status === 'in_progress'
      updateTaskByKey(selectedTaskKey, {
        deliverable: updated,
        ...(isMainAndInProgress && { status: 'delivered' }),
      })
      if (isMainAndInProgress) {
        const keyToShow = selectedTaskKey
        setTimeout(() => setPendingSubmitForReviewTaskKey(keyToShow), 0)
      }
    },
    [selectedTaskKey, selectedTask, updateTaskByKey],
  )

  const handleRemoveDeliverable = React.useCallback(
    (itemKey: string) => {
      if (!selectedTaskKey) return
      const item = (selectedTask?.deliverable ?? []).find(
        e => (e._key ?? '') === itemKey,
      )
      if (item?.locked) return
      const filtered = (selectedTask?.deliverable ?? []).filter(
        e => (e._key ?? '') !== itemKey,
      )
      const isRemovingMain = (item?.tag ?? 'support') === 'main'
      const statusUpdate =
        isRemovingMain &&
        (selectedTask?.status === 'delivered' ||
          selectedTask?.status === 'in_review')
          ? { status: 'in_progress' as const }
          : {}
      updateTaskByKey(selectedTaskKey, {
        deliverable: filtered,
        ...statusUpdate,
      })
    },
    [selectedTaskKey, selectedTask, updateTaskByKey],
  )

  const handleSubmitForReview = React.useCallback(
    async (key: string) => {
      const task = tasks.find(t => (t._key ?? '') === key)
      if (!task) return
      const mainEv = (task.deliverable ?? []).find(
        e => (e.tag ?? 'support') === 'main',
      )
      if (!mainEv) return
      const lockedDeliverable = (task.deliverable ?? []).map(e =>
        (e.tag ?? 'support') === 'main' ? { ...e, locked: true } : e,
      )
      const submitEntry = {
        _key: `dr-${Date.now()}`,
        action: 'submit' as const,
        role: 'officer' as const,
        createdAt: new Date().toISOString(),
      }
      const updatedTasks = tasks.map(row =>
        (row._key ?? '') === key
          ? {
              ...row,
              deliverable: lockedDeliverable,
              status: 'in_review',
              deliverableReviewThread: [
                ...(row.deliverableReviewThread ?? []),
                submitEntry,
              ],
            }
          : row,
      )
      setTasks(updatedTasks)
      await saveTasks(updatedTasks)
      setPendingSubmitForReviewTaskKey(null)
    },
    [tasks, saveTasks],
  )

  const handleAddInputs = React.useCallback(
    async (file: File) => {
      if (!selectedTaskKey) return
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/sanity/upload', {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Upload failed')
      }
      const data = (await res.json()) as {
        id: string
        url?: string
        originalFilename?: string
        size?: number
        mimeType?: string
      }
      const fileAsset = {
        _id: data.id,
        url: data.url,
        originalFilename: data.originalFilename,
        size: data.size,
        mimeType: data.mimeType ?? 'application/pdf',
      }
      const newEntry = {
        _key: `th-${Date.now()}`,
        action: 'submit' as const,
        role: 'officer' as const,
        createdAt: new Date().toISOString(),
        file: { asset: fileAsset },
      }
      updateTaskByKey(selectedTaskKey, {
        inputs: {
          file: { asset: fileAsset },
          submittedAt: new Date().toISOString(),
        },
        status: 'inputs_submitted',
        inputsReviewThread: [
          ...(selectedTask?.inputsReviewThread ?? []),
          newEntry,
        ],
      })
    },
    [selectedTaskKey, selectedTask, updateTaskByKey],
  )

  const handleApproveInputs = React.useCallback(
    (reason?: string) => {
      if (!selectedTaskKey) return
      const newEntry = {
        _key: `th-${Date.now()}`,
        action: 'approve' as const,
        role: 'supervisor' as const,
        ...(reason && { message: reason }),
        createdAt: new Date().toISOString(),
      }
      updateTaskByKey(selectedTaskKey, {
        status: 'in_progress',
        inputsReviewThread: [
          ...(selectedTask?.inputsReviewThread ?? []),
          newEntry,
        ],
      })
    },
    [selectedTaskKey, selectedTask, updateTaskByKey],
  )

  const handleRejectInputs = React.useCallback(
    (message: string) => {
      if (!selectedTaskKey) return
      const newEntry = {
        _key: `th-${Date.now()}`,
        action: 'reject' as const,
        role: 'supervisor' as const,
        message: message.trim(),
        createdAt: new Date().toISOString(),
      }
      updateTaskByKey(selectedTaskKey, {
        inputsReviewThread: [
          ...(selectedTask?.inputsReviewThread ?? []),
          newEntry,
        ],
      })
    },
    [selectedTaskKey, selectedTask, updateTaskByKey],
  )

  const handleRespondToRejection = React.useCallback(
    async (message: string, replacementFile?: File) => {
      if (!selectedTaskKey) return
      let inputs = selectedTask?.inputs
      let fileAsset: {
        _id: string
        url?: string
        originalFilename?: string
        size?: number
        mimeType?: string
      } | undefined
      if (replacementFile) {
        const fd = new FormData()
        fd.append('file', replacementFile)
        const res = await fetch('/api/sanity/upload', {
          method: 'POST',
          body: fd,
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error((data as { error?: string }).error ?? 'Upload failed')
        }
        const data = (await res.json()) as {
          id: string
          url?: string
          originalFilename?: string
          size?: number
          mimeType?: string
        }
        fileAsset = {
          _id: data.id,
          url: data.url,
          originalFilename: data.originalFilename,
          size: data.size,
          mimeType: data.mimeType ?? 'application/pdf',
        }
        inputs = {
          file: { asset: fileAsset },
          submittedAt: new Date().toISOString(),
        }
      }
      const newEntry = {
        _key: `th-${Date.now()}`,
        action: 'respond' as const,
        role: 'officer' as const,
        message: message.trim(),
        createdAt: new Date().toISOString(),
        ...(fileAsset && { file: { asset: fileAsset } }),
      }
      updateTaskByKey(selectedTaskKey, {
        ...(inputs && { inputs }),
        inputsReviewThread: [
          ...(selectedTask?.inputsReviewThread ?? []),
          newEntry,
        ],
      })
    },
    [selectedTaskKey, selectedTask, updateTaskByKey],
  )

  const handleApproveDeliverable = React.useCallback(
    (reason?: string) => {
      if (!selectedTaskKey) return
      const newEntry = {
        _key: `dr-${Date.now()}`,
        action: 'approve' as const,
        role: 'supervisor' as const,
        ...(reason && { message: reason }),
        createdAt: new Date().toISOString(),
      }
      updateTaskByKey(selectedTaskKey, {
        status: 'done',
        deliverableReviewThread: [
          ...(selectedTask?.deliverableReviewThread ?? []),
          newEntry,
        ],
      })
    },
    [selectedTaskKey, selectedTask, updateTaskByKey],
  )

  const handleRejectDeliverable = React.useCallback(
    (message: string) => {
      if (!selectedTaskKey) return
      const newEntry = {
        _key: `dr-${Date.now()}`,
        action: 'reject' as const,
        role: 'supervisor' as const,
        message: message.trim(),
        createdAt: new Date().toISOString(),
      }
      updateTaskByKey(selectedTaskKey, {
        deliverableReviewThread: [
          ...(selectedTask?.deliverableReviewThread ?? []),
          newEntry,
        ],
      })
    },
    [selectedTaskKey, selectedTask, updateTaskByKey],
  )

  const handleRespondToDeliverableRejection = React.useCallback(
    async (message: string, replacementFile?: File) => {
      if (!selectedTaskKey) return
      let fileAsset:
        | {
            _id: string
            url?: string
            originalFilename?: string
            size?: number
            mimeType?: string
          }
        | undefined
      if (replacementFile) {
        const fd = new FormData()
        fd.append('file', replacementFile)
        const res = await fetch('/api/sanity/upload', {
          method: 'POST',
          body: fd,
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error((data as { error?: string }).error ?? 'Upload failed')
        }
        const data = (await res.json()) as {
          id: string
          url?: string
          originalFilename?: string
          size?: number
          mimeType?: string
        }
        fileAsset = {
          _id: data.id,
          url: data.url,
          originalFilename: data.originalFilename,
          size: data.size,
          mimeType: data.mimeType ?? 'application/pdf',
        }
      }
      const newEntry = {
        _key: `dr-${Date.now()}`,
        action: 'respond' as const,
        role: 'officer' as const,
        message: message.trim(),
        createdAt: new Date().toISOString(),
        ...(fileAsset && { file: { asset: fileAsset } }),
      }
      const existing = selectedTask?.deliverable ?? []
      const updatedDeliverable = fileAsset
        ? existing.map(e =>
            (e.tag ?? 'support') === 'main'
              ? {
                  ...e,
                  file: { asset: fileAsset },
                  locked: true,
                }
              : e,
          )
        : existing.map(e =>
            (e.tag ?? 'support') === 'main' ? { ...e, locked: true } : e,
          )
      updateTaskByKey(selectedTaskKey, {
        deliverable: updatedDeliverable,
        status: 'in_review',
        deliverableReviewThread: [
          ...(selectedTask?.deliverableReviewThread ?? []),
          newEntry,
        ],
      })
    },
    [selectedTaskKey, selectedTask, updateTaskByKey],
  )

  const getOrCreatePeriodDeliverable = (
    periodKey: string,
  ): NonNullable<TaskRow['periodDeliverables']>[0] => {
    const existing = selectedTask?.periodDeliverables ?? []
    const pd = existing.find(p => p.periodKey === periodKey)
    if (pd) return pd
    return {
      _key: `pd-${periodKey}-${Date.now()}`,
      periodKey,
      status: 'pending',
      deliverable: [],
      deliverableReviewThread: [],
    }
  }

  const updatePeriodDeliverable = React.useCallback(
    (periodKey: string, updater: (pd: NonNullable<TaskRow['periodDeliverables']>[0]) => NonNullable<TaskRow['periodDeliverables']>[0]) => {
      if (!selectedTaskKey) return
      const existing = selectedTask?.periodDeliverables ?? []
      const idx = existing.findIndex(p => p.periodKey === periodKey)
      const pd = idx >= 0 ? existing[idx] : getOrCreatePeriodDeliverable(periodKey)
      const updatedPd = updater(pd)
      const updated =
        idx >= 0
          ? existing.map((p, i) => (i === idx ? updatedPd : p))
          : [...existing, updatedPd]
      updateTaskByKey(selectedTaskKey, { periodDeliverables: updated })
    },
    [selectedTaskKey, selectedTask, updateTaskByKey],
  )

  const handleAddPeriodDeliverable = React.useCallback(
    async (periodKey: string, file: File, tag: 'support' | 'main') => {
      if (!selectedTaskKey) return
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/sanity/upload', {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Upload failed')
      }
      const data = (await res.json()) as {
        id: string
        url?: string
        originalFilename?: string
        size?: number
        mimeType?: string
      }
      const newEv = {
        _key: `ev-${Date.now()}`,
        file: {
          asset: {
            _id: data.id,
            url: data.url,
            originalFilename: data.originalFilename,
            size: data.size,
            mimeType: data.mimeType ?? 'application/pdf',
          },
        },
        tag,
      }
      updatePeriodDeliverable(periodKey, pd => {
        const existing = pd.deliverable ?? []
        const updated =
          tag === 'main'
            ? [...existing.filter(e => (e.tag ?? 'support') !== 'main'), newEv]
            : [...existing, newEv]
        return {
          ...pd,
          deliverable: updated,
          status: tag === 'main' ? 'delivered' : (pd.status ?? 'pending'),
          submittedAt:
            tag === 'main' ? new Date().toISOString() : pd.submittedAt,
        }
      })
    },
    [selectedTaskKey, updatePeriodDeliverable],
  )

  const handleRemovePeriodDeliverable = React.useCallback(
    (periodKey: string, itemKey: string) => {
      if (!selectedTaskKey) return
      updatePeriodDeliverable(periodKey, pd => {
        const item = (pd.deliverable ?? []).find(
          e => (e._key ?? '') === itemKey,
        )
        if (item?.locked) return pd
        const filtered = (pd.deliverable ?? []).filter(
          e => (e._key ?? '') !== itemKey,
        )
        const wasMain = (item?.tag ?? 'support') === 'main'
        const newStatus =
          wasMain &&
          (pd.status === 'delivered' || pd.status === 'in_review')
            ? 'pending'
            : pd.status
        return {
          ...pd,
          deliverable: filtered,
          status: newStatus ?? 'pending',
        }
      })
    },
    [selectedTaskKey, updatePeriodDeliverable],
  )

  const handleSubmitPeriodForReview = React.useCallback(
    (periodKey: string) => {
      if (!selectedTaskKey) return
      updatePeriodDeliverable(periodKey, pd => {
        const mainEv = (pd.deliverable ?? []).find(
          e => (e.tag ?? 'support') === 'main',
        )
        if (!mainEv) return pd
        const lockedDeliverable = (pd.deliverable ?? []).map(e =>
          (e.tag ?? 'support') === 'main' ? { ...e, locked: true } : e,
        )
        const submitEntry = {
          _key: `dr-${Date.now()}`,
          action: 'submit' as const,
          role: 'officer' as const,
          createdAt: new Date().toISOString(),
        }
        return {
          ...pd,
          deliverable: lockedDeliverable,
          status: 'in_review',
          deliverableReviewThread: [
            ...(pd.deliverableReviewThread ?? []),
            submitEntry,
          ],
        }
      })
    },
    [selectedTaskKey, updatePeriodDeliverable],
  )

  const handleApprovePeriodDeliverable = React.useCallback(
    (periodKey: string, reason?: string) => {
      if (!selectedTaskKey) return
      const newEntry = {
        _key: `dr-${Date.now()}`,
        action: 'approve' as const,
        role: 'supervisor' as const,
        ...(reason && { message: reason }),
        createdAt: new Date().toISOString(),
      }
      updatePeriodDeliverable(periodKey, pd => ({
        ...pd,
        status: 'done',
        deliverableReviewThread: [
          ...(pd.deliverableReviewThread ?? []),
          newEntry,
        ],
      }))
    },
    [selectedTaskKey, updatePeriodDeliverable],
  )

  const handleRejectPeriodDeliverable = React.useCallback(
    (periodKey: string, message: string) => {
      if (!selectedTaskKey) return
      const newEntry = {
        _key: `dr-${Date.now()}`,
        action: 'reject' as const,
        role: 'supervisor' as const,
        message: message.trim(),
        createdAt: new Date().toISOString(),
      }
      updatePeriodDeliverable(periodKey, pd => ({
        ...pd,
        deliverableReviewThread: [
          ...(pd.deliverableReviewThread ?? []),
          newEntry,
        ],
      }))
    },
    [selectedTaskKey, updatePeriodDeliverable],
  )

  const handleRespondToPeriodDeliverableRejection = React.useCallback(
    async (periodKey: string, message: string, replacementFile?: File) => {
      if (!selectedTaskKey) return
      let fileAsset:
        | {
            _id: string
            url?: string
            originalFilename?: string
            size?: number
            mimeType?: string
          }
        | undefined
      if (replacementFile) {
        const fd = new FormData()
        fd.append('file', replacementFile)
        const res = await fetch('/api/sanity/upload', {
          method: 'POST',
          body: fd,
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error((data as { error?: string }).error ?? 'Upload failed')
        }
        const data = (await res.json()) as {
          id: string
          url?: string
          originalFilename?: string
          size?: number
          mimeType?: string
        }
        fileAsset = {
          _id: data.id,
          url: data.url,
          originalFilename: data.originalFilename,
          size: data.size,
          mimeType: data.mimeType ?? 'application/pdf',
        }
      }
      const newEntry = {
        _key: `dr-${Date.now()}`,
        action: 'respond' as const,
        role: 'officer' as const,
        message: message.trim(),
        createdAt: new Date().toISOString(),
        ...(fileAsset && { file: { asset: fileAsset } }),
      }
      updatePeriodDeliverable(periodKey, pd => {
        const existing = pd.deliverable ?? []
        const updatedDeliverable = fileAsset
          ? existing.map(e =>
              (e.tag ?? 'support') === 'main'
                ? {
                    ...e,
                    file: { asset: fileAsset },
                    locked: true,
                  }
                : e,
            )
          : existing.map(e =>
              (e.tag ?? 'support') === 'main' ? { ...e, locked: true } : e,
            )
        return {
          ...pd,
          deliverable: updatedDeliverable,
          status: 'in_review',
          deliverableReviewThread: [
            ...(pd.deliverableReviewThread ?? []),
            newEntry,
          ],
        }
      })
    },
    [selectedTaskKey, updatePeriodDeliverable],
  )

  const handleAddTask = async () => {
    const trimmed = newTask.trim()
    if (!trimmed) return

    const newRow: TaskRow = {
      _key: `task-${Date.now()}`,
      task: trimmed,
      priority: 'medium',
      assignee: null,
      status: 'to_do',
      deliverable: [],
      inputsReviewThread: [],
      deliverableReviewThread: [],
    }
    const updatedTasks = [...tasks, newRow]
    setTasks(updatedTasks)
    setNewTask('')
    setIsAddingTask(true)

    try {
      await saveTasks(updatedTasks)
    } catch (err) {
      console.error(err)
      setTasks(tasks)
      setNewTask(trimmed)
      alert(err instanceof Error ? err.message : 'Failed to add task')
    } finally {
      setIsAddingTask(false)
    }
  }

  const removeTaskByKey = React.useCallback((key: string) => {
    setTasks(prev => prev.filter(row => (row._key ?? '') !== key))
  }, [])

  return (
    <div className='flex flex-1 min-h-0 overflow-hidden lg:h-[calc(100vh-5rem)]'>
      <div className='flex flex-col flex-1 gap-6 p-4 md:p-8 pt-6 min-w-0 overflow-y-auto overscroll-contain'>
      <div>
        <div className='max-w-prose'>
          {isEditingTitle ? (
            <div ref={titleEditRef} className='space-y-2'>
              <textarea
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') handleCancelTitle()
                }}
                autoFocus
                disabled={isSavingActivity}
                rows={2}
                className='flex min-h-[80px] w-full resize-y rounded-md border-2 border-input bg-background px-3 py-2 text-2xl font-bold placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50'
              />
              <div className='flex gap-1'>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='h-8 w-8'
                  onClick={handleConfirmTitle}
                  disabled={isSavingActivity || !title.trim()}
                >
                  <Check className='h-4 w-4' />
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='h-8 w-8'
                  onClick={handleCancelTitle}
                  disabled={isSavingActivity}
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
            </div>
          ) : (
            <h1
              className='text-2xl font-bold cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1'
              onClick={() => {
                setTitleBeforeEdit(title)
                setIsEditingTitle(true)
              }}
            >
              {activityCode} – {title}
            </h1>
          )}
        </div>
        {isKPI && (
          <div className='mt-6 max-w-prose'>
            <Label className='text-sm font-medium'>AIM</Label>
            {isEditingAim ? (
              <div ref={aimEditRef} className='space-y-2 mt-1'>
                <textarea
                  value={aim}
                  onChange={e => setAim(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') handleCancelAim()
                  }}
                  autoFocus
                  disabled={isSavingActivity}
                  rows={2}
                  className='flex min-h-[80px] w-full resize-y rounded-md border-2 border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50'
                  placeholder='Scope, design, and validate...'
                />
                <div className='flex gap-1'>
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    className='h-8 w-8'
                    onClick={handleConfirmAim}
                    disabled={isSavingActivity}
                  >
                    <Check className='h-4 w-4' />
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    className='h-8 w-8'
                    onClick={handleCancelAim}
                    disabled={isSavingActivity}
                  >
                    <X className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            ) : (
              <p
                className='text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1 min-h-[2rem] mt-1'
                onClick={() => {
                  setAimBeforeEdit(aim)
                  setIsEditingAim(true)
                }}
              >
                {aim || 'Click to add AIM...'}
              </p>
            )}
          </div>
        )}
          {!isKPI && (
        <div className='flex flex-wrap items-start gap-8 mt-8 max-w-prose'>
              <Card className='w-full max-w-prose'>
                <CardHeader className='flex flex-row items-center justify-between space-y-0'>
                  <div>
                    <CardTitle className='text-base font-medium'>
                      Activity is reported periodically
                    </CardTitle>
                    <CardDescription className='mt-1'>
                      Enable if this activity has regular reporting cycles
                      (weekly, monthly, or quarterly)
                    </CardDescription>
                  </div>
                  <Switch
                    checked={reportingFrequency !== 'n/a'}
                    disabled={isSavingActivity}
                    onCheckedChange={async checked => {
                      const v = checked ? 'monthly' : 'n/a'
                      setReportingFrequency(v)
                      setIsSavingReportingFrequency(true)
                      setIsSavingActivity(true)
                      try {
                        const res = await fetch(
                          `/api/section-contracts/${sectionContract._id}`,
                          {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              op: 'updateActivity',
                              payload: {
                                objectiveIndex,
                                initiativeIndex,
                                activityIndex,
                                reportingFrequency: v,
                              },
                            }),
                          },
                        )
                        if (!res.ok) {
                          const data = await res.json()
                          throw new Error(data.error || 'Failed to save')
                        }
                        router.refresh()
                      } catch (err) {
                        console.error(err)
                        setReportingFrequency(reportingFrequency)
                        alert(
                          err instanceof Error ? err.message : 'Failed to save',
                        )
                      } finally {
                        setIsSavingReportingFrequency(false)
                        setIsSavingActivity(false)
                      }
                    }}
                  />
                </CardHeader>
                {reportingFrequency !== 'n/a' && (
                  <CardContent className='pt-0 space-y-2'>
                    <Label className='text-sm mb-2'>Reporting frequency</Label>
            <div className='flex items-center gap-2'>
              <Select
                value={reportingFrequency}
                onValueChange={handleReportingFrequencyChange}
                disabled={isSavingActivity}
              >
                <SelectTrigger className='h-9 min-w-[140px]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='weekly'>Weekly</SelectItem>
                  <SelectItem value='monthly'>Monthly</SelectItem>
                  <SelectItem value='quarterly'>Quarterly</SelectItem>
                </SelectContent>
              </Select>
              {isSavingReportingFrequency && (
                <Loader2 className='h-4 w-4 shrink-0 animate-spin text-muted-foreground' />
              )}
            </div>
                  </CardContent>
                )}
              </Card>
          <div className='flex flex-col gap-1'>
                <Label className='text-sm mb-2'>Due Date</Label>
            <div className='flex items-center gap-2'>
            {reportingFrequency === 'weekly' ? (
              <div className='flex h-9 min-w-[200px] items-center gap-2 rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground'>
                <CalendarIcon className='h-4 w-4 shrink-0' />
                <span>
                        Due end of this week (
                        {format(endOfWeek(new Date()), 'PPP')})
                </span>
              </div>
            ) : (
              <>
                      <Popover
                        open={datePopoverOpen}
                        onOpenChange={setDatePopoverOpen}
                      >
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  disabled={isSavingActivity}
                  className={cn(
                    'h-9 justify-between text-left font-normal min-w-[200px]',
                    !targetDate && 'text-muted-foreground',
                  )}
                >
                  <span className='flex items-center gap-2'>
                    <CalendarIcon className='h-4 w-4 shrink-0' />
                    {targetDate ? (
                      format(new Date(targetDate), 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </span>
                  {isSavingDate && (
                    <Loader2 className='h-4 w-4 shrink-0 animate-spin' />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='start'>
                <Calendar
                  mode='single'
                            selected={
                              targetDate ? new Date(targetDate) : undefined
                            }
                  onSelect={handleTargetDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {reportingFrequency === 'monthly' && (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='h-9 text-muted-foreground'
                disabled={isSavingActivity}
                onClick={() => {
                  const now = new Date()
                  handleTargetDateChange(endOfMonth(now))
                }}
              >
                Set to end of period
              </Button>
            )}
              </>
            )}
            </div>
          </div>
          <div className='flex flex-col gap-1'>
            <Label className='text-sm mb-2'>Status</Label>
            <div className='flex items-center gap-2'>
              <Select
                value={status}
                onValueChange={handleStatusChange}
                disabled={isSavingActivity}
              >
                <SelectTrigger className='h-9 min-w-[140px]'>
                  <SelectValue placeholder='Select status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='not_started'>Not started</SelectItem>
                  <SelectItem value='in_progress'>In progress</SelectItem>
                  <SelectItem value='completed'>Completed</SelectItem>
                </SelectContent>
              </Select>
              {isSavingStatus && (
                <Loader2 className='h-4 w-4 shrink-0 animate-spin text-muted-foreground' />
              )}
            </div>
          </div>
        </div>
          )}

          <div className='space-y-4 flex-1 min-w-0 mt-10'>
        <h2 className='text-sm font-semibold'>Detailed Tasks</h2>
        <DetailedTasksTable
          tasks={tasks}
          officers={officers}
          sectionId={section._id}
          selectedTaskKey={selectedTaskKey}
          onSelectTask={setSelectedTaskKey}
          onUpdateTask={updateTaskByKey}
          onRemoveTask={removeTaskByKey}
          isSaving={isSavingTasks}
        />
        <div className='flex gap-2'>
          <Input
            placeholder='Add a task...'
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={e =>
              e.key === 'Enter' && (e.preventDefault(), handleAddTask())
            }
            disabled={isSavingTasks || isAddingTask}
          />
          <Button
            type='button'
            variant='default'
            size='icon'
            onClick={handleAddTask}
            disabled={isSavingTasks || isAddingTask || !newTask.trim()}
          >
            {isAddingTask ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Plus className='h-4 w-4' />
            )}
          </Button>
            </div>
        </div>
      </div>
      </div>
      <TaskDetailsPanel
        task={selectedTask}
        officers={officers}
        sectionId={section._id}
        activityType={activity.activityType}
        onUpdate={updates =>
          selectedTaskKey && updateTaskByKey(selectedTaskKey, updates)
        }
        onAddInputs={handleAddInputs}
        onApproveInputs={handleApproveInputs}
        onRejectInputs={handleRejectInputs}
        onRespondToRejection={handleRespondToRejection}
        onAddDeliverable={handleAddDeliverable}
        onRemoveDeliverable={handleRemoveDeliverable}
        onSubmitForReview={
          selectedTaskKey
            ? () => handleSubmitForReview(selectedTaskKey)
            : undefined
        }
        onApproveDeliverable={handleApproveDeliverable}
        onRejectDeliverable={handleRejectDeliverable}
        onRespondToDeliverableRejection={handleRespondToDeliverableRejection}
        onAddPeriodDeliverable={handleAddPeriodDeliverable}
        onRemovePeriodDeliverable={handleRemovePeriodDeliverable}
        onSubmitPeriodForReview={handleSubmitPeriodForReview}
        onApprovePeriodDeliverable={handleApprovePeriodDeliverable}
        onRejectPeriodDeliverable={handleRejectPeriodDeliverable}
        onRespondToPeriodDeliverableRejection={
          handleRespondToPeriodDeliverableRejection
        }
        isSaving={isSavingTasks}
      />
      <SubmitForReviewDialog
        open={!!pendingSubmitForReviewTaskKey}
        onOpenChange={open => {
          if (!open) setPendingSubmitForReviewTaskKey(null)
        }}
        onConfirm={
          pendingSubmitForReviewTaskKey
            ? () => handleSubmitForReview(pendingSubmitForReviewTaskKey)
            : () => {}
        }
        onDecline={() => setPendingSubmitForReviewTaskKey(null)}
      />
    </div>
  )
}
