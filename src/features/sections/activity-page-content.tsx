'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { endOfMonth, endOfQuarter, endOfWeek, format } from 'date-fns'
import {
  ArrowLeft,
  CalendarIcon,
  Check,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ContractsApiResource } from '@/lib/contracts-api'
import { contractsApiBase } from '@/lib/contracts-api'
import {
  leadershipActivityNumber,
  resolveActivityNumberingType,
} from '@/lib/contract-numbering'
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
import type { ContractTaskSprintCycleEvidence } from '@/lib/contract-task-sprint-evidence'
import { sprintsHrefForViewer } from '@/lib/contract-activity-back-href'
import type { Officer } from '@/features/sections/components/officer-switcher'
import {
  DetailedTasksTable,
  enrichTasksWithDownstreamAssignees,
  enrichTaskRowsWithContractOfficer,
  type ContractOfficer,
  type OfficerCascadeAssignee,
  type OfficerWorkRow,
  type TaskRow,
} from '@/features/sections/components/detailed-tasks-table'
import { TaskDetailsPanel } from '@/features/sections/components/task-details-panel'
import { SubmitForReviewDialog } from '@/features/sections/components/submit-for-review-dialog'
import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useIsLg } from '@/hooks/use-is-lg'
import { toast } from 'sonner'
import {
  canSubmitDetailedTaskWork,
  type SectionAccess,
} from '@/lib/section-access'
import {
  defaultOfficerWorkKey,
  findOfficerWork,
  flattenOfficerWork,
  omitWorkFields,
  pickWorkFields,
} from '@/lib/detailed-task-assignees'

type Section = {
  _id: string
  name: string
  slug?: { current: string }
  division?: { _id: string; name: string; slug?: { current: string } }
}

function mapTaskStatus(s: string | undefined) {
  const status = s ?? 'to_do'
  const legacy: Record<string, string> = {
    not_started: 'to_do',
    completed: 'done',
  }
  return legacy[status] ?? status
}

function officerWorkFromDetailedTask(
  t: DetailedTaskType,
  fallbackKey: string,
): OfficerWorkRow[] {
  if (t.officerWork?.length) {
    return t.officerWork.map((work, index) => ({
      _key: work._key ?? `ow-${fallbackKey}-${index}`,
      assignee: work.assignee?._id ?? null,
      assigneeName: work.assignee?.fullName ?? null,
      status: mapTaskStatus(work.status),
      inputs: work.inputs ?? undefined,
      inputsReviewThread: work.inputsReviewThread ?? [],
      deliverableReviewThread: work.deliverableReviewThread ?? [],
      periodDeliverables: work.periodDeliverables ?? [],
      deliverable: work.deliverable ?? [],
    }))
  }
  if (
    t.assignee?._id ||
    t.inputs ||
    (t.deliverable ?? []).length ||
    (t.periodDeliverables ?? []).length
  ) {
    return [
      {
        _key: `ow-legacy-${fallbackKey}`,
        assignee: t.assignee?._id ?? null,
        assigneeName: t.assignee?.fullName ?? null,
        status: mapTaskStatus(t.status),
        inputs: t.inputs ?? undefined,
        inputsReviewThread: t.inputsReviewThread ?? [],
        deliverableReviewThread: t.deliverableReviewThread ?? [],
        periodDeliverables: t.periodDeliverables ?? [],
        deliverable: t.deliverable ?? [],
      },
    ]
  }
  return []
}

function emptyOfficerWorkFields() {
  return {
    status: 'to_do',
    inputs: undefined,
    inputsReviewThread: [] as OfficerWorkRow['inputsReviewThread'],
    deliverableReviewThread: [] as OfficerWorkRow['deliverableReviewThread'],
    periodDeliverables: [] as OfficerWorkRow['periodDeliverables'],
    deliverable: [] as OfficerWorkRow['deliverable'],
  }
}

