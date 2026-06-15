'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, isPast, parseISO, startOfDay } from 'date-fns'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Loader2,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'
import { cn } from '@/lib/utils'
import {
  COMMISSIONER_LEVEL_DIVISION,
  divisionIdForApi,
  divisionIdFromAction,
} from './board-action-labels'
import {
  ORG_WORK_ITEM_WORKFLOW_STEPS,
  orgWorkItemStatusLabel,
  orgWorkItemWorkflowStepIndex,
} from '@/lib/org-work-item/workflow'
import type { BoardActionDetailPageData } from './load-board-action-detail'

const WORKFLOW_STEPS = ORG_WORK_ITEM_WORKFLOW_STEPS

function workflowStatusLabel(status?: string) {
  return orgWorkItemStatusLabel(status)
}

function formatDateTime(value?: string) {
  if (!value) return '—'
  try {
    return format(new Date(value), 'dd MMM yyyy, h:mm a')
  } catch {
    return value
  }
}

function formatDueDate(value?: string) {
  if (!value) return '—'
  try {
    return format(parseISO(value), 'dd MMM yyyy')
  } catch {
    return value
  }
}

function isOverdue(dueDate?: string, status?: string) {
  if (!dueDate || status === 'completed') return false
  try {
    return isPast(startOfDay(parseISO(dueDate)))
  } catch {
    return false
  }
}

function workflowStepIndex(status?: string) {
  return orgWorkItemWorkflowStepIndex(status)
}

function reopenStatus(action: { sectionId?: string; divisionId?: string }) {
  if (action.sectionId) return 'delegated_to_section'
  if (action.divisionId) return 'assigned_to_division'
  return 'at_commissioner'
}

