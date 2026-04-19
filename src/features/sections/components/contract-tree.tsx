'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { DotIcon, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { TreeView, TreeDataItem } from '@/components/tree-view'
import { measurableActivityNumber } from '@/lib/contract-numbering'
import type { SectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import type { TreeRenderItemParams } from '@/components/tree-view'
import { useServerSyncedState } from '@/hooks/use-server-synced-state'
import { AddObjectiveDialog } from '@/features/sections/components/add-objective-dialog'
import { AddInitiativeDialog } from '@/features/sections/components/add-initiative-dialog'
import { AddMeasurableActivityDialog } from '@/features/sections/components/add-measurable-activity-dialog'
import { EditObjectiveDialog } from '@/features/sections/components/edit-objective-dialog'
import { EditInitiativeDialog } from '@/features/sections/components/edit-initiative-dialog'

interface ContractTreeProps {
  sectionContract: SectionContract
  sectionId: string
  supervisors: { _id: string; fullName: string; staffId?: string }[]
  sectionSlug?: string
  expandAllSignal?: number
  collapseAllSignal?: number
  /** Increment to open the add SSMARTA objective dialog (from parent toolbar). */
  addObjectiveSignal?: number
  /** Call when the add-objective dialog closes so the parent can clear `addObjectiveSignal`. */
  onAddObjectiveRequestConsumed?: () => void
}

const nodeMeta = new Map<
  string,
  {
    code?: string
    aim?: string
    objIdx?: number
    initIdx?: number
    actIdx?: number
    isKpi?: boolean
  }
>()

function sectionContractToTreeData(
  sectionContract: SectionContract,
): TreeDataItem[] {
  nodeMeta.clear()
  const objectives = sectionContract.objectives ?? []
  const items: TreeDataItem[] = [
    {
      id: 'label-objectives',
      name: 'SSMARTA objectives',
      className: 'py-1 before:h-[1.25rem] text-primary',
    },
  ]

  for (let objIdx = 0; objIdx < objectives.length; objIdx++) {
    const obj = objectives[objIdx]
    const objNum = obj.code ?? String(objIdx + 1)
    nodeMeta.set(obj._key, { code: objNum, objIdx })
    const initiatives = obj.initiatives ?? []

    const initiativeChildren: TreeDataItem[] = [
      {
        id: `label-initiatives-${objIdx}`,
        name: 'Initiatives',
        className: 'py-1 before:h-[1.25rem] text-primary',
      },
    ]

    for (let initIdx = 0; initIdx < initiatives.length; initIdx++) {
      const init = initiatives[initIdx]
      const initNum = init.code ?? `${objNum}.${initIdx + 1}`
      nodeMeta.set(init._key, { code: initNum, objIdx, initIdx })
      const activities = init.measurableActivities ?? []

      const activityChildren: TreeDataItem[] = [
        {
          id: `label-activities-${objIdx}-${initIdx}`,
          name: 'Measurable activities',
          className: 'py-1 before:h-[1.25rem] text-primary',
        },
      ]

      for (let actIdx = 0; actIdx < activities.length; actIdx++) {
        const act = activities[actIdx]
        if (!act?.title || !String(act.title).trim()) continue
        const sameTypeBefore = activities
          .slice(0, actIdx)
          .filter(a => a.activityType === act.activityType).length
        const actOrder = sameTypeBefore + 1
        const actNum = measurableActivityNumber(
          initNum,
          act.activityType,
          actOrder,
        )
        nodeMeta.set(act._key, {
          code: actNum,
          aim: act.aim,
          objIdx,
          initIdx,
          actIdx,
          isKpi: act.activityType === 'kpi',
        })
        activityChildren.push({
          id: act._key,
          name: act.title,
        })
      }

      initiativeChildren.push({
        id: init._key,
        name: init.title,
        children: activityChildren,
      })
    }

    items.push({
      id: obj._key,
      name: obj.title,
      children: initiativeChildren,
    })
  }

  return items
}

export function ContractTree({
  sectionContract,
  sectionId,
  supervisors,
  sectionSlug = '',
  expandAllSignal,
  collapseAllSignal,
  addObjectiveSignal = 0,
  onAddObjectiveRequestConsumed,
}: ContractTreeProps) {
  const router = useRouter()
  const [contract, setContract] = useServerSyncedState(sectionContract)
  const [openMenu, setOpenMenu] = React.useState<string | null>(null)
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
  const [deleting, setDeleting] = React.useState(false)
  const [activityDialogParams, setActivityDialogParams] = React.useState<{
    objIdx: number
    initIdx: number
    type: 'kpi' | 'cross-cutting'
  } | null>(null)

  const objectives = contract.objectives ?? []

  React.useEffect(() => {
    if (addObjectiveSignal === 0) return
    setObjectiveDialogOpen(true)
  }, [addObjectiveSignal])

  const treeData = React.useMemo(
    () => sectionContractToTreeData(contract),
    [contract],
  )

  const handleDeleteObjective = React.useCallback(async () => {
    if (deleteObjectiveIndex == null) return
    const idx = deleteObjectiveIndex
    setDeleting(true)
    try {
      const res = await fetch(`/api/section-contracts/${contract._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'deleteObjective',
          payload: { objectiveIndex: idx },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete objective')
      }
      setContract(prev => ({
        ...prev,
        objectives: (prev.objectives ?? []).filter((_, i) => i !== idx),
      }))
      setDeleteObjectiveIndex(null)
      void router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to delete objective')
    } finally {
      setDeleting(false)
    }
  }, [deleteObjectiveIndex, router, contract._id, setContract])

  const handleDeleteInitiative = React.useCallback(async () => {
    if (!deleteInitiative) return
    const { objIdx, initIdx } = deleteInitiative
    setDeleting(true)
    try {
      const res = await fetch(`/api/section-contracts/${contract._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          op: 'deleteInitiative',
          payload: {
            objectiveIndex: objIdx,
            initiativeIndex: initIdx,
          },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete initiative')
      }
      setContract(prev => {
        const objectives = [...(prev.objectives ?? [])]
        const obj = objectives[objIdx]
        if (!obj) return prev
        const initiatives = [...(obj.initiatives ?? [])]
        initiatives.splice(initIdx, 1)
        objectives[objIdx] = { ...obj, initiatives }
        return { ...prev, objectives }
      })
      setDeleteInitiative(null)
      void router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to delete initiative')
    } finally {
      setDeleting(false)
    }
  }, [deleteInitiative, router, contract._id, setContract])

  const handleSelectChange = React.useCallback(
    (item: { id: string } | undefined) => {
      if (!item || !sectionSlug) return
      const meta = nodeMeta.get(item.id)
      if (
        meta &&
        typeof meta.objIdx === 'number' &&
        typeof meta.initIdx === 'number' &&
        typeof meta.actIdx === 'number'
      ) {
        router.push(
          `/sections/${sectionSlug}/activity/${contract._id}/${meta.objIdx}/${meta.initIdx}/${meta.actIdx}`,
        )
      }
    },
    [sectionSlug, contract._id, router],
  )

  const renderItem = React.useCallback(
    (params: TreeRenderItemParams) => {
      const { item, level, isLeaf } = params

      if (item.id.startsWith('label-')) {
        const hint = item.id.startsWith('label-objectives')
          ? '(Click an objective below to see its initiatives)'
          : item.id.startsWith('label-initiatives')
            ? '(Click an initiative below to see its measurable activities)'
            : item.id.startsWith('label-activities')
              ? '(Click a measurable activity below to manage its detailed tasks)'
              : undefined
        return (
          <div className='flex items-baseline gap-2 min-w-0'>
            <span
              className={`flex text-[11px] min-w-[${item.name === 'SSMARTA objectives' ? '120px' : item.name === 'Initiatives' ? '90px' : item.name === 'Measurable activities' ? '130px' : '100px'}] font-bold uppercase tracking-normal  truncate`}
            >
              {item.name}
            </span>
            {hint && (
              <span className='text-[11px] font-light normal-case tracking-normal text-muted-foreground truncate'>
                {hint}
              </span>
            )}
          </div>
        )
      }

      const meta = nodeMeta.get(item.id)
      const code = meta?.code
      const isObjectiveRow =
        typeof meta?.objIdx === 'number' && typeof meta?.initIdx !== 'number'
      const isInitiativeRow =
        typeof meta?.objIdx === 'number' &&
        typeof meta?.initIdx === 'number' &&
        typeof meta?.actIdx !== 'number'
      const isActivityRow = isLeaf && typeof meta?.actIdx === 'number'

      return (
        <div
          className={`flex gap-4 min-w-0 ${isActivityRow ? 'items-start' : 'items-center'}`}
        >
          {code && (
            <span
              className={`font-mono text-xs leading-4 shrink-0 ${isActivityRow ? 'self-start' : ''}`}
            >
              {code}
            </span>
          )}
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-1 min-w-0'>
              <p className='text-sm leading-4 truncate'>{item.name}</p>
              {isObjectiveRow && (
                <>
                  <DropdownMenu
                    open={openMenu === `${item.id}:objective-options`}
                    onOpenChange={open =>
                      setOpenMenu(open ? `${item.id}:objective-options` : null)
                    }
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-6 w-6 shrink-0'
                        onClick={e => e.stopPropagation()}
                        onPointerDown={e => e.stopPropagation()}
                        aria-label='Objective options'
                        title='Objective options'
                      >
                        <MoreVertical className='h-4 w-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align='start'
                      onPointerDown={e => e.stopPropagation()}
                      onClick={e => e.stopPropagation()}
                    >
                      <DropdownMenuItem
                        onSelect={e => {
                          e.preventDefault()
                          e.stopPropagation()
                          setTimeout(() => setOpenMenu(null), 0)
                          setEditingObjectiveIndex(meta!.objIdx!)
                          setEditObjectiveOpen(true)
                        }}
                      >
                        <Pencil className='mr-2 h-4 w-4' />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className='text-destructive focus:text-destructive'
                        onSelect={e => {
                          e.preventDefault()
                          e.stopPropagation()
                          setTimeout(() => setOpenMenu(null), 0)
                          setDeleteObjectiveIndex(meta!.objIdx!)
                        }}
                      >
                        <Trash2 className='mr-2 h-4 w-4' />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-6 w-6 shrink-0'
                    onClick={e => {
                      e.stopPropagation()
                      setInitiativeDialogObjIdx(meta!.objIdx!)
                      setInitiativeDialogOpen(true)
                    }}
                    aria-label='Add initiative'
                    title='Add initiative'
                  >
                    <Plus className='h-4 w-4' />
                  </Button>
                </>
              )}
              {isInitiativeRow && (
                <>
                  <DropdownMenu
                    open={openMenu === `${item.id}:initiative-options`}
                    onOpenChange={open =>
                      setOpenMenu(open ? `${item.id}:initiative-options` : null)
                    }
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-6 w-6 shrink-0'
                        onClick={e => e.stopPropagation()}
                        onPointerDown={e => e.stopPropagation()}
                        aria-label='Initiative options'
                        title='Initiative options'
                      >
                        <MoreVertical className='h-4 w-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align='start'
                      onPointerDown={e => e.stopPropagation()}
                      onClick={e => e.stopPropagation()}
                    >
                      <DropdownMenuItem
                        onSelect={e => {
                          e.preventDefault()
                          e.stopPropagation()
                          setTimeout(() => setOpenMenu(null), 0)
                          setEditingInitiative({
                            objIdx: meta!.objIdx!,
                            initIdx: meta!.initIdx!,
                          })
                          setEditInitiativeOpen(true)
                        }}
                      >
                        <Pencil className='mr-2 h-4 w-4' />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className='text-destructive focus:text-destructive'
                        onSelect={e => {
                          e.preventDefault()
                          e.stopPropagation()
                          setTimeout(() => setOpenMenu(null), 0)
                          setDeleteInitiative({
                            objIdx: meta!.objIdx!,
                            initIdx: meta!.initIdx!,
                          })
                        }}
                      >
                        <Trash2 className='mr-2 h-4 w-4' />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu
                    open={openMenu === `${item.id}:add-activity`}
                    onOpenChange={open =>
                      setOpenMenu(open ? `${item.id}:add-activity` : null)
                    }
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-6 w-6 shrink-0'
                        onClick={e => e.stopPropagation()}
                        onPointerDown={e => e.stopPropagation()}
                        aria-label='Add measurable activity'
                        title='Add measurable activity'
                      >
                        <Plus className='h-4 w-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align='start'
                      onPointerDown={e => e.stopPropagation()}
                      onClick={e => e.stopPropagation()}
                    >
                      <DropdownMenuItem
                        onSelect={e => {
                          e.preventDefault()
                          e.stopPropagation()
                          setTimeout(() => setOpenMenu(null), 0)
                          setActivityDialogParams({
                            objIdx: meta!.objIdx!,
                            initIdx: meta!.initIdx!,
                            type: 'kpi',
                          })
                          setActivityDialogOpen(true)
                        }}
                      >
                        Core KPI Task
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={e => {
                          e.preventDefault()
                          e.stopPropagation()
                          setTimeout(() => setOpenMenu(null), 0)
                          setActivityDialogParams({
                            objIdx: meta!.objIdx!,
                            initIdx: meta!.initIdx!,
                            type: 'cross-cutting',
                          })
                          setActivityDialogOpen(true)
                        }}
                      >
                        Cross-cutting activity
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
            {meta?.aim && isLeaf && (
              <p className='text-xs text-muted-foreground mt-0.5'>{meta.aim}</p>
            )}
          </div>
        </div>
      )
    },
    [openMenu],
  )

  return (
    <>
      <AddObjectiveDialog
        open={objectiveDialogOpen}
        onOpenChange={open => {
          setObjectiveDialogOpen(open)
          if (!open) onAddObjectiveRequestConsumed?.()
        }}
        sectionContractId={contract._id}
      />
      <EditObjectiveDialog
        open={editObjectiveOpen}
        onOpenChange={setEditObjectiveOpen}
        sectionContractId={contract._id}
        objectiveIndex={editingObjectiveIndex}
        initialCode={objectives[editingObjectiveIndex]?.code ?? ''}
        initialTitle={objectives[editingObjectiveIndex]?.title ?? ''}
      />
      <EditInitiativeDialog
        open={editInitiativeOpen}
        onOpenChange={setEditInitiativeOpen}
        sectionContractId={contract._id}
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
        <AlertDialogContent>
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
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteInitiative !== null}
        onOpenChange={open => !open && setDeleteInitiative(null)}
      >
        <AlertDialogContent>
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
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AddInitiativeDialog
        open={initiativeDialogOpen}
        onOpenChange={setInitiativeDialogOpen}
        sectionContractId={contract._id}
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
          sectionContractId={contract._id}
          sectionId={sectionId}
          supervisors={supervisors}
          objectiveIndex={activityDialogParams.objIdx}
          initiativeIndex={activityDialogParams.initIdx}
          initiativeCode={
            objectives[activityDialogParams.objIdx]?.initiatives?.[
              activityDialogParams.initIdx
            ]?.code ??
            `${objectives[activityDialogParams.objIdx]?.code ?? String(activityDialogParams.objIdx + 1)}.${activityDialogParams.initIdx + 1}`
          }
          activityType={activityDialogParams.type}
          nextOrder={
            activityDialogParams.type === 'kpi'
              ? (objectives[activityDialogParams.objIdx]?.initiatives?.[
                  activityDialogParams.initIdx
                ]?.measurableActivities?.filter(a => a.activityType === 'kpi')
                  .length ?? 0) + 1
              : (objectives[activityDialogParams.objIdx]?.initiatives?.[
                  activityDialogParams.initIdx
                ]?.measurableActivities?.filter(
                  a => a.activityType === 'cross-cutting',
                ).length ?? 0) + 1
          }
        />
      )}
      <TreeView
        data={treeData}
        renderItem={renderItem}
        expandAllSignal={expandAllSignal}
        collapseAllSignal={collapseAllSignal}
        onSelectChange={handleSelectChange}
      />
    </>
  )
}
