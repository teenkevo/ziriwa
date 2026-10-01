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
  departmentDetailedTaskNumber,
  displayedActivityOrder,
  leadershipActivityNumber,
  resolveActivityNumberingType,
} from '@/lib/contract-numbering'
import { contractsApiBase, type ContractsApiResource } from '@/lib/contracts-api'
import { isCascadedItem } from '@/lib/contract-cascade/is-cascaded'
import type { DepartmentContract } from '@/sanity/lib/department-contracts/get-department-contract'
import type { ProjectContract } from '@/sanity/lib/project-contracts/get-project-contract'
import type { DivisionContract } from '@/sanity/lib/division-contracts/get-division-contract'
import type { SupervisorContract } from '@/sanity/lib/supervisor-contracts/get-supervisor-contract'
import type { OfficerContract } from '@/sanity/lib/officer-contracts/get-officer-contract'
import { AddObjectiveDialog } from '@/features/sections/components/add-objective-dialog'
import { AddInitiativeDialog } from '@/features/sections/components/add-initiative-dialog'
import { AddDepartmentMeasurableActivityDialog } from '@/features/sections/components/add-department-measurable-activity-dialog'
import { EditObjectiveDialog } from '@/features/sections/components/edit-objective-dialog'
import { EditInitiativeDialog } from '@/features/sections/components/edit-initiative-dialog'
import {
  ContractColumnAddButton,
  ContractColumnBrowser,
  contractDetailedTaskHref,
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

type LeadershipContract =
  | DepartmentContract
  | DivisionContract
  | SupervisorContract
  | OfficerContract
  | ProjectContract

interface DepartmentContractTreeProps {
  departmentContract: LeadershipContract
  /** When set, measurable activity rows navigate to the detailed tasks page. */
  sectionSlug?: string
  /**
   * Opens the initiative details page at `{base}/initiative/{contractId}/...`
   * instead of a section activity URL. Used by the assistant commissioner contract.
   */
  activityPageBasePath?: string
  contractsApi?: Extract<
    ContractsApiResource,
    | 'department-contracts'
    | 'division-contracts'
    | 'project-contracts'
    | 'deputy-project-contracts'
    | 'supervisor-contracts'
    | 'officer-contracts'
  >
  canManageContract?: boolean
  assigneeOptions?: CascadeAssigneeOption[] | null
  assigneeEmptyLabel?: string
  unassignedLabel?: string
  /** Increment to open the add SSMARTA objective dialog (from parent toolbar). */
  addObjectiveSignal?: number
  /** Call when the add-objective dialog closes so the parent can clear `addObjectiveSignal`. */
  onAddObjectiveRequestConsumed?: () => void
}

function contractTreeShowsTasksOnly(
  contractsApi: DepartmentContractTreeProps['contractsApi'],
): boolean {
  return contractsApi === 'officer-contracts'
}

function cascadedObjectivesWaitingMessage(
  contractsApi: DepartmentContractTreeProps['contractsApi'],
): string | undefined {
  if (contractsApi === 'division-contracts') return undefined
  if (contractsApi === 'supervisor-contracts') {
    return 'Waiting for manager to cascade activities.'
  }
  if (contractsApi === 'officer-contracts') {
    return 'Waiting for supervisor to cascade activities.'
  }
  return 'Waiting for objectives to be cascaded.'
}

function taskLabel(task: { task?: string } | string): string {
  if (typeof task === 'string') return task.trim()
  return task.task?.trim() ?? ''
}

function buildDepartmentColumnObjectives(input: {
  contract: LeadershipContract
  sectionSlug: string
  activityPageBasePath?: string
  canManage: boolean
  showTasksOnly: boolean
  onEditObjective: (objIdx: number) => void
  onDeleteObjective: (objIdx: number) => void
  onAddInitiative: (objIdx: number) => void
  onEditInitiative: (objIdx: number, initIdx: number) => void
  onDeleteInitiative: (objIdx: number, initIdx: number) => void
  onAddActivity: (objIdx: number, initIdx: number) => void
  onDeleteActivity: (objIdx: number, initIdx: number, actIdx: number) => void
  onEditActivity: (objIdx: number, initIdx: number, actIdx: number) => void
  onOpenActivity: (
    objIdx: number,
    initIdx: number,
    actIdx: number,
    taskKey?: string,
  ) => void
}): ContractColumnObjective[] {
  const {
    contract,
    sectionSlug,
    activityPageBasePath,
    canManage,
    showTasksOnly,
    onEditObjective,
    onDeleteObjective,
    onAddInitiative,
    onEditInitiative,
    onDeleteInitiative,
    onAddActivity,
    onDeleteActivity,
    onEditActivity,
    onOpenActivity,
  } = input
  const objectives = contract.objectives ?? []
  const attention = contractFinalizeAttentionKeys(
    reviewContractForFinalize(objectives, contract.hiddenCascadeKeys),
  )
  const hidden = new Set(contract.hiddenCascadeKeys ?? [])

  return objectives.flatMap((obj, objIdx) => {
    if (obj._key && hidden.has(obj._key)) return []
    const objNum = obj.code ?? String(objIdx + 1)
    const initiatives = obj.initiatives ?? []

    const canEditObjective = canManage && !isCascadedItem(obj)

    const objectiveId = obj._key || `objective-${objIdx}`
    const initiativeRows: ContractColumnInitiative[] = initiatives.flatMap(
      (init, initIdx) => {
        if (init._key && hidden.has(init._key)) return []
        const initNum = init.code ?? `${objNum}.${initIdx + 1}`
        const canEditInitiative = canManage && !isCascadedItem(init)
        const activities = init.measurableActivities ?? []
        const children = showTasksOnly
          ? (() => {
              let officerTaskOrder = 0
              const leaves: ContractColumnObjective['initiatives'][number]['children'] =
                []
              for (let actIdx = 0; actIdx < activities.length; actIdx++) {
                const act = activities[actIdx]
                const rawTasks = act.tasks ?? []
                for (let taskIdx = 0; taskIdx < rawTasks.length; taskIdx++) {
                  const raw = rawTasks[taskIdx]
                  const title = taskLabel(raw)
                  if (!title) continue
                  officerTaskOrder += 1
                  const taskKey =
                    typeof raw === 'string'
                      ? `idx-${taskIdx}`
                      : (raw._key ?? `idx-${taskIdx}`)
                  leaves.push({
                    id: `task:${act._key}:${taskKey}`,
                    title,
                    code: departmentDetailedTaskNumber(initNum, officerTaskOrder),
                    href: contractDetailedTaskHref({
                      sectionSlug,
                      contractId: contract._id,
                      objectiveIndex: objIdx,
                      initiativeIndex: initIdx,
                      activityIndex: actIdx,
                      taskKey,
                    }),
                    onOpen: sectionSlug
                      ? () => onOpenActivity(objIdx, initIdx, actIdx, taskKey)
                      : undefined,
                  })
                }
              }
              return leaves
            })()
          : activities.flatMap((act, actIdx) => {
              if (!act?.title || !String(act.title).trim()) return []
              const actOrder = displayedActivityOrder(activities, actIdx)
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
                  code: leadershipActivityNumber(initNum, act, actOrder),
                  status: act.status,
                  href: activityPageBasePath
                    ? `${activityPageBasePath}/initiative/${contract._id}/${objIdx}/${initIdx}${
                        act._key
                          ? `?activityKey=${encodeURIComponent(act._key)}`
                          : ''
                      }`
                    : contractInitiativeActivityHref({
                        sectionSlug,
                        contractId: contract._id,
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

        const initiativeId = init._key || `initiative-${objIdx}-${initIdx}`
        return [{
          id: initiativeId,
          attention: attention.has(initiativeId),
          ready: !attention.has(initiativeId),
          title: init.title,
          code: initNum,
          opensNextColumn: true,
          childEmptyLabel: showTasksOnly
            ? 'No detailed tasks yet.'
            : 'No measurable activities yet.',
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

export function DepartmentContractTree({
  departmentContract,
  sectionSlug = '',
  activityPageBasePath,
  contractsApi = 'department-contracts',
  canManageContract = false,
  assigneeOptions = null,
  assigneeEmptyLabel,
  unassignedLabel,
  addObjectiveSignal = 0,
  onAddObjectiveRequestConsumed,
}: DepartmentContractTreeProps) {
  const router = useRouter()
  const apiBase = contractsApiBase(contractsApi)
  const showTasksOnlyUnderMeasurable =
    contractTreeShowsTasksOnly(contractsApi)
  const canCreateObjectives = contractsApi === 'division-contracts'
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
  const [deleting, setDeleting] = React.useState(false)
  const [activityDialogParams, setActivityDialogParams] = React.useState<{
    objIdx: number
    initIdx: number
  } | null>(null)
  const [editingActivity, setEditingActivity] = React.useState<{
    objIdx: number
    initIdx: number
    actIdx: number
  } | null>(null)
  const [editActivityOpen, setEditActivityOpen] = React.useState(false)

  const objectives = departmentContract.objectives ?? []

  React.useEffect(() => {
    if (
      addObjectiveSignal === 0 ||
      !canManageContract ||
      departmentContract.status === 'finalized' ||
      !canCreateObjectives
    ) {
      return
    }
    setObjectiveDialogOpen(true)
  }, [
    addObjectiveSignal,
    canManageContract,
    canCreateObjectives,
    departmentContract.status,
  ])

  const columnObjectives = React.useMemo(
    () =>
      buildDepartmentColumnObjectives({
        contract: departmentContract,
        sectionSlug,
        activityPageBasePath,
        canManage:
          canManageContract && departmentContract.status !== 'finalized',
        showTasksOnly: showTasksOnlyUnderMeasurable,
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
        onAddActivity: (objIdx, initIdx) => {
          setActivityDialogParams({ objIdx, initIdx })
          setActivityDialogOpen(true)
        },
        onDeleteActivity: (objIdx, initIdx, actIdx) =>
          setDeleteActivity({ objIdx, initIdx, actIdx }),
        onEditActivity: (objIdx, initIdx, actIdx) => {
          setEditingActivity({ objIdx, initIdx, actIdx })
          setEditActivityOpen(true)
        },
        onOpenActivity: (objIdx, initIdx, actIdx, taskKey) => {
          if (!sectionSlug) return
          if (taskKey != null) {
            router.push(
              `/sections/${sectionSlug}/activity/${departmentContract._id}/${objIdx}/${initIdx}/${actIdx}?taskKey=${encodeURIComponent(taskKey)}`,
            )
            return
          }
          const activityKey =
            departmentContract.objectives?.[objIdx]?.initiatives?.[initIdx]
              ?.measurableActivities?.[actIdx]?._key
          const activityQuery = activityKey
            ? `?activityKey=${encodeURIComponent(activityKey)}`
            : ''
          router.push(
            `/sections/${sectionSlug}/initiative/${departmentContract._id}/${objIdx}/${initIdx}${activityQuery}`,
          )
        },
      }),
    [
      departmentContract,
      sectionSlug,
      activityPageBasePath,
      canManageContract,
      showTasksOnlyUnderMeasurable,
      router,
    ],
  )

  const handleDeleteObjective = React.useCallback(async () => {
    if (deleteObjectiveIndex == null) return
    setDeleting(true)
    try {
      const res = await fetch(`${apiBase}/${departmentContract._id}`, {
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
  }, [deleteObjectiveIndex, router, departmentContract._id, apiBase])

  const handleDeleteInitiative = React.useCallback(async () => {
    if (!deleteInitiative) return
    setDeleting(true)
    try {
      const res = await fetch(`${apiBase}/${departmentContract._id}`, {
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
  }, [deleteInitiative, router, departmentContract._id, apiBase])

  const handleDeleteActivity = React.useCallback(async () => {
    if (!deleteActivity) return
    setDeleting(true)
    try {
      const res = await fetch(`${apiBase}/${departmentContract._id}`, {
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
  }, [deleteActivity, router, departmentContract._id, apiBase])

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
        sectionContractId={departmentContract._id}
        contractsApi={contractsApi}
      />
      <EditObjectiveDialog
        open={editObjectiveOpen}
        onOpenChange={setEditObjectiveOpen}
        sectionContractId={departmentContract._id}
        contractsApi={contractsApi}
        objectiveIndex={editingObjectiveIndex}
        initialCode={objectives[editingObjectiveIndex]?.code ?? ''}
        initialTitle={objectives[editingObjectiveIndex]?.title ?? ''}
      />
      <EditInitiativeDialog
        open={editInitiativeOpen}
        onOpenChange={setEditInitiativeOpen}
        sectionContractId={departmentContract._id}
        contractsApi={contractsApi}
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
        sectionContractId={departmentContract._id}
        contractsApi={contractsApi}
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
        <AddDepartmentMeasurableActivityDialog
          open={activityDialogOpen}
          onOpenChange={setActivityDialogOpen}
          departmentContractId={departmentContract._id}
          contractsApi={contractsApi}
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
          contractId={departmentContract._id}
          contractsApi={contractsApi}
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
        contractId={departmentContract._id}
        status={departmentContract.status}
        canFinalize={canManageContract}
        objectives={departmentContract.objectives}
        holdMessage={departmentContract.cascadeHoldMessage}
        hiddenKeys={departmentContract.hiddenCascadeKeys}
        issueHref={issue => {
          if (issue.objectiveIndex < 0 || issue.initiativeIndex == null) {
            return undefined
          }
          if (activityPageBasePath) {
            const key = issue.activityKey
              ? `?activityKey=${encodeURIComponent(issue.activityKey)}`
              : ''
            return `${activityPageBasePath}/initiative/${departmentContract._id}/${issue.objectiveIndex}/${issue.initiativeIndex}${key}`
          }
          if (!sectionSlug) return undefined
          return contractInitiativeActivityHref({
            sectionSlug,
            contractId: departmentContract._id,
            objectiveIndex: issue.objectiveIndex,
            initiativeIndex: issue.initiativeIndex,
            activityKey: issue.activityKey,
          })
        }}
      />
      <ContractColumnBrowser
        objectives={columnObjectives}
        onAddObjective={
          canCreateObjectives &&
          canManageContract &&
          departmentContract.status !== 'finalized'
            ? () => setObjectiveDialogOpen(true)
            : undefined
        }
        emptyObjectivesMessage={
          departmentContract.cascadeHoldMessage ||
          cascadedObjectivesWaitingMessage(contractsApi)
        }
      />
    </div>
  )
}
