'use client'

import * as React from 'react'
import Image from 'next/image'
import { endOfMonth, endOfWeek, format } from 'date-fns'
import {
  CalendarIcon,
  Check,
  ChevronDown,
  Download,
  Eye,
  Loader2,
  Lock,
  Paperclip,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Switch } from '@/components/ui/switch'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  getExpectedPeriodsForTask,
  parseDateAsLocal,
  type ReportingFrequency,
} from '@/lib/reporting-periods'
import { cn } from '@/lib/utils'
import { OfficerSwitcher, type Officer } from './officer-switcher'
import { PeriodDeliverableTabs } from './period-deliverable-tabs'
import { hasOfficerContent, type TaskRow } from './detailed-tasks-table'
import { InfoCircledIcon } from '@radix-ui/react-icons'

const PRIORITIES = [
  { label: 'Highest', value: 'highest' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
  { label: 'Lowest', value: 'lowest' },
]

const TASK_STATUSES = [
  { label: 'To do', value: 'to_do' },
  { label: 'Inputs submitted', value: 'inputs_submitted' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'In review', value: 'in_review' },
  { label: 'Done', value: 'done' },
]

interface TaskDetailsPanelProps {
  task: TaskRow | null
  officers: Officer[]
  sectionId: string
  activityType?: 'kpi' | 'cross-cutting'
  onUpdate: (updates: Partial<TaskRow>) => void
  onAddInputs: (file: File) => Promise<void>
  onApproveInputs: (reason?: string) => void
  onRejectInputs: (message: string) => void
  onRespondToRejection: (
    message: string,
    replacementFile?: File,
  ) => Promise<void>
  onAddDeliverable: (file: File, tag: 'support' | 'main') => Promise<void>
  onRemoveDeliverable: (key: string) => void
  onSubmitForReview?: () => void
  onApproveDeliverable?: (reason?: string) => void
  onRejectDeliverable?: (message: string) => void
  onRespondToDeliverableRejection?: (
    message: string,
    replacementFile?: File,
  ) => Promise<void>
  onAddPeriodDeliverable?: (
    periodKey: string,
    file: File,
    tag: 'support' | 'main',
  ) => Promise<void>
  onRemovePeriodDeliverable?: (periodKey: string, key: string) => void
  onSubmitPeriodForReview?: (periodKey: string) => void
  onApprovePeriodDeliverable?: (periodKey: string, reason?: string) => void
  onRejectPeriodDeliverable?: (periodKey: string, message: string) => void
  onRespondToPeriodDeliverableRejection?: (
    periodKey: string,
    message: string,
    replacementFile?: File,
  ) => Promise<void>
  isSaving: boolean
}

export function TaskDetailsPanel({
  task,
  officers,
  sectionId,
  activityType,
  onUpdate,
  onAddInputs,
  onApproveInputs,
  onRejectInputs,
  onRespondToRejection,
  onAddDeliverable,
  onRemoveDeliverable,
  onSubmitForReview,
  onApproveDeliverable,
  onRejectDeliverable,
  onRespondToDeliverableRejection,
  onAddPeriodDeliverable,
  onRemovePeriodDeliverable,
  onSubmitPeriodForReview,
  onApprovePeriodDeliverable,
  onRejectPeriodDeliverable,
  onRespondToPeriodDeliverableRejection,
  isSaving,
}: TaskDetailsPanelProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const inputsFileRef = React.useRef<HTMLInputElement>(null)
  const pendingTagRef = React.useRef<'support' | 'main'>('support')
  const [approveDialogOpen, setApproveDialogOpen] = React.useState(false)
  const [approveReason, setApproveReason] = React.useState('')
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false)
  const [rejectMessage, setRejectMessage] = React.useState('')
  const [resubmitDialogOpen, setResubmitDialogOpen] = React.useState(false)
  const [resubmitFile, setResubmitFile] = React.useState<File | null>(null)
  const [resubmitComment, setResubmitComment] = React.useState('')
  const [resubmitting, setResubmitting] = React.useState(false)
  const resubmitFileRef = React.useRef<HTMLInputElement>(null)
  const [uploadingInputs, setUploadingInputs] = React.useState(false)
  const [deliverableApproveDialogOpen, setDeliverableApproveDialogOpen] =
    React.useState(false)
  const [deliverableApproveReason, setDeliverableApproveReason] =
    React.useState('')
  const [deliverableRejectDialogOpen, setDeliverableRejectDialogOpen] =
    React.useState(false)
  const [deliverableRejectMessage, setDeliverableRejectMessage] =
    React.useState('')
  const [deliverableResubmitDialogOpen, setDeliverableResubmitDialogOpen] =
    React.useState(false)
  const [deliverableResubmitFile, setDeliverableResubmitFile] =
    React.useState<File | null>(null)
  const [deliverableResubmitComment, setDeliverableResubmitComment] =
    React.useState('')
  const [deliverableResubmitting, setDeliverableResubmitting] =
    React.useState(false)
  const deliverableResubmitFileRef = React.useRef<HTMLInputElement>(null)
  const taskEditRef = React.useRef<HTMLDivElement>(null)
  const [uploadingTag, setUploadingTag] = React.useState<
    'support' | 'main' | null
  >(null)
  const [isEditingTask, setIsEditingTask] = React.useState(false)
  const [taskEditValue, setTaskEditValue] = React.useState('')
  const [isEditingDeliverable, setIsEditingDeliverable] = React.useState(false)
  const [deliverableEditValue, setDeliverableEditValue] = React.useState('')
  const [waitingForSave, setWaitingForSave] = React.useState(false)
  const [waitingForReject, setWaitingForReject] = React.useState(false)
  const [waitingForApprove, setWaitingForApprove] = React.useState(false)
  const [waitingForDeliverableApprove, setWaitingForDeliverableApprove] =
    React.useState(false)
  const [waitingForDeliverableReject, setWaitingForDeliverableReject] =
    React.useState(false)
  const [datePopoverOpen, setDatePopoverOpen] = React.useState(false)
  const deliverableEditRef = React.useRef<HTMLDivElement>(null)
  const [selectedPeriodKey, setSelectedPeriodKey] = React.useState<
    string | null
  >(null)
  const pendingPeriodKeyRef = React.useRef<string | null>(null)

  const isSavingTask = isSaving || waitingForSave
  const isKPI = activityType === 'kpi'
  const isDone = (task?.status ?? '') === 'done'
  const hasAssignee = Boolean(task?.assignee)
  const taskConfigLocked = task ? hasOfficerContent(task) : false
  const assigneeLocked = taskConfigLocked
  const expectedDeliverableSet = !!task?.expectedDeliverable?.trim()
  const hasInputsFile = Boolean(task?.inputs?.file?.asset?.url)
  const inputsApproved = task
    ? ['in_progress', 'delivered', 'in_review', 'done'].includes(
        task.status ?? '',
      )
    : false
  const taskFreq = (task?.reportingFrequency ?? 'n/a') as
    | 'weekly'
    | 'monthly'
    | 'quarterly'
    | 'n/a'
  const inputsLocked =
    isKPI &&
    (!expectedDeliverableSet ||
      (taskFreq !== 'n/a' && !task?.reportingPeriodStart))
  const deliverablesLocked =
    (isKPI && !expectedDeliverableSet) || !inputsApproved
  const periodDeliverablesGateMet =
    hasInputsFile && (!isKPI || expectedDeliverableSet)
  const isPeriodicallyReported = isKPI && taskFreq !== 'n/a'
  const dueDateRequiredMissing = !isPeriodicallyReported && !task?.targetDate
  const periodicScheduleMissing =
    isPeriodicallyReported && !task?.reportingPeriodStart

  React.useEffect(() => {
    if (!task || taskFreq === 'n/a') {
      setSelectedPeriodKey(null)
      return
    }
    if (task.reportingPeriodStart) {
      const periods = getExpectedPeriodsForTask(
        task.reportingPeriodStart,
        taskFreq as ReportingFrequency,
      )
      if (periods.length > 0) {
        const now = new Date()
        const todayStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        )
        const lastSelectable = [...periods]
          .reverse()
          .find(p => parseDateAsLocal(p.startDate) <= todayStart)
        const defaultKey = lastSelectable?.periodKey ?? periods[0].periodKey
        setSelectedPeriodKey(prev => {
          const valid = periods.some(p => p.periodKey === prev)
          if (!valid) return defaultKey
          const isFuture =
            parseDateAsLocal(
              periods.find(x => x.periodKey === prev)!.startDate,
            ) > todayStart
          return isFuture ? defaultKey : prev
        })
      }
    }
  }, [
    task?._key,
    task?.reportingFrequency,
    task?.reportingPeriodStart,
    taskFreq,
  ])

  const handleConfirmTask = () => {
    const trimmed = taskEditValue.trim()
    if (trimmed) {
      onUpdate({ task: trimmed })
      setWaitingForSave(true)
    } else {
      setIsEditingTask(false)
    }
  }

  const handleCancelTask = () => {
    if (task) setTaskEditValue(task.task)
    setWaitingForSave(false)
    setIsEditingTask(false)
  }

  const handleConfirmDeliverable = () => {
    const trimmed = deliverableEditValue.trim()
    if (!trimmed) return
    onUpdate({ expectedDeliverable: trimmed })
    setWaitingForSave(true)
  }

  const handleCancelDeliverable = () => {
    if (task) setDeliverableEditValue(task.expectedDeliverable ?? '')
    setWaitingForSave(false)
    setIsEditingDeliverable(false)
  }

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isSavingTask) return
      const target = e.target as Node
      if (
        isEditingTask &&
        taskEditRef.current &&
        !taskEditRef.current.contains(target)
      ) {
        handleCancelTask()
      }
      if (
        isEditingDeliverable &&
        deliverableEditRef.current &&
        !deliverableEditRef.current.contains(target)
      ) {
        handleCancelDeliverable()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isEditingTask, isEditingDeliverable, isSavingTask])

  React.useEffect(() => {
    if (task) {
      setTaskEditValue(task.task)
      setDeliverableEditValue(task.expectedDeliverable ?? '')
      setIsEditingTask(false)
      setIsEditingDeliverable(false)
      setWaitingForSave(false)
      setWaitingForReject(false)
    }
  }, [task?._key])

  const prevIsSavingRef = React.useRef(isSaving)
  React.useEffect(() => {
    const wasSaving = prevIsSavingRef.current
    prevIsSavingRef.current = isSaving
    if (
      wasSaving &&
      !isSaving &&
      (waitingForSave ||
        waitingForReject ||
        waitingForApprove ||
        waitingForDeliverableApprove ||
        waitingForDeliverableReject)
    ) {
      setWaitingForSave(false)
      setWaitingForReject(false)
      setWaitingForApprove(false)
      setWaitingForDeliverableApprove(false)
      setWaitingForDeliverableReject(false)
      setIsEditingTask(false)
      setIsEditingDeliverable(false)
      if (waitingForReject) {
        setRejectDialogOpen(false)
        setRejectMessage('')
      }
      if (waitingForApprove) {
        setApproveDialogOpen(false)
        setApproveReason('')
      }
      if (waitingForDeliverableReject) {
        setDeliverableRejectDialogOpen(false)
        setDeliverableRejectMessage('')
      }
      if (waitingForDeliverableApprove) {
        setDeliverableApproveDialogOpen(false)
        setDeliverableApproveReason('')
      }
    }
  }, [
    isSaving,
    waitingForSave,
    waitingForReject,
    waitingForApprove,
    waitingForDeliverableApprove,
    waitingForDeliverableReject,
  ])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (deliverablesLocked) {
      e.target.value = ''
      return
    }
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are accepted for deliverables')
      e.target.value = ''
      return
    }
    const periodKey = pendingPeriodKeyRef.current
    const tag = pendingTagRef.current
    if (periodKey && onAddPeriodDeliverable) {
      pendingPeriodKeyRef.current = null
      setUploadingTag(tag)
      try {
        await onAddPeriodDeliverable(periodKey, file, tag)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setUploadingTag(null)
      }
    } else {
      setUploadingTag(tag)
      try {
        await onAddDeliverable(file, tag)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setUploadingTag(null)
      }
    }
    e.target.value = ''
  }

  if (!task) {
    return (
      <aside className='w-full lg:w-[24rem] shrink-0 border-l bg-muted/20 flex flex-col min-h-0 overflow-y-auto overscroll-contain'>
        <div className='p-6 flex flex-1 items-center justify-center'>
          <p className='text-sm text-muted-foreground text-center'>
            Select a task to view and edit details
          </p>
        </div>
      </aside>
    )
  }

  return (
    <aside className='w-full lg:w-[24rem] shrink-0 border-l bg-muted/20 flex flex-col min-h-0 overflow-y-auto overscroll-contain'>
      <div className='p-4 space-y-6 flex-1 min-h-0'>
        <div>
          <Label className='text-xs text-muted-foreground'>Detailed Task</Label>
          {isEditingTask ? (
            <div ref={taskEditRef} className='space-y-2 mt-1'>
              <textarea
                value={taskEditValue}
                onChange={e => setTaskEditValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') handleCancelTask()
                }}
                autoFocus
                disabled={isSavingTask || isDone}
                rows={3}
                className='flex min-h-[80px] w-full resize-y rounded-md border-2 border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50'
                placeholder='Task description'
              />
              <div className='flex gap-1'>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='h-8 w-8'
                  onClick={handleConfirmTask}
                  disabled={isSavingTask || isDone || !taskEditValue.trim()}
                >
                  {isSavingTask ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <Check className='h-4 w-4' />
                  )}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='h-8 w-8'
                  onClick={handleCancelTask}
                  disabled={isSavingTask || isDone}
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
            </div>
          ) : (
            <p
              className={cn(
                'text-sm rounded px-2 py-2 -mx-2 -my-1 mt-1 min-h-[2.5rem]',
                isDone
                  ? 'text-muted-foreground cursor-not-allowed'
                  : 'cursor-pointer hover:bg-muted/50',
              )}
              onClick={() => {
                if (isDone) return
                setTaskEditValue(task.task)
                setIsEditingTask(true)
              }}
            >
              {task.task || 'Click to add task...'}
            </p>
          )}
        </div>
        <div>
          <Label required className='text-xs text-muted-foreground'>
            Assignee
          </Label>
          <div className='mt-1'>
            <OfficerSwitcher
              officers={officers}
              value={task.assignee}
              onChange={id => onUpdate({ assignee: id })}
              disabled={isSaving || isDone || assigneeLocked}
              placeholder='Select officer'
              sectionId={sectionId}
            />
          </div>
          {!task.assignee && (
            <p className='text-xs text-muted-foreground mt-1'>
              Assign an officer to enable inputs, deliverables, and status
              updates.
            </p>
          )}
          {assigneeLocked && (
            <p className='text-xs text-muted-foreground mt-1'>
              Assignee cannot be changed once work has been submitted.
            </p>
          )}
        </div>

        {hasAssignee && (
          <>
            {isKPI && (
              <>
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 py-4'>
                    <div>
                      <CardTitle className='text-sm font-medium'>
                        Task is reported periodically
                      </CardTitle>
                      <CardDescription className='mt-1 text-xs'>
                        Enable if this task has regular reporting cycles
                      </CardDescription>
                    </div>
                    <Switch
                      checked={taskFreq !== 'n/a'}
                      disabled={isSaving || taskConfigLocked || !hasAssignee}
                      onCheckedChange={checked => {
                        onUpdate({
                          reportingFrequency: checked ? 'monthly' : 'n/a',
                        })
                      }}
                    />
                  </CardHeader>
                  {taskFreq !== 'n/a' && (
                    <CardContent className='pt-0 space-y-4'>
                      <div className='space-y-2'>
                        <Label
                          className='text-xs text-muted-foreground'
                          required
                        >
                          Reporting frequency
                        </Label>
                        <Select
                          value={taskFreq}
                          onValueChange={v =>
                            onUpdate({
                              reportingFrequency: v as
                                | 'weekly'
                                | 'monthly'
                                | 'quarterly',
                            })
                          }
                          disabled={
                            isSaving || taskConfigLocked || !hasAssignee
                          }
                        >
                          <SelectTrigger className='mt-1 h-9'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='weekly'>Weekly</SelectItem>
                            <SelectItem value='monthly'>Monthly</SelectItem>
                            <SelectItem value='quarterly'>Quarterly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className='space-y-2'>
                        <Label
                          className='text-xs text-muted-foreground'
                          required
                        >
                          Reporting starts
                        </Label>
                        <div className='flex items-center gap-2'>
                          <Popover
                            open={datePopoverOpen}
                            onOpenChange={setDatePopoverOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant='outline'
                                disabled={
                                  isSaving || taskConfigLocked || !hasAssignee
                                }
                                className={cn(
                                  'h-9 justify-between text-left font-normal min-w-[180px]',
                                  !task.reportingPeriodStart &&
                                    'text-muted-foreground',
                                )}
                              >
                                <span className='flex items-center gap-2'>
                                  <CalendarIcon className='h-4 w-4 shrink-0' />
                                  {task.reportingPeriodStart ? (
                                    format(
                                      parseDateAsLocal(
                                        task.reportingPeriodStart,
                                      ),
                                      'PPP',
                                    )
                                  ) : (
                                    <span>Select start date</span>
                                  )}
                                </span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className='w-auto p-0'
                              align='start'
                            >
                              <Calendar
                                mode='single'
                                selected={
                                  task.reportingPeriodStart
                                    ? parseDateAsLocal(
                                        task.reportingPeriodStart,
                                      )
                                    : undefined
                                }
                                onSelect={date => {
                                  if (date) {
                                    onUpdate({
                                      reportingPeriodStart: format(
                                        date,
                                        'yyyy-MM-dd',
                                      ),
                                    })
                                    setDatePopoverOpen(false)
                                  }
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <div className='space-y-2'>
                        <Label
                          className='text-xs text-muted-foreground'
                          required={isKPI}
                        >
                          Expected{' '}
                          {taskFreq === 'weekly'
                            ? 'Weekly'
                            : taskFreq === 'monthly'
                              ? 'Monthly'
                              : 'Quarterly'}{' '}
                          Deliverable
                        </Label>

                        {isEditingDeliverable ? (
                          <div
                            ref={deliverableEditRef}
                            className='space-y-2 mt-1'
                          >
                            <textarea
                              value={deliverableEditValue}
                              onChange={e =>
                                setDeliverableEditValue(e.target.value)
                              }
                              onKeyDown={e => {
                                if (e.key === 'Escape')
                                  handleCancelDeliverable()
                              }}
                              disabled={isSavingTask || !hasAssignee}
                              rows={2}
                              className='flex min-h-[60px] w-full resize-y rounded-md border-2 border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50'
                              placeholder='e.g. Monthly budget report, Weekly status update'
                            />
                            <div className='flex gap-1'>
                              <Button
                                type='button'
                                variant='outline'
                                size='icon'
                                className='h-8 w-8'
                                onClick={handleConfirmDeliverable}
                                disabled={
                                  isSavingTask || !deliverableEditValue.trim()
                                }
                              >
                                {isSavingTask ? (
                                  <Loader2 className='h-4 w-4 animate-spin' />
                                ) : (
                                  <Check className='h-4 w-4' />
                                )}
                              </Button>
                              <Button
                                type='button'
                                variant='outline'
                                size='icon'
                                className='h-8 w-8'
                                onClick={handleCancelDeliverable}
                                disabled={isSavingTask}
                              >
                                <X className='h-4 w-4' />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p
                            className={cn(
                              'text-sm rounded px-2 py-2 -mx-2 -my-1 mt-1 min-h-[2.5rem]',
                              !taskConfigLocked &&
                                hasAssignee &&
                                'cursor-pointer hover:bg-muted/50',
                            )}
                            onClick={() => {
                              if (taskConfigLocked || !hasAssignee) return
                              setDeliverableEditValue(
                                task.expectedDeliverable ?? '',
                              )
                              setIsEditingDeliverable(true)
                            }}
                          >
                            {task.expectedDeliverable ||
                              'Click to add expected deliverable...'}
                          </p>
                        )}
                      </div>
                      {(!expectedDeliverableSet ||
                        !task.reportingPeriodStart) && (
                        <div className='bg-orange-700 p-2 rounded-md flex items-center gap-2'>
                          <InfoCircledIcon />
                          <p className='text-xs text-foreground'>
                            Required fields above are needed for the officer to
                            progress with this task.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  )}
                  {taskFreq === 'n/a' && (
                    <div className='px-6 pb-6 space-y-4'>
                      <div className='space-y-2'>
                        <Label
                          className='text-xs text-muted-foreground'
                          required
                        >
                          Due Date
                        </Label>
                        <div className='mt-1 flex items-center gap-2'>
                          <Popover
                            open={datePopoverOpen}
                            onOpenChange={setDatePopoverOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant='outline'
                                disabled={isSaving || taskConfigLocked || !hasAssignee}
                                className={cn(
                                  'h-9 justify-between text-left font-normal min-w-[180px]',
                                  !task.targetDate && 'text-muted-foreground',
                                )}
                              >
                                <span className='flex items-center gap-2'>
                                  <CalendarIcon className='h-4 w-4 shrink-0' />
                                  {task.targetDate ? (
                                    format(
                                      parseDateAsLocal(task.targetDate),
                                      'PPP',
                                    )
                                  ) : (
                                    <span>Select due date</span>
                                  )}
                                </span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className='w-auto p-0'
                              align='start'
                            >
                              <Calendar
                                mode='single'
                                selected={
                                  task.targetDate
                                    ? parseDateAsLocal(task.targetDate)
                                    : undefined
                                }
                                onSelect={date => {
                                  if (taskConfigLocked) return
                                  if (date) {
                                    onUpdate({
                                      targetDate: format(date, 'yyyy-MM-dd'),
                                    })
                                    setDatePopoverOpen(false)
                                  }
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <div className='space-y-0.5'>
                        <Label
                          className='text-xs text-muted-foreground'
                          required
                        >
                          Expected Deliverable
                        </Label>

                        {isEditingDeliverable ? (
                          <div
                            ref={deliverableEditRef}
                            className='space-y-2 mt-1'
                          >
                            <textarea
                              value={deliverableEditValue}
                              onChange={e =>
                                setDeliverableEditValue(e.target.value)
                              }
                              onKeyDown={e => {
                                if (e.key === 'Escape')
                                  handleCancelDeliverable()
                              }}
                              disabled={isSavingTask || !hasAssignee}
                              rows={2}
                              className='flex min-h-[60px] w-full resize-y rounded-md border-2 border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50'
                              placeholder='e.g. Monthly budget report, Weekly status update'
                            />
                            <div className='flex gap-1'>
                              <Button
                                type='button'
                                variant='outline'
                                size='icon'
                                className='h-8 w-8'
                                onClick={handleConfirmDeliverable}
                                disabled={
                                  isSavingTask || !deliverableEditValue.trim()
                                }
                              >
                                {isSavingTask ? (
                                  <Loader2 className='h-4 w-4 animate-spin' />
                                ) : (
                                  <Check className='h-4 w-4' />
                                )}
                              </Button>
                              <Button
                                type='button'
                                variant='outline'
                                size='icon'
                                className='h-8 w-8'
                                onClick={handleCancelDeliverable}
                                disabled={isSavingTask}
                              >
                                <X className='h-4 w-4' />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p
                            className={cn(
                              'text-sm rounded px-2 py-2 -mx-2 -my-1 mt-1 min-h-[2.5rem]',
                              !taskConfigLocked &&
                                hasAssignee &&
                                'cursor-pointer hover:bg-muted/50',
                            )}
                            onClick={() => {
                              if (taskConfigLocked || !hasAssignee) return
                              setDeliverableEditValue(
                                task.expectedDeliverable ?? '',
                              )
                              setIsEditingDeliverable(true)
                            }}
                          >
                            {task.expectedDeliverable ||
                              'Click to add expected deliverable...'}
                          </p>
                        )}
                      </div>
                      {(!task.targetDate || !expectedDeliverableSet) && (
                        <div className='bg-orange-700 p-2 rounded-md flex items-center gap-2'>
                          <InfoCircledIcon />
                          <p className='text-xs text-foreground'>
                            Required fields above are needed for the officer to
                            progress with this task.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </>
            )}

            <div>
              <Label className='text-xs text-muted-foreground'>Status</Label>
              <Select
                value={task.status}
                onValueChange={v => onUpdate({ status: v })}
                disabled={
                  isSaving ||
                  isDone ||
                  !task.assignee ||
                  dueDateRequiredMissing ||
                  periodicScheduleMissing
                }
              >
                <SelectTrigger className='mt-1'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map(s => {
                    const currentStatus = task.status ?? ''
                    const hasInputs = !!task.inputs?.file?.asset?.url
                    const disabled =
                      currentStatus === 'to_do' && !hasInputs
                        ? s.value !== 'to_do'
                        : currentStatus === 'inputs_submitted'
                          ? s.value !== 'inputs_submitted'
                          : currentStatus === 'in_progress'
                            ? [
                                'to_do',
                                'inputs_submitted',
                                'delivered',
                                'in_review',
                                'done',
                              ].includes(s.value)
                            : currentStatus === 'delivered'
                              ? [
                                  'to_do',
                                  'inputs_submitted',
                                  'in_progress',
                                  'in_review',
                                  'done',
                                ].includes(s.value)
                              : currentStatus === 'in_review'
                                ? [
                                    'to_do',
                                    'inputs_submitted',
                                    'in_progress',
                                    'delivered',
                                    'done',
                                  ].includes(s.value)
                                : ['to_do', 'inputs_submitted'].includes(
                                    s.value,
                                  )
                    return (
                      <SelectItem
                        key={s.value}
                        value={s.value}
                        disabled={disabled}
                      >
                        <span className='flex w-full items-center justify-between'>
                          <span>{s.label}</span>
                          {disabled && (
                            <Lock className='ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground' />
                          )}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className='text-xs text-muted-foreground'>Priority</Label>
              <Select
                value={task.priority}
                onValueChange={v => onUpdate({ priority: v })}
                disabled={isSaving || isDone || !hasAssignee}
              >
                <SelectTrigger className='mt-1'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {task.assignee &&
              [
                'to_do',
                'inputs_submitted',
                'in_progress',
                'delivered',
                'in_review',
                'done',
              ].includes(task.status) && (
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    {inputsLocked && (
                      <Lock className='h-4 w-4 text-muted-foreground' />
                    )}
                    <Label className='text-xs text-muted-foreground'>
                      Inputs and dependencies for this task to start
                    </Label>
                  </div>

                  {(() => {
                    const thread = task.inputsReviewThread ?? []
                    const lastIdx = thread.length - 1
                    const inputsApproved = [
                      'in_progress',
                      'delivered',
                      'in_review',
                      'done',
                    ].includes(task.status ?? '')
                    const needsOfficerResubmit =
                      task.status === 'inputs_submitted' &&
                      lastIdx >= 0 &&
                      thread[lastIdx]?.action === 'reject' &&
                      thread[lastIdx]?.role === 'supervisor'
                    const isPendingRejection = (i: number) =>
                      needsOfficerResubmit && i === lastIdx
                    const approvedFile =
                      task.inputs?.file?.asset ??
                      [...thread]
                        .reverse()
                        .find(
                          e =>
                            (e.action === 'submit' || e.action === 'respond') &&
                            e.file?.asset?.url,
                        )?.file?.asset
                    if (inputsApproved) {
                      return (
                        <div className='space-y-2'>
                          {approvedFile?.url && (
                            <div className='flex items-center gap-3 p-2 rounded-md border bg-muted/30'>
                              <Image
                                src='/pdf.png'
                                alt='PDF'
                                width={36}
                                height={36}
                                className='shrink-0 rounded'
                              />
                              <div className='flex-1 space-y-1 min-w-0'>
                                <p className='text-sm font-medium truncate'>
                                  {approvedFile.originalFilename ??
                                    'inputs.pdf'}
                                </p>
                                <p className='text-xs font-normal text-muted-foreground'>
                                  Approved by Supervisor
                                </p>
                              </div>
                              <div className='flex items-center gap-1 shrink-0'>
                                <Button
                                  type='button'
                                  variant='outline'
                                  size='icon'
                                  className='h-7 w-7'
                                  asChild
                                >
                                  <a
                                    href={approvedFile.url}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    className='flex items-center justify-center'
                                    aria-label='View'
                                  >
                                    <Eye className='h-4 w-4' />
                                  </a>
                                </Button>
                                <Button
                                  type='button'
                                  variant='outline'
                                  size='icon'
                                  className='h-7 w-7'
                                  asChild
                                >
                                  <a
                                    href={approvedFile.url}
                                    download
                                    className='flex items-center justify-center'
                                    aria-label='Download'
                                  >
                                    <Download className='h-4 w-4' />
                                  </a>
                                </Button>
                              </div>
                            </div>
                          )}
                          {thread.length > 0 && (
                            <Accordion type='single' collapsible>
                              <AccordionItem
                                value='review'
                                className='border rounded-md'
                              >
                                <AccordionTrigger className='px-3 py-2 bg-muted/80 text-xs hover:no-underline [&[data-state=open]>svg]:rotate-180'>
                                  <span className='font-light'>
                                    Click to see approval thread
                                  </span>
                                  <ChevronDown className='h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200' />
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className='border-t  divide-y max-h-[180px] overflow-y-auto'>
                                    {[...thread].reverse().map((entry, i) => {
                                      const fileToShow =
                                        entry.file?.asset ??
                                        (entry.action === 'submit'
                                          ? task.inputs?.file?.asset
                                          : undefined)
                                      const role =
                                        (entry.role ?? 'Officer') ===
                                        'supervisor'
                                          ? 'Supervisor'
                                          : 'Officer'
                                      const actionLabel: Record<
                                        string,
                                        string
                                      > = {
                                        submit: 'Submitted Inputs',
                                        approve: 'Approved',
                                        reject: 'Rejected',
                                        respond: 'Responded',
                                      }
                                      const action =
                                        actionLabel[entry.action ?? ''] ??
                                        (entry.action ?? '').replace(/^./, c =>
                                          c.toUpperCase(),
                                        )
                                      const dateStr = entry.createdAt
                                        ? format(
                                            new Date(entry.createdAt),
                                            'PPp',
                                          )
                                        : ''
                                      return (
                                        <div
                                          key={entry._key ?? i}
                                          className='p-2.5 space-y-2'
                                        >
                                          <p className='text-xs text-muted-foreground'>
                                            {role} {action}
                                            {dateStr ? ` – ${dateStr}` : ''}
                                          </p>
                                          {(entry.action === 'submit' ||
                                            entry.action === 'respond') &&
                                            fileToShow?.url && (
                                              <div className='flex items-center gap-3 p-2 rounded-md border bg-muted/30'>
                                                <Image
                                                  src='/pdf.png'
                                                  alt='PDF'
                                                  width={36}
                                                  height={36}
                                                  className='shrink-0 rounded'
                                                />
                                                <div className='flex-1 min-w-0'>
                                                  <p className='text-sm font-medium truncate'>
                                                    {fileToShow.originalFilename ??
                                                      'inputs.pdf'}
                                                  </p>
                                                </div>
                                                <div className='flex items-center gap-1 shrink-0'>
                                                  <Button
                                                    type='button'
                                                    variant='outline'
                                                    size='icon'
                                                    className='h-7 w-7'
                                                    asChild
                                                  >
                                                    <a
                                                      href={fileToShow.url}
                                                      target='_blank'
                                                      rel='noopener noreferrer'
                                                      className='flex items-center justify-center'
                                                      aria-label='View'
                                                    >
                                                      <Eye className='h-4 w-4' />
                                                    </a>
                                                  </Button>
                                                  <Button
                                                    type='button'
                                                    variant='outline'
                                                    size='icon'
                                                    className='h-7 w-7'
                                                    asChild
                                                  >
                                                    <a
                                                      href={fileToShow.url}
                                                      download
                                                      className='flex items-center justify-center'
                                                      aria-label='Download'
                                                    >
                                                      <Download className='h-4 w-4' />
                                                    </a>
                                                  </Button>
                                                </div>
                                              </div>
                                            )}
                                          {entry.message && (
                                            <p className='text-sm text-foreground'>
                                              {entry.message}
                                            </p>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          )}
                        </div>
                      )
                    }
                    return (
                      <>
                        {needsOfficerResubmit && (
                          <Dialog
                            open={resubmitDialogOpen}
                            onOpenChange={open => {
                              if (!open && resubmitting) return
                              setResubmitDialogOpen(open)
                              if (!open) {
                                setResubmitFile(null)
                                setResubmitComment('')
                                resubmitFileRef.current &&
                                  (resubmitFileRef.current.value = '')
                              }
                            }}
                          >
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Resubmit inputs</DialogTitle>
                                <DialogDescription>
                                  Upload a new inputs file and add a comment for
                                  the supervisor.
                                </DialogDescription>
                              </DialogHeader>
                              <div className='py-4 space-y-3'>
                                <div>
                                  <Label className='text-xs' required>
                                    File
                                  </Label>
                                  <input
                                    ref={resubmitFileRef}
                                    type='file'
                                    className='hidden'
                                    accept='application/pdf,.pdf'
                                    onChange={e => {
                                      setResubmitFile(
                                        e.target.files?.[0] ?? null,
                                      )
                                    }}
                                  />
                                  <div className='mt-1 flex items-center gap-2'>
                                    <Button
                                      type='button'
                                      variant='outline'
                                      size='sm'
                                      onClick={() =>
                                        resubmitFileRef.current?.click()
                                      }
                                      disabled={resubmitting}
                                    >
                                      {resubmitFile
                                        ? resubmitFile.name
                                        : 'Choose PDF'}
                                    </Button>
                                    {resubmitFile && (
                                      <Button
                                        type='button'
                                        variant='ghost'
                                        size='sm'
                                        onClick={() => {
                                          setResubmitFile(null)
                                          resubmitFileRef.current &&
                                            (resubmitFileRef.current.value = '')
                                        }}
                                        disabled={resubmitting}
                                      >
                                        <X className='h-4 w-4' />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <Label className='text-xs'>Comment</Label>
                                  <textarea
                                    value={resubmitComment}
                                    onChange={e =>
                                      setResubmitComment(e.target.value)
                                    }
                                    disabled={resubmitting}
                                    className='mt-1 w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50'
                                    placeholder='Add a comment for the supervisor...'
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant='outline'
                                  onClick={() => {
                                    if (resubmitting) return
                                    setResubmitFile(null)
                                    setResubmitComment('')
                                    resubmitFileRef.current &&
                                      (resubmitFileRef.current.value = '')
                                    setResubmitDialogOpen(false)
                                  }}
                                  disabled={resubmitting}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={async () => {
                                    if (!resubmitFile) return
                                    setResubmitting(true)
                                    try {
                                      await onRespondToRejection(
                                        resubmitComment,
                                        resubmitFile,
                                      )
                                      setResubmitFile(null)
                                      setResubmitComment('')
                                      resubmitFileRef.current &&
                                        (resubmitFileRef.current.value = '')
                                      setResubmitDialogOpen(false)
                                    } catch (err) {
                                      toast.error(
                                        err instanceof Error
                                          ? err.message
                                          : 'Resubmit failed',
                                      )
                                    } finally {
                                      setResubmitting(false)
                                    }
                                  }}
                                  disabled={
                                    !resubmitFile || isSaving || resubmitting
                                  }
                                >
                                  {resubmitting ? (
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                  ) : (
                                    'Resubmit'
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                        <div className='space-y-3'>
                          <div className='rounded-md border divide-y max-h-[180px] overflow-y-auto'>
                            {task.status === 'to_do' &&
                            !task.inputs?.file?.asset?.url ? (
                              <div className='p-2.5 space-y-2'>
                                <p className='text-xs'>
                                  Officer to submit inputs
                                </p>
                                <input
                                  ref={inputsFileRef}
                                  type='file'
                                  className='hidden'
                                  accept='application/pdf,.pdf'
                                  onChange={async e => {
                                    if (inputsLocked) return
                                    const file = e.target.files?.[0]
                                    if (!file) return
                                    if (file.type !== 'application/pdf') {
                                      toast.error('Only PDF files are accepted')
                                      e.target.value = ''
                                      return
                                    }
                                    setUploadingInputs(true)
                                    try {
                                      await onAddInputs(file)
                                    } catch (err) {
                                      toast.error(
                                        err instanceof Error
                                          ? err.message
                                          : 'Upload failed',
                                      )
                                    } finally {
                                      setUploadingInputs(false)
                                      e.target.value = ''
                                    }
                                  }}
                                />
                                <Button
                                  type='button'
                                  variant='outline'
                                  size='sm'
                                  onClick={() =>
                                    !inputsLocked &&
                                    inputsFileRef.current?.click()
                                  }
                                  disabled={
                                    isSaving || uploadingInputs || inputsLocked
                                  }
                                >
                                  {uploadingInputs ? (
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                  ) : (
                                    <Paperclip className='h-4 w-4' />
                                  )}
                                  <span className='ml-1.5'>
                                    Submit inputs (PDF)
                                  </span>
                                </Button>
                              </div>
                            ) : (
                              [...(task.inputsReviewThread ?? [])]
                                .reverse()
                                .map((entry, i) => {
                                  const origIdx =
                                    (task.inputsReviewThread ?? []).length -
                                    1 -
                                    i
                                  const fileToShow =
                                    entry.file?.asset ??
                                    (entry.action === 'submit'
                                      ? task.inputs?.file?.asset
                                      : undefined)
                                  const role =
                                    (entry.role ?? 'Officer') === 'supervisor'
                                      ? 'Supervisor'
                                      : 'Officer'
                                  const actionLabel: Record<string, string> = {
                                    submit: 'Submitted Inputs',
                                    approve: 'Approved',
                                    reject: 'Rejected',
                                    respond: 'Responded',
                                  }
                                  const action =
                                    actionLabel[entry.action ?? ''] ??
                                    (entry.action ?? '').replace(/^./, c =>
                                      c.toUpperCase(),
                                    )
                                  const dateStr = entry.createdAt
                                    ? format(new Date(entry.createdAt), 'PPp')
                                    : ''
                                  return (
                                    <div
                                      key={entry._key ?? i}
                                      className='p-2.5 space-y-2'
                                    >
                                      <p className='text-xs text-muted-foreground'>
                                        {role} {action}
                                        {dateStr ? ` – ${dateStr}` : ''}
                                      </p>
                                      {(entry.action === 'submit' ||
                                        entry.action === 'respond') &&
                                        fileToShow?.url && (
                                          <div className='flex items-center gap-3 p-2 rounded-md border bg-muted/30'>
                                            <Image
                                              src='/pdf.png'
                                              alt='PDF'
                                              width={36}
                                              height={36}
                                              className='shrink-0 rounded'
                                            />
                                            <div className='flex-1 min-w-0'>
                                              <p className='text-sm font-medium truncate'>
                                                {fileToShow.originalFilename ??
                                                  'inputs.pdf'}
                                              </p>
                                            </div>
                                            <div className='flex items-center gap-1 shrink-0'>
                                              <Button
                                                type='button'
                                                variant='outline'
                                                size='icon'
                                                className='h-7 w-7'
                                                asChild
                                              >
                                                <a
                                                  href={fileToShow.url}
                                                  target='_blank'
                                                  rel='noopener noreferrer'
                                                  className='flex items-center justify-center'
                                                  aria-label='View'
                                                >
                                                  <Eye className='h-4 w-4' />
                                                </a>
                                              </Button>
                                              <Button
                                                type='button'
                                                variant='outline'
                                                size='icon'
                                                className='h-7 w-7'
                                                asChild
                                              >
                                                <a
                                                  href={fileToShow.url}
                                                  download
                                                  className='flex items-center justify-center'
                                                  aria-label='Download'
                                                >
                                                  <Download className='h-4 w-4' />
                                                </a>
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                      {entry.message && (
                                        <p className='text-sm text-foreground'>
                                          {entry.message}
                                        </p>
                                      )}
                                      {isPendingRejection(origIdx) && (
                                        <Button
                                          type='button'
                                          variant='outline'
                                          size='sm'
                                          disabled={isSaving}
                                          onClick={() =>
                                            setResubmitDialogOpen(true)
                                          }
                                        >
                                          <Paperclip className='h-4 w-4' />
                                          <span className='ml-1.5'>
                                            Resubmit inputs
                                          </span>
                                        </Button>
                                      )}
                                      {task.status === 'inputs_submitted' &&
                                        !needsOfficerResubmit &&
                                        i === 0 &&
                                        (entry.action === 'submit' ||
                                          entry.action === 'respond') && (
                                          <div className='flex flex-wrap gap-2 pt-1'>
                                            <Dialog
                                              open={approveDialogOpen}
                                              onOpenChange={open => {
                                                if (
                                                  !open &&
                                                  (isSavingTask ||
                                                    waitingForApprove)
                                                )
                                                  return
                                                setApproveDialogOpen(open)
                                                if (!open) setApproveReason('')
                                              }}
                                            >
                                              <DialogTrigger asChild>
                                                <Button
                                                  type='button'
                                                  variant='outline'
                                                  size='sm'
                                                  disabled={isSaving}
                                                >
                                                  <ThumbsUp className='h-4 w-4' />
                                                  <span className='ml-1.5'>
                                                    Approve
                                                  </span>
                                                </Button>
                                              </DialogTrigger>
                                              <DialogContent>
                                                <DialogHeader>
                                                  <DialogTitle>
                                                    Approve inputs
                                                  </DialogTitle>
                                                  <DialogDescription>
                                                    Approval of inputs will
                                                    allow the task to start (In
                                                    progress).
                                                  </DialogDescription>
                                                </DialogHeader>
                                                <div className='py-4'>
                                                  <Label className='text-xs'>
                                                    Reason (optional)
                                                  </Label>
                                                  <textarea
                                                    value={approveReason}
                                                    onChange={e =>
                                                      setApproveReason(
                                                        e.target.value,
                                                      )
                                                    }
                                                    disabled={
                                                      isSavingTask ||
                                                      waitingForApprove
                                                    }
                                                    className='mt-1 w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50'
                                                    placeholder='Add an optional note...'
                                                  />
                                                </div>
                                                <DialogFooter>
                                                  <Button
                                                    variant='outline'
                                                    onClick={() => {
                                                      setApproveReason('')
                                                      setApproveDialogOpen(
                                                        false,
                                                      )
                                                    }}
                                                    disabled={
                                                      isSavingTask ||
                                                      waitingForApprove
                                                    }
                                                  >
                                                    Cancel
                                                  </Button>
                                                  <Button
                                                    onClick={() => {
                                                      setWaitingForSave(true)
                                                      setWaitingForApprove(true)
                                                      onApproveInputs(
                                                        approveReason.trim() ||
                                                          undefined,
                                                      )
                                                    }}
                                                    disabled={
                                                      isSavingTask ||
                                                      waitingForApprove
                                                    }
                                                  >
                                                    {isSavingTask ||
                                                    waitingForApprove ? (
                                                      <Loader2 className='h-4 w-4 animate-spin' />
                                                    ) : (
                                                      'Approve'
                                                    )}
                                                  </Button>
                                                </DialogFooter>
                                              </DialogContent>
                                            </Dialog>
                                            <Dialog
                                              open={rejectDialogOpen}
                                              onOpenChange={open => {
                                                if (
                                                  !open &&
                                                  (isSavingTask ||
                                                    waitingForReject)
                                                )
                                                  return
                                                setRejectDialogOpen(open)
                                                if (!open) setRejectMessage('')
                                              }}
                                            >
                                              <DialogTrigger asChild>
                                                <Button
                                                  type='button'
                                                  variant='outline'
                                                  size='sm'
                                                  disabled={isSaving}
                                                >
                                                  <ThumbsDown className='h-4 w-4' />
                                                  <span className='ml-1.5'>
                                                    Reject
                                                  </span>
                                                </Button>
                                              </DialogTrigger>
                                              <DialogContent>
                                                <DialogHeader>
                                                  <DialogTitle>
                                                    Reject inputs
                                                  </DialogTitle>
                                                  <DialogDescription>
                                                    The task will not proceed
                                                    and the officer needs to
                                                    resubmit inputs. A rejection
                                                    reason is required.
                                                  </DialogDescription>
                                                </DialogHeader>
                                                <div className='py-4'>
                                                  <Label
                                                    className='text-xs'
                                                    required
                                                  >
                                                    Rejection reason
                                                  </Label>
                                                  <textarea
                                                    value={rejectMessage}
                                                    onChange={e =>
                                                      setRejectMessage(
                                                        e.target.value,
                                                      )
                                                    }
                                                    disabled={
                                                      isSavingTask ||
                                                      waitingForReject
                                                    }
                                                    className='mt-1 w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50'
                                                    placeholder='Explain what needs to be changed...'
                                                  />
                                                </div>
                                                <DialogFooter>
                                                  <Button
                                                    variant='outline'
                                                    onClick={() => {
                                                      setRejectMessage('')
                                                      setRejectDialogOpen(false)
                                                    }}
                                                    disabled={
                                                      isSavingTask ||
                                                      waitingForReject
                                                    }
                                                  >
                                                    Cancel
                                                  </Button>
                                                  <Button
                                                    onClick={() => {
                                                      setWaitingForSave(true)
                                                      setWaitingForReject(true)
                                                      onRejectInputs(
                                                        rejectMessage,
                                                      )
                                                    }}
                                                    disabled={
                                                      !rejectMessage.trim() ||
                                                      isSavingTask ||
                                                      waitingForReject
                                                    }
                                                  >
                                                    {isSavingTask ||
                                                    waitingForReject ? (
                                                      <Loader2 className='h-4 w-4 animate-spin' />
                                                    ) : (
                                                      'Reject'
                                                    )}
                                                  </Button>
                                                </DialogFooter>
                                              </DialogContent>
                                            </Dialog>
                                          </div>
                                        )}
                                    </div>
                                  )
                                })
                            )}
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}

            {task.assignee && (
              <div className='pb-10'>
                <div className='mb-2 flex items-center gap-2'>
                  {!periodDeliverablesGateMet && (
                    <Lock className='h-4 w-4 text-muted-foreground' />
                  )}
                  <Label className='text-xs text-muted-foreground block'>
                    Deliverables for period{' '}
                    {!periodDeliverablesGateMet &&
                      '(waiting for inputs from officer)'}
                  </Label>
                </div>
                {!periodDeliverablesGateMet ? null : deliverablesLocked ? (
                  <p className='text-xs text-muted-foreground mb-2'>
                    {!expectedDeliverableSet
                      ? 'Specify the expected deliverable and get inputs approved to submit deliverables.'
                      : 'Get inputs approved to enable deliverables.'}
                  </p>
                ) : null}
                {!periodDeliverablesGateMet ? null : (
                  <>
                    <input
                      ref={fileInputRef}
                      type='file'
                      className='hidden'
                      accept='application/pdf,.pdf'
                      onChange={handleFileSelect}
                    />
                    {taskFreq !== 'n/a' &&
                    task?.reportingPeriodStart &&
                    onAddPeriodDeliverable ? (
                      <>
                        <div className=' mb-2'>
                          <Select
                            value={selectedPeriodKey ?? ''}
                            onValueChange={v => setSelectedPeriodKey(v || null)}
                          >
                            <SelectTrigger className='w-[180px]'>
                              <SelectValue placeholder='Select period...' />
                            </SelectTrigger>
                            <SelectContent>
                              {(() => {
                                const periods = getExpectedPeriodsForTask(
                                  task.reportingPeriodStart,
                                  taskFreq as ReportingFrequency,
                                )
                                const now = new Date()
                                const todayStart = new Date(
                                  now.getFullYear(),
                                  now.getMonth(),
                                  now.getDate(),
                                )
                                return periods.map(p => {
                                  const isFuture =
                                    parseDateAsLocal(p.startDate) > todayStart
                                  return (
                                    <SelectItem
                                      key={p.periodKey}
                                      value={p.periodKey}
                                      disabled={isFuture}
                                    >
                                      {p.label}
                                    </SelectItem>
                                  )
                                })
                              })()}
                            </SelectContent>
                          </Select>
                        </div>
                        {selectedPeriodKey && (
                          <PeriodDeliverableTabs
                            periodKey={selectedPeriodKey}
                            pd={
                              (task.periodDeliverables ?? []).find(
                                p => p.periodKey === selectedPeriodKey,
                              ) ?? {
                                periodKey: selectedPeriodKey,
                                status: 'pending' as const,
                                deliverable: [],
                                deliverableReviewThread: [],
                              }
                            }
                            onAddDeliverable={(tag: 'support' | 'main') => {
                              pendingPeriodKeyRef.current = selectedPeriodKey
                              pendingTagRef.current = tag
                              fileInputRef.current?.click()
                            }}
                            onRemoveDeliverable={
                              onRemovePeriodDeliverable
                                ? (key: string) =>
                                    onRemovePeriodDeliverable(
                                      selectedPeriodKey,
                                      key,
                                    )
                                : undefined
                            }
                            onSubmitForReview={
                              onSubmitPeriodForReview
                                ? () =>
                                    onSubmitPeriodForReview(selectedPeriodKey)
                                : undefined
                            }
                            onApproveDeliverable={
                              onApprovePeriodDeliverable
                                ? (reason?: string) =>
                                    onApprovePeriodDeliverable(
                                      selectedPeriodKey,
                                      reason,
                                    )
                                : undefined
                            }
                            onRejectDeliverable={
                              onRejectPeriodDeliverable
                                ? (msg: string) =>
                                    onRejectPeriodDeliverable(
                                      selectedPeriodKey,
                                      msg,
                                    )
                                : undefined
                            }
                            onRespondToDeliverableRejection={
                              onRespondToPeriodDeliverableRejection
                                ? (msg: string, file?: File) =>
                                    onRespondToPeriodDeliverableRejection(
                                      selectedPeriodKey,
                                      msg,
                                      file,
                                    )
                                : undefined
                            }
                            isSaving={isSaving}
                            uploadingTag={uploadingTag}
                            deliverablesLocked={deliverablesLocked}
                          />
                        )}
                      </>
                    ) : (
                      <Tabs defaultValue='main' className='w-full'>
                        <TabsList className='w-full grid grid-cols-2'>
                          <TabsTrigger value='main' className='text-xs'>
                            Main
                          </TabsTrigger>
                          <TabsTrigger value='supporting' className='text-xs'>
                            Supporting
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent
                          value='supporting'
                          className='space-y-2 mt-2'
                        >
                          {(task.deliverable ?? [])
                            .filter(e => (e.tag ?? 'support') === 'support')
                            .map(item => {
                              const asset = item.file?.asset
                              if (!asset?.url) return null
                              return (
                                <div
                                  key={item._key ?? asset._id}
                                  className='flex items-center gap-3 p-2 rounded-md border bg-muted/30'
                                >
                                  <Image
                                    src='/pdf.png'
                                    alt='PDF'
                                    width={36}
                                    height={36}
                                    className='shrink-0 rounded'
                                  />
                                  <div className='flex-1 min-w-0'>
                                    <p className='text-sm font-medium truncate'>
                                      {asset.originalFilename ?? 'document.pdf'}
                                    </p>
                                  </div>
                                  <div className='flex items-center gap-1 shrink-0'>
                                    <Button
                                      type='button'
                                      variant='outline'
                                      size='icon'
                                      className='h-7 w-7'
                                      asChild
                                    >
                                      <a
                                        href={asset.url}
                                        target='_blank'
                                        rel='noopener noreferrer'
                                        className='flex items-center justify-center'
                                        aria-label='View'
                                      >
                                        <Eye className='h-4 w-4' />
                                      </a>
                                    </Button>
                                    <Button
                                      type='button'
                                      variant='outline'
                                      size='icon'
                                      className='h-7 w-7'
                                      asChild
                                    >
                                      <a
                                        href={asset.url}
                                        download
                                        className='flex items-center justify-center'
                                        aria-label='Download'
                                      >
                                        <Download className='h-4 w-4' />
                                      </a>
                                    </Button>
                                    <Button
                                      type='button'
                                      variant='outline'
                                      size='icon'
                                      className='h-7 w-7'
                                      onClick={() =>
                                        item._key &&
                                        onRemoveDeliverable(item._key)
                                      }
                                      disabled={isSaving || item.locked}
                                      aria-label='Remove'
                                    >
                                      <Trash2 className='h-4 w-4' />
                                    </Button>
                                  </div>
                                </div>
                              )
                            })}
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() => {
                              pendingTagRef.current = 'support'
                              fileInputRef.current?.click()
                            }}
                            disabled={
                              isSaving ||
                              uploadingTag !== null ||
                              deliverablesLocked
                            }
                          >
                            {uploadingTag === 'support' ? (
                              <Loader2 className='h-4 w-4 animate-spin' />
                            ) : (
                              <Paperclip className='h-4 w-4' />
                            )}
                            <span className='ml-2'>
                              Add Supporting Deliverable
                            </span>
                          </Button>
                        </TabsContent>
                        <TabsContent value='main' className='space-y-2 mt-2'>
                          {task.status === 'delivered' &&
                            onSubmitForReview &&
                            (task.deliverable ?? []).some(
                              e => (e.tag ?? 'support') === 'main' && !e.locked,
                            ) && (
                              <div className='flex justify-end pb-1'>
                                <Button
                                  type='button'
                                  size='sm'
                                  onClick={onSubmitForReview}
                                  disabled={isSaving || deliverablesLocked}
                                >
                                  Submit for review
                                </Button>
                              </div>
                            )}
                          {(task.status === 'in_review' ||
                            task.status === 'done') &&
                            (task.deliverable ?? []).some(
                              e => (e.tag ?? 'support') === 'main' && e.locked,
                            ) && (
                              <div className=' space-y-3'>
                                {(() => {
                                  const thread =
                                    task.deliverableReviewThread ?? []
                                  const mainDeliverable = (
                                    task.deliverable ?? []
                                  ).find(e => (e.tag ?? 'support') === 'main')
                                  const mainFile = mainDeliverable?.file?.asset
                                  const submitEntry = thread.find(
                                    e =>
                                      e.action === 'submit' &&
                                      e.role === 'officer',
                                  )
                                  const submitDateStr = submitEntry?.createdAt
                                    ? format(
                                        new Date(submitEntry.createdAt),
                                        'MMM d, yyyy, h:mm a',
                                      )
                                    : ''
                                  const lastIdx = thread.length - 1
                                  const isDone = task.status === 'done'
                                  const needsOfficerResubmit =
                                    !isDone &&
                                    lastIdx >= 0 &&
                                    thread[lastIdx]?.action === 'reject' &&
                                    thread[lastIdx]?.role === 'supervisor'
                                  const isPendingRejection = (i: number) =>
                                    needsOfficerResubmit && i === lastIdx
                                  const subsequentEntries = thread.filter(
                                    e =>
                                      !(
                                        e.action === 'submit' &&
                                        e.role === 'officer'
                                      ),
                                  )
                                  const renderThreadContent = () => (
                                    <div className=' divide-y'>
                                      {[...subsequentEntries]
                                        .reverse()
                                        .map((entry, i) => {
                                          const origIdx = thread.indexOf(entry)
                                          const fileToShow = entry.file?.asset
                                          const role =
                                            (entry.role ?? 'Officer') ===
                                            'supervisor'
                                              ? 'Supervisor'
                                              : 'Officer'
                                          const actionLabel: Record<
                                            string,
                                            string
                                          > = {
                                            submit: 'Submitted for review',
                                            approve: 'Approved',
                                            reject: 'Rejected',
                                            respond: 'Resubmitted',
                                          }
                                          const action =
                                            actionLabel[entry.action ?? ''] ??
                                            (entry.action ?? '').replace(
                                              /^./,
                                              c => c.toUpperCase(),
                                            )
                                          const dateStr = entry.createdAt
                                            ? format(
                                                new Date(entry.createdAt),
                                                'MMM d, yyyy, h:mm a',
                                              )
                                            : ''
                                          const titleStr = `${role} ${action}${dateStr ? ` – ${dateStr}` : ''}`
                                          return (
                                            <div
                                              key={entry._key ?? origIdx}
                                              className='p-2.5 space-y-2'
                                            >
                                              <p className='text-xs text-muted-foreground'>
                                                {titleStr}
                                              </p>
                                              {(entry.action === 'submit' ||
                                                entry.action === 'respond') &&
                                                fileToShow?.url && (
                                                  <div className='flex items-center gap-3 p-2 rounded-md border bg-muted/30'>
                                                    <Image
                                                      src='/pdf.png'
                                                      alt='PDF'
                                                      width={36}
                                                      height={36}
                                                      className='shrink-0 rounded'
                                                    />
                                                    <div className='flex-1 min-w-0'>
                                                      <p className='text-sm font-medium truncate'>
                                                        {fileToShow.originalFilename ??
                                                          'document.pdf'}
                                                      </p>
                                                    </div>
                                                    <Button
                                                      type='button'
                                                      variant='outline'
                                                      size='icon'
                                                      className='h-7 w-7'
                                                      asChild
                                                    >
                                                      <a
                                                        href={fileToShow.url}
                                                        target='_blank'
                                                        rel='noopener noreferrer'
                                                        className='flex items-center justify-center'
                                                        aria-label='View'
                                                      >
                                                        <Eye className='h-4 w-4' />
                                                      </a>
                                                    </Button>
                                                  </div>
                                                )}
                                              {entry.message && (
                                                <p className='text-sm text-foreground'>
                                                  {entry.message}
                                                </p>
                                              )}
                                              {isPendingRejection(origIdx) && (
                                                <Button
                                                  type='button'
                                                  variant='outline'
                                                  size='sm'
                                                  onClick={() =>
                                                    setDeliverableResubmitDialogOpen(
                                                      true,
                                                    )
                                                  }
                                                  disabled={isSaving}
                                                >
                                                  <Paperclip className='h-4 w-4' />
                                                  <span className='ml-1.5'>
                                                    Resubmit main deliverable
                                                  </span>
                                                </Button>
                                              )}
                                              {!needsOfficerResubmit &&
                                                subsequentEntries.length > 0 &&
                                                i === 0 &&
                                                entry.action === 'respond' &&
                                                onApproveDeliverable &&
                                                onRejectDeliverable && (
                                                  <div className='flex flex-wrap gap-2 pt-1'>
                                                    <Dialog
                                                      open={
                                                        deliverableApproveDialogOpen
                                                      }
                                                      onOpenChange={open => {
                                                        if (
                                                          !open &&
                                                          (isSaving ||
                                                            waitingForDeliverableApprove)
                                                        )
                                                          return
                                                        setDeliverableApproveDialogOpen(
                                                          open,
                                                        )
                                                        if (!open)
                                                          setDeliverableApproveReason(
                                                            '',
                                                          )
                                                      }}
                                                    >
                                                      <DialogTrigger asChild>
                                                        <Button
                                                          type='button'
                                                          variant='outline'
                                                          size='sm'
                                                          disabled={isSaving}
                                                        >
                                                          <ThumbsUp className='h-4 w-4' />
                                                          <span className='ml-1.5'>
                                                            Approve
                                                          </span>
                                                        </Button>
                                                      </DialogTrigger>
                                                      <DialogContent>
                                                        <DialogHeader>
                                                          <DialogTitle>
                                                            Approve deliverable
                                                          </DialogTitle>
                                                          <DialogDescription>
                                                            Approval will mark
                                                            the task as Done.
                                                          </DialogDescription>
                                                        </DialogHeader>
                                                        <div className='py-4'>
                                                          <Label className='text-xs'>
                                                            Reason (optional)
                                                          </Label>
                                                          <textarea
                                                            value={
                                                              deliverableApproveReason
                                                            }
                                                            onChange={e =>
                                                              setDeliverableApproveReason(
                                                                e.target.value,
                                                              )
                                                            }
                                                            disabled={
                                                              isSaving ||
                                                              waitingForDeliverableApprove
                                                            }
                                                            className='mt-1 w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50'
                                                            placeholder='Add an optional note...'
                                                          />
                                                        </div>
                                                        <DialogFooter>
                                                          <Button
                                                            variant='outline'
                                                            onClick={() => {
                                                              setDeliverableApproveReason(
                                                                '',
                                                              )
                                                              setDeliverableApproveDialogOpen(
                                                                false,
                                                              )
                                                            }}
                                                            disabled={
                                                              isSaving ||
                                                              waitingForDeliverableApprove
                                                            }
                                                          >
                                                            Cancel
                                                          </Button>
                                                          <Button
                                                            onClick={() => {
                                                              setWaitingForSave(
                                                                true,
                                                              )
                                                              setWaitingForDeliverableApprove(
                                                                true,
                                                              )
                                                              onApproveDeliverable(
                                                                deliverableApproveReason.trim() ||
                                                                  undefined,
                                                              )
                                                            }}
                                                            disabled={
                                                              isSaving ||
                                                              waitingForDeliverableApprove
                                                            }
                                                          >
                                                            {isSaving ||
                                                            waitingForDeliverableApprove ? (
                                                              <Loader2 className='h-4 w-4 animate-spin' />
                                                            ) : (
                                                              'Approve'
                                                            )}
                                                          </Button>
                                                        </DialogFooter>
                                                      </DialogContent>
                                                    </Dialog>
                                                    <Dialog
                                                      open={
                                                        deliverableRejectDialogOpen
                                                      }
                                                      onOpenChange={open => {
                                                        if (
                                                          !open &&
                                                          (isSaving ||
                                                            waitingForDeliverableReject)
                                                        )
                                                          return
                                                        setDeliverableRejectDialogOpen(
                                                          open,
                                                        )
                                                        if (!open)
                                                          setDeliverableRejectMessage(
                                                            '',
                                                          )
                                                      }}
                                                    >
                                                      <DialogTrigger asChild>
                                                        <Button
                                                          type='button'
                                                          variant='outline'
                                                          size='sm'
                                                          disabled={isSaving}
                                                        >
                                                          <ThumbsDown className='h-4 w-4' />
                                                          <span className='ml-1.5'>
                                                            Reject
                                                          </span>
                                                        </Button>
                                                      </DialogTrigger>
                                                      <DialogContent>
                                                        <DialogHeader>
                                                          <DialogTitle>
                                                            Reject deliverable
                                                          </DialogTitle>
                                                          <DialogDescription>
                                                            The officer will be
                                                            able to resubmit a
                                                            replacement for the
                                                            main deliverable.
                                                          </DialogDescription>
                                                        </DialogHeader>
                                                        <div className='py-4'>
                                                          <Label
                                                            className='text-xs'
                                                            required
                                                          >
                                                            Reason
                                                          </Label>
                                                          <textarea
                                                            value={
                                                              deliverableRejectMessage
                                                            }
                                                            onChange={e =>
                                                              setDeliverableRejectMessage(
                                                                e.target.value,
                                                              )
                                                            }
                                                            disabled={
                                                              isSaving ||
                                                              waitingForDeliverableReject
                                                            }
                                                            className='mt-1 w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50'
                                                            placeholder='Explain what needs to be changed...'
                                                          />
                                                        </div>
                                                        <DialogFooter>
                                                          <Button
                                                            variant='outline'
                                                            onClick={() => {
                                                              setDeliverableRejectMessage(
                                                                '',
                                                              )
                                                              setDeliverableRejectDialogOpen(
                                                                false,
                                                              )
                                                            }}
                                                            disabled={
                                                              isSaving ||
                                                              waitingForDeliverableReject
                                                            }
                                                          >
                                                            Cancel
                                                          </Button>
                                                          <Button
                                                            onClick={() => {
                                                              if (
                                                                !deliverableRejectMessage.trim()
                                                              ) {
                                                                toast.error(
                                                                  'Please provide a reason for rejection',
                                                                )
                                                                return
                                                              }
                                                              setWaitingForSave(
                                                                true,
                                                              )
                                                              setWaitingForDeliverableReject(
                                                                true,
                                                              )
                                                              onRejectDeliverable(
                                                                deliverableRejectMessage.trim(),
                                                              )
                                                            }}
                                                            disabled={
                                                              isSaving ||
                                                              waitingForDeliverableReject ||
                                                              !deliverableRejectMessage.trim()
                                                            }
                                                          >
                                                            {isSaving ||
                                                            waitingForDeliverableReject ? (
                                                              <Loader2 className='h-4 w-4 animate-spin' />
                                                            ) : (
                                                              'Reject'
                                                            )}
                                                          </Button>
                                                        </DialogFooter>
                                                      </DialogContent>
                                                    </Dialog>
                                                  </div>
                                                )}
                                            </div>
                                          )
                                        })}
                                      <div className='p-2.5 space-y-2'>
                                        <p className='text-xs text-muted-foreground'>
                                          Officer submitted main deliverable
                                          {submitDateStr
                                            ? ` – ${submitDateStr}`
                                            : ''}
                                        </p>
                                        {mainFile?.url && (
                                          <div className='flex items-center gap-3 p-2 rounded-md border bg-muted/30'>
                                            <Image
                                              src='/pdf.png'
                                              alt='PDF'
                                              width={36}
                                              height={36}
                                              className='shrink-0 rounded'
                                            />
                                            <div className='flex-1 min-w-0'>
                                              <p className='text-sm font-medium truncate'>
                                                {mainFile.originalFilename ??
                                                  'document.pdf'}
                                              </p>
                                            </div>
                                            <div className='flex items-center gap-1 shrink-0'>
                                              <Button
                                                type='button'
                                                variant='outline'
                                                size='icon'
                                                className='h-7 w-7'
                                                asChild
                                              >
                                                <a
                                                  href={mainFile.url}
                                                  target='_blank'
                                                  rel='noopener noreferrer'
                                                  className='flex items-center justify-center'
                                                  aria-label='View'
                                                >
                                                  <Eye className='h-4 w-4' />
                                                </a>
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                        {!needsOfficerResubmit &&
                                          subsequentEntries.length === 0 &&
                                          onApproveDeliverable &&
                                          onRejectDeliverable && (
                                            <div className='flex flex-wrap gap-2'>
                                              <Dialog
                                                open={
                                                  deliverableApproveDialogOpen
                                                }
                                                onOpenChange={open => {
                                                  if (
                                                    !open &&
                                                    (isSaving ||
                                                      waitingForDeliverableApprove)
                                                  )
                                                    return
                                                  setDeliverableApproveDialogOpen(
                                                    open,
                                                  )
                                                  if (!open)
                                                    setDeliverableApproveReason(
                                                      '',
                                                    )
                                                }}
                                              >
                                                <DialogTrigger asChild>
                                                  <Button
                                                    type='button'
                                                    variant='outline'
                                                    size='sm'
                                                    disabled={isSaving}
                                                  >
                                                    <ThumbsUp className='h-4 w-4' />
                                                    <span className='ml-1.5'>
                                                      Approve
                                                    </span>
                                                  </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                  <DialogHeader>
                                                    <DialogTitle>
                                                      Approve deliverable
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                      Approval will mark the
                                                      task as Done.
                                                    </DialogDescription>
                                                  </DialogHeader>
                                                  <div className='py-4'>
                                                    <Label className='text-xs'>
                                                      Reason (optional)
                                                    </Label>
                                                    <textarea
                                                      value={
                                                        deliverableApproveReason
                                                      }
                                                      onChange={e =>
                                                        setDeliverableApproveReason(
                                                          e.target.value,
                                                        )
                                                      }
                                                      disabled={
                                                        isSaving ||
                                                        waitingForDeliverableApprove
                                                      }
                                                      className='mt-1 w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50'
                                                      placeholder='Add an optional note...'
                                                    />
                                                  </div>
                                                  <DialogFooter>
                                                    <Button
                                                      variant='outline'
                                                      onClick={() => {
                                                        setDeliverableApproveReason(
                                                          '',
                                                        )
                                                        setDeliverableApproveDialogOpen(
                                                          false,
                                                        )
                                                      }}
                                                      disabled={
                                                        isSaving ||
                                                        waitingForDeliverableApprove
                                                      }
                                                    >
                                                      Cancel
                                                    </Button>
                                                    <Button
                                                      onClick={() => {
                                                        setWaitingForSave(true)
                                                        setWaitingForDeliverableApprove(
                                                          true,
                                                        )
                                                        onApproveDeliverable(
                                                          deliverableApproveReason.trim() ||
                                                            undefined,
                                                        )
                                                      }}
                                                      disabled={
                                                        isSaving ||
                                                        waitingForDeliverableApprove
                                                      }
                                                    >
                                                      {isSaving ||
                                                      waitingForDeliverableApprove ? (
                                                        <Loader2 className='h-4 w-4 animate-spin' />
                                                      ) : (
                                                        'Approve'
                                                      )}
                                                    </Button>
                                                  </DialogFooter>
                                                </DialogContent>
                                              </Dialog>
                                              <Dialog
                                                open={
                                                  deliverableRejectDialogOpen
                                                }
                                                onOpenChange={open => {
                                                  if (
                                                    !open &&
                                                    (isSaving ||
                                                      waitingForDeliverableReject)
                                                  )
                                                    return
                                                  setDeliverableRejectDialogOpen(
                                                    open,
                                                  )
                                                  if (!open)
                                                    setDeliverableRejectMessage(
                                                      '',
                                                    )
                                                }}
                                              >
                                                <DialogTrigger asChild>
                                                  <Button
                                                    type='button'
                                                    variant='outline'
                                                    size='sm'
                                                    disabled={isSaving}
                                                  >
                                                    <ThumbsDown className='h-4 w-4' />
                                                    <span className='ml-1.5'>
                                                      Reject
                                                    </span>
                                                  </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                  <DialogHeader>
                                                    <DialogTitle>
                                                      Reject deliverable
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                      The officer will be able
                                                      to resubmit a replacement
                                                      for the main deliverable.
                                                    </DialogDescription>
                                                  </DialogHeader>
                                                  <div className='py-4'>
                                                    <Label
                                                      className='text-xs'
                                                      required
                                                    >
                                                      Reason
                                                    </Label>
                                                    <textarea
                                                      value={
                                                        deliverableRejectMessage
                                                      }
                                                      onChange={e =>
                                                        setDeliverableRejectMessage(
                                                          e.target.value,
                                                        )
                                                      }
                                                      disabled={
                                                        isSaving ||
                                                        waitingForDeliverableReject
                                                      }
                                                      className='mt-1 w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50'
                                                      placeholder='Explain what needs to be changed...'
                                                    />
                                                  </div>
                                                  <DialogFooter>
                                                    <Button
                                                      variant='outline'
                                                      onClick={() => {
                                                        setDeliverableRejectMessage(
                                                          '',
                                                        )
                                                        setDeliverableRejectDialogOpen(
                                                          false,
                                                        )
                                                      }}
                                                      disabled={
                                                        isSaving ||
                                                        waitingForDeliverableReject
                                                      }
                                                    >
                                                      Cancel
                                                    </Button>
                                                    <Button
                                                      onClick={() => {
                                                        if (
                                                          !deliverableRejectMessage.trim()
                                                        ) {
                                                          toast.error(
                                                            'Please provide a reason for rejection',
                                                          )
                                                          return
                                                        }
                                                        setWaitingForSave(true)
                                                        setWaitingForDeliverableReject(
                                                          true,
                                                        )
                                                        onRejectDeliverable(
                                                          deliverableRejectMessage.trim(),
                                                        )
                                                      }}
                                                      disabled={
                                                        isSaving ||
                                                        waitingForDeliverableReject ||
                                                        !deliverableRejectMessage.trim()
                                                      }
                                                    >
                                                      {isSaving ||
                                                      waitingForDeliverableReject ? (
                                                        <Loader2 className='h-4 w-4 animate-spin' />
                                                      ) : (
                                                        'Reject'
                                                      )}
                                                    </Button>
                                                  </DialogFooter>
                                                </DialogContent>
                                              </Dialog>
                                            </div>
                                          )}
                                      </div>
                                    </div>
                                  )
                                  if (isDone) {
                                    if (thread.length === 0 && !mainFile)
                                      return null
                                    const approvedFile =
                                      mainFile ??
                                      [...thread]
                                        .reverse()
                                        .find(
                                          e =>
                                            (e.action === 'submit' ||
                                              e.action === 'respond') &&
                                            e.file?.asset?.url,
                                        )?.file?.asset
                                    return (
                                      <div className='space-y-2'>
                                        {approvedFile?.url && (
                                          <div className='flex items-center gap-3 p-2 rounded-md border bg-muted/30'>
                                            <Image
                                              src='/pdf.png'
                                              alt='PDF'
                                              width={36}
                                              height={36}
                                              className='shrink-0 rounded'
                                            />
                                            <div className='flex-1 space-y-1 min-w-0'>
                                              <p className='text-sm font-medium truncate'>
                                                {approvedFile.originalFilename ??
                                                  'document.pdf'}
                                              </p>
                                              <p className='text-xs font-normal text-muted-foreground'>
                                                Main deliverable approved by
                                                Supervisor
                                              </p>
                                            </div>
                                            <div className='flex items-center gap-1 shrink-0'>
                                              <Button
                                                type='button'
                                                variant='outline'
                                                size='icon'
                                                className='h-7 w-7'
                                                asChild
                                              >
                                                <a
                                                  href={approvedFile.url}
                                                  target='_blank'
                                                  rel='noopener noreferrer'
                                                  className='flex items-center justify-center'
                                                  aria-label='View'
                                                >
                                                  <Eye className='h-4 w-4' />
                                                </a>
                                              </Button>
                                              <Button
                                                type='button'
                                                variant='outline'
                                                size='icon'
                                                className='h-7 w-7'
                                                asChild
                                              >
                                                <a
                                                  href={approvedFile.url}
                                                  download
                                                  className='flex items-center justify-center'
                                                  aria-label='Download'
                                                >
                                                  <Download className='h-4 w-4' />
                                                </a>
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                        <Accordion type='single' collapsible>
                                          <AccordionItem
                                            value='deliverable-review'
                                            className='border rounded-md'
                                          >
                                            <AccordionTrigger className='px-3 py-2 bg-muted/80 text-xs hover:no-underline [&[data-state=open]>svg]:rotate-180'>
                                              <span className='font-light'>
                                                Click to see approval thread
                                              </span>
                                              <ChevronDown className='h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200' />
                                            </AccordionTrigger>
                                            <AccordionContent>
                                              <div className='border-t max-h-[180px] overflow-y-auto'>
                                                {renderThreadContent()}
                                              </div>
                                            </AccordionContent>
                                          </AccordionItem>
                                        </Accordion>
                                      </div>
                                    )
                                  }
                                  return (
                                    <>
                                      {needsOfficerResubmit && (
                                        <Dialog
                                          open={deliverableResubmitDialogOpen}
                                          onOpenChange={open => {
                                            if (
                                              !open &&
                                              deliverableResubmitting
                                            )
                                              return
                                            setDeliverableResubmitDialogOpen(
                                              open,
                                            )
                                            if (!open) {
                                              setDeliverableResubmitFile(null)
                                              setDeliverableResubmitComment('')
                                              deliverableResubmitFileRef.current &&
                                                (deliverableResubmitFileRef.current.value =
                                                  '')
                                            }
                                          }}
                                        >
                                          <DialogContent>
                                            <DialogHeader>
                                              <DialogTitle>
                                                Resubmit main deliverable
                                              </DialogTitle>
                                              <DialogDescription>
                                                Upload a replacement file and
                                                add a note for the supervisor.
                                              </DialogDescription>
                                            </DialogHeader>
                                            <input
                                              ref={deliverableResubmitFileRef}
                                              type='file'
                                              className='hidden'
                                              accept='application/pdf,.pdf'
                                              onChange={e => {
                                                const f = e.target.files?.[0]
                                                setDeliverableResubmitFile(
                                                  f ?? null,
                                                )
                                              }}
                                            />
                                            <div className='space-y-4 py-4'>
                                              <div>
                                                <Label className='text-xs'>
                                                  Main deliverable (PDF)
                                                </Label>
                                                <div className='flex gap-2 mt-1'>
                                                  <Button
                                                    type='button'
                                                    variant='outline'
                                                    size='sm'
                                                    onClick={() =>
                                                      deliverableResubmitFileRef.current?.click()
                                                    }
                                                  >
                                                    {deliverableResubmitFile
                                                      ? deliverableResubmitFile.name
                                                      : 'Choose file'}
                                                  </Button>
                                                </div>
                                              </div>
                                              <div>
                                                <Label className='text-xs'>
                                                  Message
                                                </Label>
                                                <textarea
                                                  value={
                                                    deliverableResubmitComment
                                                  }
                                                  onChange={e =>
                                                    setDeliverableResubmitComment(
                                                      e.target.value,
                                                    )
                                                  }
                                                  disabled={
                                                    isSaving ||
                                                    deliverableResubmitting
                                                  }
                                                  className='mt-1 w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50'
                                                  placeholder='Add a note for the supervisor...'
                                                />
                                              </div>
                                            </div>
                                            <DialogFooter>
                                              <Button
                                                variant='outline'
                                                onClick={() =>
                                                  setDeliverableResubmitDialogOpen(
                                                    false,
                                                  )
                                                }
                                                disabled={
                                                  deliverableResubmitting
                                                }
                                              >
                                                Cancel
                                              </Button>
                                              <Button
                                                onClick={async () => {
                                                  if (
                                                    !onRespondToDeliverableRejection
                                                  )
                                                    return
                                                  setDeliverableResubmitting(
                                                    true,
                                                  )
                                                  try {
                                                    await onRespondToDeliverableRejection(
                                                      deliverableResubmitComment.trim(),
                                                      deliverableResubmitFile ??
                                                        undefined,
                                                    )
                                                    setDeliverableResubmitDialogOpen(
                                                      false,
                                                    )
                                                  } catch (err) {
                                                    toast.error(
                                                      err instanceof Error
                                                        ? err.message
                                                        : 'Failed to resubmit',
                                                    )
                                                  } finally {
                                                    setDeliverableResubmitting(
                                                      false,
                                                    )
                                                  }
                                                }}
                                                disabled={
                                                  isSaving ||
                                                  deliverableResubmitting ||
                                                  !deliverableResubmitFile
                                                }
                                              >
                                                {deliverableResubmitting ? (
                                                  <Loader2 className='h-4 w-4 animate-spin' />
                                                ) : (
                                                  'Resubmit'
                                                )}
                                              </Button>
                                            </DialogFooter>
                                          </DialogContent>
                                        </Dialog>
                                      )}
                                      {renderThreadContent()}
                                    </>
                                  )
                                })()}
                              </div>
                            )}
                          {!(
                            task.status === 'in_review' ||
                            task.status === 'done'
                          ) && (
                            <>
                              {(() => {
                                const mainDeliverable = (
                                  task.deliverable ?? []
                                ).find(e => (e.tag ?? 'support') === 'main')
                                const mainFile = mainDeliverable?.file?.asset
                                const hasMain = !!mainDeliverable
                                if (hasMain && mainFile?.url) {
                                  return (
                                    <div className='flex items-center gap-3 p-2 rounded-md border bg-muted/30'>
                                      <Image
                                        src='/pdf.png'
                                        alt='PDF'
                                        width={36}
                                        height={36}
                                        className='shrink-0 rounded'
                                      />
                                      <div className='flex-1 min-w-0'>
                                        <p className='text-sm font-medium truncate'>
                                          {mainFile.originalFilename ??
                                            'document.pdf'}
                                        </p>
                                      </div>
                                      <div className='flex items-center gap-1 shrink-0'>
                                        <Button
                                          type='button'
                                          variant='outline'
                                          size='icon'
                                          className='h-7 w-7'
                                          asChild
                                        >
                                          <a
                                            href={mainFile.url}
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            className='flex items-center justify-center'
                                            aria-label='View'
                                          >
                                            <Eye className='h-4 w-4' />
                                          </a>
                                        </Button>
                                        <Button
                                          type='button'
                                          variant='outline'
                                          size='icon'
                                          className='h-7 w-7'
                                          asChild
                                        >
                                          <a
                                            href={mainFile.url}
                                            download
                                            className='flex items-center justify-center'
                                            aria-label='Download'
                                          >
                                            <Download className='h-4 w-4' />
                                          </a>
                                        </Button>
                                        {!mainDeliverable?.locked &&
                                          mainDeliverable?._key && (
                                            <Button
                                              type='button'
                                              variant='outline'
                                              size='icon'
                                              className='h-7 w-7'
                                              onClick={() =>
                                                onRemoveDeliverable(
                                                  mainDeliverable._key!,
                                                )
                                              }
                                              disabled={isSaving}
                                              aria-label='Remove'
                                            >
                                              <Trash2 className='h-4 w-4' />
                                            </Button>
                                          )}
                                      </div>
                                    </div>
                                  )
                                }
                                return (
                                  <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    onClick={() => {
                                      pendingTagRef.current = 'main'
                                      fileInputRef.current?.click()
                                    }}
                                    disabled={
                                      isSaving ||
                                      deliverablesLocked ||
                                      uploadingTag !== null ||
                                      (task.deliverable ?? []).some(
                                        e => (e.tag ?? 'support') === 'main',
                                      )
                                    }
                                  >
                                    {uploadingTag === 'main' ? (
                                      <Loader2 className='h-4 w-4 animate-spin' />
                                    ) : (
                                      <Paperclip className='h-4 w-4' />
                                    )}
                                    <span className='ml-2'>
                                      Add Main Deliverable
                                    </span>
                                  </Button>
                                )
                              })()}
                            </>
                          )}
                        </TabsContent>
                      </Tabs>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  )
}