function normalizeTasks(
  raw: (DetailedTaskType | string)[] | undefined,
): TaskRow[] {
  if (!raw?.length) return []
  return raw.map((t, i) => {
    if (typeof t === 'string') {
      return {
        _key: `task-${i}`,
        task: t,
        priority: 'medium',
        assignee: null,
        assigneeName: null,
        officerWork: [],
        cascadeKind: null,
        ...emptyOfficerWorkFields(),
        targetDate: undefined,
        reportingFrequency: 'n/a' as const,
      }
    }
    const key = t._key ?? `task-${i}`
    const officerWork = officerWorkFromDetailedTask(t, key)
    const primary = officerWork[0]
    return {
      _key: key,
      task: t.task ?? '',
      priority: t.priority ?? 'medium',
      assignee: primary?.assignee ?? t.assignee?._id ?? null,
      assigneeName: primary?.assigneeName ?? t.assignee?.fullName ?? null,
      officerWork,
      cascadeKind: t.cascadeKind ?? null,
      inputs: primary?.inputs ?? t.inputs ?? undefined,
      inputsReviewThread:
        primary?.inputsReviewThread ?? t.inputsReviewThread ?? [],
      deliverableReviewThread:
        primary?.deliverableReviewThread ?? t.deliverableReviewThread ?? [],
      status: primary?.status ?? mapTaskStatus(t.status),
      targetDate: t.targetDate ?? undefined,
      reportingFrequency: (t.reportingFrequency ?? 'n/a') as
        | 'weekly'
        | 'monthly'
        | 'quarterly'
        | 'n/a',
      expectedDeliverable: t.expectedDeliverable ?? undefined,
      reportingPeriodStart: t.reportingPeriodStart ?? undefined,
      periodDeliverables:
        primary?.periodDeliverables ?? t.periodDeliverables ?? [],
      deliverable: primary?.deliverable ?? t.deliverable ?? [],
    }
  })
}

function resolveInitialSelectedTaskKey(
  activity: MeasurableActivity,
  initialTaskKey?: string,
): string | null {
  if (!initialTaskKey?.trim()) return null
  const rows = normalizeTasks(activity.tasks)
  return rows.some(r => (r._key ?? '') === initialTaskKey)
    ? initialTaskKey
    : null
}

function serializeReviewThread(
  entries: NonNullable<OfficerWorkRow['inputsReviewThread']>,
) {
  return entries.map(entry => {
    const assetId = entry.file?.asset?._id
    const authorId =
      typeof entry.author === 'string' ? entry.author : entry.author?._id
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
  })
}

function serializeOfficerWork(work: OfficerWorkRow) {
  return {
    _key: work._key,
    assignee: work.assignee,
    status: work.status,
    inputs: work.inputs?.file?.asset?._id
      ? {
          file: { asset: { _ref: work.inputs.file.asset._id } },
          submittedAt: work.inputs.submittedAt ?? new Date().toISOString(),
        }
      : undefined,
    inputsReviewThread: serializeReviewThread(work.inputsReviewThread ?? []),
    deliverableReviewThread: serializeReviewThread(
      work.deliverableReviewThread ?? [],
    ),
    periodDeliverables: (work.periodDeliverables ?? []).map(pd => ({
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
      deliverableReviewThread: serializeReviewThread(
        pd.deliverableReviewThread ?? [],
      ),
    })),
    deliverable: (work.deliverable ?? [])
      .filter(e => e.file?.asset?._id)
      .map(e => ({
        _key: e._key,
        file: { asset: { _ref: e.file!.asset!._id } },
        tag: e.tag === 'main' ? 'main' : 'support',
        locked: e.locked ?? false,
      })),
  }
}

function tasksToPayload(rows: TaskRow[]) {
  return rows.map(r => ({
    _key: r._key,
    task: r.task,
    priority: r.priority,
    assignee: r.officerWork[0]?.assignee ?? r.assignee,
    officerWork: (r.officerWork ?? []).map(serializeOfficerWork),
    targetDate: r.targetDate,
    reportingFrequency: r.reportingFrequency ?? 'n/a',
    expectedDeliverable: r.expectedDeliverable,
    reportingPeriodStart: r.reportingPeriodStart,
  }))
}

interface ActivityPageContentProps {
  section: Section
  sectionContract: SectionContract & { officer?: ContractOfficer }
  contractsApi?: Extract<
    ContractsApiResource,
    'section-contracts' | 'supervisor-contracts' | 'officer-contracts'
  >
  contractBackHref?: string
  canManageContract?: boolean
  activity: MeasurableActivity
  objectiveIndex: number
  initiativeIndex: number
  activityIndex: number
  officers: Officer[]
  sectionAccess: SectionAccess
  /** When set (e.g. `?taskKey=` from dashboard), select this task in the details panel. */
  initialTaskKey?: string
  /** Mirrored assignees from downstream cascades (supervisor/officer or manager chain). */
  downstreamTaskAssignees?: Record<string, OfficerCascadeAssignee>
  /** Sprint work submissions keyed by contract detailed-task _key. */
  sprintEvidenceByTaskKey?: Record<string, ContractTaskSprintCycleEvidence[]>
}