export function BoardActionPageContent({
  action,
  divisions,
  sectionOptions = [],
  canManage,
  canDelegate = false,
  workspace,
  apiPath = '/api/board-actions',
  supervisorOptions = [],
  officerOptions = [],
  canCascadeToSupervisor = false,
  canCascadeToOfficer = false,
  canSubmitResponse = false,
  canApprove = false,
  canReject = false,
}: BoardActionDetailPageData & {
  apiPath?: string
  supervisorOptions?: { _id: string; name: string }[]
  officerOptions?: { _id: string; name: string }[]
  canCascadeToSupervisor?: boolean
  canCascadeToOfficer?: boolean
  canSubmitResponse?: boolean
  canApprove?: boolean
  canReject?: boolean
}) {
  const router = useRouter()
  const resolvedWorkspace = workspace ?? {
    roleLabel: 'Commissioner',
    dashboardHref: '/commissioner/dashboard',
    listHref: '/commissioner/board-actions',
    mode: 'commissioner' as const,
  }
  const listHref = resolvedWorkspace.listHref
  const isAssistantWorkspace = resolvedWorkspace.mode === 'assistant-commissioner'

  const [title, setTitle] = React.useState(action.title)
  const [description, setDescription] = React.useState(action.description ?? '')
  const [dueDate, setDueDate] = React.useState(action.dueDate ?? '')
  const [divisionId, setDivisionId] = React.useState(
    divisionIdFromAction(action.divisionId),
  )
  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [titleBeforeEdit, setTitleBeforeEdit] = React.useState('')
  const [isEditingDescription, setIsEditingDescription] = React.useState(false)
  const [descriptionBeforeEdit, setDescriptionBeforeEdit] = React.useState('')
  const descriptionEditRef = React.useRef<HTMLDivElement>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [showDelete, setShowDelete] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [delegateSectionId, setDelegateSectionId] = React.useState('')
  const [isDelegating, setIsDelegating] = React.useState(false)
  const [cascadeSupervisorId, setCascadeSupervisorId] = React.useState('')
  const [cascadeOfficerId, setCascadeOfficerId] = React.useState('')
  const [responseText, setResponseText] = React.useState(
    (action as { response?: string }).response ?? '',
  )
  const [rejectFeedback, setRejectFeedback] = React.useState('')
  const [showReject, setShowReject] = React.useState(false)
  const [isWorkflowBusy, setIsWorkflowBusy] = React.useState(false)

  React.useEffect(() => {
    setTitle(action.title)
    setDescription(action.description ?? '')
    setDueDate(action.dueDate ?? '')
    setDivisionId(divisionIdFromAction(action.divisionId))
  }, [action])

  useRegisterPageBreadcrumbs(
    React.useMemo(
      () => [
        {
          label: resolvedWorkspace.roleLabel,
          href: resolvedWorkspace.dashboardHref,
        },
        { label: 'Board Actions', href: listHref },
        { label: action.title },
      ],
      [
        action.title,
        listHref,
        resolvedWorkspace.dashboardHref,
        resolvedWorkspace.roleLabel,
      ],
    ),
  )

  const patchAction = React.useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch(`${apiPath}/${action._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }
      router.refresh()
    },
    [action._id, apiPath, router],
  )

  const runWorkflow = async (body: Record<string, unknown>, success: string) => {
    setIsWorkflowBusy(true)
    try {
      await patchAction(body)
      toast.success(success)
      setShowReject(false)
      setRejectFeedback('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setIsWorkflowBusy(false)
    }
  }

  const saveTitle = async () => {
    const trimmed = title.trim()
    if (!trimmed) return
    setIsSaving(true)
    try {
      await patchAction({ title: trimmed })
      setIsEditingTitle(false)
      toast.success('Title updated')
    } catch (err) {
      setTitle(titleBeforeEdit)
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const saveDescription = async () => {
    setIsSaving(true)
    try {
      await patchAction({ description })
      setIsEditingDescription(false)
      toast.success('Description updated')
    } catch (err) {
      setDescription(descriptionBeforeEdit)
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const cancelDescriptionEdit = React.useCallback(() => {
    setDescription(descriptionBeforeEdit)
    setIsEditingDescription(false)
  }, [descriptionBeforeEdit])

  React.useEffect(() => {
    if (!isEditingDescription) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        descriptionEditRef.current &&
        !descriptionEditRef.current.contains(target)
      ) {
        cancelDescriptionEdit()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isEditingDescription, cancelDescriptionEdit])

  const saveDueDate = async (value: string) => {
    if (!value) return
    setDueDate(value)
    setIsSaving(true)
    try {
      await patchAction({ dueDate: value })
      toast.success('Due date updated')
    } catch (err) {
      setDueDate(action.dueDate ?? '')
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const saveDivision = async (value: string) => {
    setDivisionId(value)
    setIsSaving(true)
    try {
      await patchAction({ divisionId: divisionIdForApi(value) })
      toast.success('Responsibility center updated')
    } catch (err) {
      setDivisionId(divisionIdFromAction(action.divisionId))
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const setStatus = async (status: string) => {
    setIsSaving(true)
    try {
      await patchAction({ status })
      toast.success(
        status === 'completed' ? 'Marked as completed' : 'Status updated',
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const delegateToSection = async () => {
    if (!delegateSectionId) return
    setIsDelegating(true)
    try {
      const res = await fetch(`${apiPath}/${action._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId: delegateSectionId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delegate action')
      }
      toast.success('Delegated to section')
      router.refresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delegate action',
      )
    } finally {
      setIsDelegating(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`${apiPath}/${action._id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete')
      }
      toast.success('Board action deleted')
      router.push(listHref)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setIsDeleting(false)
      setShowDelete(false)
    }
  }

  const overdue = isOverdue(action.dueDate, action.status)
  const currentStep = workflowStepIndex(action.status)
  const sectionDelegated = Boolean(action.sectionId)
  const showCascadeProgress = !(
    action.status === 'at_commissioner' && !action.divisionId
  )

  return (
    <div className='flex min-h-0 w-full flex-1 flex-col overflow-hidden'>
      <div className='flex min-h-0 min-w-0 flex-1 flex-col gap-8 overflow-y-auto overscroll-contain p-4 pt-6 md:p-8'>
        <Button variant='ghost' size='sm' className='w-fit -ml-2' asChild>
          <Link href={listHref}>
            <ArrowLeft className='mr-2 h-4 w-4' />
            Board actions
          </Link>
        </Button>

        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0 flex-1 max-w-3xl space-y-6'>
            <div>
              {isEditingTitle && canManage ? (
                <div className='space-y-2'>
                  <textarea
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') {
                        setTitle(titleBeforeEdit)
                        setIsEditingTitle(false)
                      }
                    }}
                    autoFocus
                    disabled={isSaving}
                    rows={2}
                    className='flex min-h-[80px] w-full resize-y rounded-md border-2 border-input bg-background px-3 py-2 text-2xl font-bold placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50'
                  />
                  <div className='flex gap-1'>
                    <Button
                      type='button'
                      variant='outline'
                      size='icon'
                      className='h-8 w-8'
                      onClick={() => void saveTitle()}
                      disabled={isSaving || !title.trim()}
                    >
                      <Check className='h-4 w-4' />
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      size='icon'
                      className='h-8 w-8'
                      onClick={() => {
                        setTitle(titleBeforeEdit)
                        setIsEditingTitle(false)
                      }}
                      disabled={isSaving}
                    >
                      <X className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              ) : (
                <h1
                  className={cn(
                    'text-2xl font-bold rounded px-2 py-1 -mx-2',
                    canManage && 'cursor-pointer hover:bg-muted/50',
                  )}
                  onClick={() => {
                    if (!canManage) return
                    setTitleBeforeEdit(title)
                    setIsEditingTitle(true)
                  }}
                >
                  {title}
                </h1>
              )}

              <div className='flex flex-wrap items-center gap-2 px-2 -mx-2'>
                {overdue && <Badge variant='destructive'>Overdue</Badge>}
              </div>
            </div>

            <div className='flex flex-col gap-1.5 px-2 -mx-2'>
              <span className='text-sm font-medium'>Description</span>
              {isEditingDescription && canManage ? (
                <div ref={descriptionEditRef} className='space-y-2'>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') cancelDescriptionEdit()
                    }}
                    autoFocus
                    disabled={isSaving}
                    rows={3}
                    placeholder='What needs to be done, context, or board direction…'
                    className='flex min-h-[72px] w-full resize-y rounded-md border-2 border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50'
                  />
                  <div className='flex gap-1'>
                    <Button
                      type='button'
                      variant='outline'
                      size='icon'
                      className='h-8 w-8'
                      onClick={() => void saveDescription()}
                      disabled={isSaving}
                    >
                      <Check className='h-4 w-4' />
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      size='icon'
                      className='h-8 w-8'
                      onClick={cancelDescriptionEdit}
                      disabled={isSaving}
                    >
                      <X className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              ) : (
                <p
                  className={cn(
                    'text-sm text-muted-foreground whitespace-pre-wrap rounded px-2 py-1.5 -mx-2 min-h-[1.5rem]',
                    canManage && 'cursor-pointer hover:bg-muted/50',
                  )}
                  onClick={() => {
                    if (!canManage) return
                    setDescriptionBeforeEdit(description)
                    setIsEditingDescription(true)
                  }}
                >
                  {description || 'Click to add a description…'}
                </p>
              )}
            </div>

            <div className='flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-end sm:gap-8 px-2 -mx-2'>
              <div className='flex min-w-[10rem] flex-col gap-1.5'>
                <span className='text-xs font-medium text-muted-foreground'>
                  Due date
                </span>
                {canManage ? (
                  <Input
                    type='date'
                    value={dueDate}
                    disabled={isSaving}
                    className='h-9 w-full sm:w-[11rem]'
                    onChange={e => void saveDueDate(e.target.value)}
                  />
                ) : (
                  <span className='text-sm font-medium tabular-nums'>
                    {formatDueDate(dueDate)}
                  </span>
                )}
              </div>

              <div className='flex min-w-[12rem] flex-1 flex-col gap-1.5 sm:max-w-xs'>
                <span className='text-xs font-medium text-muted-foreground'>
                  Responsibility center
                </span>
                {sectionDelegated ? (
                  <div className='space-y-0.5'>
                    {action.sectionSlug ? (
                      <Link
                        href={`/sections/${action.sectionSlug}`}
                        className='text-sm font-medium hover:underline'
                      >
                        {action.sectionName}
                      </Link>
                    ) : (
                      <span className='text-sm font-medium'>
                        {action.sectionName}
                      </span>
                    )}
                    {action.delegatedByName && (
                      <p className='text-xs text-muted-foreground'>
                        Delegated by {action.delegatedByName}
                      </p>
                    )}
                  </div>
                ) : canDelegate && sectionOptions.length > 0 ? (
                  <div className='flex flex-col gap-2 sm:flex-row sm:items-end'>
                    <div className='min-w-[12rem] space-y-1'>
                      <Label className='text-xs'>Assign to section</Label>
                      <Select
                        value={delegateSectionId || undefined}
                        onValueChange={setDelegateSectionId}
                        disabled={isDelegating}
                      >
                        <SelectTrigger className='h-9'>
                          <SelectValue placeholder='Select section' />
                        </SelectTrigger>
                        <SelectContent>
                          {sectionOptions.map(section => (
                            <SelectItem key={section._id} value={section._id}>
                              {section.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      size='sm'
                      onClick={() => void delegateToSection()}
                      disabled={!delegateSectionId || isDelegating}
                    >
                      {isDelegating ? (
                        <>
                          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                          Delegating...
                        </>
                      ) : (
                        'Delegate'
                      )}
                    </Button>
                  </div>
                ) : canManage && !isAssistantWorkspace ? (
                  <Select
                    value={divisionId || undefined}
                    onValueChange={value => void saveDivision(value)}
                    disabled={isSaving}
                  >
                    <SelectTrigger className='h-9'>
                      <SelectValue placeholder='Select Division' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={COMMISSIONER_LEVEL_DIVISION}>
                        Commissioner level
                      </SelectItem>
                      {divisions.map(div => (
                        <SelectItem key={div._id} value={div._id}>
                          {div.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className='text-sm font-medium'>
                    {action.sectionName ??
                      action.divisionName ??
                      'Commissioner level'}
                  </span>
                )}
              </div>

              {showCascadeProgress && (
                <div className='flex min-w-[10rem] flex-col gap-1.5'>
                  <span className='text-xs font-medium text-muted-foreground'>
                    Workflow
                  </span>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm font-medium'>
                      {workflowStatusLabel(action.status)}
                    </span>
                    <span className='text-xs text-muted-foreground'>
                      {currentStep + 1}/{WORKFLOW_STEPS.length}
                    </span>
                  </div>
                  <div className='flex items-center gap-1'>
                    {WORKFLOW_STEPS.map((step, index) => (
                      <div
                        key={step.key}
                        className={cn(
                          'h-1.5 flex-1 max-w-8 rounded-full',
                          index <= currentStep
                            ? 'bg-primary'
                            : 'bg-muted-foreground/20',
                        )}
                        title={step.label}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size='sm' className='shrink-0' disabled={isSaving}>
                  Actions
                  <ChevronDown className='ml-1 h-4 w-4 opacity-70' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                {action.status !== 'completed' ? (
                  <DropdownMenuItem
                    disabled={isSaving}
                    onClick={() => void setStatus('completed')}
                  >
                    <CheckCircle2 className='mr-2 h-4 w-4' />
                    Mark complete
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    disabled={isSaving}
                    onClick={() => void setStatus(reopenStatus(action))}
                  >
                    Reopen
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className='text-destructive focus:text-destructive'
                  disabled={isSaving || isDeleting}
                  onClick={() => setShowDelete(true)}
                >
                  <Trash2 className='mr-2 h-4 w-4' />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {showCascadeProgress && (
          <div className='max-w-3xl space-y-3 pt-2'>
            <p className='text-xs font-medium text-muted-foreground'>
              Cascade progress
            </p>
            <ol className='flex flex-wrap items-center gap-x-1 gap-y-2'>
              {WORKFLOW_STEPS.map((step, index) => {
                const isComplete = index < currentStep
                const isCurrent = index === currentStep
                return (
                  <li key={step.key} className='flex items-center gap-1'>
                    <div
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                        isComplete &&
                          'border-primary bg-primary text-primary-foreground',
                        isCurrent && 'border-primary bg-background',
                        !isComplete &&
                          !isCurrent &&
                          'border-muted-foreground/30',
                      )}
                    >
                      {isComplete ? (
                        <Check className='h-2.5 w-2.5' />
                      ) : (
                        <Circle
                          className={cn(
                            'h-2 w-2',
                            isCurrent
                              ? 'fill-primary text-primary'
                              : 'text-muted-foreground/30',
                          )}
                        />
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-xs',
                        isCurrent
                          ? 'font-medium text-foreground'
                          : 'text-muted-foreground',
                      )}
                    >
                      {step.label}
                    </span>
                    {index < WORKFLOW_STEPS.length - 1 && (
                      <span className='mx-1 text-muted-foreground/40'>·</span>
                    )}
                  </li>
                )
              })}
            </ol>
          </div>
        )}

        {(canCascadeToSupervisor ||
          canCascadeToOfficer ||
          canSubmitResponse ||
          canApprove ||
          canReject) && (
          <Card className='max-w-3xl'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-base'>Actions</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              {canCascadeToSupervisor && supervisorOptions.length > 0 ? (
                <div className='flex flex-col gap-2 sm:flex-row sm:items-end'>
                  <div className='min-w-[12rem] flex-1 space-y-1'>
                    <Label className='text-xs'>Cascade to supervisor</Label>
                    <Select
                      value={cascadeSupervisorId || undefined}
                      onValueChange={setCascadeSupervisorId}
                      disabled={isWorkflowBusy}
                    >
                      <SelectTrigger className='h-9'>
                        <SelectValue placeholder='Select supervisor' />
                      </SelectTrigger>
                      <SelectContent>
                        {supervisorOptions.map(s => (
                          <SelectItem key={s._id} value={s._id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size='sm'
                    disabled={!cascadeSupervisorId || isWorkflowBusy}
                    onClick={() =>
                      void runWorkflow(
                        {
                          action: 'cascade',
                          supervisorId: cascadeSupervisorId,
                        },
                        'Cascaded to supervisor',
                      )
                    }
                  >
                    Cascade
                  </Button>
                </div>
              ) : null}

              {canCascadeToOfficer && officerOptions.length > 0 ? (
                <div className='flex flex-col gap-2 sm:flex-row sm:items-end'>
                  <div className='min-w-[12rem] flex-1 space-y-1'>
                    <Label className='text-xs'>Cascade to officer</Label>
                    <Select
                      value={cascadeOfficerId || undefined}
                      onValueChange={setCascadeOfficerId}
                      disabled={isWorkflowBusy}
                    >
                      <SelectTrigger className='h-9'>
                        <SelectValue placeholder='Select officer' />
                      </SelectTrigger>
                      <SelectContent>
                        {officerOptions.map(o => (
                          <SelectItem key={o._id} value={o._id}>
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size='sm'
                    disabled={!cascadeOfficerId || isWorkflowBusy}
                    onClick={() =>
                      void runWorkflow(
                        {
                          action: 'cascade',
                          assigneeId: cascadeOfficerId,
                        },
                        'Cascaded to officer',
                      )
                    }
                  >
                    Cascade
                  </Button>
                </div>
              ) : null}

              {canSubmitResponse ? (
                <div className='space-y-2'>
                  <Label className='text-xs'>Your response</Label>
                  <textarea
                    className='flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                    value={responseText}
                    onChange={e => setResponseText(e.target.value)}
                    disabled={isWorkflowBusy}
                    placeholder='Describe how this item was addressed…'
                  />
                  <Button
                    size='sm'
                    disabled={!responseText.trim() || isWorkflowBusy}
                    onClick={() =>
                      void runWorkflow(
                        { action: 'submit_response', response: responseText },
                        'Response submitted for approval',
                      )
                    }
                  >
                    Submit for approval
                  </Button>
                </div>
              ) : null}

              {(action as { response?: string }).response ? (
                <div className='rounded-md border bg-muted/30 p-3 text-sm'>
                  <p className='text-xs font-medium text-muted-foreground mb-1'>
                    Officer response
                  </p>
                  <p className='whitespace-pre-wrap'>
                    {(action as { response?: string }).response}
                  </p>
                </div>
              ) : null}

              {(action as { rejectionFeedback?: string }).rejectionFeedback ? (
                <div className='rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm'>
                  <p className='text-xs font-medium text-destructive mb-1'>
                    Rejection feedback
                  </p>
                  <p className='whitespace-pre-wrap'>
                    {(action as { rejectionFeedback?: string }).rejectionFeedback}
                  </p>
                </div>
              ) : null}

              {canApprove ? (
                <div className='flex flex-wrap gap-2'>
                  <Button
                    size='sm'
                    disabled={isWorkflowBusy}
                    onClick={() =>
                      void runWorkflow({ action: 'approve' }, 'Approved')
                    }
                  >
                    Approve
                  </Button>
                  {canReject ? (
                    <Button
                      size='sm'
                      variant='outline'
                      disabled={isWorkflowBusy}
                      onClick={() => setShowReject(true)}
                    >
                      Reject
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {showReject ? (
                <div className='space-y-2 border-t pt-4'>
                  <Label className='text-xs'>Rejection feedback</Label>
                  <textarea
                    className='flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                    value={rejectFeedback}
                    onChange={e => setRejectFeedback(e.target.value)}
                    disabled={isWorkflowBusy}
                  />
                  <div className='flex gap-2'>
                    <Button
                      size='sm'
                      variant='destructive'
                      disabled={!rejectFeedback.trim() || isWorkflowBusy}
                      onClick={() =>
                        void runWorkflow(
                          { action: 'reject', feedback: rejectFeedback },
                          'Rejected — sent back to officer',
                        )
                      }
                    >
                      Confirm reject
                    </Button>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={() => setShowReject(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        <Card className='max-w-3xl'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>Activity</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm'>
            <div className='flex justify-between gap-4'>
              <span className='text-muted-foreground'>Created</span>
              <span>{formatDateTime(action.createdAt)}</span>
            </div>
            {action.createdByName && (
              <div className='flex justify-between gap-4'>
                <span className='text-muted-foreground'>Created by</span>
                <span>{action.createdByName}</span>
              </div>
            )}
            <div className='flex justify-between gap-4'>
              <span className='text-muted-foreground'>Last updated</span>
              <span>{formatDateTime(action.updatedAt)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent disableClose={isDeleting}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete board action?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{action.title}&rdquo;. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              disabled={isDeleting}
              onClick={e => {
                e.preventDefault()
                void handleDelete()
              }}
            >
              {isDeleting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Deleting...
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
