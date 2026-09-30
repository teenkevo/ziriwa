'use client'

import * as React from 'react'
import { endOfMonth, endOfQuarter, endOfWeek, format } from 'date-fns'
import { Check, Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ActivityAssigneesPicker } from '@/features/sections/components/activity-assignees-picker'
import { resolveAssigneeNames } from '@/lib/contract-cascade/assignee-names'
import type { CascadeAssigneeOption } from '@/lib/contract-cascade/types'
import { cn } from '@/lib/utils'
import type {
  MeasurableActivity,
  MeasurableEvidenceItem,
} from '@/sanity/lib/section-contracts/get-section-contract'

const ACTIVITY_PRIORITIES = [
  { label: 'Highest', value: 'highest' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
  { label: 'Lowest', value: 'lowest' },
] as const

type ReportingFrequency = 'weekly' | 'monthly' | 'quarterly' | 'n/a'

export type MeasurableActivityPanelUpdate = {
  title?: string
  status?: string
  targetDate?: string
  reportingFrequency?: ReportingFrequency
  priority?: MeasurableActivity['priority']
  expectedDeliverable?: string
  reportingPeriodStart?: string
  evidence?: EvidenceDraft[]
}

export type EvidenceDraft = {
  _key: string
  label: string
  notes: string
  fileAsset?: { _type: 'reference'; _ref: string }
  fileName?: string
  fileUrl?: string
}

export function normalizeEvidenceDrafts(
  evidence: MeasurableEvidenceItem[] | undefined,
): EvidenceDraft[] {
  if (!evidence?.length) return []
  return evidence.map((item, index) => {
    const key = item._key || `ev-${index}`
    const assetId =
      item.file?.asset?._id || item.image?.asset?._id || item.asset?._id
    return {
      _key: key,
      label: item.label?.trim() || `Evidence ${index + 1}`,
      notes: item.notes?.trim() || '',
      fileAsset: assetId
        ? { _type: 'reference' as const, _ref: assetId }
        : undefined,
      fileName:
        item.file?.asset?.originalFilename ||
        item.image?.asset?.originalFilename ||
        item.asset?.originalFilename,
      fileUrl:
        item.file?.asset?.url || item.image?.asset?.url || item.asset?.url,
    }
  })
}

interface MeasurableActivityDetailsPanelProps {
  activity: MeasurableActivity | null
  canManage: boolean
  isSaving: boolean
  /** Non-ITIL 4 contracts keep detailed-task settings on the measurable activity. */
  showTaskSettings?: boolean
  /** Staff one level below, selectable as assignees. Null hides the section. */
  assigneeOptions?: CascadeAssigneeOption[] | null
  /** Shown inside the picker when nobody can be assigned yet. */
  assigneeEmptyLabel?: string
  /** Shown while nothing is assigned. Names the role one level below. */
  unassignedLabel?: string
  onAssigneesChange?: (assigneeIds: string[]) => void
  title: string
  status: string
  evidenceDrafts: EvidenceDraft[]
  onEvidenceChange: (drafts: EvidenceDraft[]) => void
  onActivityChange: (
    updates: MeasurableActivityPanelUpdate,
  ) => void | Promise<void>
}

export function MeasurableActivityDetailsPanel({
  activity,
  canManage,
  isSaving,
  showTaskSettings = false,
  assigneeOptions = null,
  assigneeEmptyLabel = 'No staff on the level below yet.',
  unassignedLabel = 'Assign',
  onAssigneesChange,
  title,
  status,
  evidenceDrafts,
  onEvidenceChange,
  onActivityChange,
}: MeasurableActivityDetailsPanelProps) {
  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [titleDraft, setTitleDraft] = React.useState(title)
  const [evidenceDraft, setEvidenceDraft] = React.useState('')
  const [dueDate, setDueDate] = React.useState(activity?.targetDate ?? '')
  const [reportingFrequency, setReportingFrequency] =
    React.useState<ReportingFrequency>(activity?.reportingFrequency ?? 'n/a')
  const [priority, setPriority] = React.useState(activity?.priority ?? 'medium')
  const [periodStart, setPeriodStart] = React.useState(
    activity?.reportingPeriodStart ?? '',
  )
  const [editingEvidenceKey, setEditingEvidenceKey] = React.useState<
    string | null
  >(null)
  const [editingEvidenceLabel, setEditingEvidenceLabel] = React.useState('')
  const [isComposingEvidence, setIsComposingEvidence] = React.useState(false)
  const [reportingSave, setReportingSave] = React.useState<
    'toggle' | 'frequency' | 'start' | null
  >(null)
  const titleEditRef = React.useRef<HTMLDivElement>(null)
  const skipEvidenceCommitRef = React.useRef(false)
  const evidenceBaselineRef = React.useRef<EvidenceDraft[] | null>(null)

  React.useEffect(() => {
    setTitleDraft(title)
    setIsEditingTitle(false)
  }, [activity?._key, title])

  React.useEffect(() => {
    setEvidenceDraft('')
    setEditingEvidenceKey(null)
    setEditingEvidenceLabel('')
    setIsComposingEvidence(false)
    evidenceBaselineRef.current = null
    setReportingSave(null)
  }, [activity?._key])

  React.useEffect(() => {
    setDueDate(activity?.targetDate ?? '')
    setReportingFrequency(activity?.reportingFrequency ?? 'n/a')
    setPriority(activity?.priority ?? 'medium')
    setPeriodStart(activity?.reportingPeriodStart ?? '')
  }, [
    activity?._key,
    activity?.targetDate,
    activity?.reportingFrequency,
    activity?.priority,
    activity?.reportingPeriodStart,
  ])

  async function saveActivity(updates: MeasurableActivityPanelUpdate) {
    await onActivityChange(updates)
  }

  async function saveReporting(
    kind: 'toggle' | 'frequency' | 'start',
    updates: MeasurableActivityPanelUpdate,
    revert: () => void,
  ) {
    setReportingSave(kind)
    try {
      await saveActivity(updates)
    } catch {
      revert()
    } finally {
      setReportingSave(null)
    }
  }

  function beginComposingEvidence() {
    if (isComposingEvidence) return
    evidenceBaselineRef.current = evidenceDrafts
    setIsComposingEvidence(true)
  }

  function addEvidenceItem() {
    const label = evidenceDraft.trim()
    if (!label || !canManage || isSaving) return
    onEvidenceChange([
      ...evidenceDrafts,
      { _key: crypto.randomUUID(), label, notes: '' },
    ])
    setEvidenceDraft('')
  }

  function removeEvidenceItem(key: string) {
    if (editingEvidenceKey === key) {
      setEditingEvidenceKey(null)
      setEditingEvidenceLabel('')
    }
    onEvidenceChange(evidenceDrafts.filter(row => row._key !== key))
  }

  function startEditingEvidence(item: EvidenceDraft) {
    if (!canManage || isSaving) return
    beginComposingEvidence()
    setEditingEvidenceKey(item._key)
    setEditingEvidenceLabel(item.label)
  }

  function commitEditingEvidence() {
    if (skipEvidenceCommitRef.current) {
      skipEvidenceCommitRef.current = false
      return
    }
    if (!editingEvidenceKey) return
    const label = editingEvidenceLabel.trim()
    const key = editingEvidenceKey
    setEditingEvidenceKey(null)
    setEditingEvidenceLabel('')
    if (!label) return
    onEvidenceChange(
      evidenceDrafts.map(row => (row._key === key ? { ...row, label } : row)),
    )
  }

  function cancelEditingEvidence() {
    skipEvidenceCommitRef.current = true
    setEditingEvidenceKey(null)
    setEditingEvidenceLabel('')
  }

  async function confirmEvidenceComposing() {
    let next = evidenceDrafts
    if (editingEvidenceKey) {
      const label = editingEvidenceLabel.trim()
      if (label) {
        next = next.map(row =>
          row._key === editingEvidenceKey ? { ...row, label } : row,
        )
      }
    }
    const pending = evidenceDraft.trim()
    if (pending) {
      next = [
        ...next,
        { _key: crypto.randomUUID(), label: pending, notes: '' },
      ]
    }
    if (next !== evidenceDrafts) onEvidenceChange(next)
    try {
      await saveActivity({ evidence: next })
    } catch {
      return
    }
    skipEvidenceCommitRef.current = true
    setEditingEvidenceKey(null)
    setEditingEvidenceLabel('')
    setEvidenceDraft('')
    evidenceBaselineRef.current = null
    setIsComposingEvidence(false)
  }

  function cancelEvidenceComposing() {
    skipEvidenceCommitRef.current = true
    const baseline = evidenceBaselineRef.current
    if (baseline) onEvidenceChange(baseline)
    setEvidenceDraft('')
    setEditingEvidenceKey(null)
    setEditingEvidenceLabel('')
    evidenceBaselineRef.current = null
    setIsComposingEvidence(false)
  }

  const canConfirmEvidence =
    evidenceDraft.trim().length > 0 ||
    (editingEvidenceKey !== null && editingEvidenceLabel.trim().length > 0) ||
    (evidenceBaselineRef.current !== null &&
      evidenceBaselineRef.current !== evidenceDrafts)

  const assigneeNames = resolveAssigneeNames(
    activity?.assignees,
    assigneeOptions ?? [],
  )

  if (!activity) {
    return (
      <aside className='w-full lg:w-[24rem] shrink-0 border-l bg-muted/20 flex flex-col min-h-0 overflow-y-auto overscroll-contain'>
        <div className='p-6 flex flex-1 items-center justify-center'>
          <p className='text-sm text-muted-foreground text-center'>
            Select a measurable activity to view and edit details
          </p>
        </div>
      </aside>
    )
  }

  return (
    <aside className='w-full lg:w-[24rem] shrink-0 border-l bg-muted/20 flex flex-col min-h-0 overflow-y-auto overscroll-contain'>
      <div className='flex min-h-0 flex-1 flex-col space-y-6 p-4 pb-8'>
        <div>
          <Label className='text-xs text-muted-foreground'>
            Measurable activity
          </Label>
          {isEditingTitle ? (
            <div ref={titleEditRef} className='space-y-2 mt-1'>
              <textarea
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    setTitleDraft(title)
                    setIsEditingTitle(false)
                  }
                }}
                autoFocus
                disabled={isSaving || !canManage}
                rows={3}
                className='flex min-h-[80px] w-full resize-y rounded-md border-2 border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50'
                placeholder='Activity title'
              />
              <div className='flex gap-1'>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='h-8 w-8'
                  onClick={() => {
                    const next = titleDraft.trim()
                    if (!next) return
                    void saveActivity({ title: next })
                      .then(() => setIsEditingTitle(false))
                      .catch(() => undefined)
                  }}
                  disabled={isSaving || !titleDraft.trim()}
                >
                  <Check className='h-4 w-4' />
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='h-8 w-8'
                  onClick={() => {
                    setTitleDraft(title)
                    setIsEditingTitle(false)
                  }}
                  disabled={isSaving}
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
            </div>
          ) : (
            <p
              className={cn(
                'text-sm rounded px-2 py-2 -mx-2 -my-1 mt-1 min-h-[2.5rem]',
                !canManage
                  ? 'text-muted-foreground cursor-not-allowed'
                  : 'cursor-pointer hover:bg-muted/50',
              )}
              onClick={() => {
                if (!canManage) return
                setTitleDraft(title)
                setIsEditingTitle(true)
              }}
            >
              {title || '—'}
            </p>
          )}
        </div>

        <div className='space-y-2'>
          <Label className='text-xs text-muted-foreground'>Type</Label>
          <p className='text-sm'>
            {activity.activityType === 'cross-cutting'
              ? 'Cross-cutting'
              : activity.activityType === 'core'
                ? 'Core'
                : activity.activityType}
          </p>
        </div>

        {assigneeOptions ? (
          <div className='space-y-2'>
            <Label className='text-xs text-muted-foreground'>Assignees</Label>
            {activity.activityType === 'cross-cutting' ? (
              <p className='text-sm text-muted-foreground'>
                Owned at this level
              </p>
            ) : canManage && onAssigneesChange ? (
              <ActivityAssigneesPicker
                assignees={activity.assignees}
                options={assigneeOptions}
                emptyLabel={assigneeEmptyLabel}
                unassignedLabel={unassignedLabel}
                triggerClassName='w-full'
                disabled={isSaving}
                onChange={onAssigneesChange}
              />
            ) : assigneeNames.length === 0 ? (
              <p className='text-sm text-muted-foreground'>Not assigned yet</p>
            ) : (
              <div className='flex flex-wrap gap-1.5'>
                {assigneeNames.map((name, index) => (
                  <span
                    key={`${name}-${index}`}
                    className='inline-flex max-w-full items-center rounded-md bg-muted px-2 py-0.5 text-xs text-foreground'
                  >
                    <span className='truncate'>{name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className='space-y-2'>
          <Label className='text-xs text-muted-foreground'>Status</Label>
          <Select
            value={status || 'not_started'}
            onValueChange={value => {
              void saveActivity({ status: value })
            }}
            disabled={!canManage || isSaving}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='not_started'>Not started</SelectItem>
              <SelectItem value='in_progress'>In progress</SelectItem>
              <SelectItem value='completed'>Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showTaskSettings ? (
          <>
            <div className='space-y-2'>
              <Label className='text-xs text-muted-foreground'>Due date</Label>
              {reportingFrequency === 'weekly' ? (
                <div className='flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground'>
                  Due end of this week ({format(endOfWeek(new Date()), 'PPP')})
                </div>
              ) : (
                <div className='space-y-1'>
                  <div className='flex items-center gap-1'>
                    <DatePicker
                      className='flex-1'
                      value={dueDate}
                      disabled={!canManage || isSaving}
                      placeholder='Select due date'
                      onChange={value => {
                        const previous = dueDate
                        setDueDate(value)
                        void saveActivity({ targetDate: value }).catch(() =>
                          setDueDate(previous),
                        )
                      }}
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='h-9 w-9 shrink-0 text-muted-foreground'
                      aria-label='Clear due date'
                      disabled={!canManage || isSaving || !dueDate}
                      onClick={() => {
                        const previous = dueDate
                        setDueDate('')
                        void saveActivity({ targetDate: '' }).catch(() =>
                          setDueDate(previous),
                        )
                      }}
                    >
                      <X className='h-4 w-4' />
                    </Button>
                  </div>
                  {reportingFrequency === 'monthly' ||
                  reportingFrequency === 'quarterly' ? (
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='h-8 px-2 text-muted-foreground'
                      disabled={!canManage || isSaving}
                      onClick={() => {
                        const end =
                          reportingFrequency === 'quarterly'
                            ? endOfQuarter(new Date())
                            : endOfMonth(new Date())
                        const value = format(end, 'yyyy-MM-dd')
                        const previous = dueDate
                        setDueDate(value)
                        void saveActivity({ targetDate: value }).catch(() =>
                          setDueDate(previous),
                        )
                      }}
                    >
                      Set to end of period
                    </Button>
                  ) : null}
                </div>
              )}
            </div>

            <div className='space-y-2'>
              <Label className='text-xs text-muted-foreground'>Priority</Label>
              <Select
                value={priority}
                disabled={!canManage || isSaving}
                onValueChange={value => {
                  const previous = priority
                  const next = value as NonNullable<
                    MeasurableActivity['priority']
                  >
                  setPriority(next)
                  void saveActivity({ priority: next }).catch(() =>
                    setPriority(previous),
                  )
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_PRIORITIES.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Card aria-busy={reportingSave !== null}>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 p-4'>
                <div>
                  <CardTitle className='text-sm font-medium'>
                    Activity is reported periodically
                  </CardTitle>
                  <CardDescription className='mt-1 text-xs'>
                    {reportingSave === 'toggle'
                      ? 'Changing reporting settings…'
                      : 'Enable if this activity has regular reporting cycles'}
                  </CardDescription>
                </div>
                <div className='flex items-center gap-2'>
                  {reportingSave === 'toggle' ? (
                    <Loader2
                      className='h-4 w-4 animate-spin text-muted-foreground'
                      aria-hidden
                    />
                  ) : null}
                  <Switch
                    checked={reportingFrequency !== 'n/a'}
                    disabled={!canManage || reportingSave !== null}
                    onCheckedChange={checked => {
                      const previous = reportingFrequency
                      const next: ReportingFrequency = checked
                        ? 'monthly'
                        : 'n/a'
                      setReportingFrequency(next)
                      void saveReporting(
                        'toggle',
                        { reportingFrequency: next },
                        () => setReportingFrequency(previous),
                      )
                    }}
                  />
                </div>
              </CardHeader>
              {reportingFrequency !== 'n/a' ? (
                <CardContent className='space-y-4 px-4 pb-4 pt-0'>
                  <div className='space-y-2'>
                    <Label className='text-xs text-muted-foreground'>
                      Reporting frequency
                    </Label>
                    <div className='flex items-center gap-2'>
                      <Select
                        value={reportingFrequency}
                        disabled={!canManage || reportingSave !== null}
                        onValueChange={value => {
                          const previous = reportingFrequency
                          const next = value as ReportingFrequency
                          setReportingFrequency(next)
                          void saveReporting(
                            'frequency',
                            { reportingFrequency: next },
                            () => setReportingFrequency(previous),
                          )
                        }}
                      >
                        <SelectTrigger className='min-w-0 flex-1'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='weekly'>Weekly</SelectItem>
                          <SelectItem value='monthly'>Monthly</SelectItem>
                          <SelectItem value='quarterly'>Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                      {reportingSave === 'toggle' ||
                      reportingSave === 'frequency' ? (
                        <Loader2
                          className='h-4 w-4 shrink-0 animate-spin text-muted-foreground'
                          aria-label='Changing reporting frequency'
                        />
                      ) : null}
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <Label className='text-xs text-muted-foreground'>
                      Reporting starts
                    </Label>
                    <div className='flex items-center gap-2'>
                      <DatePicker
                        className='min-w-0 flex-1'
                        value={periodStart}
                        disabled={!canManage || reportingSave !== null}
                        placeholder='Defaults to FY start'
                        onChange={value => {
                          const previous = periodStart
                          setPeriodStart(value)
                          void saveReporting(
                            'start',
                            { reportingPeriodStart: value },
                            () => setPeriodStart(previous),
                          )
                        }}
                      />
                      {reportingSave === 'toggle' || reportingSave === 'start' ? (
                        <Loader2
                          className='h-4 w-4 shrink-0 animate-spin text-muted-foreground'
                          aria-label='Changing reporting start'
                        />
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              ) : null}
            </Card>
          </>
        ) : null}

        <div className='space-y-2'>
          <Label className='text-xs text-muted-foreground'>
            Expected evidence
          </Label>
          <div
            className={cn(
              'flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5',
              canManage && 'focus-within:ring-1 focus-within:ring-ring',
            )}
          >
            {evidenceDrafts.map(item =>
              item._key === editingEvidenceKey ? (
                <input
                  key={item._key}
                  autoFocus
                  value={editingEvidenceLabel}
                  disabled={isSaving}
                  aria-label={`Edit ${item.label}`}
                  onChange={event => setEditingEvidenceLabel(event.target.value)}
                  onBlur={commitEditingEvidence}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      event.currentTarget.blur()
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault()
                      cancelEditingEvidence()
                    }
                  }}
                  style={{
                    width: `${Math.max(editingEvidenceLabel.length, 4) + 2}ch`,
                  }}
                  className='h-6 max-w-full rounded-md border bg-background px-1.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed'
                />
              ) : (
                <span
                  key={item._key}
                  className='inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-foreground'
                >
                  {canManage ? (
                    <button
                      type='button'
                      className='max-w-[16rem] truncate text-left'
                      disabled={isSaving}
                      onClick={() => startEditingEvidence(item)}
                    >
                      {item.label}
                    </button>
                  ) : (
                    <span className='truncate'>{item.label}</span>
                  )}
                  {canManage ? (
                    <button
                      type='button'
                      className='shrink-0 rounded-sm text-muted-foreground hover:text-foreground disabled:opacity-50'
                      aria-label={`Remove ${item.label}`}
                      disabled={isSaving}
                      onMouseDown={event => event.preventDefault()}
                      onClick={() => removeEvidenceItem(item._key)}
                    >
                      <X className='h-3 w-3' />
                    </button>
                  ) : null}
                </span>
              ),
            )}
            {canManage ? (
              <input
                value={evidenceDraft}
                disabled={isSaving}
                onChange={event => {
                  beginComposingEvidence()
                  setEvidenceDraft(event.target.value)
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    beginComposingEvidence()
                    addEvidenceItem()
                    return
                  }
                  if (
                    event.key === 'Backspace' &&
                    evidenceDraft.length === 0 &&
                    evidenceDrafts.length > 0
                  ) {
                    event.preventDefault()
                    removeEvidenceItem(
                      evidenceDrafts[evidenceDrafts.length - 1]._key,
                    )
                  }
                }}
                placeholder={
                  evidenceDrafts.length === 0
                    ? 'Type an item and press Enter'
                    : 'Add another'
                }
                className='h-7 min-w-[8rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed'
              />
            ) : evidenceDrafts.length === 0 ? (
              <p className='text-xs text-muted-foreground'>No evidence yet.</p>
            ) : null}
          </div>
          {canManage && isComposingEvidence ? (
            <div className='flex gap-1'>
              <Button
                type='button'
                variant='outline'
                size='icon'
                className='h-8 w-8'
                aria-label='Save evidence items'
                onMouseDown={event => event.preventDefault()}
                onClick={confirmEvidenceComposing}
                disabled={isSaving || !canConfirmEvidence}
              >
                <Check className='h-4 w-4' />
              </Button>
              <Button
                type='button'
                variant='outline'
                size='icon'
                className='h-8 w-8'
                aria-label='Cancel evidence items'
                onMouseDown={event => event.preventDefault()}
                onClick={cancelEvidenceComposing}
                disabled={isSaving}
              >
                <X className='h-4 w-4' />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
