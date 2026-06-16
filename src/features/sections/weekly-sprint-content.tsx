'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
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
  MoreVertical,
  Info,
  FilePenLine,
  TriangleAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { RichTextContent } from '@/components/ui/rich-text-content'
import { Badge } from '@/components/ui/badge'
import { AllClearState } from '@/components/all-clear-state'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
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
import type { StakeholderEngagement } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
  canSubmitDetailedTaskWork,
  getSprintUiMode,
  type SectionAccess,
} from '@/lib/section-access'
import { useIsLg } from '@/hooks/use-is-lg'
import { toast } from 'sonner'
import { getEffectiveTaskStatus } from '@/lib/sprint-week'
import {
  buildSprintTaskWriteFields,
  isEmergencySprintCategory,
  isSprintDraftTaskComplete,
  getSprintActivityCategoryLabel,
  getSprintActivityCategoryOptions,
  isProjectSprintScope,
  sprintDraftNeedsContractInitiatives,
  sprintTaskRequiresContractLinks,
} from '@/lib/sprint-task-validation'
import { getRichTextPlainText } from '@/lib/rich-text'

export type {
  InitiativeWithActivities,
  ContractActivityTask,
} from '@/lib/flatten-initiatives-with-activities'
import {
  findContractActivity,
  findContractDetailedTask,
  type InitiativeWithActivities,
} from '@/lib/flatten-initiatives-with-activities'
import { getSupervisorSprintInitiatives } from '@/lib/supervisor-sprint-initiatives'
import { canSupervisorManageSprint } from '@/lib/sprint-workspace-scope'

const SprintTasksDownloadButton = dynamic(
  () =>
    import('./components/sprint-tasks-pdf').then(
      mod => mod.SprintTasksDownloadButton,
    ),
  {
    ssr: false,
    loading: () => null,
  },
)
import {
  scopeLabelsFromKind,
  theContractPhrase,
  type WorkspaceScopeKind,
} from '@/lib/project-workspace-copy'
import { cn } from '@/lib/utils'

interface WeeklySprintContentProps {
  sectionId: string
  sectionName: string
  sprints: WeeklySprint[]
  initiatives?: InitiativeWithActivities[]
  /** Supervisor contract initiatives keyed by `${sectionId}:${supervisorStaffId}`. */
  supervisorSprintInitiativesByStaffId?: Record<
    string,
    InitiativeWithActivities[]
  >
  officers?: Officer[]
  onSprintTabChange?: (tab: string) => void
  panelPortalNode?: HTMLDivElement | null
  /** Sanity staff id for signed-in user — filters accepted tasks for officers. */
  viewerStaffId?: string
  stakeholderEngagement?: StakeholderEngagement | null
  sectionAccess: SectionAccess
  workspaceScope?: WorkspaceScopeKind
  presentation?: 'tabs' | 'single-view'
  singleView?: 'ready' | 'in-review' | 'draft'
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
    className: string
  }
> = {
  pending: {
    label: 'Pending Review',
    variant: 'secondary',
    className:
      'text-orange-500 bg-orange-500/10 border-orange-500/50 hover:bg-orange-500/20',
  },
  accepted: {
    label: 'Accepted',
    variant: 'default',
    className: 'bg-green-700 text-white border-green-700 hover:bg-green-700/90',
  },
  rejected: {
    label: 'Rejected',
    variant: 'destructive',
    className:
      'text-destructive bg-destructive/10 border-destructive/50 hover:bg-destructive/20',
  },
  revisions_requested: {
    label: 'Revisions Requested',
    variant: 'outline',
    className:
      'text-orange-500 bg-orange-500/10 border-orange-500/50 hover:bg-orange-500/20',
  },
}

const weeklySprintSubTabTriggerClassName =
  'inline-flex items-center rounded-none border-b-2 border-transparent bg-transparent px-3 py-2 text-muted-foreground shadow-none transition-colors -mb-px data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none'

const sprintReviewTaskTabTriggerClassName = cn(
  weeklySprintSubTabTriggerClassName,
  'text-xs',
)

type SprintReviewTaskTab = 'accepted' | 'in-review' | 'rejected'

function getSprintReviewTaskTabCounts(tasks: SprintTask[]) {
  return {
    accepted: tasks.filter(task => task.status === 'accepted').length,
    inReview: tasks.filter(
      task =>
        task.status === 'pending' || task.status === 'revisions_requested',
    ).length,
    rejected: tasks.filter(task => task.status === 'rejected').length,
  }
}

function filterSprintReviewTasks(
  tasks: SprintTask[],
  tab: SprintReviewTaskTab,
): SprintTask[] {
  switch (tab) {
    case 'accepted':
      return tasks.filter(task => task.status === 'accepted')
    case 'rejected':
      return tasks.filter(task => task.status === 'rejected')
    case 'in-review':
      return tasks.filter(
        task =>
          task.status === 'pending' || task.status === 'revisions_requested',
      )
  }
}

const SPRINT_REVIEW_TASK_TABS: {
  value: SprintReviewTaskTab
  label: string
}[] = [
  { value: 'accepted', label: 'Accepted' },
  { value: 'in-review', label: 'In review' },
  { value: 'rejected', label: 'Rejected' },
]

function getReviewTabAllClearCopy(tab: SprintReviewTaskTab): {
  title: string
  description: string
} {
  switch (tab) {
    case 'accepted':
      return {
        title: 'All clear',
        description: 'No accepted tasks in this sprint yet.',
      }
    case 'rejected':
      return {
        title: 'All clear',
        description: 'No rejected tasks in this sprint.',
      }
    case 'in-review':
      return {
        title: 'All clear',
        description: 'No tasks awaiting review.',
      }
  }
}

type DraftTask = {
  /** Stable key for accordion state and new draft rows */
  _key: string
  description: string
  activityCategory: string
  initiativeKey: string
  activityKey: string
  contractTaskKey: string
}

function createDraftTaskKey(): string {
  return `draft-${crypto.randomUUID()}`
}

function sprintTaskToDraft(t: SprintTask): DraftTask {
  return {
    _key: t._key || createDraftTaskKey(),
    description: t.description ?? '',
    activityCategory: t.activityCategory ?? '',
    initiativeKey: t.initiativeKey ?? '',
    activityKey: t.activityKey ?? '',
    contractTaskKey: t.contractTaskKey ?? '',
  }
}

function createEmptyDraftTask(): DraftTask {
  return {
    _key: createDraftTaskKey(),
    description: '',
    activityCategory: '',
    initiativeKey: '',
    activityKey: '',
    contractTaskKey: '',
  }
}

type CreateSprintSnapshot = {
  selectedWeekIdx: string
  tasks: Array<{
    _key: string
    description: string
    activityCategory: string
    initiativeKey: string
    activityKey: string
    contractTaskKey: string
  }>
}

function snapshotCreateSprintForm(
  selectedWeekIdx: string,
  tasks: DraftTask[],
): CreateSprintSnapshot {
  return {
    selectedWeekIdx,
    tasks: tasks.map(task => ({
      _key: task._key,
      description: task.description,
      activityCategory: task.activityCategory,
      initiativeKey: task.initiativeKey,
      activityKey: task.activityKey,
      contractTaskKey: task.contractTaskKey,
    })),
  }
}

