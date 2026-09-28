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
  leadershipActivityNumber,
  resolveActivityNumberingType,
} from '@/lib/contract-numbering'
import { contractsApiBase, type ContractsApiResource } from '@/lib/contracts-api'
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
  contractItemKindLabel,
  type ContractColumnObjective,
} from '@/features/sections/components/contract-column-browser'

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
  /** Increment to open the add SSMARTA objective dialog (from parent toolbar). */
  addObjectiveSignal?: number
  /** Call when the add-objective dialog closes so the parent can clear `addObjectiveSignal`. */
  onAddObjectiveRequestConsumed?: () => void
}

function contractTreeShowsActivityAim(
  contractsApi: DepartmentContractTreeProps['contractsApi'],
): boolean {
  return (
    contractsApi === 'department-contracts' ||
    contractsApi === 'division-contracts' ||
    contractsApi === 'project-contracts' ||
    contractsApi === 'deputy-project-contracts'
  )
}

function contractTreeShowsTasksOnly(
  contractsApi: DepartmentContractTreeProps['contractsApi'],
): boolean {
  return contractsApi === 'officer-contracts'
}

function taskLabel(task: { task?: string } | string): string {
  if (typeof task === 'string') return task.trim()
  return task.task?.trim() ?? ''
}

function buildDepartmentColumnObjectives(input: {
  contract: LeadershipContract
  sectionSlug: string
  canManage: boolean
  showActivityAim: boolean
  showTasksOnly: boolean
  onEditObjective: (objIdx: number) => void
  onDeleteObjective: (objIdx: number) => void
  onAddInitiative: (objIdx: number) => void
  onEditInitiative: (objIdx: number, initIdx: number) => void
  onDeleteInitiative: (objIdx: number, initIdx: number) => void
  onAddActivity: (objIdx: number, initIdx: number) => void
  onDeleteActivity: (objIdx: number, initIdx: number, actIdx: number) => void
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
    canManage,
    showActivityAim,
    showTasksOnly,
    onEditObjective,
    onDeleteObjective,
    onAddInitiative,
    onEditInitiative,
    onDeleteInitiative,
    onAddActivity,
    onDeleteActivity,
    onOpenActivity,
  } = input
  const objectives = contract.objectives ?? []

  return objectives.map((obj, objIdx) => {
    const objNum = obj.code ?? String(objIdx + 1)
    const initiatives = obj.initiatives ?? []

    return {
      id: obj._key || `objective-${objIdx}`,
      title: obj.title,
      code: objNum,
      onEdit: canManage ? () => onEditObjective(objIdx) : undefined,
      onDelete: canManage ? () => onDeleteObjective(objIdx) : undefined,
      onAddInitiative: canManage ? () => onAddInitiative(objIdx) : undefined,
      initiatives: initiatives.map((init, initIdx) => {
        const initNum = init.code ?? `${objNum}.${initIdx + 1}`
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
              const actOrder =
                activities
                  .slice(0, actIdx)
                  .filter(
                    item =>
                      resolveActivityNumberingType(item) ===
                      resolveActivityNumberingType(act),
                  ).length + 1
              const aim = showActivityAim ? act.aim?.trim() : ''
              return [
                {
                  id: act._key || `activity-${objIdx}-${initIdx}-${actIdx}`,
                  title: act.title,
                  code: leadershipActivityNumber(initNum, act, actOrder),
                  subtitle: contractItemKindLabel(
                    resolveActivityNumberingType(act),
                  ),
                  detail: aim || undefined,
                  status: act.status,
                  onOpen: sectionSlug
                    ? () => onOpenActivity(objIdx, initIdx, actIdx)
                    : undefined,
                  onDelete: canManage
                    ? () => onDeleteActivity(objIdx, initIdx, actIdx)
                    : undefined,
                },
              ]
            })

        return {
          id: init._key || `initiative-${objIdx}-${initIdx}`,
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
          onEdit: canManage
            ? () => onEditInitiative(objIdx, initIdx)
            : undefined,
          onDelete: canManage
            ? () => onDeleteInitiative(objIdx, initIdx)
            : undefined,
          children,
        }
      }),
    }
  })
}

export function DepartmentContractTree({
  departmentContract,
  sectionSlug = '',
  contractsApi = 'department-contracts',
  canManageContract = false,
  addObjectiveSignal = 0,
  onAddObjectiveRequestConsumed,
}: DepartmentContractTreeProps) {
  const router = useRouter()
  const apiBase = contractsApiBase(contractsApi)
  const showActivityAim = contractTreeShowsActivityAim(contractsApi)
  const showTasksOnlyUnderMeasurable =
    contractTreeShowsTasksOnly(contractsApi)
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

  const objectives = departmentContract.objectives ?? []

  React.useEffect(() => {
    if (addObjectiveSignal === 0 || !canManageContract) return
    setObjectiveDialogOpen(true)
  }, [addObjectiveSignal, canManageContract])

  const columnObjectives = React.useMemo(
    () =>
      buildDepartmentColumnObjectives({
        contract: departmentContract,
        sectionSlug,
        canManage: canManageContract,
        showActivityAim,
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
        onOpenActivity: (objIdx, initIdx, actIdx, taskKey) => {
          if (!sectionSlug) return
          const taskQs =
            taskKey != null ? `?taskKey=${encodeURIComponent(taskKey)}` : ''
          router.push(
            `/sections/${sectionSlug}/activity/${departmentContract._id}/${objIdx}/${initIdx}/${actIdx}${taskQs}`,
          )
        },
      }),
    [
      departmentContract,
      sectionSlug,
      canManageContract,
      showActivityAim,
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


  return (
    <>
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
          nextOrder={
            (objectives[activityDialogParams.objIdx]?.initiatives?.[
              activityDialogParams.initIdx
            ]?.measurableActivities?.length ?? 0) + 1
          }
        />
      )}
      <ContractColumnBrowser
        objectives={columnObjectives}
        onAddObjective={
          canManageContract ? () => setObjectiveDialogOpen(true) : undefined
        }
      />
    </>
  )
}