export function ActivityPageContent({
  section,
  sectionContract,
  contractsApi = 'section-contracts',
  contractBackHref,
  canManageContract: canManageContractProp,
  activity,
  objectiveIndex,
  initiativeIndex,
  activityIndex,
  officers,
  sectionAccess,
  initialTaskKey,
  downstreamTaskAssignees,
  sprintEvidenceByTaskKey,
}: ActivityPageContentProps) {
  const router = useRouter()
  const isLg = useIsLg()
  const sectionSlug = section.slug?.current ?? ''
  const contractHref =
    contractBackHref?.trim() ||
    (sectionSlug ? `/sections/${sectionSlug}?tab=contract` : '/departments')
  const sprintsHref = sprintsHrefForViewer(sectionAccess, sectionSlug)
  const contractApiBase = contractsApiBase(contractsApi)

  const initiative =
    sectionContract.objectives?.[objectiveIndex]?.initiatives?.[initiativeIndex]
  const initiativeCode =
    initiative?.code ??
    `${sectionContract.objectives?.[objectiveIndex]?.code ?? String(objectiveIndex + 1)}.${initiativeIndex + 1}`
  const initiativeTitle = initiative?.title?.trim() ?? ''
  const initiativeActivities =
    sectionContract.objectives?.[objectiveIndex]?.initiatives?.[initiativeIndex]
      ?.measurableActivities ?? []
  const numberingKind = resolveActivityNumberingType(activity)
  const activityOrder =
    initiativeActivities
      .slice(0, activityIndex)
      .filter(a => resolveActivityNumberingType(a) === numberingKind).length + 1
  const activityCode = leadershipActivityNumber(
    initiativeCode,
    activity,
    activityOrder,
  )

  /** Manager section contracts only; supervisor/officer contracts have no AIM. */
  const showActivityAim =
    contractsApi === 'section-contracts' && numberingKind === 'kpi'
  const isOfficerContract = contractsApi === 'officer-contracts'
  const isSupervisorContract = contractsApi === 'supervisor-contracts'
  const isSectionContract = contractsApi === 'section-contracts'
  const contractOfficer: ContractOfficer | null = isOfficerContract
    ? (sectionContract.officer ?? null)
    : null
  const { canSuperviseDetailedTasks } = sectionAccess
  const canManageContract =
    canManageContractProp ?? sectionAccess.canManageContract
  const activityKindLabel =
    numberingKind === 'kpi'
      ? 'KPI'
      : numberingKind === 'cross-cutting'
        ? 'Cross-cutting'
        : 'measurable'

  const [title, setTitle] = React.useState(activity.title)
  const [aim, setAim] = React.useState(activity.aim ?? '')
  const [targetDate, setTargetDate] = React.useState(activity.targetDate ?? '')
  const [reportingFrequency, setReportingFrequency] = React.useState<
    'weekly' | 'monthly' | 'quarterly' | 'n/a'
  >(activity.reportingFrequency ?? 'n/a')
  /** KPI activities use a free-form due date; periodic cycles apply to CC/measurable. */
  const dueDateReportingFrequency =
    numberingKind === 'kpi' ? 'n/a' : reportingFrequency

  React.useEffect(() => {
    setTitle(activity.title)
    setAim(activity.aim ?? '')
    setTargetDate(activity.targetDate ?? '')
    setReportingFrequency(activity.reportingFrequency ?? 'n/a')
  }, [
    activity.title,
    activity.aim,
    activity.targetDate,
    activity.reportingFrequency,
  ])
  const [tasks, setTasks] = React.useState<TaskRow[]>(() => {
    let rows = normalizeTasks(activity.tasks)
    if (isSupervisorContract || isSectionContract) {
      rows = enrichTasksWithDownstreamAssignees(rows, downstreamTaskAssignees)
    } else if (isOfficerContract) {
      rows = enrichTaskRowsWithContractOfficer(rows, contractOfficer)
    }
    return rows
  })
  const [newTask, setNewTask] = React.useState('')
  const [isSavingActivity, setIsSavingActivity] = React.useState(false)
  const [isSavingTasks, setIsSavingTasks] = React.useState(false)
  const [isAddingTask, setIsAddingTask] = React.useState(false)
  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [titleBeforeEdit, setTitleBeforeEdit] = React.useState('')
  const [isEditingAim, setIsEditingAim] = React.useState(false)
  const [aimBeforeEdit, setAimBeforeEdit] = React.useState('')
  const [isSavingDate, setIsSavingDate] = React.useState(false)
  const [isSavingReportingFrequency, setIsSavingReportingFrequency] =
    React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [isDeletingActivity, setIsDeletingActivity] = React.useState(false)
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
    out.push({ label: section.name, href: contractHref })
    return out
  }, [section.division, section.name, contractHref])

  useRegisterPageBreadcrumbs(breadcrumbItems)

  const handleConfirmTitle = React.useCallback(async () => {
    if (!title.trim()) return
    setIsSavingActivity(true)
    try {
      const res = await fetch(`${contractApiBase}/${sectionContract._id}`, {
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
      const res = await fetch(`${contractApiBase}/${sectionContract._id}`, {
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

  const handleDeleteActivity = React.useCallback(async () => {
    setIsDeletingActivity(true)
    try {
      const res = await fetch(`${contractApiBase}/${sectionContract._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'deleteMeasurableActivity',
          payload: {
            objectiveIndex,
            initiativeIndex,
            activityIndex,
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete measurable activity')
      }
      toast.success('Measurable activity deleted')
      setDeleteDialogOpen(false)
      router.push(contractHref)
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to delete measurable activity',
      )
    } finally {
      setIsDeletingActivity(false)
    }
  }, [
    contractApiBase,
    sectionContract._id,
    objectiveIndex,
    initiativeIndex,
    activityIndex,
    router,
    contractHref,
  ])

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
    async (newDate: string) => {
      if (!newDate) return
      const previous = targetDate
      setTargetDate(newDate)
      setIsSavingDate(true)
      setIsSavingActivity(true)
      try {
        const res = await fetch(`${contractApiBase}/${sectionContract._id}`, {
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
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to save')
        }
        router.refresh()
      } catch (err) {
        console.error(err)
        setTargetDate(previous)
        alert(err instanceof Error ? err.message : 'Failed to save')
      } finally {
        setIsSavingDate(false)
        setIsSavingActivity(false)
      }
    },
    [
      sectionContract._id,
      contractApiBase,
      objectiveIndex,
      initiativeIndex,
      activityIndex,
      router,
      targetDate,
    ],
  )

  const handleReportingFrequencyChange = React.useCallback(
    async (value: string) => {
      const v = value as 'weekly' | 'monthly' | 'quarterly' | 'n/a'
      setReportingFrequency(v)
      setIsSavingReportingFrequency(true)
      setIsSavingActivity(true)
      try {
        const res = await fetch(`${contractApiBase}/${sectionContract._id}`, {
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
        })
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
        const res = await fetch(`${contractApiBase}/${sectionContract._id}`, {
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
        })
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

  const saveTimeoutRef = React.useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined)
  /** Baseline for debounced save; avoids firing after mount (incl. React Strict Mode double-invoke). */
  const lastSavedTasksPayloadRef = React.useRef<string | null>(null)

  const saveTasks = React.useCallback(
    async (tasksToSave: TaskRow[]) => {
      setIsSavingTasks(true)
      try {
        const payload = tasksToPayload(tasksToSave)
        const res = await fetch(`${contractApiBase}/${sectionContract._id}`, {
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
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to save tasks')
        }
        lastSavedTasksPayloadRef.current = JSON.stringify(payload)
        router.refresh()
      } catch (err) {
        console.error(err)
        toast.error(err instanceof Error ? err.message : 'Failed to save tasks')
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

  React.useEffect(() => {
    const serialized = JSON.stringify(tasksToPayload(tasks))
    if (lastSavedTasksPayloadRef.current === null) {
      lastSavedTasksPayloadRef.current = serialized
      return
    }
    if (lastSavedTasksPayloadRef.current === serialized) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      const snap = JSON.stringify(tasksToPayload(tasks))
      if (snap === lastSavedTasksPayloadRef.current) return
      saveTasks(tasks).catch(err => {
        toast.error(err instanceof Error ? err.message : 'Failed to save tasks')
      })
    }, 500)
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [tasks, saveTasks])

  const [selectedTaskKey, setSelectedTaskKey] = React.useState<string | null>(
    () => resolveInitialSelectedTaskKey(activity, initialTaskKey),
  )
  const [selectedWorkKey, setSelectedWorkKey] = React.useState<string | null>(
    null,
  )
  const [pendingSubmitForReviewTaskKey, setPendingSubmitForReviewTaskKey] =
    React.useState<string | null>(null)

  const selectedTask = React.useMemo(
    () => tasks.find(t => (t._key ?? '') === selectedTaskKey) ?? null,
    [tasks, selectedTaskKey],
  )

  React.useEffect(() => {
    if (!selectedTask) {
      setSelectedWorkKey(null)
      return
    }
    const nextKey = defaultOfficerWorkKey(selectedTask.officerWork ?? [], {
      viewerStaffId: sectionAccess.viewerStaffId,
      canSupervise: canSuperviseDetailedTasks,
    })
    setSelectedWorkKey(current => {
      if (current && selectedTask.officerWork?.some(work => work._key === current)) {
        return current
      }
      return nextKey
    })
  }, [
    selectedTask,
    canSuperviseDetailedTasks,
    sectionAccess.viewerStaffId,
  ])

  const activeWork = React.useMemo(
    () => findOfficerWork(selectedTask?.officerWork ?? [], selectedWorkKey),
    [selectedTask, selectedWorkKey],
  )
  const detailsTask = React.useMemo(
    () =>
      selectedTask
        ? (flattenOfficerWork(selectedTask, activeWork) as TaskRow)
        : null,
    [selectedTask, activeWork],
  )
  const selectedSprintEvidence = React.useMemo(() => {
    if (!selectedTaskKey || !sprintEvidenceByTaskKey) return []
    return sprintEvidenceByTaskKey[selectedTaskKey] ?? []
  }, [selectedTaskKey, sprintEvidenceByTaskKey])
  const canSubmitSelectedTaskWork = canSubmitDetailedTaskWork(
    sectionAccess,
    activeWork?.assignee ?? selectedTask?.assignee,
  )
  const selectedWorkKeyRef = React.useRef(selectedWorkKey)
  selectedWorkKeyRef.current = selectedWorkKey

  const updateTaskByKey = React.useCallback(
    (key: string, updates: Partial<TaskRow>) => {
      setTasks(prev =>
        prev.map(row => {
          if ((row._key ?? '') !== key) return row
          if (updates.officerWork) {
            const works = updates.officerWork
            return {
              ...row,
              ...updates,
              officerWork: works,
              assignee: works[0]?.assignee ?? null,
              assigneeName: works[0]?.assigneeName ?? null,
            }
          }
          const workUpdates = pickWorkFields(
            updates as Record<string, unknown>,
          ) as Partial<OfficerWorkRow>
          const rest = omitWorkFields(updates as Record<string, unknown>) as Partial<TaskRow>
          const workKey = selectedWorkKeyRef.current
          const officerWork =
            Object.keys(workUpdates).length > 0 && workKey
              ? (row.officerWork ?? []).map(work =>
                  work._key === workKey ? { ...work, ...workUpdates } : work,
                )
              : row.officerWork
          return { ...row, ...rest, officerWork }
        }),
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
      const existing = activeWork?.deliverable ?? []
      const updated =
        tag === 'main'
          ? [...existing.filter(e => (e.tag ?? 'support') !== 'main'), newEv]
          : [...existing, newEv]
      const isMainAndInProgress =
        tag === 'main' && activeWork?.status === 'in_progress'
      updateTaskByKey(selectedTaskKey, {
        deliverable: updated,
        ...(isMainAndInProgress && { status: 'delivered' }),
      })
      if (isMainAndInProgress) {
        const keyToShow = selectedTaskKey
        setTimeout(() => setPendingSubmitForReviewTaskKey(keyToShow), 0)
      }
    },
    [selectedTaskKey, activeWork, updateTaskByKey],
  )

  const handleRemoveDeliverable = React.useCallback(
    (itemKey: string) => {
      if (!selectedTaskKey) return
      const item = (activeWork?.deliverable ?? []).find(
        e => (e._key ?? '') === itemKey,
      )
      if (item?.locked) return
      const filtered = (activeWork?.deliverable ?? []).filter(
        e => (e._key ?? '') !== itemKey,
      )
      const isRemovingMain = (item?.tag ?? 'support') === 'main'
      const statusUpdate =
        isRemovingMain &&
        (activeWork?.status === 'delivered' ||
          activeWork?.status === 'in_review')
          ? { status: 'in_progress' as const }
          : {}
      updateTaskByKey(selectedTaskKey, {
        deliverable: filtered,
        ...statusUpdate,
      })
    },
    [selectedTaskKey, activeWork, updateTaskByKey],
  )

  const handleSubmitForReview = React.useCallback(
    async (key: string) => {
      const task = tasks.find(t => (t._key ?? '') === key)
      if (!task) return
      const work = findOfficerWork(task.officerWork ?? [], selectedWorkKeyRef.current) as OfficerWorkRow | null
      const deliverable = work?.deliverable ?? task.deliverable ?? []
      const mainEv = deliverable.find(e => (e.tag ?? 'support') === 'main')
      if (!mainEv) return
      const lockedDeliverable = deliverable.map(e =>
        (e.tag ?? 'support') === 'main' ? { ...e, locked: true } : e,
      )
      const submitEntry = {
        _key: `dr-${Date.now()}`,
        action: 'submit' as const,
        role: 'officer' as const,
        createdAt: new Date().toISOString(),
        author: sectionAccess.viewerStaffId
          ? { _id: sectionAccess.viewerStaffId }
          : undefined,
      }
      const workKey = work?._key
      const updatedTasks = tasks.map(row => {
        if ((row._key ?? '') !== key) return row
        if (!workKey) return row
        return {
          ...row,
          officerWork: (row.officerWork ?? []).map(copy =>
            copy._key === workKey
              ? {
                  ...copy,
                  deliverable: lockedDeliverable,
                  status: 'in_review',
                  deliverableReviewThread: [
                    ...(copy.deliverableReviewThread ?? []),
                    submitEntry,
                  ],
                }
              : copy,
          ),
        }
      })
      setTasks(updatedTasks)
      try {
        await saveTasks(updatedTasks)
        setPendingSubmitForReviewTaskKey(null)
      } catch {
        /* saveTasks shows toast */
      }
    },
    [tasks, saveTasks, sectionAccess.viewerStaffId],
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
          ...(activeWork?.inputsReviewThread ?? []),
          newEntry,
        ],
      })
    },
    [selectedTaskKey, activeWork, updateTaskByKey],
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
          ...(activeWork?.inputsReviewThread ?? []),
          newEntry,
        ],
      })
    },
    [selectedTaskKey, activeWork, updateTaskByKey],
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
          ...(activeWork?.inputsReviewThread ?? []),
          newEntry,
        ],
      })
    },
    [selectedTaskKey, activeWork, updateTaskByKey],
  )

  const handleRespondToRejection = React.useCallback(
    async (message: string, replacementFile?: File) => {
      if (!selectedTaskKey) return
      let inputs = activeWork?.inputs
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
          ...(activeWork?.inputsReviewThread ?? []),
          newEntry,
        ],
      })
    },
    [selectedTaskKey, activeWork, updateTaskByKey],
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
          ...(activeWork?.deliverableReviewThread ?? []),
          newEntry,
        ],
      })
    },
    [selectedTaskKey, activeWork, updateTaskByKey],
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
          ...(activeWork?.deliverableReviewThread ?? []),
          newEntry,
        ],
      })
    },
    [selectedTaskKey, activeWork, updateTaskByKey],
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
      const existing = activeWork?.deliverable ?? []
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
          ...(activeWork?.deliverableReviewThread ?? []),
          newEntry,
        ],
      })
    },
    [selectedTaskKey, activeWork, updateTaskByKey],
  )

  const getOrCreatePeriodDeliverable = (
    periodKey: string,
  ): NonNullable<TaskRow['periodDeliverables']>[0] => {
    const existing = activeWork?.periodDeliverables ?? []
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
    (
      periodKey: string,
      updater: (
        pd: NonNullable<TaskRow['periodDeliverables']>[0],
      ) => NonNullable<TaskRow['periodDeliverables']>[0],
    ) => {
      if (!selectedTaskKey) return
      const existing = activeWork?.periodDeliverables ?? []
      const idx = existing.findIndex(p => p.periodKey === periodKey)
      const pd =
        idx >= 0 ? existing[idx] : getOrCreatePeriodDeliverable(periodKey)
      const updatedPd = updater(pd)
      const updated =
        idx >= 0
          ? existing.map((p, i) => (i === idx ? updatedPd : p))
          : [...existing, updatedPd]
      updateTaskByKey(selectedTaskKey, { periodDeliverables: updated })
    },
    [selectedTaskKey, activeWork, updateTaskByKey],
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
          wasMain && (pd.status === 'delivered' || pd.status === 'in_review')
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
      officerWork: [],
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
      toast.success('Task added')
    } catch (err) {
      console.error(err)
      setTasks(tasks)
      setNewTask(trimmed)
    } finally {
      setIsAddingTask(false)
    }
  }

  const handleRemoveTaskByKey = React.useCallback(
    async (key: string) => {
      const previous = tasks
      const filtered = previous.filter(row => (row._key ?? '') !== key)
      setTasks(filtered)
      try {
        await saveTasks(filtered)
        toast.success('Task deleted')
      } catch (err) {
        console.error(err)
        setTasks(previous)
      }
    },
    [tasks, saveTasks],
  )

  const taskDetailsPanelEl = (
    <TaskDetailsPanel
      task={detailsTask}
      officers={officers}
      sectionId={section._id}
      activityType={activity.activityType}
      canManageContract={canManageContract}
      canSuperviseDetailedTasks={canSuperviseDetailedTasks}
      contractOfficer={contractOfficer}
      canSubmitTaskWork={canSubmitSelectedTaskWork}
      parentTargetDate={targetDate || activity.targetDate || null}
      workManagedInSprints
      sprintEvidence={selectedSprintEvidence}
      sprintsHref={sprintsHref}
      officerWorkTabs={
        canSuperviseDetailedTasks
          ? (selectedTask?.officerWork ?? [])
          : activeWork
            ? [activeWork]
            : []
      }
      activeWorkKey={selectedWorkKey}
      onActiveWorkKeyChange={setSelectedWorkKey}
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
  )

  return (
    <div className='flex flex-1 min-h-0 overflow-hidden lg:h-[calc(100vh-5rem)]'>
      <div className='flex flex-col flex-1 gap-6 p-4 md:p-8 pt-6 min-w-0 overflow-y-auto overscroll-contain'>
        <div className='flex items-center justify-between gap-3'>
          <Button
            variant='secondary'
            size='sm'
            className='w-fit -ml-2 shrink-0'
            asChild
          >
            <Link href={contractHref}>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back to contract
            </Link>
          </Button>
          {canManageContract && !isOfficerContract ? (
            <AlertDialog
              open={deleteDialogOpen}
              onOpenChange={open => {
                if (!isDeletingActivity) setDeleteDialogOpen(open)
              }}
            >
              <AlertDialogTrigger asChild>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive'
                  disabled={isDeletingActivity}
                >
                  <Trash2 className='mr-2 h-4 w-4' />
                  Delete activity
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent disableClose={isDeletingActivity}>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete measurable activity?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this measurable activity and
                    all of its detailed tasks. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeletingActivity}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    disabled={isDeletingActivity}
                    onClick={e => {
                      e.preventDefault()
                      void handleDeleteActivity()
                    }}
                  >
                    {isDeletingActivity ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Deleting…
                      </>
                    ) : (
                      'Delete'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
        <div>
          {!isOfficerContract ? (
            <>
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
                    className={`text-2xl font-bold rounded px-2 py-1 -mx-2 -my-1 ${canManageContract ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                    onClick={() => {
                      if (!canManageContract) return
                      setTitleBeforeEdit(title)
                      setIsEditingTitle(true)
                    }}
                  >
                    <span className='font-bold'>{activityCode} - </span>{' '}
                    <span className='font-normal'>{title}</span>
                  </h1>
                )}
              </div>
              {showActivityAim && (
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
                      className={`text-sm text-muted-foreground rounded px-2 py-1 -mx-2 -my-1 min-h-[2rem] mt-1 ${canManageContract ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                      onClick={() => {
                        if (!canManageContract) return
                        setAimBeforeEdit(aim)
                        setIsEditingAim(true)
                      }}
                    >
                      {aim || 'Click to add AIM...'}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className='max-w-prose'>
              <h1 className='text-2xl font-bold leading-snug'>
                <span className='font-bold'>
                  Initiative {initiativeCode} –{' '}
                </span>
                <span className='font-normal'>{initiativeTitle}</span>
              </h1>
            </div>
          )}

          {!isOfficerContract ? (
            <div className='mt-8 flex max-w-4xl flex-wrap items-start gap-8'>
              {numberingKind !== 'kpi' ? (
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
                      disabled={isSavingActivity || !canManageContract}
                      onCheckedChange={handlePeriodicReportingToggle}
                    />
                  </CardHeader>
                  {reportingFrequency !== 'n/a' ? (
                    <CardContent className='space-y-2 pt-0'>
                      <Label className='mb-2 text-sm'>Reporting frequency</Label>
                      <div className='flex items-center gap-2'>
                        <Select
                          value={reportingFrequency}
                          onValueChange={handleReportingFrequencyChange}
                          disabled={isSavingActivity || !canManageContract}
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
                        {isSavingReportingFrequency ? (
                          <Loader2 className='h-4 w-4 shrink-0 animate-spin text-muted-foreground' />
                        ) : null}
                      </div>
                    </CardContent>
                  ) : null}
                </Card>
              ) : null}

              <div className='flex flex-col gap-1'>
                <Label className='mb-2 text-sm'>Due Date</Label>
                <div className='flex items-center gap-2'>
                  {dueDateReportingFrequency === 'weekly' ? (
                    <div className='flex h-9 min-w-[200px] items-center gap-2 rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground'>
                      <CalendarIcon className='h-4 w-4 shrink-0' />
                      <span>
                        Due end of this week (
                        {format(endOfWeek(new Date()), 'PPP')})
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className='relative min-w-[200px]'>
                        <DatePicker
                          value={targetDate}
                          onChange={value => {
                            void handleTargetDateChange(value)
                          }}
                          placeholder='Select due date'
                          disabled={
                            isSavingActivity ||
                            isSavingDate ||
                            !canManageContract
                          }
                        />
                        {isSavingDate ? (
                          <Loader2 className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground' />
                        ) : null}
                      </div>
                      {dueDateReportingFrequency === 'monthly' ||
                      dueDateReportingFrequency === 'quarterly' ? (
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='h-9 text-muted-foreground'
                          disabled={isSavingActivity || !canManageContract}
                          onClick={() => {
                            const end =
                              dueDateReportingFrequency === 'quarterly'
                                ? endOfQuarter(new Date())
                                : endOfMonth(new Date())
                            void handleTargetDateChange(
                              format(end, 'yyyy-MM-dd'),
                            )
                          }}
                        >
                          Set to end of period
                        </Button>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div
            className={cn(
              'space-y-4 flex-1 min-w-0',
              isOfficerContract ? 'mt-6' : 'mt-10',
            )}
          >
            <h2 className='text-sm font-semibold'>Detailed Tasks</h2>
            {canSuperviseDetailedTasks ? (
              <div className='flex gap-2'>
                <Input
                  placeholder={
                    isOfficerContract
                      ? 'Add a detailed task'
                      : `Add a task to this ${activityKindLabel} measurable activity`
                  }
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  onKeyDown={e =>
                    e.key === 'Enter' && (e.preventDefault(), handleAddTask())
                  }
                  autoFocus
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
            ) : null}
            <DetailedTasksTable
              tasks={tasks}
              officers={officers}
              sectionId={section._id}
              selectedTaskKey={selectedTaskKey}
              onSelectTask={setSelectedTaskKey}
              onUpdateTask={updateTaskByKey}
              onRemoveTask={handleRemoveTaskByKey}
              isSaving={isSavingTasks}
              canSuperviseDetailedTasks={canSuperviseDetailedTasks}
              contractOfficer={contractOfficer}
            />
          </div>
        </div>
      </div>
      {isLg ? taskDetailsPanelEl : null}
      {!isLg && (
        <Sheet
          open={Boolean(selectedTaskKey)}
          onOpenChange={open => {
            if (!open) setSelectedTaskKey(null)
          }}
        >
          <SheetContent
            side='right'
            className='flex h-full max-h-[100dvh] w-full flex-col gap-0 p-0 sm:max-w-[24rem]'
          >
            <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-14'>
              {taskDetailsPanelEl}
            </div>
          </SheetContent>
        </Sheet>
      )}
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
