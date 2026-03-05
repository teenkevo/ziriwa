import { notFound } from 'next/navigation'
import { getSectionBySlug } from '@/sanity/lib/sections/get-section-by-slug'
import { getSectionContractBySection } from '@/sanity/lib/section-contracts/get-section-contract-by-section'
import {
  getSupervisorsBySection,
  getOfficersBySection,
} from '@/sanity/lib/staff/get-staff-by-section'
import {
  getDueItemsFromContract,
} from '@/sanity/lib/contract-items/get-due-items'
import { SectionPageContent } from '@/features/sections/section-page-content'

export default async function SectionPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const section = await getSectionBySlug(slug)

  if (!section) notFound()

  const [sectionContract, supervisors, officers] = await Promise.all([
    getSectionContractBySection(section._id),
    getSupervisorsBySection(section._id),
    getOfficersBySection(section._id),
  ])

  const today = new Date().toISOString().slice(0, 10)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - dayOfWeek)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  const startDate = startOfWeek.toISOString().slice(0, 10)
  const endDate = endOfWeek.toISOString().slice(0, 10)

  const dueToday = sectionContract
    ? getDueItemsFromContract(sectionContract, d => d === today)
    : []
  const dueThisWeek = sectionContract
    ? getDueItemsFromContract(
        sectionContract,
        d => d >= startDate && d <= endDate && d !== today,
      )
    : []

  return (
    <SectionPageContent
      section={section}
      sectionContract={sectionContract}
      supervisors={supervisors}
      officers={officers}
      dueToday={dueToday}
      dueThisWeek={dueThisWeek}
    />
  )
}
