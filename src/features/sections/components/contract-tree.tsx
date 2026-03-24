'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { TreeView, TreeDataItem } from '@/components/tree-view'
import { measurableActivityNumber } from '@/lib/contract-numbering'
import type { SectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import type { TreeRenderItemParams } from '@/components/tree-view'
import { AddObjectiveDialog } from '@/features/sections/components/add-objective-dialog'
import { AddInitiativeDialog } from '@/features/sections/components/add-initiative-dialog'
import { AddMeasurableActivityDialog } from '@/features/sections/components/add-measurable-activity-dialog'

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
  const items: TreeDataItem[] = []

  for (let objIdx = 0; objIdx < objectives.length; objIdx++) {
    const obj = objectives[objIdx]
    const objNum = obj.code ?? String(objIdx + 1)
    nodeMeta.set(obj._key, { code: objNum })
    const initiatives = obj.initiatives ?? []

    const initiativeChildren: TreeDataItem[] = []

    for (let initIdx = 0; initIdx < initiatives.length; initIdx++) {
      const init = initiatives[initIdx]
      const initNum = init.code ?? `${objNum}.${initIdx + 1}`
      nodeMeta.set(init._key, { code: initNum })
      const activities = init.measurableActivities ?? []

      const activityChildren: TreeDataItem[] = []

      for (let actIdx = 0; actIdx < activities.length; actIdx++) {
        const act = activities[actIdx]
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

      activityChildren.push({
        id: `add-activities-${objIdx}-${initIdx}`,
        name: '',
      })

      initiativeChildren.push({
        id: init._key,
        name: init.title,
        children: activityChildren,
      })
    }

    initiativeChildren.push({
      id: `add-initiative-${objIdx}`,
      name: 'Add Initiative',
    })

    items.push({
      id: obj._key,
      name: obj.title,
      children: initiativeChildren,
      className: 'items-start',
    })
  }

  items.push({
    id: 'add-objective',
    name: 'Add SSMARTA Objective',
  })

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

    if (item.id === 'add-objective') {
      return (
        <Button
          variant='outline'
          size='sm'
          className='justify-start'
          onClick={e => {
            e.stopPropagation()
            setObjectiveDialogOpen(true)
          }}
        >
          <Plus className='h-4 w-4 mr-2' />
          Add SSMARTA Objective
        </Button>
      )
    }

    if (item.id.startsWith('add-initiative-')) {
      const objIdx = parseInt(item.id.replace('add-initiative-', ''), 10)
      return (
        <Button
          variant='outline'
          size='sm'
          className='justify-start'
          onClick={e => {
            e.stopPropagation()
            setInitiativeDialogObjIdx(objIdx)
            setInitiativeDialogOpen(true)
          }}
        >
          <Plus className='h-3 w-3 mr-1' />
          Add Initiative
        </Button>
      )
    }

    if (item.id.startsWith('add-activities-')) {
      const [, , objIdxStr, initIdxStr] = item.id.split('-')
      const objIdx = parseInt(objIdxStr ?? '0', 10)
      const initIdx = parseInt(initIdxStr ?? '0', 10)

      return (
        <div
          className='flex gap-2 flex-wrap'
          onClick={e => e.stopPropagation()}
        >
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              setActivityDialogParams({ objIdx, initIdx, type: 'kpi' })
              setActivityDialogOpen(true)
            }}
          >
            <Plus className='h-3 w-3 mr-1' />
            KPI
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              setActivityDialogParams({
                objIdx,
                initIdx,
                type: 'cross-cutting',
              })
              setActivityDialogOpen(true)
            }}
          >
            <Plus className='h-3 w-3 mr-1' />
            CRC
          </Button>
        </div>
      )
    }

    const meta = nodeMeta.get(item.id)
    const code = meta?.code

    return (
      <div className='flex items-start gap-2 min-w-0'>
        {code && (
          <span className='font-mono text-xs text-muted-foreground shrink-0'>
            {code}
          </span>
        )}
        <div className='flex-1 min-w-0'>
          <p className='text-sm font-medium truncate'>{item.name}</p>
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
