'use client'

import * as React from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import {
  ChevronDown,
  Clock,
  Download,
  Eye,
  Loader2,
  Paperclip,
  Plus,
  ThumbsDown,
  ThumbsUp,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { OfficerSwitcher, type Officer } from './officer-switcher'
import { SprintWeekTimer } from './sprint-week-timer'
import type { AcceptedSprintTask } from './sprint-tasks-table'
import type { WorkSubmission } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'
import { getEffectiveTaskStatus, isSprintWeekStarted } from '@/lib/sprint-week'

const PRIORITIES = [
  { label: 'Highest', value: 'highest' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
  { label: 'Lowest', value: 'lowest' },
]

const TASK_STATUSES = [
  { label: 'To do', value: 'to_do' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'In review', value: 'in_review' },
  { label: 'Done', value: 'done' },
]

const CATEGORY_LABELS: Record<string, string> = {
  normal_flow: 'Normal Flow',
  compliance: 'Compliance',
  staff_development: 'Staff Development',
  stakeholder_engagement: 'Stakeholder Engagement',
}

const SUBMISSION_STATUS_BADGES: Record<
  string,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
  }
> = {
  pending: { label: 'Pending Review', variant: 'secondary' },
  approved: { label: 'Approved', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
}

interface SprintTaskDetailsPanelProps {
  task: AcceptedSprintTask | null
  officers: Officer[]
  sectionId: string
  onUpdate: (
    sprintId: string,
    taskKey: string,
    updates: Record<string, unknown>,
  ) => void
  onAddWorkSubmission: (
    sprintId: string,
    taskKey: string,
    submission: {
      description: string
      outputFile: File
      revenueAssessed?: number
    },
  ) => Promise<void>
  onApproveSubmission: (
    sprintId: string,
    taskKey: string,
    submissionKey: string,
    message?: string,
  ) => void
  onRejectSubmission: (
    sprintId: string,
    taskKey: string,
    submissionKey: string,
    message: string,
  ) => void
  onRespondToSubmissionRejection: (
    sprintId: string,
    taskKey: string,
    submissionKey: string,
    message: string,
    outputFile?: File,
  ) => Promise<void>
  isSaving: boolean
}

export function SprintTaskDetailsPanel({
  task,
  officers,
  sectionId,
  onUpdate,
  onAddWorkSubmission,
  onApproveSubmission,
  onRejectSubmission,
  onRespondToSubmissionRejection,
  isSaving,
}: SprintTaskDetailsPanelProps) {
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [newDescription, setNewDescription] = React.useState('')
  const [newOutputFile, setNewOutputFile] = React.useState<File | null>(null)
  const [newRevenue, setNewRevenue] = React.useState('')
  const [isAdding, setIsAdding] = React.useState(false)
  const outputFileRef = React.useRef<HTMLInputElement>(null)

  const resetAddForm = () => {
    setNewDescription('')
    setNewOutputFile(null)
    setNewRevenue('')
  }

  const hasSubmissions = (task?.workSubmissions ?? []).length > 0

  if (!task) {
    return (
      <div className='flex min-h-[12rem] w-full flex-col items-center justify-center p-6'>
        <p className='text-center text-sm text-muted-foreground'>
          Select a task to view and edit details
        </p>
      </div>
    )
  }

  const sprintStarted = isSprintWeekStarted(task.weekStart)
  const taskStatus = getEffectiveTaskStatus(task, task.weekStart)
  const isDone = taskStatus === 'done'
  const preSprintLocked =
    task.status === 'accepted' && !sprintStarted
  const isCompliance = task.activityCategory === 'compliance'

  const handleAddSubmission = async () => {
    if (!newDescription.trim()) return
    if (!newOutputFile) {
      toast.error('Output file is required')
      return
    }
    setIsAdding(true)
    try {
      await onAddWorkSubmission(task.sprintId, task._key, {
        description: newDescription.trim(),
        outputFile: newOutputFile,
        revenueAssessed: newRevenue ? parseFloat(newRevenue) : undefined,
      })
      resetAddForm()
      setAddDialogOpen(false)
    } catch {
      toast.error('Failed to add work submission')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className='w-full space-y-6 p-4'>
        <div>
          <Label className='text-xs text-muted-foreground'>
            Task Description
          </Label>
          <p className='text-sm mt-1'>{task.description}</p>
        </div>

        {task.activityCategory && (
          <div>
            <Label className='text-xs text-muted-foreground'>
              Activity Category
            </Label>
            <p className='text-sm mt-1'>
              {CATEGORY_LABELS[task.activityCategory] ?? task.activityCategory}
            </p>
          </div>
        )}

        {task.initiativeTitle && (
          <div>
            <Label className='text-xs text-muted-foreground'>
              Related Initiative
            </Label>
            <p className='text-sm mt-1'>{task.initiativeTitle}</p>
          </div>
        )}

        {task.activityTitle && (
          <div>
            <Label className='text-xs text-muted-foreground'>
              Related Measurable Activity
            </Label>
            <p className='text-sm mt-1'>{task.activityTitle}</p>
          </div>
        )}

        <div>
          <Label className='text-xs text-muted-foreground'>Week</Label>
          <p className='text-sm mt-1'>{task.weekLabel}</p>
        </div>

        <div>
          <Label className='text-xs text-muted-foreground'>
            Sprint runs from Monday 10 AM to Friday 5 PM
          </Label>
          <SprintWeekTimer
            weekStart={task.weekStart}
            weekEnd={task.weekEnd}
            variant='detail'
          />
        </div>

        <div>
          <Label className='text-xs text-muted-foreground'>Priority</Label>
          <Select
            value={task.priority ?? 'medium'}
            onValueChange={v =>
              onUpdate(task.sprintId, task._key, { priority: v })
            }
            disabled={isSaving}
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

        <div>
          <Label className='text-xs text-muted-foreground'>Status</Label>
          <Select
            value={taskStatus}
            onValueChange={v =>
              onUpdate(task.sprintId, task._key, { taskStatus: v })
            }
            disabled={isSaving || !task.assignee || isDone || preSprintLocked}
          >
            <SelectTrigger className='mt-1'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map(s => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {preSprintLocked && (
            <p className='text-xs text-muted-foreground mt-1'>
              Status stays To do until the sprint week starts (Monday 10 AM).
            </p>
          )}
        </div>

        <div>
          <Label className='text-xs text-muted-foreground'>Assignee</Label>
          <div className='mt-1'>
            <OfficerSwitcher
              officers={officers}
              value={task.assignee ?? null}
              onChange={id =>
                onUpdate(task.sprintId, task._key, { assignee: id })
              }
              disabled={isSaving || hasSubmissions}
              placeholder='Select officer'
              sectionId={sectionId}
            />
          </div>
          {!task.assignee && (
            <p className='text-xs text-muted-foreground mt-1'>
              Assign an officer to enable work submissions.
            </p>
          )}
          {hasSubmissions && (
            <p className='text-xs text-muted-foreground mt-1'>
              Assignee cannot be changed once work submissions exist.
            </p>
          )}
        </div>

        {task.assignee && (
          <div className='pb-10'>
            <div className='flex items-center justify-between mb-3'>
              <Label className='text-xs text-muted-foreground'>
                Work Submissions ({(task.workSubmissions ?? []).length})
              </Label>
              {!isDone && sprintStarted && (
                <Dialog
                  open={addDialogOpen}
                  onOpenChange={open => {
                    setAddDialogOpen(open)
                    if (!open) resetAddForm()
                  }}
                >
                  <DialogTrigger asChild>
                    <Button type='button' variant='outline' size='sm'>
                      <Plus className='h-3.5 w-3.5 mr-1' />
                      Submit Output
                    </Button>
                  </DialogTrigger>
                  <DialogContent className='max-w-md'>
                    <DialogHeader>
                      <DialogTitle>Submit Output</DialogTitle>
                      <DialogDescription>
                        Time is tracked automatically from the sprint start
                        (Monday 10 AM).
                      </DialogDescription>
                    </DialogHeader>
                    <div className='space-y-4 py-2'>
                      <div>
                        <Label className='text-xs' required>
                          Description of Work Done
                        </Label>
                        <textarea
                          value={newDescription}
                          onChange={e => setNewDescription(e.target.value)}
                          disabled={isAdding}
                          rows={3}
                          className='mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50'
                          placeholder='Describe what was accomplished...'
                        />
                      </div>
                      <div>
                        <Label className='text-xs' required>
                          Output (Evidence File)
                        </Label>
                        <input
                          ref={outputFileRef}
                          type='file'
                          className='hidden'
                          accept='application/pdf,.pdf'
                          onChange={e => {
                            const f = e.target.files?.[0]
                            if (f) setNewOutputFile(f)
                            e.target.value = ''
                          }}
                        />
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='mt-1 w-full justify-start'
                          onClick={() => outputFileRef.current?.click()}
                          disabled={isAdding}
                        >
                          <Paperclip className='h-4 w-4 mr-1.5' />
                          {newOutputFile
                            ? newOutputFile.name
                            : 'Attach PDF output'}
                        </Button>
                      </div>
                      {isCompliance && (
                        <div>
                          <Label className='text-xs'>Revenue Assessed</Label>
                          <Input
                            type='number'
                            step='0.01'
                            min='0'
                            value={newRevenue}
                            onChange={e => setNewRevenue(e.target.value)}
                            disabled={isAdding}
                            className='mt-1'
                            placeholder='0.00'
                          />
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        variant='outline'
                        onClick={() => {
                          resetAddForm()
                          setAddDialogOpen(false)
                        }}
                        disabled={isAdding}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddSubmission}
                        disabled={
                          isAdding || !newDescription.trim() || !newOutputFile
                        }
                      >
                        {isAdding ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          'Submit'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            {!isDone && !sprintStarted && (
              <p className='text-xs text-muted-foreground mb-3'>
                Work submissions open when the sprint week starts (Monday 10 AM).
              </p>
            )}

            {(task.workSubmissions ?? []).length === 0 ? (
              <p className='text-xs text-muted-foreground'>
                No submissions yet.
              </p>
            ) : (
              <div className='space-y-3'>
                {(task.workSubmissions ?? []).map(sub => (
                  <WorkSubmissionCard
                    key={sub._key}
                    submission={sub}
                    sprintId={task.sprintId}
                    taskKey={task._key}
                    weekStart={task.weekStart}
                    weekEnd={task.weekEnd}
                    sprintStarted={sprintStarted}
                    isCompliance={isCompliance}
                    onApprove={onApproveSubmission}
                    onReject={onRejectSubmission}
                    onRespond={onRespondToSubmissionRejection}
                    isSaving={isSaving}
                  />
                ))}
              </div>
            )}
          </div>
        )}
    </div>
  )
}

function WorkSubmissionCard({
  submission,
  sprintId,
  taskKey,
  weekStart,
  weekEnd,
  sprintStarted,
  isCompliance,
  onApprove,
  onReject,
  onRespond,
  isSaving,
}: {
  submission: WorkSubmission
  sprintId: string
  taskKey: string
  weekStart: string
  weekEnd: string
  sprintStarted: boolean
  isCompliance: boolean
  onApprove: (
    sprintId: string,
    taskKey: string,
    submissionKey: string,
    message?: string,
  ) => void
  onReject: (
    sprintId: string,
    taskKey: string,
    submissionKey: string,
    message: string,
  ) => void
  onRespond: (
    sprintId: string,
    taskKey: string,
    submissionKey: string,
    message: string,
    outputFile?: File,
  ) => Promise<void>
  isSaving: boolean
}) {
  const [approveOpen, setApproveOpen] = React.useState(false)
  const [approveMsg, setApproveMsg] = React.useState('')
  const [waitApprove, setWaitApprove] = React.useState(false)

  const [rejectOpen, setRejectOpen] = React.useState(false)
  const [rejectMsg, setRejectMsg] = React.useState('')
  const [waitReject, setWaitReject] = React.useState(false)

  const [respondOpen, setRespondOpen] = React.useState(false)
  const [respondMsg, setRespondMsg] = React.useState('')
  const [respondFile, setRespondFile] = React.useState<File | null>(null)
  const [waitRespond, setWaitRespond] = React.useState(false)
  const respondFileRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!isSaving) {
      if (waitApprove) {
        setWaitApprove(false)
        setApproveOpen(false)
        setApproveMsg('')
      }
      if (waitReject) {
        setWaitReject(false)
        setRejectOpen(false)
        setRejectMsg('')
      }
    }
  }, [isSaving, waitApprove, waitReject])

  const statusBadge =
    SUBMISSION_STATUS_BADGES[submission.status ?? 'pending'] ??
    SUBMISSION_STATUS_BADGES.pending
  const thread = submission.reviewThread ?? []
  const lastEntry = thread.length > 0 ? thread[thread.length - 1] : null
  const isPending = submission.status === 'pending'
  const isRejected = submission.status === 'rejected'
  const isApproved = submission.status === 'approved'
  const outputAsset = submission.output?.asset

  return (
    <div className='rounded-md border bg-muted/20'>
      <div className='p-3 space-y-2'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <span className='text-xs font-medium'>
              {submission.date ?? '—'}
            </span>
            <span className='text-xs text-muted-foreground'>
              {submission.startTime}–{submission.endTime}
            </span>
            <Badge variant='outline' className='text-[10px] px-1.5 py-0'>
              <Clock className='h-3 w-3 mr-0.5' />
              {submission.totalHours ?? 0}h
            </Badge>
          </div>
          <Badge
            variant={statusBadge.variant}
            className='text-[10px] px-1.5 py-0'
          >
            {statusBadge.label}
          </Badge>
        </div>

        <p className='text-sm'>{submission.description}</p>

        {isCompliance && submission.revenueAssessed != null && (
          <p className='text-xs text-muted-foreground'>
            Revenue Assessed: {submission.revenueAssessed.toLocaleString()}
          </p>
        )}

        {outputAsset?.url && (
          <div className='flex items-center gap-3 p-2 rounded-md border bg-muted/30'>
            <Image
              src='/pdf.png'
              alt='PDF'
              width={28}
              height={28}
              className='shrink-0 rounded'
            />
            <div className='flex-1 min-w-0'>
              <p className='text-xs font-medium truncate'>
                {outputAsset.originalFilename ?? 'output.pdf'}
              </p>
            </div>
            <div className='flex items-center gap-1 shrink-0'>
              <Button
                type='button'
                variant='outline'
                size='icon'
                className='h-6 w-6'
                asChild
              >
                <a
                  href={outputAsset.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label='View'
                >
                  <Eye className='h-3 w-3' />
                </a>
              </Button>
              <Button
                type='button'
                variant='outline'
                size='icon'
                className='h-6 w-6'
                asChild
              >
                <a href={outputAsset.url} download aria-label='Download'>
                  <Download className='h-3 w-3' />
                </a>
              </Button>
            </div>
          </div>
        )}

        {isPending && (
          <div className='flex flex-wrap gap-2 pt-1'>
            <Dialog
              open={approveOpen}
              onOpenChange={open => {
                if (!open && waitApprove) return
                setApproveOpen(open)
                if (!open) setApproveMsg('')
              }}
            >
              <DialogTrigger asChild>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={isSaving}
                >
                  <ThumbsUp className='h-3.5 w-3.5 mr-1' />
                  Approve
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Approve Submission</DialogTitle>
                  <DialogDescription>
                    Approving this work submission confirms the output is
                    satisfactory.
                  </DialogDescription>
                </DialogHeader>
                <div className='py-4'>
                  <Label className='text-xs'>Note (optional)</Label>
                  <textarea
                    value={approveMsg}
                    onChange={e => setApproveMsg(e.target.value)}
                    disabled={isSaving || waitApprove}
                    className='mt-1 w-full min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50'
                    placeholder='Optional approval note...'
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant='outline'
                    onClick={() => setApproveOpen(false)}
                    disabled={waitApprove}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setWaitApprove(true)
                      onApprove(
                        sprintId,
                        taskKey,
                        submission._key,
                        approveMsg.trim() || undefined,
                      )
                    }}
                    disabled={isSaving || waitApprove}
                  >
                    {waitApprove ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      'Approve'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog
              open={rejectOpen}
              onOpenChange={open => {
                if (!open && waitReject) return
                setRejectOpen(open)
                if (!open) setRejectMsg('')
              }}
            >
              <DialogTrigger asChild>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={isSaving}
                >
                  <ThumbsDown className='h-3.5 w-3.5 mr-1' />
                  Reject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reject Submission</DialogTitle>
                  <DialogDescription>
                    The officer will need to respond or resubmit output.
                  </DialogDescription>
                </DialogHeader>
                <div className='py-4'>
                  <Label className='text-xs' required>
                    Rejection reason
                  </Label>
                  <textarea
                    value={rejectMsg}
                    onChange={e => setRejectMsg(e.target.value)}
                    disabled={isSaving || waitReject}
                    className='mt-1 w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50'
                    placeholder='Explain what needs to be changed...'
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant='outline'
                    onClick={() => setRejectOpen(false)}
                    disabled={waitReject}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setWaitReject(true)
                      onReject(sprintId, taskKey, submission._key, rejectMsg)
                    }}
                    disabled={!rejectMsg.trim() || isSaving || waitReject}
                  >
                    {waitReject ? (
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

        {isRejected && lastEntry?.action === 'reject' && (
          <div className='space-y-2'>
            <p className='text-xs text-orange-600 dark:text-orange-400'>
              Submission rejected. Please respond or resubmit output.
            </p>
            <Dialog
              open={respondOpen}
              onOpenChange={open => {
                if (!open && waitRespond) return
                setRespondOpen(open)
                if (!open) {
                  setRespondMsg('')
                  setRespondFile(null)
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={isSaving || !sprintStarted}
                  title={
                    !sprintStarted
                      ? 'Opens when the sprint week starts (Monday 10 AM)'
                      : undefined
                  }
                >
                  <Paperclip className='h-3.5 w-3.5 mr-1' />
                  Respond
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Respond to Rejection</DialogTitle>
                  <DialogDescription>
                    Optionally attach a new output file and add a comment.
                  </DialogDescription>
                </DialogHeader>
                <div className='space-y-4 py-4'>
                  <div>
                    <Label className='text-xs'>
                      Replacement output (optional)
                    </Label>
                    <input
                      ref={respondFileRef}
                      type='file'
                      className='hidden'
                      accept='application/pdf,.pdf'
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) setRespondFile(f)
                        e.target.value = ''
                      }}
                    />
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='mt-1'
                      onClick={() => respondFileRef.current?.click()}
                      disabled={waitRespond}
                    >
                      <Paperclip className='h-4 w-4 mr-1.5' />
                      {respondFile ? respondFile.name : 'Attach PDF'}
                    </Button>
                  </div>
                  <div>
                    <Label className='text-xs'>Comment</Label>
                    <textarea
                      value={respondMsg}
                      onChange={e => setRespondMsg(e.target.value)}
                      disabled={waitRespond}
                      className='mt-1 w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50'
                      placeholder='Explain what was changed...'
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant='outline'
                    onClick={() => setRespondOpen(false)}
                    disabled={waitRespond}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      setWaitRespond(true)
                      try {
                        await onRespond(
                          sprintId,
                          taskKey,
                          submission._key,
                          respondMsg.trim() || 'Output resubmitted',
                          respondFile ?? undefined,
                        )
                        setRespondOpen(false)
                        setRespondMsg('')
                        setRespondFile(null)
                      } finally {
                        setWaitRespond(false)
                      }
                    }}
                    disabled={waitRespond}
                  >
                    {waitRespond ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      'Resubmit'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {thread.length > 0 && (
          <Accordion type='single' collapsible className='mt-1'>
            <AccordionItem value='thread' className='border rounded-md'>
              <AccordionTrigger className='px-3 py-1.5 bg-muted/80 text-xs hover:no-underline [&[data-state=open]>svg]:rotate-180'>
                <span className='font-light'>
                  Review thread ({thread.length})
                </span>
                <ChevronDown className='h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200' />
              </AccordionTrigger>
              <AccordionContent>
                <div className='border-t divide-y max-h-[180px] overflow-y-auto'>
                  {[...thread].reverse().map((entry, i) => {
                    const role =
                      entry.role === 'supervisor' ? 'Supervisor' : 'Officer'
                    const actionLabels: Record<string, string> = {
                      submit: 'Submitted',
                      approve: 'Approved',
                      reject: 'Rejected',
                      respond: 'Responded',
                    }
                    const actionLabel =
                      actionLabels[entry.action ?? ''] ?? entry.action ?? ''
                    const dateStr = entry.createdAt
                      ? format(new Date(entry.createdAt), 'PPp')
                      : ''
                    return (
                      <div key={entry._key ?? i} className='p-2 space-y-1'>
                        <p className='text-xs text-muted-foreground'>
                          {role} {actionLabel}
                          {dateStr ? ` – ${dateStr}` : ''}
                        </p>
                        {entry.message && (
                          <p className='text-xs text-foreground'>
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
    </div>
  )
}
