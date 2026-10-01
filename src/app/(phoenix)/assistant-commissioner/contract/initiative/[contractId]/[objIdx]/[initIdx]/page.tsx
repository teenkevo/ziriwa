import { notFound } from 'next/navigation'

import { CascadeHoldNotice } from '@/features/sections/components/contract-finalize-bar'
import { InitiativePageContent } from '@/features/sections/initiative-page-content'
import { getUnreleasedCascadeKeys } from '@/lib/contract-cascade-visibility'
import { ensureAssistantCommissionerPageAccess } from '@/features/manager/assistant-commissioner-workspace-page'
import {
  loadCascadeAssigneeOptions,
  releaseAssignedCrossCuttingActivities,
} from '@/lib/contract-cascade/assign-measurable-activity.server'
import {
  canManageDivisionContract,
  getDivisionIdFromContract,
} from '@/lib/division-contract-access.server'
import { sanityFetch } from '@/sanity/lib/client'
import { MEASURABLE_ACTIVITIES_WITH_TASKS_PROJECTION } from '@/sanity/lib/contracts/measurable-activities-projection'
import type {
  ContractInitiative,
  SsmartaObjective,
} from '@/sanity/lib/section-contracts/get-section-contract'

export default async function AssistantCommissionerInitiativePage({
  params,
  searchParams,
}: {
  params: Promise<{ contractId: string; objIdx: string; initIdx: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await ensureAssistantCommissionerPageAccess()
  const { contractId, objIdx, initIdx } = await params
  const sp = await searchParams
  const rawKey = sp.activityKey
  const initialActivityKey =
    typeof rawKey === 'string'
      ? rawKey
      : Array.isArray(rawKey)
        ? rawKey[0]
        : undefined

  const objectiveIndex = parseInt(objIdx, 10)
  const initiativeIndex = parseInt(initIdx, 10)
  if (Number.isNaN(objectiveIndex) || Number.isNaN(initiativeIndex)) notFound()

  const divisionId = await getDivisionIdFromContract(contractId)
  if (!divisionId) notFound()
  if (!(await canManageDivisionContract(divisionId))) notFound()

  const contract = (await sanityFetch({
    query: /* groq */ `*[_type == "divisionContract" && _id == $contractId][0]{
      _id,
      status,
      "divisionName": coalesce(division->fullName, division->name, "Division"),
      objectives[] {
        _key,
        cascadeKind,
        code,
        title,
        order,
        initiatives[] {
          _key,
          cascadeKind,
          code,
          title,
          order,
          ${MEASURABLE_ACTIVITIES_WITH_TASKS_PROJECTION}
        },
      },
    }`,
    params: { contractId },
    revalidate: 0,
  })) as {
    _id: string
    status?: string
    divisionName?: string
    objectives?: SsmartaObjective[]
  } | null
  if (!contract) notFound()

  const objective = contract.objectives?.[objectiveIndex]
  const initiative = objective?.initiatives?.[initiativeIndex] as
    | ContractInitiative
    | undefined
  if (!initiative) notFound()

  const hold = await getUnreleasedCascadeKeys(contract._id)
  const hidden = new Set(hold.hiddenKeys)
  if (
    (objective?._key && hidden.has(objective._key)) ||
    (initiative._key && hidden.has(initiative._key))
  ) {
    return (
      <CascadeHoldNotice
        message={
          hold.holdMessage ||
          'Waiting for the level above to finalize their contract.'
        }
      />
    )
  }

  await releaseAssignedCrossCuttingActivities({
    contractId: contract._id,
    objectives: contract.objectives,
  })

  const assigneeOptions = await loadCascadeAssigneeOptions({
    contractType: 'divisionContract',
    divisionId,
  })

  return (
    <InitiativePageContent
      section={{
        _id: divisionId,
        name: contract.divisionName ?? 'Division',
      }}
      contractId={contract._id}
      contractApiResource='division-contracts'
      objectiveIndex={objectiveIndex}
      initiativeIndex={initiativeIndex}
      objectiveCode={objective?.code}
      objectiveTitle={objective?.title}
      initiative={initiative}
      canManage={contract.status !== 'finalized'}
      backHref='/assistant-commissioner/contract'
      initialActivityKey={initialActivityKey}
      assigneeOptions={assigneeOptions ?? []}
      assigneeEmptyLabel='No managers in this division yet.'
      unassignedLabel='Assign a Manager'
      showTaskSettings
    />
  )
}
