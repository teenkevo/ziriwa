import { notFound } from 'next/navigation'
import { getDivisionBySlug } from '@/sanity/lib/divisions/get-division-by-slug'
import { getSectionsByDivision } from '@/sanity/lib/sections/get-sections-by-division'
import { getManagers } from '@/sanity/lib/staff/get-managers'
import { getAssistantCommissioners } from '@/sanity/lib/staff/get-assistant-commissioners'
import { getInitiativeProgressForSections } from '@/sanity/lib/section-contracts/get-initiative-progress-for-sections'
import { getCurrentFinancialYear } from '@/lib/financial-year'
import { DivisionPageContent } from '@/features/divisions/division-page-content'

export default async function DivisionPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const division = await getDivisionBySlug(slug)

  if (!division) notFound()

  const [sections, managers, assistantCommissioners] = await Promise.all([
    getSectionsByDivision(division._id),
    getManagers(),
    getAssistantCommissioners(),
  ])

  const fy = getCurrentFinancialYear()
  const progressBySection = await getInitiativeProgressForSections(
    sections.map(s => s._id),
    fy.label,
  )
  const sectionsWithMetrics = sections.map(s => {
    const p = progressBySection.get(s._id) ?? {
      completed: 0,
      total: 0,
      percent: 0,
    }
    return {
      ...s,
      initiativeProgressPercent: p.percent,
      initiativeProgressCompleted: p.completed,
      initiativeProgressTotal: p.total,
    }
  })

  return (
    <DivisionPageContent
      division={division}
      sections={sectionsWithMetrics}
      managers={managers}
      assistantCommissioners={assistantCommissioners}
    />
  )
}