function isCreateSprintSnapshotEqual(
  a: CreateSprintSnapshot,
  b: CreateSprintSnapshot,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

interface SprintTaskAccordionSummaryProps {
  task: DraftTask
  index: number
  initiatives: InitiativeWithActivities[]
  isOpen: boolean
  actions: React.ReactNode
}

function SprintTaskAccordionSummary({
  task,
  index,
  initiatives,
  isOpen,
  actions,
}: SprintTaskAccordionSummaryProps) {
  const description = getRichTextPlainText(task.description)
  const title = description || `Task ${index + 1}`
  const categoryLabel = getSprintActivityCategoryLabel(task.activityCategory)
  const initiative = initiatives.find(item => item.key === task.initiativeKey)
  const showMeta = !isOpen && (categoryLabel || initiative?.title)

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
          {categoryLabel ? (
            <Badge variant='secondary' className='text-xs font-normal'>
              {categoryLabel}
            </Badge>
          ) : null}
          {initiative?.title ? (
            <span className='max-w-full truncate text-xs text-muted-foreground'>
              {initiative.title}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function SprintTaskDescriptionEditor({
  value,
  onChange,
  disabled = false,
  minHeight = '140px',
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  minHeight?: string
}) {
  return (
    <div className={disabled ? 'pointer-events-none opacity-50' : undefined}>
      <RichTextEditor
        value={value}
        onChange={onChange}
        placeholder='Describe the task...'
        minHeight={minHeight}
        enableMentions={false}
        className='text-xs'
      />
    </div>
  )
}

function draftTaskLinkOptions(
  initiatives: InitiativeWithActivities[],
  task: Pick<DraftTask, 'initiativeKey' | 'activityKey'>,
) {
  const activity = findContractActivity(
    initiatives,
    task.initiativeKey,
    task.activityKey,
  )
  return { activityHasDetailedTasks: (activity?.tasks.length ?? 0) > 0 }
}

function buildDraftTaskWritePayload(
  task: DraftTask,
  initiatives: InitiativeWithActivities[],
) {
  const init = initiatives.find(i => i.key === task.initiativeKey)
  const act = init?.activities.find(a => a.key === task.activityKey)
  const contractTask = findContractDetailedTask(
    initiatives,
    task.initiativeKey,
    task.activityKey,
    task.contractTaskKey,
  )
  return buildSprintTaskWriteFields({
    description: task.description,
    activityCategory: task.activityCategory,
    initiativeKey: task.initiativeKey,
    activityKey: task.activityKey,
    initiativeTitle: init?.title,
    activityTitle: act?.title,
    contractTaskKey: task.contractTaskKey,
    contractTaskTitle: contractTask?.title,
  })
}

type ContractLinkField = 'initiativeKey' | 'activityKey' | 'contractTaskKey'

function applyContractLinkFieldChange(
  task: DraftTask,
  field: ContractLinkField,
  value: string,
): DraftTask {
  if (field === 'initiativeKey') {
    return {
      ...task,
      initiativeKey: value,
      activityKey: '',
      contractTaskKey: '',
    }
  }
  if (field === 'activityKey') {
    return { ...task, activityKey: value, contractTaskKey: '' }
  }
  return { ...task, contractTaskKey: value }
}

const SPRINT_TASK_DIALOG_FORM_CLASS =
  'flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden'

const SPRINT_TASK_DIALOG_BODY_CLASS =
  'min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain py-2 pr-1 pb-2'

function SprintTaskContractLinkFields({
  contractPhrase,
  task,
  initiatives,
  disabled = false,
  onFieldChange,
}: {
  contractPhrase: string
  task: Pick<
    DraftTask,
    'activityCategory' | 'initiativeKey' | 'activityKey' | 'contractTaskKey'
  >
  initiatives: InitiativeWithActivities[]
  disabled?: boolean
  onFieldChange: (field: ContractLinkField, value: string) => void
}) {
  if (!task.activityCategory) {
    return null
  }

  if (isEmergencySprintCategory(task.activityCategory)) {
    return (
      <p className='rounded-md border border-dashed p-2 text-xs text-muted-foreground'>
        Emergency tasks are not linked to {contractPhrase}.
      </p>
    )
  }

  if (initiatives.length === 0) {
    return (
      <p className='rounded-md border border-dashed p-2 text-xs text-muted-foreground'>
        Add initiatives and measurable activities to {contractPhrase} before you
        can link sprint tasks.
      </p>
    )
  }

  const selectedInit = initiatives.find(i => i.key === task.initiativeKey)
  const selectedActivity = findContractActivity(
    initiatives,
    task.initiativeKey,
    task.activityKey,
  )
  const detailedTasks = selectedActivity?.tasks ?? []

  return (
    <div className='grid gap-2'>
      <div className='w-[100%] space-y-1 overflow-hidden p-1'>
        <Label className='text-xs' required>
          Related initiative
        </Label>
        <Select
          value={task.initiativeKey || undefined}
          onValueChange={v => onFieldChange('initiativeKey', v)}
          disabled={disabled}
        >
          <SelectTrigger className='w-[100%] overflow-hidden text-xs'>
            <SelectValue placeholder='Select related initiative' />
          </SelectTrigger>
          <SelectContent className='max-w-[var(--radix-select-trigger-width)]'>
            {initiatives.map(ini => (
              <SelectItem
                key={ini.key}
                value={ini.key}
                className='truncate text-xs'
              >
                {ini.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className='w-[100%] space-y-1 overflow-hidden p-1'>
        <Label className='text-xs' required>
          Related measurable activity
        </Label>
        <Select
          value={task.activityKey || undefined}
          onValueChange={v => onFieldChange('activityKey', v)}
          disabled={disabled || !task.initiativeKey}
        >
          <SelectTrigger className='w-[100%] overflow-hidden text-xs'>
            <SelectValue placeholder='Select related measurable activity' />
          </SelectTrigger>
          <SelectContent className='max-w-[var(--radix-select-trigger-width)]'>
            {(selectedInit?.activities ?? []).map(act => (
              <SelectItem
                key={act.key}
                value={act.key}
                className='whitespace-normal break-words text-xs'
              >
                {act.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {task.activityKey ? (
        detailedTasks.length > 0 ? (
          <div className='w-[100%] space-y-1 overflow-hidden p-1'>
            <Label className='text-xs' required>
              Related detailed task
            </Label>
            <Select
              value={task.contractTaskKey || undefined}
              onValueChange={v => onFieldChange('contractTaskKey', v)}
              disabled={disabled}
            >
              <SelectTrigger className='w-[100%] overflow-hidden text-xs'>
                <SelectValue placeholder='Select related detailed task' />
              </SelectTrigger>
              <SelectContent className='max-w-[var(--radix-select-trigger-width)]'>
                {detailedTasks.map(dt => (
                  <SelectItem
                    key={dt.key}
                    value={dt.key}
                    className='whitespace-normal break-words text-xs'
                  >
                    {dt.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className='rounded-md border border-dashed p-2 text-xs text-muted-foreground'>
            This measurable activity has no detailed tasks yet. Add them on your
            contract before linking sprint work.
          </p>
        )
      ) : null}
    </div>
  )
}

function SprintTaskContractLinkRows({
  initiativeTitle,
  activityTitle,
  contractTaskTitle,
}: {
  initiativeTitle?: string
  activityTitle?: string
  contractTaskTitle?: string
}) {
  if (!initiativeTitle && !activityTitle && !contractTaskTitle) return null

  return (
    <div className='mt-6 space-y-6 font-light bg-muted dark:bg-muted/30 rounded-md p-4'>
      {initiativeTitle ? (
        <div>
          <p className='text-[10px] font-medium text-muted-foreground'>
            Related initiative
          </p>
          <p className='text-xs'>{initiativeTitle}</p>
        </div>
      ) : null}
      {activityTitle ? (
        <div>
          <p className='text-[10px] font-medium text-muted-foreground'>
            Related measurable activity
          </p>
          <p className='text-xs leading-relaxed'>{activityTitle}</p>
        </div>
      ) : null}
      {contractTaskTitle ? (
        <div>
          <p className='text-[10px] font-medium text-muted-foreground'>
            Related detailed task
          </p>
          <p className='text-xs'>{contractTaskTitle}</p>
        </div>
      ) : null}
    </div>
  )
}

export function WeeklySprintContent({
  sectionId,
  sectionName,
  sprints,
  initiatives = [],
  supervisorSprintInitiativesByStaffId = {},
  officers = [],
  onSprintTabChange,
  panelPortalNode,
  viewerStaffId,
  stakeholderEngagement = null,
  sectionAccess,
  workspaceScope = 'mainstream',
  presentation = 'tabs',
  singleView = 'ready',
}: WeeklySprintContentProps) {
  const router = useRouter()
  const scopeLabels = scopeLabelsFromKind(workspaceScope)
  const isProjectSprint = isProjectSprintScope(workspaceScope)
  const activityCategoryOptions =
    getSprintActivityCategoryOptions(workspaceScope)
  const contractPhrase = theContractPhrase(scopeLabels)
  const sprintUiMode = getSprintUiMode(sectionAccess)
  const isOfficerView = sprintUiMode === 'officer'
  const showSprintSubTabs =
    presentation === 'tabs' &&
    (sectionAccess.canViewSprintDraftTab ||
      sectionAccess.canViewSprintInReviewTab)
  const isLg = useIsLg()

  const [createOpen, setCreateOpen] = React.useState(false)
  const [editingSprintId, setEditingSprintId] = React.useState<string | null>(
    null,
  )
  const [isSavingSprint, setIsSavingSprint] = React.useState(false)
  const [draftTasks, setDraftTasks] = React.useState<DraftTask[]>([
    createEmptyDraftTask(),
  ])
  const [openCreateTaskAccordion, setOpenCreateTaskAccordion] =
    React.useState('')
  const [discardCreateSprintOpen, setDiscardCreateSprintOpen] =
    React.useState(false)
  const createSprintSnapshotRef = React.useRef<CreateSprintSnapshot | null>(
    null,
  )

  const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false)
  const [reviewingSprintId, setReviewingSprintId] = React.useState('')
  const [reviewingTask, setReviewingTask] = React.useState<SprintTask | null>(
    null,
  )
  const [reviewAction, setReviewAction] = React.useState<string>('')
  const [revisionReason, setRevisionReason] = React.useState('')
  const [isReviewing, setIsReviewing] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState<string | null>(null)
  const [sprintToDelete, setSprintToDelete] =
    React.useState<WeeklySprint | null>(null)
  const [isDeletingSprint, setIsDeletingSprint] = React.useState(false)
  const [reviseOpen, setReviseOpen] = React.useState(false)
  const [reviseSprintId, setReviseSprintId] = React.useState('')
  const [reviseSprintSectionId, setReviseSprintSectionId] = React.useState('')
  const [reviseSupervisorStaffId, setReviseSupervisorStaffId] =
    React.useState('')
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
  const [extraTaskMode, setExtraTaskMode] = React.useState<
    'officer-extra' | 'supervisor-plan'
  >('officer-extra')
  const [extraTaskSprintId, setExtraTaskSprintId] = React.useState('')
  const [extraTaskSprintSectionId, setExtraTaskSprintSectionId] =
    React.useState('')
  const [extraTaskSupervisorStaffId, setExtraTaskSupervisorStaffId] =
    React.useState('')
  const [extraTaskDraft, setExtraTaskDraft] = React.useState<DraftTask>(
    createEmptyDraftTask,
  )
  const [isSavingExtraTask, setIsSavingExtraTask] = React.useState(false)

  const reviseInitiatives = React.useMemo(() => {
    if (!reviseSupervisorStaffId) return initiatives
    const supervisorInitiatives = getSupervisorSprintInitiatives(
      supervisorSprintInitiativesByStaffId,
      reviseSprintSectionId || sectionId,
      reviseSupervisorStaffId,
    )
    return supervisorInitiatives.length > 0
      ? supervisorInitiatives
      : initiatives
  }, [
    reviseSupervisorStaffId,
    reviseSprintSectionId,
    sectionId,
    supervisorSprintInitiativesByStaffId,
    initiatives,
  ])

  const extraTaskInitiatives = React.useMemo(() => {
    if (extraTaskMode !== 'supervisor-plan' || !extraTaskSupervisorStaffId) {
      return initiatives
    }
    const supervisorInitiatives = getSupervisorSprintInitiatives(
      supervisorSprintInitiativesByStaffId,
      extraTaskSprintSectionId || sectionId,
      extraTaskSupervisorStaffId,
    )
    return supervisorInitiatives.length > 0
      ? supervisorInitiatives
      : initiatives
  }, [
    extraTaskMode,
    extraTaskSupervisorStaffId,
    extraTaskSprintSectionId,
    sectionId,
    supervisorSprintInitiativesByStaffId,
    initiatives,
  ])

  const fyWeeks = React.useMemo(() => getFYWeeks(), [])
  const [selectedWeekIdx, setSelectedWeekIdx] = React.useState('0')
  const todayStart = React.useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }, [])
  const existingSprintWeeks = React.useMemo(() => {
    const set = new Set<string>()
    for (const s of sprints) {
      if (s.weekStart && s.weekEnd) {
        set.add(`${s.weekStart}__${s.weekEnd}`)
      }
    }
    return set
  }, [sprints])
  const currentWeekIdx = React.useMemo(() => {
    const idx = fyWeeks.findIndex(w => {
      const start = parseYMDLocal(w.start)
      const end = endOfDayLocal(parseYMDLocal(w.end))
      return todayStart >= start && todayStart <= end
    })
    return idx >= 0 ? String(idx) : '0'
  }, [fyWeeks, todayStart])
  const firstAvailableWeekIdx = React.useMemo(() => {
    const idx = fyWeeks.findIndex(w => {
      const isPast = endOfDayLocal(parseYMDLocal(w.end)) < todayStart
      const hasSprint = existingSprintWeeks.has(`${w.start}__${w.end}`)
      return !isPast && !hasSprint
    })
    return idx >= 0 ? String(idx) : currentWeekIdx
  }, [fyWeeks, todayStart, existingSprintWeeks, currentWeekIdx])

  React.useEffect(() => {
    if (presentation === 'single-view') {
      setSprintTab(singleView)
      return
    }
    if (!showSprintSubTabs) {
      onSprintTabChange?.('ready')
    } else if (sprintUiMode === 'manager') {
      setSprintTab('in-review')
    }
  }, [
    presentation,
    singleView,
    showSprintSubTabs,
    sprintUiMode,
    onSprintTabChange,
    setSprintTab,
  ])

  const addTask = () => {
    const nextTask = createEmptyDraftTask()
    setDraftTasks(prev => [...prev, nextTask])
    setOpenCreateTaskAccordion(nextTask._key)
  }

  const removeTask = (index: number) => {
    if (draftTasks.length === 1) {
      const replacement = createEmptyDraftTask()
      setDraftTasks([replacement])
      setOpenCreateTaskAccordion(replacement._key)
      return
    }

    const removedKey = draftTasks[index]?._key
    const next = draftTasks.filter((_, i) => i !== index)
    setDraftTasks(next)

    if (removedKey && openCreateTaskAccordion === removedKey) {
      const nextOpenIndex = Math.min(index, next.length - 1)
      setOpenCreateTaskAccordion(next[nextOpenIndex]?._key ?? '')
    }
  }

  const updateTaskField = (
    index: number,
    field: keyof DraftTask,
    value: string,
  ) =>
    setDraftTasks(prev =>
      prev.map((t, i) => {
        if (i !== index) return t
        if (
          field === 'initiativeKey' ||
          field === 'activityKey' ||
          field === 'contractTaskKey'
        ) {
          return applyContractLinkFieldChange(t, field, value)
        }
        if (field === 'activityCategory' && isEmergencySprintCategory(value)) {
          return {
            ...t,
            activityCategory: value,
            initiativeKey: '',
            activityKey: '',
            contractTaskKey: '',
          }
        }
        return { ...t, [field]: value }
      }),
    )

  const openNewSprintDialog = () => {
    const firstTask = createEmptyDraftTask()
    const weekIdx = firstAvailableWeekIdx
    createSprintSnapshotRef.current = snapshotCreateSprintForm(weekIdx, [
      firstTask,
    ])
    setEditingSprintId(null)
    setDraftTasks([firstTask])
    setOpenCreateTaskAccordion(firstTask._key)
    setSelectedWeekIdx(weekIdx)
    setDiscardCreateSprintOpen(false)
    setCreateOpen(true)
  }

  const openEditDraftSprint = (sprint: WeeklySprint) => {
    setEditingSprintId(sprint._id)
    const mapped = (sprint.tasks ?? []).map(sprintTaskToDraft)
    const nextTasks = mapped.length > 0 ? mapped : [createEmptyDraftTask()]
    const idx = fyWeeks.findIndex(
      w => w.start === sprint.weekStart && w.end === sprint.weekEnd,
    )
    const weekIdx = idx >= 0 ? String(idx) : '0'
    createSprintSnapshotRef.current = snapshotCreateSprintForm(
      weekIdx,
      nextTasks,
    )
    setDraftTasks(nextTasks)
    setOpenCreateTaskAccordion(nextTasks[0]._key)
    setSelectedWeekIdx(weekIdx)
    setDiscardCreateSprintOpen(false)
    setCreateOpen(true)
  }

  const isCreateSprintDirty = React.useMemo(() => {
    if (!createOpen || !createSprintSnapshotRef.current) return false
    return !isCreateSprintSnapshotEqual(
      snapshotCreateSprintForm(selectedWeekIdx, draftTasks),
      createSprintSnapshotRef.current,
    )
  }, [createOpen, selectedWeekIdx, draftTasks])

  const resetCreateSprintDialog = React.useCallback(() => {
    setEditingSprintId(null)
    setDraftTasks([createEmptyDraftTask()])
    setOpenCreateTaskAccordion('')
    setSelectedWeekIdx('0')
    createSprintSnapshotRef.current = null
  }, [])

  const closeCreateSprintDialog = React.useCallback(() => {
    setDiscardCreateSprintOpen(false)
    setCreateOpen(false)
    resetCreateSprintDialog()
  }, [resetCreateSprintDialog])

  const requestCloseCreateSprint = React.useCallback(() => {
    if (isSavingSprint) return
    if (isCreateSprintDirty) {
      setDiscardCreateSprintOpen(true)
      return
    }
    closeCreateSprintDialog()
  }, [closeCreateSprintDialog, isCreateSprintDirty, isSavingSprint])

  const handleSaveSprint = async (e: React.FormEvent) => {
    e.preventDefault()
    const validTasks = draftTasks.filter(t =>
      isSprintDraftTaskComplete(t, draftTaskLinkOptions(initiatives, t)),
    )
    const week = fyWeeks[Number(selectedWeekIdx)]
    if (validTasks.length === 0 || !week) return
    if (endOfDayLocal(parseYMDLocal(week.end)) < todayStart) {
      alert(
        'Past sprint weeks are locked. Please select the current week or a future week.',
      )
      return
    }
    if (
      !editingSprintId &&
      existingSprintWeeks.has(`${week.start}__${week.end}`)
    ) {
      alert(
        'A sprint already exists for this week. Please choose a different week.',
      )
      return
    }

    setIsSavingSprint(true)
    try {
      const tasksPayload = validTasks.map(t => ({
        ...(t._key && { _key: t._key }),
        ...buildDraftTaskWritePayload(t, initiatives),
      }))

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

      closeCreateSprintDialog()
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to save sprint')
    } finally {
      setIsSavingSprint(false)
    }
  }

  const openReviseDialog = (sprint: WeeklySprint, task: SprintTask) => {
    setReviseSprintId(sprint._id)
    setReviseSprintSectionId(sprint.sectionId ?? sectionId)
    setReviseSupervisorStaffId(sprint.supervisor?._id ?? '')
    setReviseTaskDraft(sprintTaskToDraft(task))
    setReviseManagerFeedback(task.revisionReason?.trim() ?? '')
    setReviseOpen(true)
  }

  const setReviseField = (field: keyof DraftTask, value: string) => {
    setReviseTaskDraft(prev => {
      if (!prev) return prev
      if (
        field === 'initiativeKey' ||
        field === 'activityKey' ||
        field === 'contractTaskKey'
      ) {
        return applyContractLinkFieldChange(prev, field, value)
      }
      if (field === 'activityCategory' && isEmergencySprintCategory(value)) {
        return {
          ...prev,
          activityCategory: value,
          initiativeKey: '',
          activityKey: '',
          contractTaskKey: '',
        }
      }
      return { ...prev, [field]: value }
    })
  }

  const handleSaveRevise = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !reviseTaskDraft?._key ||
      !isSprintDraftTaskComplete(
        reviseTaskDraft,
        draftTaskLinkOptions(reviseInitiatives, reviseTaskDraft),
      )
    ) {
      return
    }

    setIsSavingRevise(true)
    try {
      const res = await fetch(`/api/weekly-sprints/${reviseSprintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revise-task',
          taskKey: reviseTaskDraft._key,
          ...buildDraftTaskWritePayload(reviseTaskDraft, reviseInitiatives),
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
      setReviseSprintSectionId('')
      setReviseSupervisorStaffId('')
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
          : isProjectSprint
            ? 'Failed to mark sprint as ready'
            : 'Failed to submit sprint for review',
      )
    } finally {
      setIsSubmitting(null)
    }
  }

  const confirmDeleteDraftSprint = async () => {
    if (!sprintToDelete) return
    setIsDeletingSprint(true)
    try {
      const res = await fetch(`/api/weekly-sprints/${sprintToDelete._id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Failed to delete',
        )
      }
      if (editingSprintId === sprintToDelete._id) {
        setEditingSprintId(null)
        setCreateOpen(false)
        setDraftTasks([createEmptyDraftTask()])
      }
      setSprintToDelete(null)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to delete sprint')
    } finally {
      setIsDeletingSprint(false)
    }
  }

  const openReview = (sprintId: string, task: SprintTask, action: string) => {
    setReviewingSprintId(sprintId)
    setReviewingTask(task)
    setReviewAction(action)
    setRevisionReason(
      action === 'revisions_requested'
        ? (task.revisionReason?.trim() ?? '')
        : '',
    )
    setReviewDialogOpen(true)
  }

  const handleReview = async () => {
    if (!reviewingTask || !reviewAction) return
    if (reviewAction === 'revisions_requested' && !revisionReason.trim()) return

    const reviewStatus =
      reviewAction === 'withdraw_revision' ? 'pending' : reviewAction

    setIsReviewing(true)
    try {
      const res = await fetch(`/api/weekly-sprints/${reviewingSprintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review-task',
          taskKey: reviewingTask._key,
          reviewStatus,
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
      if (reviewAction === 'revisions_requested') {
        toast.success(
          reviewingTask.status === 'revisions_requested'
            ? 'Revision request updated'
            : 'Feedback sent successfully',
        )
      }
      if (reviewAction === 'withdraw_revision') {
        toast.success('Revision request withdrawn')
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
    if (!isOfficerView) return acceptedSprintGroups
    if (!viewerStaffId) return []
    return acceptedSprintGroups
      .map(g => ({
        ...g,
        tasks: g.tasks.filter(t => t.assignee === viewerStaffId),
      }))
      .filter(g => g.tasks.length > 0)
  }, [acceptedSprintGroups, isOfficerView, viewerStaffId])

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

  const currentWeekNonDraftSprints = React.useMemo(() => {
    const now = new Date()
    return nonDraftSprints.filter(s => {
      const start = parseYMDLocal(s.weekStart)
      const end = endOfDayLocal(parseYMDLocal(s.weekEnd))
      return now >= start && now <= end
    })
  }, [nonDraftSprints])

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
      stakeholderEngagementId?: string
      stakeholderKey?: string
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
        stakeholderEngagementId: submission.stakeholderEngagementId,
        stakeholderKey: submission.stakeholderKey,
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

  const openExtraTaskDialog = (sprintId?: string) => {
    setExtraTaskMode('officer-extra')
    setExtraTaskDraft(createEmptyDraftTask())
    setExtraTaskSprintId(sprintId ?? currentWeekNonDraftSprints[0]?._id ?? '')
    setExtraTaskSprintSectionId('')
    setExtraTaskSupervisorStaffId('')
    setExtraTaskOpen(true)
  }

  const openPlanTaskDialog = (sprint: WeeklySprint) => {
    setExtraTaskMode('supervisor-plan')
    setExtraTaskDraft(createEmptyDraftTask())
    setExtraTaskSprintId(sprint._id)
    setExtraTaskSprintSectionId(sprint.sectionId ?? sectionId)
    setExtraTaskSupervisorStaffId(sprint.supervisor?._id ?? '')
    setExtraTaskOpen(true)
  }

  const setExtraTaskField = (field: keyof DraftTask, value: string) => {
    setExtraTaskDraft(prev => {
      if (
        field === 'initiativeKey' ||
        field === 'activityKey' ||
        field === 'contractTaskKey'
      ) {
        return applyContractLinkFieldChange(prev, field, value)
      }
      if (field === 'activityCategory' && isEmergencySprintCategory(value)) {
        return {
          ...prev,
          activityCategory: value,
          initiativeKey: '',
          activityKey: '',
          contractTaskKey: '',
        }
      }
      return { ...prev, [field]: value }
    })
  }

  const handleCreateExtraTask = async (e: React.FormEvent) => {
    e.preventDefault()
    const taskInitiatives =
      extraTaskMode === 'supervisor-plan' ? extraTaskInitiatives : initiatives
    if (
      !isSprintDraftTaskComplete(
        extraTaskDraft,
        draftTaskLinkOptions(taskInitiatives, extraTaskDraft),
      ) ||
      !extraTaskSprintId
    ) {
      return
    }

    setIsSavingExtraTask(true)
    try {
      const res = await fetch(`/api/weekly-sprints/${extraTaskSprintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:
            extraTaskMode === 'supervisor-plan'
              ? 'add-plan-task'
              : 'add-extra-task',
          ...buildDraftTaskWritePayload(extraTaskDraft, taskInitiatives),
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
      setExtraTaskDraft(createEmptyDraftTask())
      setExtraTaskSprintId('')
      setExtraTaskSprintSectionId('')
      setExtraTaskSupervisorStaffId('')
      setExtraTaskMode('officer-extra')
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to add extra task')
    } finally {
      setIsSavingExtraTask(false)
    }
  }

  const validDraftTasks = draftTasks.filter(t =>
    isSprintDraftTaskComplete(t, draftTaskLinkOptions(initiatives, t)),
  )
  const createSprintNeedsContractInitiatives =
    sprintDraftNeedsContractInitiatives(validDraftTasks)

  const draftSprints = sprints.filter(s => s.status === 'draft')
  /** Submitted (awaiting / in review) and reviewed (all tasks decided) — both stay visible here. */
  const submittedOrReviewedSprints = sprints.filter(s => {
    if (s.status === 'submitted') return true
    if (s.status !== 'reviewed') return false
    const tasks = s.tasks ?? []
    const allAccepted =
      tasks.length > 0 && tasks.every(t => t.status === 'accepted')
    return !allAccepted
  })

  const canSubmitSprintTaskWork = canSubmitDetailedTaskWork(
    sectionAccess,
    selectedAcceptedTask?.assignee ?? null,
  )

  const detailPanel = (
    <SprintTaskDetailsPanel
      task={selectedAcceptedTask}
      officers={officers}
      sectionId={sectionId}
      canSuperviseDetailedTasks={sectionAccess.canSuperviseDetailedTasks}
      canSubmitTaskWork={canSubmitSprintTaskWork}
      onUpdate={handleUpdateTask}
      onAddWorkSubmission={handleAddWorkSubmission}
      onApproveSubmission={handleApproveSubmission}
      onRejectSubmission={handleRejectSubmission}
      onRespondToSubmissionRejection={handleRespondToSubmissionRejection}
      isSaving={isSavingTask}
      stakeholderEngagement={stakeholderEngagement}
    />
  )

  const readySprintsEmptyMessage = isOfficerView
    ? !viewerStaffId
      ? `Your account could not be matched to a staff record for this ${scopeLabels.unit}. Ensure your sign-in email matches your staff profile.`
      : 'No tasks assigned to you yet.'
    : 'No sprints yet, Check back later'

  const readySprintsContent = (
    <div className='mt-4 space-y-4'>
      {groupsForAcceptedUi.length === 0 ? (
        <Card>
          <CardContent className='pt-6'>
            <p className='text-sm text-muted-foreground'>
              {readySprintsEmptyMessage}
            </p>
          </CardContent>
        </Card>
      ) : (
        groupsForAcceptedUi.map(({ sprint, tasks }) => (
          <AcceptedSprintTasksCard
            key={sprint._id}
            sprint={sprint}
            sectionName={sectionName}
            tasks={tasks}
            officers={officers}
            sectionId={sectionId}
            showWorkstreamBadge={isProjectSprint}
            selectedTaskKey={selectedTaskKey}
            onSelectTask={setSelectedTaskKey}
            onUpdateTask={handleUpdateTask}
            isSaving={isSavingTask}
            canAddPlanTask={
              canSupervisorManageSprint(sprint, sectionAccess) &&
              initiatives.length > 0
            }
            onAddPlanTask={openPlanTaskDialog}
            canSuperviseDetailedTasks={sectionAccess.canSuperviseDetailedTasks}
          />
        ))
      )}
      {panelPortalNode && isLg && createPortal(detailPanel, panelPortalNode)}
    </div>
  )

  const draftSprintsContent = (
    <div className='space-y-4 mt-4'>
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
            sectionName={sectionName}
            sprint={sprint}
            onSubmit={() => handleSubmitSprint(sprint._id)}
            isSubmitting={
              isSubmitting === sprint._id ||
              (isDeletingSprint && sprintToDelete?._id === sprint._id)
            }
            onEditDraft={() => openEditDraftSprint(sprint)}
            onDeleteDraft={() => setSprintToDelete(sprint)}
            canSubmitDraft={sectionAccess.canCreateSprints}
            isProjectSprint={isProjectSprint}
            onReviewTask={(task, action) =>
              openReview(sprint._id, task, action)
            }
          />
        ))
      )}
    </div>
  )

  const inReviewSprintsContent = (
    <div className='space-y-4 mt-4'>
      {submittedOrReviewedSprints.length === 0 ? (
        <Card>
          <CardContent className='pt-6'>
            <p className='text-sm text-muted-foreground'>
              No sprints in review.
            </p>
          </CardContent>
        </Card>
      ) : (
        submittedOrReviewedSprints.map(sprint => (
          <SprintCard
            key={sprint._id}
            sectionName={sectionName}
            sprint={sprint}
            onSubmit={() => handleSubmitSprint(sprint._id)}
            isSubmitting={isSubmitting === sprint._id}
            canManagerReviewPlan={sectionAccess.isSectionManager}
            onReviewTask={(task, action) =>
              openReview(sprint._id, task, action)
            }
            onOpenRevise={
              sectionAccess.isSectionManager ? undefined : openReviseDialog
            }
            canAddPlanTask={canSupervisorManageSprint(sprint, sectionAccess)}
            onAddPlanTask={openPlanTaskDialog}
          />
        ))
      )}
    </div>
  )

  const singleViewContent =
    singleView === 'draft'
      ? draftSprintsContent
      : singleView === 'in-review'
        ? inReviewSprintsContent
        : readySprintsContent

  return (
    <div className='space-y-4'>
      {presentation === 'single-view' ? (
        <>
          {singleView === 'draft' && sectionAccess.canCreateSprints ? (
            <div className='flex justify-end'>
              <Button onClick={openNewSprintDialog} size='sm'>
                <Plus className='h-4 w-4' />
                New Sprint
              </Button>
            </div>
          ) : null}
          {singleViewContent}
        </>
      ) : !showSprintSubTabs ? (
        readySprintsContent
      ) : (
        <Tabs value={sprintTab} onValueChange={setSprintTab}>
          <div className='flex items-center justify-between'>
            <TabsList className='inline-flex h-auto w-auto flex-wrap items-stretch gap-1 rounded-none border-b border-border bg-transparent p-0'>
              {sectionAccess.canViewSprintDraftTab ? (
                <TabsTrigger
                  value='draft'
                  className={weeklySprintSubTabTriggerClassName}
                >
                  Drafts
                  {draftSprints.length > 0 && (
                    <Badge
                      variant='secondary'
                      className='ml-1.5 text-[10px] px-1.5 py-0'
                    >
                      {draftSprints.length}
                    </Badge>
                  )}
                </TabsTrigger>
              ) : null}

              {sectionAccess.canViewSprintInReviewTab ? (
                <TabsTrigger
                  value='in-review'
                  className={weeklySprintSubTabTriggerClassName}
                >
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
              ) : null}
              <TabsTrigger
                value='ready'
                className={weeklySprintSubTabTriggerClassName}
              >
                Ready
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
            {sprintTab === 'draft' && sectionAccess.canCreateSprints ? (
              <Button onClick={openNewSprintDialog} size='sm'>
                <Plus className='h-4 w-4' />
                New Sprint
              </Button>
            ) : null}
          </div>

          {sectionAccess.canViewSprintDraftTab ? (
            <TabsContent value='draft'>{draftSprintsContent}</TabsContent>
          ) : null}

          {sectionAccess.canViewSprintInReviewTab ? (
            <TabsContent value='in-review'>
              {inReviewSprintsContent}
            </TabsContent>
          ) : null}

          <TabsContent value='ready' className='mt-4 space-y-4'>
            {readySprintsContent}
          </TabsContent>
        </Tabs>
      )}

      {!isLg &&
      ((presentation === 'single-view' && singleView === 'ready') ||
        !showSprintSubTabs ||
        sprintTab === 'ready') ? (
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
              {detailPanel}
            </div>
          </SheetContent>
        </Sheet>
      ) : null}

      {/* Create Sprint Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={open => {
          if (open) {
            setCreateOpen(true)
            return
          }
          requestCloseCreateSprint()
        }}
      >
        <DialogContent
          disableClose={isSavingSprint}
          className={cn(
            'flex flex-col gap-0 overflow-hidden rounded-xl p-0',
            '!fixed !inset-3 !bottom-3 !left-3 !right-3 !top-3',
            '!h-auto !max-h-none !w-auto !max-w-none',
            '!translate-x-0 !translate-y-0',
            'sm:!inset-4',
            '[&>button.absolute]:hidden',
          )}
        >
          <form
            onSubmit={e => {
              e.stopPropagation()
              handleSaveSprint(e)
            }}
            className='flex min-h-0 flex-1 flex-col overflow-hidden'
          >
            <div className='flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6'>
              <div className='min-w-0'>
                <DialogTitle className='truncate text-left text-base sm:text-lg'>
                  {editingSprintId ? 'Edit draft sprint' : 'New Weekly Sprint'}
                </DialogTitle>
                <DialogDescription className='text-left'>
                  {editingSprintId
                    ? isProjectSprint
                      ? 'Update the week and tasks for this draft. Mark as ready when complete.'
                      : 'Update the week and tasks for this draft. Submit when ready for review.'
                    : 'Create a sprint plan for a week in the current financial year.'}
                </DialogDescription>
              </div>
              <div className='flex shrink-0 items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={requestCloseCreateSprint}
                  disabled={isSavingSprint}
                >
                  Cancel
                </Button>
                <Button
                  type='submit'
                  size='sm'
                  disabled={
                    isSavingSprint ||
                    validDraftTasks.length === 0 ||
                    (createSprintNeedsContractInitiatives &&
                      initiatives.length === 0)
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
              </div>
            </div>

            <div className='flex flex-wrap items-end justify-between gap-3 border-b bg-muted/30 px-4 py-3 sm:px-6'>
              <div className='min-w-[220px] flex-1 space-y-1.5 max-w-md'>
                <Label required className='text-xs'>
                  Week
                </Label>
                <Select
                  value={selectedWeekIdx}
                  onValueChange={setSelectedWeekIdx}
                  disabled={isSavingSprint}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select week' />
                  </SelectTrigger>
                  <SelectContent>
                    {fyWeeks.map((w, i) => {
                      const isPast =
                        endOfDayLocal(parseYMDLocal(w.end)) < todayStart
                      const hasSprint = existingSprintWeeks.has(
                        `${w.start}__${w.end}`,
                      )
                      const disabled = isPast || (!editingSprintId && hasSprint)
                      return (
                        <SelectItem
                          key={i}
                          value={String(i)}
                          disabled={disabled}
                        >
                          {w.label}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <Badge variant='secondary' className='rounded-full px-3 py-1'>
                {draftTasks.length} task{draftTasks.length === 1 ? '' : 's'}
              </Badge>
            </div>

            <div className='min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6'>
              <div className='space-y-3'>
                <Label required>Tasks</Label>
                <Accordion
                  type='single'
                  collapsible
                  value={openCreateTaskAccordion}
                  onValueChange={setOpenCreateTaskAccordion}
                  className='w-full rounded-lg border'
                >
                  {draftTasks.map((task, i) => {
                    const isOpen = openCreateTaskAccordion === task._key

                    return (
                      <AccordionItem
                        key={task._key}
                        value={task._key}
                        className='border-b px-4 last:border-b-0'
                      >
                        <AccordionTrigger className='w-full items-stretch py-3 hover:no-underline'>
                          <SprintTaskAccordionSummary
                            task={task}
                            index={i}
                            initiatives={initiatives}
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
                                    removeTask(i)
                                  }}
                                  disabled={isSavingSprint}
                                  aria-label={`Remove task ${i + 1}`}
                                >
                                  <Trash2 className='h-4 w-4' />
                                </Button>
                              </>
                            }
                          />
                        </AccordionTrigger>

                        <AccordionContent className='space-y-3 px-0.5 pb-4'>
                          <div className='space-y-2'>
                            <Label className='text-xs' required>
                              Description
                            </Label>
                            <SprintTaskDescriptionEditor
                              value={task.description}
                              onChange={value =>
                                updateTaskField(i, 'description', value)
                              }
                              disabled={isSavingSprint}
                              minHeight='180px'
                            />
                          </div>
                          <div className='w-full space-y-1 overflow-hidden p-0.5'>
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
                              <SelectTrigger className='w-full overflow-hidden text-xs'>
                                <SelectValue placeholder='Select activity category' />
                              </SelectTrigger>
                              <SelectContent>
                                {activityCategoryOptions.map(c => (
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
                          <SprintTaskContractLinkFields
                            contractPhrase={contractPhrase}
                            task={task}
                            initiatives={initiatives}
                            disabled={isSavingSprint}
                            onFieldChange={(field, value) =>
                              updateTaskField(i, field, value)
                            }
                          />
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
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
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={discardCreateSprintOpen}
        onOpenChange={setDiscardCreateSprintOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this sprint plan. If you leave now,
              your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              onClick={closeCreateSprintDialog}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={extraTaskOpen}
        onOpenChange={open => {
          setExtraTaskOpen(open)
          if (!open) {
            setExtraTaskDraft(createEmptyDraftTask())
            setExtraTaskSprintId('')
            setExtraTaskSprintSectionId('')
            setExtraTaskSupervisorStaffId('')
            setExtraTaskMode('officer-extra')
          }
        }}
      >
        <DialogContent disableClose={isSavingExtraTask} layout='scrollable'>
          <form
            onSubmit={handleCreateExtraTask}
            className={SPRINT_TASK_DIALOG_FORM_CLASS}
          >
            <DialogHeader className='shrink-0 pr-8'>
              <DialogTitle>
                {extraTaskMode === 'supervisor-plan'
                  ? 'Add task to sprint'
                  : 'Add extra task'}
              </DialogTitle>
              <DialogDescription>
                {extraTaskMode === 'supervisor-plan'
                  ? 'Add a new task to this sprint plan for manager review.'
                  : 'Add an extra task to the current sprint week'}
              </DialogDescription>
            </DialogHeader>
            <div className={SPRINT_TASK_DIALOG_BODY_CLASS}>
              <div className='space-y-2 pb-4'>
                <Label required>Week</Label>
                <Select
                  value={extraTaskSprintId}
                  onValueChange={setExtraTaskSprintId}
                  disabled
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select week' />
                  </SelectTrigger>
                  <SelectContent>
                    {(extraTaskMode === 'supervisor-plan'
                      ? submittedOrReviewedSprints
                      : currentWeekNonDraftSprints
                    ).map(s => (
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
              <div className='m-0.5'>
                <SprintTaskDescriptionEditor
                  value={extraTaskDraft.description}
                  onChange={value => setExtraTaskField('description', value)}
                  disabled={isSavingExtraTask}
                  minHeight='180px'
                />
              </div>
              {extraTaskMode === 'supervisor-plan' ? (
                <div className='w-[100%] overflow-hidden space-y-1 p-1'>
                  <Label className='text-xs' required>
                    Activity category
                  </Label>
                  <Select
                    value={extraTaskDraft.activityCategory || undefined}
                    onValueChange={v =>
                      setExtraTaskField('activityCategory', v)
                    }
                    disabled={isSavingExtraTask}
                  >
                    <SelectTrigger className='w-[100%] text-xs overflow-hidden'>
                      <SelectValue placeholder='Select activity category' />
                    </SelectTrigger>
                    <SelectContent>
                      {activityCategoryOptions.map(c => (
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
              ) : null}

              <SprintTaskContractLinkFields
                contractPhrase={contractPhrase}
                task={extraTaskDraft}
                initiatives={extraTaskInitiatives}
                disabled={isSavingExtraTask}
                onFieldChange={(field, value) =>
                  setExtraTaskField(field, value)
                }
              />
            </div>
            <DialogFooter className='mt-0 shrink-0 border-t bg-background pt-4'>
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
                  !isSprintDraftTaskComplete(
                    extraTaskDraft,
                    draftTaskLinkOptions(extraTaskInitiatives, extraTaskDraft),
                  ) ||
                  !extraTaskSprintId ||
                  (sprintTaskRequiresContractLinks(
                    extraTaskDraft.activityCategory,
                  ) &&
                    extraTaskInitiatives.length === 0)
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
        <DialogContent disableClose={isReviewing}>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'accepted' && 'Accept Task'}
              {reviewAction === 'rejected' && 'Reject Task'}
              {reviewAction === 'revisions_requested' &&
                (reviewingTask?.status === 'revisions_requested'
                  ? 'Update revision request'
                  : 'Request Revisions')}
              {reviewAction === 'withdraw_revision' && 'Withdraw revision request'}
            </DialogTitle>
            <DialogDescription>
              Review this sprint task before deciding.
            </DialogDescription>
          </DialogHeader>
          {reviewingTask ? (
            <div className='rounded-md border bg-muted/20 p-3'>
              <RichTextContent
                html={reviewingTask.description}
                className='text-sm'
                emptyText='No description provided.'
              />
            </div>
          ) : null}
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
            {reviewAction === 'withdraw_revision' && (
              <p className='text-sm text-muted-foreground'>
                This will return the task to pending review and remove your
                revision request.
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
              variant={
                reviewAction === 'rejected' ||
                reviewAction === 'withdraw_revision'
                  ? 'destructive'
                  : 'default'
              }
            >
              {isReviewing ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  {reviewAction === 'revisions_requested'
                    ? 'Saving...'
                    : 'Reviewing...'}
                </>
              ) : reviewAction === 'revisions_requested' ? (
                reviewingTask?.status === 'revisions_requested' ? (
                  'Update request'
                ) : (
                  'Submit Feedback'
                )
              ) : reviewAction === 'withdraw_revision' ? (
                'Withdraw request'
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
            setReviseSprintSectionId('')
            setReviseSupervisorStaffId('')
            setReviseManagerFeedback('')
          }
        }}
      >
        <DialogContent disableClose={isSavingRevise} layout='scrollable'>
          {reviseTaskDraft && (
            <form
              onSubmit={handleSaveRevise}
              className={SPRINT_TASK_DIALOG_FORM_CLASS}
            >
              <DialogHeader className='shrink-0 pr-8'>
                <DialogTitle>Revise task</DialogTitle>
                <DialogDescription>
                  Edit this task and resubmit it for manager review.
                  {reviseManagerFeedback ? (
                    <div className='items-start gap-2 text-xs my-5 rounded-xl text-orange-500 border border-orange-500/50 bg-orange-500/10 px-4 py-2 leading-relaxed'>
                      <span className='font-medium uppercase text-foreground mr-1'>
                        Feedback :{' '}
                      </span>
                      {reviseManagerFeedback}
                    </div>
                  ) : null}
                </DialogDescription>
              </DialogHeader>
              <div className={SPRINT_TASK_DIALOG_BODY_CLASS}>
                <Label className='text-xs' required>
                  Description
                </Label>
                <div className='m-0.5'>
                  <SprintTaskDescriptionEditor
                    value={reviseTaskDraft.description}
                    onChange={value => setReviseField('description', value)}
                    disabled={isSavingRevise}
                    minHeight='180px'
                  />
                </div>
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
                      {activityCategoryOptions.map(c => (
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
                <SprintTaskContractLinkFields
                  contractPhrase={contractPhrase}
                  task={reviseTaskDraft}
                  initiatives={reviseInitiatives}
                  disabled={isSavingRevise}
                  onFieldChange={(field, value) => setReviseField(field, value)}
                />
              </div>
              <DialogFooter className='mt-0 shrink-0 border-t bg-background pt-4'>
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
                    !isSprintDraftTaskComplete(
                      reviseTaskDraft,
                      draftTaskLinkOptions(reviseInitiatives, reviseTaskDraft),
                    ) ||
                    (sprintTaskRequiresContractLinks(
                      reviseTaskDraft.activityCategory,
                    ) &&
                      reviseInitiatives.length === 0)
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

      <AlertDialog
        open={sprintToDelete !== null}
        onOpenChange={open =>
          !open && !isDeletingSprint && setSprintToDelete(null)
        }
      >
        <AlertDialogContent disableClose={isDeletingSprint}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete draft sprint?</AlertDialogTitle>
            <AlertDialogDescription>
              {sprintToDelete
                ? `"${sprintToDelete.weekLabel}" will be permanently removed. This cannot be undone.`
                : 'This sprint will be permanently removed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingSprint}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.preventDefault()
                void confirmDeleteDraftSprint()
              }}
              disabled={isDeletingSprint}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {isDeletingSprint ? (
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
    </div>
  )
}

function AcceptedSprintTasksCard({
  sprint,
  sectionName,
  tasks,
  officers,
  sectionId,
  showWorkstreamBadge = false,
  selectedTaskKey,
  onSelectTask,
  onUpdateTask,
  isSaving,
  canAddPlanTask = false,
  onAddPlanTask,
  canSuperviseDetailedTasks,
}: {
  sprint: WeeklySprint
  sectionName: string
  tasks: AcceptedSprintTask[]
  officers: Officer[]
  sectionId: string
  showWorkstreamBadge?: boolean
  selectedTaskKey: string | null
  onSelectTask: (key: string | null) => void
  onUpdateTask: (
    sprintId: string,
    taskKey: string,
    updates: Record<string, unknown>,
  ) => void
  isSaving: boolean
  canAddPlanTask?: boolean
  onAddPlanTask?: (sprint: WeeklySprint) => void
  canSuperviseDetailedTasks: boolean
}) {
  const weekStartDate = parseYMDLocal(sprint.weekStart)
  const weekEndDate = parseYMDLocal(sprint.weekEnd)
  const now = new Date()
  const sprintNotStarted = now < weekStartDate
  const sprintCompleted = now > endOfDayLocal(weekEndDate)
  const sprintOngoing = !sprintNotStarted && !sprintCompleted
  const isCurrentWeek =
    now >= weekStartDate && now <= endOfDayLocal(weekEndDate)

  const [open, setOpen] = React.useState(isCurrentWeek)

  const pendingCount = React.useMemo(() => {
    return tasks.filter(
      t => getEffectiveTaskStatus(t, sprint.weekStart) !== 'done',
    ).length
  }, [tasks, sprint.weekStart])

  const statusBadge = React.useMemo(() => {
    if (sprintNotStarted) {
      return {
        variant: 'outline' as const,
        className: 'border-orange-500',
        label: `Starting in ${formatTimeUntil(weekStartDate, now)}`,
      }
    }
    if (sprintOngoing) {
      return {
        variant: 'secondary' as const,
        className: 'bg-orange-500 text-white border-orange-500',
        label: 'Ongoing',
      }
    }
    if (pendingCount > 0) {
      return {
        variant: 'destructive' as const,
        className: '',
        label: `Completed with ${pendingCount} task${pendingCount === 1 ? '' : 's'} pending`,
      }
    }
    return {
      variant: 'default' as const,
      className: 'bg-green-700 text-white border-green-700',
      label: 'Completed',
    }
  }, [sprintNotStarted, sprintOngoing, pendingCount, weekStartDate, now])

  const showAddPlanTask =
    isCurrentWeek &&
    canAddPlanTask &&
    Boolean(onAddPlanTask) &&
    (sprint.status === 'submitted' || sprint.status === 'reviewed')

  const addPlanTaskButton = showAddPlanTask ? (
    <Button
      type='button'
      variant='outline'
      size='sm'
      className='h-8'
      onClick={() => onAddPlanTask?.(sprint)}
      disabled={isSaving}
      title={`Add a task to ${sprint.weekLabel}`}
    >
      <Plus className='mr-2 h-4 w-4' />
      Add extra task
    </Button>
  ) : null

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between gap-3'>
            <div className='min-w-0 flex-1 space-y-3'>
              {showWorkstreamBadge && sprint.workstreamName ? (
                <Badge
                  variant='outline'
                  className='w-fit max-w-full truncate text-xs font-normal text-orange-500'
                >
                  {sprint.workstreamName}
                </Badge>
              ) : null}
              <CardTitle className='min-w-0 text-base font-medium truncate'>
                {sprint.weekLabel}
              </CardTitle>
              <p className='text-xs text-muted-foreground'>
                {sprint.supervisor?.fullName &&
                  `Supervised by ${sprint.supervisor.fullName} · `}
                {tasks.length} task{tasks.length === 1 ? '' : 's'}
              </p>
              <Badge
                variant={statusBadge.variant}
                className={`${statusBadge.className} w-fit pointer-events-none select-none`}
              >
                {statusBadge.label}
              </Badge>
              {addPlanTaskButton ? (
                <div className='lg:hidden'>{addPlanTaskButton}</div>
              ) : null}
            </div>
            <div className='flex shrink-0 items-center gap-2'>
              {addPlanTaskButton ? (
                <div className='hidden lg:block'>{addPlanTaskButton}</div>
              ) : null}
              <SprintTasksDownloadButton
                sectionName={sectionName}
                sprint={sprint}
              />
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
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className='pt-6'>
            <SprintTasksTable
              tasks={tasks}
              officers={officers}
              sectionId={sectionId}
              selectedTaskKey={selectedTaskKey}
              onSelectTask={onSelectTask}
              onUpdateTask={onUpdateTask}
              isSaving={isSaving}
              canSuperviseDetailedTasks={canSuperviseDetailedTasks}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

function parseYMDLocal(s: string) {
  const [y, m, d] = s.split('-').map(n => parseInt(n, 10))
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function endOfDayLocal(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

function formatTimeUntil(target: Date, from: Date) {
  const ms = Math.max(0, target.getTime() - from.getTime())
  const totalMinutes = Math.round(ms / 60000)
  if (totalMinutes < 60) return `${totalMinutes}m`
  const totalHours = Math.round(totalMinutes / 60)
  if (totalHours < 48) return `${totalHours}h`
  const totalDays = Math.round(totalHours / 24)
  return `${totalDays}d`
}

function SprintCard({
  sectionName,
  sprint,
  onSubmit,
  onEditDraft,
  onDeleteDraft,
  isSubmitting,
  canManagerReviewPlan = false,
  canSubmitDraft = true,
  isProjectSprint = false,
  onReviewTask,
  onOpenRevise,
  canAddPlanTask = false,
  onAddPlanTask,
}: {
  sectionName: string
  sprint: WeeklySprint
  onSubmit: () => void
  onEditDraft?: () => void
  onDeleteDraft?: () => void
  isSubmitting: boolean
  canManagerReviewPlan?: boolean
  canSubmitDraft?: boolean
  isProjectSprint?: boolean
  onReviewTask: (task: SprintTask, action: string) => void
  /** Open dialog to edit this task and resubmit for manager review. */
  onOpenRevise?: (sprint: WeeklySprint, task: SprintTask) => void
  canAddPlanTask?: boolean
  onAddPlanTask?: (sprint: WeeklySprint) => void
}) {
  const [open, setOpen] = React.useState(true)
  const tasks = sprint.tasks || []
  const accepted = tasks.filter(t => t.status === 'accepted').length
  const total = tasks.length

  const hasRevisionsRequested = tasks.some(
    t => t.status === 'revisions_requested',
  )

  const isReviewInProgress = sprint.status !== 'draft' && hasRevisionsRequested

  const sprintStatusBadge = isReviewInProgress
    ? {
        label: isProjectSprint ? 'Updates requested' : 'Review in progress',
        variant: 'default' as const,
      }
    : {
        draft: { label: 'Draft', variant: 'secondary' as const },
        submitted: {
          label: isProjectSprint ? 'Ready' : 'Submitted for Review',
          variant: 'default' as const,
        },
        reviewed: {
          label: isProjectSprint ? 'Ready' : 'Review complete',
          variant: 'outline' as const,
        },
      }[sprint.status]

  const isInReviewSprint =
    sprint.status === 'submitted' || sprint.status === 'reviewed'

  const reviewTaskCounts = React.useMemo(
    () => getSprintReviewTaskTabCounts(tasks),
    [tasks],
  )

  const [reviewTaskTab, setReviewTaskTab] =
    React.useState<SprintReviewTaskTab>('in-review')

  const visibleTasks = React.useMemo(() => {
    if (!isInReviewSprint) return tasks
    return filterSprintReviewTasks(tasks, reviewTaskTab)
  }, [isInReviewSprint, reviewTaskTab, tasks])

  const reviewTabAllClearCopy = getReviewTabAllClearCopy(reviewTaskTab)

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <div className='space-y-3 min-w-0 flex-1'>
              <CardTitle className='text-base'>{sprint.weekLabel}</CardTitle>
              <p className='text-xs text-muted-foreground'>
                {sprint.supervisor?.fullName &&
                  `Supervised by ${sprint.supervisor.fullName} · `}
                {accepted}/{total} accepted
              </p>
              {!isSubmitting ? (
                <Badge
                  variant={sprintStatusBadge.variant}
                  className='w-fit text-[10px] px-1.5 py-0'
                >
                  {sprintStatusBadge.label}
                </Badge>
              ) : null}
            </div>
            <div className='flex items-center gap-2'>
              <SprintTasksDownloadButton
                sectionName={sectionName}
                sprint={sprint}
              />
              {isSubmitting ? (
                <Badge
                  variant='secondary'
                  className='inline-flex items-center gap-1.5'
                >
                  <Loader2 className='h-3 w-3 animate-spin' />
                  {isProjectSprint ? 'Marking as ready…' : 'Submitting…'}
                </Badge>
              ) : null}
              {(sprint.status === 'submitted' ||
                sprint.status === 'reviewed') &&
                canAddPlanTask &&
                onAddPlanTask && (
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='h-8'
                    onClick={() => onAddPlanTask(sprint)}
                  >
                    <Plus className='mr-1 h-4 w-4' />
                    Add task
                  </Button>
                )}
              {sprint.status === 'draft' &&
                (onEditDraft || onDeleteDraft || canSubmitDraft) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8'
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          <MoreVertical className='h-4 w-4' />
                        )}
                        <span className='sr-only'>Sprint actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      {onEditDraft ? (
                        <DropdownMenuItem
                          onClick={onEditDraft}
                          disabled={isSubmitting}
                        >
                          <Pencil className='mr-2 h-4 w-4' />
                          Edit
                        </DropdownMenuItem>
                      ) : null}
                      {canSubmitDraft ? (
                        <DropdownMenuItem
                          disabled={isSubmitting || tasks.length === 0}
                          onSelect={event => {
                            event.preventDefault()
                            if (!isSubmitting && tasks.length > 0) {
                              onSubmit()
                            }
                          }}
                        >
                          {isSubmitting ? (
                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                          ) : (
                            <Send className='mr-2 h-4 w-4' />
                          )}
                          {isSubmitting
                            ? isProjectSprint
                              ? 'Marking as ready…'
                              : 'Submitting…'
                            : isProjectSprint
                              ? 'Mark as Ready'
                              : 'Submit to manager'}
                        </DropdownMenuItem>
                      ) : null}
                      {onDeleteDraft ? (
                        <>
                          {(onEditDraft || canSubmitDraft) && (
                            <DropdownMenuSeparator />
                          )}
                          <DropdownMenuItem
                            className='text-destructive focus:text-destructive'
                            onClick={onDeleteDraft}
                            disabled={isSubmitting}
                          >
                            <Trash2 className='mr-2 h-4 w-4' />
                            Delete
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
          <CardContent className='pt-6'>
            {isInReviewSprint ? (
              <Tabs
                value={reviewTaskTab}
                onValueChange={value =>
                  setReviewTaskTab(value as SprintReviewTaskTab)
                }
                className='space-y-4'
              >
                <TabsList className='inline-flex h-auto w-full flex-wrap items-stretch justify-start gap-1 rounded-none border-b border-border bg-transparent p-0'>
                  {SPRINT_REVIEW_TASK_TABS.map(tab => {
                    const count =
                      tab.value === 'accepted'
                        ? reviewTaskCounts.accepted
                        : tab.value === 'rejected'
                          ? reviewTaskCounts.rejected
                          : reviewTaskCounts.inReview

                    return (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className={sprintReviewTaskTabTriggerClassName}
                      >
                        {tab.label}
                        {count > 0 ? (
                          <Badge
                            variant='secondary'
                            className='ml-1.5 text-[10px] px-1.5 py-0'
                          >
                            {count}
                          </Badge>
                        ) : null}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
              </Tabs>
            ) : null}
            <div className='space-y-6'>
              {visibleTasks.map((task, i) => {
                const config = STATUS_CONFIG[task.status] ?? {
                  label: task.status ?? 'Unknown',
                  variant: 'secondary' as const,
                  className:
                    'text-orange-500 bg-orange-500/10 border-orange-500/50 hover:bg-orange-500/20',
                }
                const canReview =
                  canManagerReviewPlan &&
                  sprint.status === 'submitted' &&
                  task.status === 'pending'
                const canRevise =
                  !canManagerReviewPlan &&
                  task.status === 'revisions_requested' &&
                  (sprint.status === 'submitted' ||
                    sprint.status === 'reviewed') &&
                  Boolean(onOpenRevise)
                const canManageRevisionRequest =
                  canManagerReviewPlan &&
                  task.status === 'revisions_requested' &&
                  (sprint.status === 'submitted' ||
                    sprint.status === 'reviewed')
                const showRevisionReason =
                  task.status === 'revisions_requested' &&
                  Boolean(task.revisionReason)
                const hasFooter =
                  showRevisionReason ||
                  canRevise ||
                  canReview ||
                  canManageRevisionRequest
                return (
                  <div
                    key={task._key || i}
                    className='flex flex-col rounded-md border shadow-md p-6'
                  >
                    <div className='min-w-0'>
                      <div className='mb-4 space-y-5'>
                        <Badge
                          variant={config.variant}
                          className={cn(
                            'w-fit text-[10px] px-1.5 py-0',
                            config.className,
                          )}
                        >
                          {config.label}
                        </Badge>
                        <RichTextContent
                          html={task.description}
                          className='text-sm'
                          emptyText='No description provided.'
                        />
                      </div>

                      <SprintTaskContractLinkRows
                        initiativeTitle={task.initiativeTitle}
                        activityTitle={task.activityTitle}
                        contractTaskTitle={task.contractTaskTitle}
                      />
                    </div>
                    {hasFooter ? (
                      <div
                        className={cn(
                          'mt-4 flex items-center gap-3 border-t pt-4',
                          showRevisionReason
                            ? 'justify-between'
                            : 'justify-end',
                        )}
                      >
                        {showRevisionReason ? (
                          <div className='flex min-w-0 flex-1 items-center rounded-2xl p-2 text-xs'>
                            <TriangleAlert
                              strokeWidth={1.5}
                              className='mr-2 h-6 w-6 shrink-0 text-orange-500'
                            />
                            <span className='min-w-0'>
                              Revisions requested: {task.revisionReason}
                            </span>
                          </div>
                        ) : null}
                        {(canRevise || canReview || canManageRevisionRequest) && (
                          <div className='flex shrink-0 items-center gap-2'>
                            {canRevise && (
                              <Button
                                type='button'
                                size='sm'
                                className='h-8'
                                onClick={() => onOpenRevise?.(sprint, task)}
                              >
                                <FilePenLine
                                  className='h-4 w-4'
                                  strokeWidth={1.2}
                                />
                                Make revisions
                              </Button>
                            )}
                            {canManageRevisionRequest && (
                              <>
                                <Button
                                  type='button'
                                  size='sm'
                                  variant='outline'
                                  className='h-8'
                                  onClick={() =>
                                    onReviewTask(task, 'revisions_requested')
                                  }
                                >
                                  <Pencil className='h-4 w-4' />
                                  Update request
                                </Button>
                                <Button
                                  type='button'
                                  size='sm'
                                  variant='outline'
                                  className='h-8'
                                  onClick={() =>
                                    onReviewTask(task, 'withdraw_revision')
                                  }
                                >
                                  Withdraw
                                </Button>
                              </>
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
                        )}
                      </div>
                    ) : null}
                  </div>
                )
              })}
              {visibleTasks.length === 0 ? (
                isInReviewSprint ? (
                  <AllClearState
                    compact
                    title={reviewTabAllClearCopy.title}
                    description={reviewTabAllClearCopy.description}
                  />
                ) : (
                  <p className='text-sm text-muted-foreground py-2'>
                    No tasks in this sprint.
                  </p>
                )
              ) : null}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
