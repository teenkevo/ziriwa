'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
  departmentMeasurableActivityNumber,
  measurableActivityNumber,
  resolveActivityNumberingType,
} from '@/lib/contract-numbering'
import type { SectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import { isPmsAlignment } from '@/lib/contract-alignment'
import { isCascadedItem } from '@/lib/contract-cascade/is-cascaded'
import { AddObjectiveDialog } from '@/features/sections/components/add-objective-dialog'
import { AddInitiativeDialog } from '@/features/sections/components/add-initiative-dialog'
import { AddMeasurableActivityDialog } from '@/features/sections/components/add-measurable-activity-dialog'
import { EditObjectiveDialog } from '@/features/sections/components/edit-objective-dialog'
import { EditInitiativeDialog } from '@/features/sections/components/edit-initiative-dialog'
import {
  ContractColumnAddButton,
  ContractColumnBrowser,
  contractInitiativeActivityHref,
  type ContractColumnInitiative,
  type ContractColumnObjective,
} from '@/features/sections/components/contract-column-browser'
import { EditMeasurableActivityDialog } from '@/features/sections/components/edit-measurable-activity-dialog'
import type { CascadeAssigneeOption } from '@/lib/contract-cascade/types'
import {
  contractFinalizeAttentionKeys,
  reviewContractForFinalize,
} from '@/lib/contract-finalize'
import { ContractFinalizeBar } from '@/features/sections/components/contract-finalize-bar'

interface ContractTreeProps {
  sectionContract: SectionContract
  sectionSlug?: string
  canManageContract?: boolean
  assigneeOptions?: CascadeAssigneeOption[] | null
  assigneeEmptyLabel?: string
  unassignedLabel?: string
  /** Increment to open the add SSMARTA objective dialog (from parent toolbar). */
  addObjectiveSignal?: number
  /** Call when the add-objective dialog closes so the parent can clear `addObjectiveSignal`. */
  onAddObjectiveRequestConsumed?: () => void
}

function buildSectionColumnObjectives(input: {
  sectionContract: SectionContract
  sectionSlug: string
  pmsMode: boolean
  canManage: boolean
  onEditObjective: (objIdx: number) => void
  onDeleteObjective: (objIdx: number) => void
  onAddInitiative: (objIdx: number) => void
  onEditInitiative: (objIdx: number, initIdx: number) => void
  onDeleteInitiative: (objIdx: number, initIdx: number) => void
  onDeleteActivity: (objIdx: number, initIdx: number, actIdx: number) => void
  onEditActivity: (objIdx: number, initIdx: number, actIdx: number) => void
  onAddActivity: (objIdx: number, initIdx: number) => void
  onOpenInitiative: (objIdx: number, initIdx: number) => void
  onOpenActivity: (objIdx: number, initIdx: number, actIdx: number) => void
}): ContractColumnObjective[] {
  const {
    sectionContract,
    sectionSlug,
    pmsMode,
    canManage,
    onEditObjective,
    onDeleteObjective,
    onAddInitiative,
    onEditInitiative,
    onDeleteInitiative,
    onDeleteActivity,
    onEditActivity,
    onAddActivity,
    onOpenInitiative,
    onOpenActivity,
  } = input
  const objectives = sectionContract.objectives ?? []
  const attention = contractFinalizeAttentionKeys(
    reviewContractForFinalize(objectives, sectionContract.hiddenCascadeKeys),
  )
  const hidden = new Set(sectionContract.hiddenCascadeKeys ?? [])

  return objectives.flatMap((obj, objIdx) => {
    if (obj._key && hidden.has(obj._key)) return []
    const objNum = obj.code ?? String(objIdx + 1)
    const initiatives = obj.initiatives ?? []

    const canEditObjective = canManage && !isCascadedItem(obj)

    const objectiveId = obj._key || `objective-${objIdx}`
    const initiativeRows = initiatives.flatMap<ContractColumnInitiative>((init, initIdx) => {
        const initNum = init.code ?? `${objNum}.${initIdx + 1}`
        const initiativeId = init._key || `initiative-${objIdx}-${initIdx}`
        if (init._key && hidden.has(init._key)) return []
        const canEditInitiative = canManage && !isCascadedItem(init)

        if (pmsMode) {
          return [{
            id: initiativeId,
            attention: attention.has(initiativeId),
            ready: !attention.has(initiativeId),
            title: init.title,
            code: initNum,
            onEdit: canEditInitiative
              ? () => onEditInitiative(objIdx, initIdx)
              : undefined,
            onDelete: canEditInitiative
              ? () => onDeleteInitiative(objIdx, initIdx)
              : undefined,
            onOpen: sectionSlug
              ? () => onOpenInitiative(objIdx, initIdx)
              : undefined,
          }]
        }

        const activities = init.measurableActivities ?? []
        const children = activities.flatMap((act, actIdx) => {
          if (!act?.title || !String(act.title).trim()) return []
          const numberingKind = resolveActivityNumberingType(act)
          const actOrder =
            activities.slice(0, actIdx).filter(
              item => resolveActivityNumberingType(item) === numberingKind,
            ).length + 1
          const actNum =
            numberingKind === 'kpi' || numberingKind === 'cross-cutting'
              ? measurableActivityNumber(initNum, numberingKind, actOrder)
              : departmentMeasurableActivityNumber(initNum, actOrder)
          const canEditActivity = canManage && !isCascadedItem(act)
          return [
            {
              id: act._key || `activity-${objIdx}-${initIdx}-${actIdx}`,
              attention: attention.has(
                act._key || `activity-${objIdx}-${initIdx}-${actIdx}`,
              ),
              ready: !attention.has(
                act._key || `activity-${objIdx}-${initIdx}-${actIdx}`,
              ),
              title: act.title,
              code: actNum,
              status: act.status,
              href: contractInitiativeActivityHref({
                sectionSlug,
                contractId: sectionContract._id,
                objectiveIndex: objIdx,
                initiativeIndex: initIdx,
                activityKey: act._key,
              }),
              onOpen: sectionSlug
                ? () => onOpenActivity(objIdx, initIdx, actIdx)
                : undefined,
              onEdit: canEditActivity
                ? () => onEditActivity(objIdx, initIdx, actIdx)
                : undefined,
              onDelete: canEditActivity
                ? () => onDeleteActivity(objIdx, initIdx, actIdx)
                : undefined,
            },
          ]
        })

        return [{
          id: initiativeId,
          attention: attention.has(initiativeId),
          ready: !attention.has(initiativeId),
          title: init.title,
          code: initNum,
          opensNextColumn: true,
          childEmptyLabel: 'No measurable activities yet.',
          childHeaderAction: canManage ? (
            <ContractColumnAddButton
              label='Add measurable activity'
              onClick={() => onAddActivity(objIdx, initIdx)}
            />
          ) : undefined,
          onEdit: canEditInitiative
            ? () => onEditInitiative(objIdx, initIdx)
            : undefined,
          onDelete: canEditInitiative
            ? () => onDeleteInitiative(objIdx, initIdx)
            : undefined,
          children,
        }]
    })
    if (initiatives.length > 0 && initiativeRows.length === 0) return []
    return [{
      id: objectiveId,
      attention: attention.has(objectiveId),
      ready: !attention.has(objectiveId),
      title: obj.title,
      code: objNum,
      onEdit: canEditObjective ? () => onEditObjective(objIdx) : undefined,
      onDelete: canEditObjective ? () => onDeleteObjective(objIdx) : undefined,
      onAddInitiative: canManage ? () => onAddInitiative(objIdx) : undefined,
      initiatives: initiativeRows,
    }]
  })
}

export function ContractTree({
  sectionContract,
  sectionSlug = '',
  canManageContract = false,
  assigneeOptions = null,
  assigneeEmptyLabel,
  unassignedLabel,
  addObjectiveSignal = 0,
  onAddObjectiveRequestConsumed,
}: ContractTreeProps) {
  const router = useRouter()
  const [objectiveDialogOpen, setObjectiveDialogOpen] = React.useState(false)
  const [initiativeDialogOpen, setInitiativeDialogOpen] = React.useState(false)
  const [initiativeDialogObjIdx, setInitiativeDialogObjIdx] =
    React.useState<number>(0)
  const [activityDialogOpen, setActivityDialogOpen] = React.useState(false)
  const [editObjectiveOpen, setEditObjectiveOpen] = React.useState(false)
  const [editingObjectiveIndex, setEditingObjectiveIndex] =
    React.useState<number>(0)
  const [editInitiativeOpen, setEditInitiativeOpen] = React.useState(false)
  const [editingInitiative, setEditingInitiative] = React.useState<{
    objIdx: number
    initIdx: number
  } | null>(null)
  const [deleteObjectiveIndex, setDeleteObjectiveIndex] = React.useState<
    number | null
  >(null)
  const [deleteInitiative, setDeleteInitiative] = React.useState<{
    objIdx: number
    initIdx: number
  } | null>(null)
  const [deleteActivity, setDeleteActivity] = React.useState<{
    objIdx: number
    initIdx: number
    actIdx: number
  } | null>(null)
  const [editingActivity, setEditingActivity] = React.useState<{
    objIdx: number
    initIdx: number
    actIdx: number
  } | null>(null)
  const [editActivityOpen, setEditActivityOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [activityDialogParams, setActivityDialogParams] = React.useState<{
    objIdx: number
    initIdx: number
  } | null>(null)

  const objectives = sectionContract.objectives ?? []
  const pmsMode = isPmsAlignment(sectionContract.contractAlignment)

  React.useEffect(() => {
    if (addObjectiveSignal === 0) return
    onAddObjectiveRequestConsumed?.()
  }, [addObjectiveSignal, onAddObjectiveRequestConsumed])

  const columnObjectives = React.useMemo(
    () =>
      buildSectionColumnObjectives({
        sectionContract,
        sectionSlug,
        pmsMode,
        canManage: canManageContract && sectionContract.status !== 'finalized',
        onEditObjective: objIdx => {
          setEditingObjectiveIndex(objIdx)
          setEditObjectiveOpen(true)
        },
        onDeleteObjective: setDeleteObjectiveIndex,
        onAddInitiative: objIdx => {
          setInitiativeDialogObjIdx(objIdx)
          setInitiativeDialogOpen(true)
        },
        onEditInitiative: (objIdx, initIdx) => {
          setEditingInitiative({ objIdx, initIdx })
          setEditInitiativeOpen(true)
        },
        onDeleteInitiative: (objIdx, initIdx) =>
          setDeleteInitiative({ objIdx, initIdx }),
        onDeleteActivity: (objIdx, initIdx, actIdx) =>
          setDeleteActivity({ objIdx, initIdx, actIdx }),
        onEditActivity: (objIdx, initIdx, actIdx) => {
          setEditingActivity({ objIdx, initIdx, actIdx })
          setEditActivityOpen(true)
        },
        onAddActivity: (objIdx, initIdx) => {
          setActivityDialogParams({ objIdx, initIdx })
          setActivityDialogOpen(true)
        },
        onOpenInitiative: (objIdx, initIdx) => {
          if (!sectionSlug) return
          router.push(
            `/sections/${sectionSlug}/initiative/${sectionContract._id}/${objIdx}/${initIdx}`,
          )
        },
        onOpenActivity: (objIdx, initIdx, actIdx) => {
          if (!sectionSlug) return
          const activityKey =
            sectionContract.objectives?.[objIdx]?.initiatives?.[initIdx]
              ?.measurableActivities?.[actIdx]?._key
          const activityQuery = activityKey
            ? `?activityKey=${encodeURIComponent(activityKey)}`
            : ''
          router.push(
            `/sections/${sectionSlug}/initiative/${sectionContract._id}/${objIdx}/${initIdx}${activityQuery}`,
          )
        },
      }),
    [sectionContract, sectionSlug, pmsMode, canManageContract, router],
  )

  const handleDeleteObjective = React.useCallback(async () => {
    if (deleteObjectiveIndex == null) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/section-contracts/${sectionContract._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'deleteObjective',
          payload: { objectiveIndex: deleteObjectiveIndex },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete objective')
      }
      setDeleteObjectiveIndex(null)
      toast.success('Objective deleted')
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete objective',
      )
    } finally {
      setDeleting(false)
    }
  }, [deleteObjectiveIndex, router, sectionContract._id])

  const handleDeleteInitiative = React.useCallback(async () => {
    if (!deleteInitiative) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/section-contracts/${sectionContract._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'deleteInitiative',
          payload: {
            objectiveIndex: deleteInitiative.objIdx,
            initiativeIndex: deleteInitiative.initIdx,
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete initiative')
      }
      setDeleteInitiative(null)
      toast.success('Initiative deleted')
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete initiative',
      )
    } finally {
      setDeleting(false)
    }
  }, [deleteInitiative, router, sectionContract._id])

  const handleDeleteActivity = React.useCallback(async () => {
    if (!deleteActivity) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/section-contracts/${sectionContract._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'deleteMeasurableActivity',
          payload: {
            objectiveIndex: deleteActivity.objIdx,
            initiativeIndex: deleteActivity.initIdx,
            activityIndex: deleteActivity.actIdx,
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete measurable activity')
      }
      setDeleteActivity(null)
      toast.success('Measurable activity deleted')
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to delete measurable activity',
      )
    } finally {
      setDeleting(false)
    }
  }, [deleteActivity, router, sectionContract._id])

  const activityBeingEdited = editingActivity
    ? objectives[editingActivity.objIdx]?.initiatives?.[editingActivity.initIdx]
        ?.measurableActivities?.[editingActivity.actIdx]
    : undefined

  return (
    <div className='space-y-4'>
      <AddObjectiveDialog
        open={objectiveDialogOpen}
        onOpenChange={open => {
          setObjectiveDialogOpen(open)
          if (!open) onAddObjectiveRequestConsumed?.()
        }}
        sectionContractId={sectionContract._id}
      />
      <EditObjectiveDialog
        open={editObjectiveOpen}
        onOpenChange={setEditObjectiveOpen}
        sectionContractId={sectionContract._id}
        objectiveIndex={editingObjectiveIndex}
        initialCode={objectives[editingObjectiveIndex]?.code ?? ''}
        initialTitle={objectives[editingObjectiveIndex]?.title ?? ''}
      />
      <EditInitiativeDialog
        open={editInitiativeOpen}
        onOpenChange={setEditInitiativeOpen}
        sectionContractId={sectionContract._id}
        objectiveIndex={editingInitiative?.objIdx ?? 0}
        initiativeIndex={editingInitiative?.initIdx ?? 0}
        objectiveCode={
          objectives[editingInitiative?.objIdx ?? 0]?.code ??
          String((editingInitiative?.objIdx ?? 0) + 1)
        }
        initialCode={
          objectives[editingInitiative?.objIdx ?? 0]?.initiatives?.[
            editingInitiative?.initIdx ?? 0
          ]?.code ?? ''
        }
        initialTitle={
          objectives[editingInitiative?.objIdx ?? 0]?.initiatives?.[
            editingInitiative?.initIdx ?? 0
          ]?.title ?? ''
        }
      />
      <AlertDialog
        open={deleteObjectiveIndex !== null}
        onOpenChange={open => !open && setDeleteObjectiveIndex(null)}
      >
        <AlertDialogContent disableClose={deleting}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete objective?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this SSMARTA objective and all of its
              initiatives and measurable activities.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              disabled={deleting}
              onClick={e => {
                e.preventDefault()
                handleDeleteObjective()
              }}
            >
              {deleting ? (
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

      <AlertDialog
        open={deleteInitiative !== null}
        onOpenChange={open => !open && setDeleteInitiative(null)}
      >
        <AlertDialogContent disableClose={deleting}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete initiative?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this initiative and all of its
              measurable activities.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              disabled={deleting}
              onClick={e => {
                e.preventDefault()
                handleDeleteInitiative()
              }}
            >
              {deleting ? (
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

      <AlertDialog
        open={deleteActivity !== null}
        onOpenChange={open => !open && setDeleteActivity(null)}
      >
        <AlertDialogContent disableClose={deleting}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete measurable activity?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this measurable activity and all of
              its detailed tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              disabled={deleting}
              onClick={e => {
                e.preventDefault()
                handleDeleteActivity()
              }}
            >
              {deleting ? (
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
      <AddInitiativeDialog
        open={initiativeDialogOpen}
        onOpenChange={setInitiativeDialogOpen}
        sectionContractId={sectionContract._id}
        objectiveIndex={initiativeDialogObjIdx}
        objectiveCode={
          objectives[initiativeDialogObjIdx]?.code ??
          String(initiativeDialogObjIdx + 1)
        }
        nextOrder={
          (objectives[initiativeDialogObjIdx]?.initiatives?.length ?? 0) + 1
        }
      />
      {activityDialogParams && (
        <AddMeasurableActivityDialog
          open={activityDialogOpen}
          onOpenChange={setActivityDialogOpen}
          sectionContractId={sectionContract._id}
          objectiveIndex={activityDialogParams.objIdx}
          initiativeIndex={activityDialogParams.initIdx}
          initiativeCode={
            objectives[activityDialogParams.objIdx]?.initiatives?.[
              activityDialogParams.initIdx
            ]?.code ??
            `${objectives[activityDialogParams.objIdx]?.code ?? String(activityDialogParams.objIdx + 1)}.${activityDialogParams.initIdx + 1}`
          }
          assigneeOptions={assigneeOptions}
          assigneeEmptyLabel={assigneeEmptyLabel}
          unassignedLabel={unassignedLabel}
          nextOrderForType={type => {
            const kind = type === 'cross-cutting' ? 'cross-cutting' : 'kpi'
            const activities =
              objectives[activityDialogParams.objIdx]?.initiatives?.[
                activityDialogParams.initIdx
              ]?.measurableActivities ?? []
            return (
              activities.filter(
                activity => resolveActivityNumberingType(activity) === kind,
              ).length + 1
            )
          }}
        />
      )}
      {editingActivity && activityBeingEdited ? (
        <EditMeasurableActivityDialog
          open={editActivityOpen}
          onOpenChange={setEditActivityOpen}
          contractId={sectionContract._id}
          objectiveIndex={editingActivity.objIdx}
          initiativeIndex={editingActivity.initIdx}
          activityIndex={editingActivity.actIdx}
          initialTitle={activityBeingEdited.title}
          initialActivityType={activityBeingEdited.activityType}
          initialTargetDate={activityBeingEdited.targetDate}
          hasAssignees={(activityBeingEdited.assignees?.length ?? 0) > 0}
        />
      ) : null}
      <ContractFinalizeBar
        contractId={sectionContract._id}
        status={sectionContract.status}
        canFinalize={canManageContract}
        objectives={sectionContract.objectives}
        holdMessage={sectionContract.cascadeHoldMessage}
        hiddenKeys={sectionContract.hiddenCascadeKeys}
        issueHref={issue => {
          if (
            !sectionSlug ||
            issue.objectiveIndex < 0 ||
            issue.initiativeIndex == null
          ) {
            return undefined
          }
          return contractInitiativeActivityHref({
            sectionSlug,
            contractId: sectionContract._id,
            objectiveIndex: issue.objectiveIndex,
            initiativeIndex: issue.initiativeIndex,
            activityKey: issue.activityKey,
          })
        }}
      />
      <ContractColumnBrowser
        objectives={columnObjectives}
        emptyObjectivesMessage={
          sectionContract.cascadeHoldMessage ||
          'Waiting for the Assistant Commissioner to cascade activities.'
        }
      />
    </div>
  )
}
