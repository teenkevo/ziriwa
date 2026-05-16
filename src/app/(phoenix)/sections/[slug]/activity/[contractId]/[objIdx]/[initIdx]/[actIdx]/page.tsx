import { notFound } from 'next/navigation'
import { getSectionBySlug } from '@/sanity/lib/sections/get-section-by-slug'
import { getSectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import { getOfficersBySection } from '@/sanity/lib/staff/get-staff-by-section'
import { getCurrentFinancialYear } from '@/lib/financial-year'
import { getSectionAccessForViewer } from '@/lib/section-access.server'
import { ActivityPageContent } from '@/features/sections/activity-page-content'

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

  const currentFY = getCurrentFinancialYear()
  const [sectionContract, officers, sectionAccess] = await Promise.all([
    getSectionContract(section._id, currentFY.label),
    getOfficersBySection(section._id),
    getSectionAccessForViewer(section._id),
  ])
  if (!sectionContract || sectionContract._id !== contractId) notFound()

  const activity =
    sectionContract.objectives?.[objIndex]?.initiatives?.[initIndex]
      ?.measurableActivities?.[actIndex]
  if (!activity) notFound()

  return (
    <ActivityPageContent
      section={section}
      sectionContract={sectionContract}
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
