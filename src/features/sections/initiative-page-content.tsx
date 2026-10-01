'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Loader2, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useRegisterPageBreadcrumbs } from '@/contexts/app-breadcrumb-context'
import { useIsLg } from '@/hooks/use-is-lg'
import {
  contractsApiBase,
  type ContractsApiResource,
} from '@/lib/contracts-api'
import { AddPmsMeasurableActivityDialog } from '@/features/sections/components/add-pms-measurable-activity-dialog'
import { MeasurableActivitiesTable } from '@/features/sections/components/measurable-activities-table'
import {
  MeasurableActivityDetailsPanel,
  normalizeEvidenceDrafts,
  type EvidenceDraft,
  type MeasurableActivityPanelUpdate,
} from '@/features/sections/components/measurable-activity-details-panel'
import { isCascadedItem } from '@/lib/contract-cascade/is-cascaded'
import type { CascadeAssigneeOption } from '@/lib/contract-cascade/types'
import type {
  ContractInitiative,
  MeasurableActivity,
} from '@/sanity/lib/section-contracts/get-section-contract'

type Section = {
  _id: string
  name: string
  slug?: { current: string }
}

interface InitiativePageContentProps {
  section: Section
  contractId: string
  contractApiResource: ContractsApiResource
  objectiveIndex: number
  initiativeIndex: number
  objectiveCode?: string
  objectiveTitle?: string
  initiative: ContractInitiative
  canManage: boolean
  backHref: string
  initialActivityKey?: string
  /** Null hides assignees (officer contracts). */
  assigneeOptions?: CascadeAssigneeOption[] | null
  assigneeEmptyLabel?: string
  /** Shown on an unassigned core activity. */
  unassignedLabel?: string
  /** PMS and other non-ITIL 4 contracts keep task settings on the activity. */
  showTaskSettings?: boolean
}

