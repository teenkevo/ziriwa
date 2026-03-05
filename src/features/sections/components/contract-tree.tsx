'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { measurableActivityNumber } from '@/lib/contract-numbering'
import type {
  SsmartaObjective,
  ContractInitiative,
  MeasurableActivity,
} from '@/sanity/lib/section-contracts/get-section-contract'
import type { SectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import { AddObjectiveDialog } from '@/features/sections/components/add-objective-dialog'
import { AddInitiativeDialog } from '@/features/sections/components/add-initiative-dialog'
import { AddMeasurableActivityDialog } from '@/features/sections/components/add-measurable-activity-dialog'

interface ContractTreeProps {
  sectionContract: SectionContract
}

export function ContractTree({ sectionContract }: ContractTreeProps) {
  const objectives = sectionContract.objectives ?? []

  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        {objectives.map((obj, objIdx) => (
          <ObjectiveNode
            key={obj._key}
            objective={obj}
            objectiveIndex={objIdx}
            sectionContractId={sectionContract._id}
          />
        ))}
        <AddObjectiveRow sectionContractId={sectionContract._id} />
      </div>
    </div>
  )
}

function ObjectiveNode({
  objective,
  objectiveIndex,
  sectionContractId,
}: {
  objective: SsmartaObjective
  objectiveIndex: number
  sectionContractId: string
}) {
  const initiatives = objective.initiatives ?? []
  const objNum = objective.code ?? String(objectiveIndex + 1)

  return (
    <div className='rounded-lg border bg-card'>
      <div className='flex items-start gap-2 p-3'>
        <span className='font-mono text-xs text-muted-foreground shrink-0'>
          {objNum}
        </span>
        <div className='flex-1 min-w-0'>
          <p className='font-medium text-sm'>{objective.title}</p>
        </div>
      </div>
      <div className='pl-4 pb-2 space-y-1 border-l-2 border-muted ml-2'>
        {initiatives.map((init, initIdx) => (
          <InitiativeNode
            key={init._key}
            initiative={init}
            initiativeIndex={initIdx}
            objectiveIndex={objectiveIndex}
            sectionContractId={sectionContractId}
          />
        ))}
        <AddInitiativeRow
          sectionContractId={sectionContractId}
          objectiveIndex={objectiveIndex}
          existingInitiatives={initiatives}
        />
      </div>
    </div>
  )
}

function InitiativeNode({
  initiative,
  initiativeIndex,
  objectiveIndex,
  sectionContractId,
}: {
  initiative: ContractInitiative
  initiativeIndex: number
  objectiveIndex: number
  sectionContractId: string
}) {
  const activities = initiative.measurableActivities ?? []
  const initNum = initiative.code ?? `1.1.${initiativeIndex + 1}`

  return (
    <div className='rounded border bg-muted/30 p-2'>
      <div className='flex items-start gap-2'>
        <span className='font-mono text-xs text-muted-foreground shrink-0'>
          {initNum}
        </span>
        <div className='flex-1 min-w-0'>
          <p className='text-sm'>{initiative.title}</p>
        </div>
      </div>
      <div className='pl-4 mt-2 space-y-1 border-l border-muted ml-1'>
        {activities.map((act, actIdx) => {
          const sameTypeBefore = activities
            .slice(0, actIdx)
            .filter(a => a.activityType === act.activityType).length
          const actOrder = sameTypeBefore + 1
          return (
            <MeasurableActivityNode
              key={act._key}
              activity={act}
              activityOrder={actOrder}
              initiativeNumber={initNum}
            />
          )
        })}
        <AddMeasurableActivityRow
          sectionContractId={sectionContractId}
          objectiveIndex={objectiveIndex}
          initiativeIndex={initiativeIndex}
          initiativeNumber={initNum}
          existingActivities={activities}
        />
      </div>
    </div>
  )
}

function MeasurableActivityNode({
  activity,
  activityOrder,
  initiativeNumber,
}: {
  activity: MeasurableActivity
  activityOrder: number
  initiativeNumber: string
}) {
  const actNum = measurableActivityNumber(
    initiativeNumber,
    activity.activityType,
    activityOrder,
  )

  return (
    <div className='flex items-start gap-2 py-1'>
      <span className='font-mono text-xs text-muted-foreground shrink-0'>
        {actNum}
      </span>
      <div className='flex-1 min-w-0'>
        <p className='text-sm'>{activity.title}</p>
        {activity.aim && (
          <p className='text-xs text-muted-foreground mt-0.5'>
            {activity.aim}
          </p>
        )}
      </div>
    </div>
  )
}

function AddObjectiveRow({ sectionContractId }: { sectionContractId: string }) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <AddObjectiveDialog
        open={open}
        onOpenChange={setOpen}
        sectionContractId={sectionContractId}
      />
      <Button
        variant='outline'
        size='sm'
        className='w-full justify-start'
        onClick={() => setOpen(true)}
      >
        <Plus className='h-4 w-4 mr-2' />
        Add SSMARTA Objective
      </Button>
    </>
  )
}

function AddInitiativeRow({
  sectionContractId,
  objectiveIndex,
  existingInitiatives,
}: {
  sectionContractId: string
  objectiveIndex: number
  existingInitiatives: ContractInitiative[]
}) {
  const [open, setOpen] = React.useState(false)
  const nextOrder = existingInitiatives.length + 1

  return (
    <>
      <AddInitiativeDialog
        open={open}
        onOpenChange={setOpen}
        sectionContractId={sectionContractId}
        objectiveIndex={objectiveIndex}
        nextOrder={nextOrder}
      />
      <Button variant='ghost' size='sm' onClick={() => setOpen(true)}>
        <Plus className='h-3 w-3 mr-1' />
        Add Initiative
      </Button>
    </>
  )
}

function AddMeasurableActivityRow({
  sectionContractId,
  objectiveIndex,
  initiativeIndex,
  initiativeNumber,
  existingActivities,
}: {
  sectionContractId: string
  objectiveIndex: number
  initiativeIndex: number
  initiativeNumber: string
  existingActivities: MeasurableActivity[]
}) {
  const [kpiOpen, setKPIOpen] = React.useState(false)
  const [ccOpen, setCCOpen] = React.useState(false)

  const kpiCount = existingActivities.filter(a => a.activityType === 'kpi').length
  const ccCount = existingActivities.filter(
    a => a.activityType === 'cross-cutting',
  ).length

  return (
    <div className='flex gap-2 flex-wrap'>
      <AddMeasurableActivityDialog
        open={kpiOpen}
        onOpenChange={setKPIOpen}
        sectionContractId={sectionContractId}
        objectiveIndex={objectiveIndex}
        initiativeIndex={initiativeIndex}
        activityType='kpi'
        nextOrder={kpiCount + 1}
      />
      <AddMeasurableActivityDialog
        open={ccOpen}
        onOpenChange={setCCOpen}
        sectionContractId={sectionContractId}
        objectiveIndex={objectiveIndex}
        initiativeIndex={initiativeIndex}
        activityType='cross-cutting'
        nextOrder={ccCount + 1}
      />
      <Button variant='ghost' size='sm' onClick={() => setKPIOpen(true)}>
        <Plus className='h-3 w-3 mr-1' />
        KPI
      </Button>
      <Button variant='ghost' size='sm' onClick={() => setCCOpen(true)}>
        <Plus className='h-3 w-3 mr-1' />
        CC
      </Button>
    </div>
  )
}
