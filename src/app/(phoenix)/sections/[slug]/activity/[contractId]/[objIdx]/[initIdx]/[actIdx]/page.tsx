import { notFound } from 'next/navigation'
import { getSectionBySlug } from '@/sanity/lib/sections/get-section-by-slug'
import { getSectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import { getOfficers } from '@/sanity/lib/staff/get-staff-by-section'
import { getCurrentFinancialYear } from '@/lib/financial-year'
import { ActivityPageContent } from '@/features/sections/activity-page-content'

export default async function ActivityPage({
  params,
}: {
  params: Promise<{
    slug: string
    contractId: string
    objIdx: string
    initIdx: string
    actIdx: string
  }>
}) {
  const { slug, contractId, objIdx, initIdx, actIdx } = await params
  const objIndex = parseInt(objIdx, 10)
  const initIndex = parseInt(initIdx, 10)
  const actIndex = parseInt(actIdx, 10)

  if (isNaN(objIndex) || isNaN(initIndex) || isNaN(actIndex)) {
    notFound()
  }

  const section = await getSectionBySlug(slug)
  if (!section) notFound()

  const currentFY = getCurrentFinancialYear()
  const [sectionContract, officers] = await Promise.all([
    getSectionContract(section._id, currentFY.label),
    getOfficers(),
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
    />
  )
}