export function InitiativePageContent({
  section,
  contractId,
  contractApiResource,
  objectiveIndex,
  initiativeIndex,
  objectiveCode,
  objectiveTitle,
  initiative,
  canManage,
  backHref,
  initialActivityKey,
  assigneeOptions = null,
  assigneeEmptyLabel,
  unassignedLabel,
  showTaskSettings = false,
}: InitiativePageContentProps) {
  const router = useRouter()
  const isLg = useIsLg()
  const apiBase = contractsApiBase(contractApiResource)

  const activities = initiative.measurableActivities ?? []

  const [selectedKey, setSelectedKey] = React.useState<string | null>(() => {
    if (!initialActivityKey?.trim()) return null
    return activities.some(a => a._key === initialActivityKey)
      ? initialActivityKey
      : null
  })
  const [isSaving, setIsSaving] = React.useState(false)
  const [addActivityOpen, setAddActivityOpen] = React.useState(false)
  const [isDeletingInitiative, setIsDeletingInitiative] = React.useState(false)
  const [deleteInitiativeOpen, setDeleteInitiativeOpen] = React.useState(false)

  const [initiativeTitle, setInitiativeTitle] = React.useState(
    initiative.title ?? '',
  )
  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [titleBeforeEdit, setTitleBeforeEdit] = React.useState(
    initiative.title ?? '',
  )
  const [isSavingTitle, setIsSavingTitle] = React.useState(false)

  const selectedIndex = activities.findIndex(a => a._key === selectedKey)
  const selected = selectedIndex >= 0 ? activities[selectedIndex] : null

  const [panelTitle, setPanelTitle] = React.useState('')
  const [panelStatus, setPanelStatus] = React.useState('not_started')
  const [evidenceDrafts, setEvidenceDrafts] = React.useState<EvidenceDraft[]>(
    [],
  )

  React.useEffect(() => {
    setInitiativeTitle(initiative.title ?? '')
  }, [initiative.title])

  React.useEffect(() => {
    if (!selected) {
      setPanelTitle('')
      setPanelStatus('not_started')
      setEvidenceDrafts([])
      return
    }
    setPanelTitle(selected.title ?? '')
    setPanelStatus(selected.status ?? 'not_started')
    setEvidenceDrafts(normalizeEvidenceDrafts(selected.evidence))
  }, [selected])

  const initiativeCode = initiative.code ?? ''
  const breadcrumbs = React.useMemo(
    () => [
      { label: section.name, href: backHref },
      { label: 'Performance Contract', href: backHref },
      { label: initiative.title || 'Initiative' },
    ],
    [section.name, backHref, initiative.title],
  )
  useRegisterPageBreadcrumbs(breadcrumbs)

  async function patchContract(body: Record<string, unknown>) {
    const res = await fetch(`${apiBase}/${contractId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || 'Request failed')
    }
    return data as { warnings?: string[] }
  }

  async function handleAssigneesChange(key: string, assigneeIds: string[]) {
    const index = activities.findIndex(activity => activity._key === key)
    if (index < 0 || isCascadedItem(activities[index])) return
    setIsSaving(true)
    try {
      const data = await patchContract({
        op: 'setActivityAssignees',
        payload: {
          objectiveIndex,
          initiativeIndex,
          activityIndex: index,
          assigneeIds,
        },
      })
      if (data.warnings?.length) {
        toast.warning(data.warnings.join(' '))
      } else {
        toast.success('Assignees updated')
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update assignees')
    } finally {
      setIsSaving(false)
    }
  }

  const initiativeIsCascaded = isCascadedItem(initiative)
  const canEditInitiative = canManage && !initiativeIsCascaded

  async function handleConfirmTitle() {
    if (!canEditInitiative || !initiativeTitle.trim()) return
    setIsSavingTitle(true)
    try {
      await patchContract({
        op: 'updateInitiative',
        payload: {
          objectiveIndex,
          initiativeIndex,
          title: initiativeTitle.trim(),
        },
      })
      setIsEditingTitle(false)
      toast.success('Initiative updated')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save title')
    } finally {
      setIsSavingTitle(false)
    }
  }

  function handleCancelTitle() {
    setInitiativeTitle(titleBeforeEdit)
    setIsEditingTitle(false)
  }

  function nextOrderForType(type: 'core' | 'cross-cutting') {
    return activities.filter(a => a.activityType === type).length + 1
  }

  async function handleUpdateActivity(
    key: string,
    updates: Partial<
      Pick<MeasurableActivity, 'title' | 'status' | 'activityType'>
    >,
  ) {
    const index = activities.findIndex(a => a._key === key)
    if (index < 0 || isCascadedItem(activities[index])) return
    setIsSaving(true)
    try {
      await patchContract({
        op: 'updateActivity',
        payload: {
          objectiveIndex,
          initiativeIndex,
          activityIndex: index,
          ...updates,
        },
      })
      if (key === selectedKey) {
        if (updates.title !== undefined) setPanelTitle(updates.title)
        if (updates.status !== undefined) setPanelStatus(updates.status)
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRemoveActivity(key: string) {
    const index = activities.findIndex(a => a._key === key)
    if (index < 0 || isCascadedItem(activities[index])) return
    setIsSaving(true)
    try {
      await patchContract({
        op: 'deleteMeasurableActivity',
        payload: {
          objectiveIndex,
          initiativeIndex,
          activityIndex: index,
        },
      })
      if (selectedKey === key) setSelectedKey(null)
      toast.success('Activity deleted')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleActivityChange(updates: MeasurableActivityPanelUpdate) {
    if (!canManage || selectedIndex < 0 || isCascadedItem(selected)) return
    if (updates.title !== undefined) setPanelTitle(updates.title)
    if (updates.status !== undefined) setPanelStatus(updates.status)
    if (updates.evidence) setEvidenceDrafts(updates.evidence)
    const { evidence, ...rest } = updates
    setIsSaving(true)
    try {
      await patchContract({
        op: 'updateActivity',
        payload: {
          objectiveIndex,
          initiativeIndex,
          activityIndex: selectedIndex,
          ...rest,
          ...(evidence
            ? {
                evidence: evidence.map(item => ({
                  _key: item._key,
                  label: item.label,
                  notes: item.notes,
                  ...(item.fileAsset
                    ? {
                        file: {
                          _type: 'file',
                          asset: item.fileAsset,
                        },
                      }
                    : {}),
                })),
              }
            : {}),
        },
      })
      router.refresh()
    } catch (err) {
      if (selected) {
        setPanelTitle(selected.title ?? '')
        setPanelStatus(selected.status ?? 'not_started')
        setEvidenceDrafts(normalizeEvidenceDrafts(selected.evidence))
      }
      toast.error(err instanceof Error ? err.message : 'Failed to save')
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteInitiative() {
    if (!canEditInitiative) return
    setIsDeletingInitiative(true)
    try {
      await patchContract({
        op: 'deleteInitiative',
        payload: {
          objectiveIndex,
          initiativeIndex,
        },
      })
      toast.success('Initiative deleted')
      router.push(backHref)
      router.refresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete initiative',
      )
      setIsDeletingInitiative(false)
    }
  }

  const detailsPanelEl = (
    <MeasurableActivityDetailsPanel
      activity={selected}
      canManage={canManage && !isCascadedItem(selected)}
      isSaving={isSaving}
      showTaskSettings={showTaskSettings}
      assigneeOptions={assigneeOptions}
      assigneeEmptyLabel={assigneeEmptyLabel}
      unassignedLabel={unassignedLabel}
      onAssigneesChange={
        selected
          ? ids => void handleAssigneesChange(selected._key, ids)
          : undefined
      }
      title={panelTitle}
      status={panelStatus}
      evidenceDrafts={evidenceDrafts}
      onEvidenceChange={setEvidenceDrafts}
      onActivityChange={handleActivityChange}
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
            <Link href={backHref}>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back to contract
            </Link>
          </Button>
          {canEditInitiative ? (
            <AlertDialog
              open={deleteInitiativeOpen}
              onOpenChange={open => {
                if (!isDeletingInitiative) setDeleteInitiativeOpen(open)
              }}
            >
              <AlertDialogTrigger asChild>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive'
                  disabled={isDeletingInitiative}
                >
                  <Trash2 className='mr-2 h-4 w-4' />
                  Delete activity
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent disableClose={isDeletingInitiative}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete initiative?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this initiative and all of its
                    measurable activities. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeletingInitiative}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    disabled={isDeletingInitiative}
                    onClick={e => {
                      e.preventDefault()
                      void handleDeleteInitiative()
                    }}
                  >
                    {isDeletingInitiative ? (
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
          {(objectiveCode || objectiveTitle) && (
            <p className='mb-2 text-sm text-muted-foreground'>
              {[
                objectiveCode
                  ? `SSMARTA objective ${objectiveCode}`
                  : 'SSMARTA objective',
                objectiveTitle,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          <div className='max-w-prose'>
            {isEditingTitle ? (
              <div className='space-y-2'>
                <textarea
                  value={initiativeTitle}
                  onChange={e => setInitiativeTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') handleCancelTitle()
                  }}
                  autoFocus
                  disabled={isSavingTitle}
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
                    disabled={isSavingTitle || !initiativeTitle.trim()}
                  >
                    <Check className='h-4 w-4' />
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    className='h-8 w-8'
                    onClick={handleCancelTitle}
                    disabled={isSavingTitle}
                  >
                    <X className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            ) : (
              <h1
                className={`text-2xl font-bold rounded px-2 py-1 -mx-2 -my-1 ${canEditInitiative ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                onClick={() => {
                  if (!canEditInitiative) return
                  setTitleBeforeEdit(initiativeTitle)
                  setIsEditingTitle(true)
                }}
              >
                {initiativeCode ? (
                  <>
                    <span className='font-bold'>
                      INITIATIVE {initiativeCode} –{' '}
                    </span>
                  </>
                ) : null}
                <span className='font-normal'>{initiativeTitle}</span>
              </h1>
            )}
          </div>

          <div className='mt-10 space-y-4 flex-1 min-w-0'>
            <div className='flex items-center justify-between gap-3'>
              <h2 className='text-sm font-semibold'>Measurable activities</h2>
              {canManage ? (
                <Button
                  type='button'
                  size='sm'
                  onClick={() => setAddActivityOpen(true)}
                  disabled={isSaving}
                >
                  <Plus className='mr-1.5 h-4 w-4' />
                  Add Measurable Activity
                </Button>
              ) : null}
            </div>
            <MeasurableActivitiesTable
              activities={activities}
              selectedActivityKey={selectedKey}
              onSelectActivity={setSelectedKey}
              onUpdateActivity={handleUpdateActivity}
              onRemoveActivity={handleRemoveActivity}
              assigneeOptions={assigneeOptions}
              assigneeEmptyLabel={assigneeEmptyLabel}
              unassignedLabel={unassignedLabel}
              onAssigneesChange={handleAssigneesChange}
              isSaving={isSaving}
              canManage={canManage}
            />
          </div>
        </div>
      </div>

      {canManage ? (
        <AddPmsMeasurableActivityDialog
          open={addActivityOpen}
          onOpenChange={setAddActivityOpen}
          contractId={contractId}
          contractsApi={contractApiResource}
          objectiveIndex={objectiveIndex}
          initiativeIndex={initiativeIndex}
          initiativeCode={initiativeCode || undefined}
          nextOrderForType={nextOrderForType}
          assigneeOptions={assigneeOptions}
          assigneeEmptyLabel={assigneeEmptyLabel}
          unassignedLabel={unassignedLabel}
        />
      ) : null}

      {isLg ? detailsPanelEl : null}
      {!isLg && (
        <Sheet
          open={Boolean(selectedKey)}
          onOpenChange={open => {
            if (!open) setSelectedKey(null)
          }}
        >
          <SheetContent
            side='right'
            className='flex h-full max-h-[100dvh] w-full flex-col gap-0 p-0 sm:max-w-[24rem]'
          >
            <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-14'>
              {detailsPanelEl}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
