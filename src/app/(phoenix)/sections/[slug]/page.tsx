import { notFound } from 'next/navigation'
import { getSectionBySlug } from '@/sanity/lib/sections/get-section-by-slug'
import { getSectionContractBySection } from '@/sanity/lib/section-contracts/get-section-contract-by-section'
import { getStakeholderEngagementBySection } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement-by-section'
import {
  getSupervisorsBySection,
  getOfficersBySection,
} from '@/sanity/lib/staff/get-staff-by-section'
import { getDueItemsFromContract } from '@/sanity/lib/contract-items/get-due-items'
import { getSprintsBySection } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'
import { SectionPageContent } from '@/features/sections/section-page-content'

export default async function SectionPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const section = await getSectionBySlug(slug)

  if (!section) notFound()

  const [
    sectionContract,
    stakeholderEngagement,
    supervisors,
    officers,
    sprints,
  ] = await Promise.all([
    getSectionContractBySection(section._id),
    getStakeholderEngagementBySection(section._id),
    getSupervisorsBySection(section._id),
    getOfficersBySection(section._id),
    getSprintsBySection(section._id),
  ])

  const today = new Date().toISOString().slice(0, 10)
  const now = new Date()

  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day

  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() + diffToMonday)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 4)

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const quarter = Math.floor(now.getMonth() / 3) + 1
  const startOfQuarter = new Date(now.getFullYear(), (quarter - 1) * 3, 1)
  const endOfQuarter = new Date(now.getFullYear(), quarter * 3, 0)

  const weekStart = startOfWeek.toISOString().slice(0, 10)
  const weekEnd = endOfWeek.toISOString().slice(0, 10)
  const monthStart = startOfMonth.toISOString().slice(0, 10)
  const monthEnd = endOfMonth.toISOString().slice(0, 10)
  const quarterStart = startOfQuarter.toISOString().slice(0, 10)
  const quarterEnd = endOfQuarter.toISOString().slice(0, 10)

  const dueToday = sectionContract
    ? getDueItemsFromContract(sectionContract, d => d === today)
    : []
  const dueThisWeek = sectionContract
    ? getDueItemsFromContract(
        sectionContract,
        d => d >= weekStart && d <= weekEnd && d !== today,
      )
    : []
  const dueThisMonth = sectionContract
    ? getDueItemsFromContract(
        sectionContract,
        d =>
          d >= monthStart &&
          d <= monthEnd &&
          d !== today &&
          !(d >= weekStart && d <= weekEnd),
      )
    : []
  const dueThisQuarter = sectionContract
    ? getDueItemsFromContract(
        sectionContract,
        d =>
          d >= quarterStart &&
          d <= quarterEnd &&
          d !== today &&
          !(d >= monthStart && d <= monthEnd),
      )
    : []

  const staffOptions: { _id: string; fullName?: string; staffId?: string }[] = [
    ...(section.manager ? [section.manager] : []),
    ...supervisors,
    ...officers,
  ].map(s => {
    const staffId =
      'staffId' in s && typeof s.staffId === 'string' ? s.staffId : undefined
    return { _id: s._id, fullName: s.fullName, staffId }
  })

  return (
    <SectionPageContent
      section={section}
      sectionContract={sectionContract}
      stakeholderEngagement={stakeholderEngagement}
      staffOptions={staffOptions}
      supervisors={supervisors}
      officers={officers}
      dueToday={dueToday}
      dueThisWeek={dueThisWeek}
      dueThisMonth={dueThisMonth}
      dueThisQuarter={dueThisQuarter}
      sprints={sprints}
    />
  )
}
