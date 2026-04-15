'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'

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
import { AddObjectiveDialog } from '@/features/sections/components/add-objective-dialog'
import { AddInitiativeDialog } from '@/features/sections/components/add-initiative-dialog'
import { AddMeasurableActivityDialog } from '@/features/sections/components/add-measurable-activity-dialog'
import { EditObjectiveDialog } from '@/features/sections/components/edit-objective-dialog'
import { EditInitiativeDialog } from '@/features/sections/components/edit-initiative-dialog'

interface ContractTreeProps {
  sectionContract: SectionContract
  sectionSlug?: string
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
    { id: 'label-objectives', name: 'SSMARTA objectives' },
  ]

  for (let objIdx = 0; objIdx < objectives.length; objIdx++) {
    const obj = objectives[objIdx]
    const objNum = obj.code ?? String(objIdx + 1)
    nodeMeta.set(obj._key, { code: objNum, objIdx })
    const initiatives = obj.initiatives ?? []

    const initiativeChildren: TreeDataItem[] = [
      { id: `label-initiatives-${objIdx}`, name: 'Initiatives' },
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
  sectionSlug = '',
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
  const [deleting, setDeleting] = React.useState(false)
  const [activityDialogParams, setActivityDialogParams] = React.useState<{
    objIdx: number
    initIdx: number
    type: 'kpi' | 'cross-cutting'
  } | null>(null)

  const objectives = sectionContract.objectives ?? []

  const treeData = React.useMemo(
    () => sectionContractToTreeData(sectionContract),
    [sectionContract],
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
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to delete objective')
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
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to delete initiative')
    } finally {
      setDeleting(false)
    }
  }, [deleteInitiative, router, sectionContract._id])

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
          `/sections/${sectionSlug}/activity/${sectionContract._id}/${meta.objIdx}/${meta.initIdx}/${meta.actIdx}`,
        )
      }
    },
    [sectionSlug, sectionContract._id, router],
  )

  const renderItem = React.useCallback((params: TreeRenderItemParams) => {
    const { item, level, isLeaf } = params

    if (item.id.startsWith('label-')) {
      return (
        <p className='text-[10px] font-light uppercase tracking-wider text-muted-foreground'>
          {item.name}
        </p>
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

    return (
      <div className='flex items-center gap-4 min-w-0'>
        {code && (
          <span className='font-mono text-xs leading-4 text-muted-foreground shrink-0'>
            {code}
          </span>
        )}
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-1 min-w-0'>
            <p className='text-sm font-medium leading-4 truncate'>
              {item.name}
            </p>
            {isObjectiveRow && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-6 w-6 shrink-0'
                      onClick={e => e.stopPropagation()}
                      aria-label='Objective options'
                      title='Objective options'
                    >
                      <MoreVertical className='h-4 w-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='start'>
                    <DropdownMenuItem
                      onClick={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        setEditingObjectiveIndex(meta!.objIdx!)
                        setEditObjectiveOpen(true)
                      }}
                    >
                      <Pencil className='mr-2 h-4 w-4' />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className='text-destructive focus:text-destructive'
                      onClick={e => {
                        e.preventDefault()
                        e.stopPropagation()
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-6 w-6 shrink-0'
                      onClick={e => e.stopPropagation()}
                      aria-label='Initiative options'
                      title='Initiative options'
                    >
                      <MoreVertical className='h-4 w-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='start'>
                    <DropdownMenuItem
                      onClick={e => {
                        e.preventDefault()
                        e.stopPropagation()
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
                      onClick={e => {
                        e.preventDefault()
                        e.stopPropagation()
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

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-6 w-6 shrink-0'
                      onClick={e => e.stopPropagation()}
                      aria-label='Add measurable activity'
                      title='Add measurable activity'
                    >
                      <Plus className='h-4 w-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='start'>
                    <DropdownMenuItem
                      onClick={e => {
                        e.preventDefault()
                        e.stopPropagation()
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
                      onClick={e => {
                        e.preventDefault()
                        e.stopPropagation()
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
  }, [])

  return (
    <>
      <AddObjectiveDialog
        open={objectiveDialogOpen}
        onOpenChange={setObjectiveDialogOpen}
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
        sectionContractId={sectionContract._id}
        objectiveIndex={initiativeDialogObjIdx}
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
        expandAll
        onSelectChange={handleSelectChange}
      />
    </>
  )
}
