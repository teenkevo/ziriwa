import { notFound } from 'next/navigation'
import { getSectionBySlug } from '@/sanity/lib/sections/get-section-by-slug'
import { getOfficersBySection } from '@/sanity/lib/staff/get-staff-by-section'
import { getSectionAccessForViewer } from '@/lib/section-access.server'
import { contractBackHrefForViewer } from '@/lib/contract-activity-back-href'
import {
  contractsApiForActivityContract,
  getActivityFromContract,
  getContractForActivityPage,
} from '@/sanity/lib/contracts/get-contract-for-activity'
import { ActivityPageContent } from '@/features/sections/activity-page-content'

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

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{
    slug: string
    contractId: string
    objIdx: string
    initIdx: string
    actIdx: string
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug, contractId, objIdx, initIdx, actIdx } = await params
  const sp = await searchParams
  const rawTaskKey = sp.taskKey
  const initialTaskKey =
    typeof rawTaskKey === 'string'
      ? rawTaskKey
      : Array.isArray(rawTaskKey)
        ? rawTaskKey[0]
        : undefined
  const objIndex = parseInt(objIdx, 10)
  const initIndex = parseInt(initIdx, 10)
  const actIndex = parseInt(actIdx, 10)

  if (isNaN(objIndex) || isNaN(initIndex) || isNaN(actIndex)) {
    notFound()
  }

  const section = await getSectionBySlug(slug)
  if (!section) notFound()

  const [contract, officers, sectionAccess] = await Promise.all([
    getContractForActivityPage(contractId, section._id),
    getOfficersBySection(section._id),
    getSectionAccessForViewer(section._id),
  ])
  if (!contract) notFound()

  const activity = getActivityFromContract(
    contract,
    objIndex,
    initIndex,
    actIndex,
  )
  if (!activity) notFound()

  const sectionSlug = section.slug?.current ?? ''

  return (
    <ActivityPageContent
      section={section}
      sectionContract={contract}
      contractsApi={contractsApiForActivityContract(contract._type)}
      contractBackHref={contractBackHrefForViewer(sectionAccess, sectionSlug)}
      canManageContract={canManageActivityContract(
        contract._type,
        sectionAccess,
      )}
      activity={activity}
      objectiveIndex={objIndex}
      initiativeIndex={initIndex}
      activityIndex={actIndex}
      officers={officers}
      sectionAccess={sectionAccess}
      initialTaskKey={initialTaskKey}
    />
  )
}
