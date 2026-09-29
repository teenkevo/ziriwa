import { notFound } from 'next/navigation'
import { getSectionBySlug } from '@/sanity/lib/sections/get-section-by-slug'
import { getSectionAccessForViewer } from '@/lib/section-access.server'
import { contractBackHrefForViewer } from '@/lib/contract-activity-back-href'
import {
  contractsApiForActivityContract,
  getContractForActivityPage,
  getInitiativeFromContract,
} from '@/sanity/lib/contracts/get-contract-for-activity'
import { InitiativePageContent } from '@/features/sections/initiative-page-content'
import { loadCascadeAssigneeOptions } from '@/lib/contract-cascade/assign-measurable-activity.server'

function canManageActivityContract(
  contractType: 'sectionContract' | 'supervisorContract' | 'officerContract',
  sectionAccess: Awaited<ReturnType<typeof getSectionAccessForViewer>>,
): boolean {
  if (contractType === 'sectionContract') return sectionAccess.canManageContract
  if (contractType === 'supervisorContract') {
    return sectionAccess.canManageSupervisorContract
  }
  return sectionAccess.canManageOfficerContract
}

export default async function InitiativePage({
  params,
  searchParams,
}: {
  params: Promise<{
    slug: string
    contractId: string
    objIdx: string
    initIdx: string
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug, contractId, objIdx, initIdx } = await params
  const sp = await searchParams
  const rawKey = sp.activityKey
  const initialActivityKey =
    typeof rawKey === 'string'
      ? rawKey
      : Array.isArray(rawKey)
        ? rawKey[0]
        : undefined

  const objIndex = parseInt(objIdx, 10)
  const initIndex = parseInt(initIdx, 10)
  if (isNaN(objIndex) || isNaN(initIndex)) notFound()

  const section = await getSectionBySlug(slug)
  if (!section) notFound()

  const [contract, sectionAccess] = await Promise.all([
    getContractForActivityPage(contractId, section._id),
    getSectionAccessForViewer(section._id),
  ])
  if (!contract) notFound()

  const initiative = getInitiativeFromContract(contract, objIndex, initIndex)
  if (!initiative) notFound()

  const objective = contract.objectives?.[objIndex]
  const backHref = contractBackHrefForViewer(sectionAccess, slug)
  const assigneeOptions = await loadCascadeAssigneeOptions({
    contractType: contract._type,
    sectionId: section._id,
  })
  const assigneeEmptyLabel =
    contract._type === 'sectionContract'
      ? 'No supervisors in this section yet.'
      : contract._type === 'supervisorContract'
        ? 'No officers in this section yet.'
        : undefined

  return (
    <InitiativePageContent
      section={section}
      contractId={contract._id}
      contractApiResource={contractsApiForActivityContract(contract._type)}
      objectiveIndex={objIndex}
      initiativeIndex={initIndex}
      objectiveCode={objective?.code}
      objectiveTitle={objective?.title}
      initiative={initiative}
      canManage={canManageActivityContract(contract._type, sectionAccess)}
      backHref={backHref}
      initialActivityKey={initialActivityKey}
      assigneeOptions={assigneeOptions}
      assigneeEmptyLabel={assigneeEmptyLabel}
    />
  )
}
