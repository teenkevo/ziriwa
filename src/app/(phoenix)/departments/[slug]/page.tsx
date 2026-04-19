import { notFound } from 'next/navigation'
import { getDepartmentBySlug } from '@/oracle/lib/departments/get-department-by-slug'
import { getDivisionsByDepartment } from '@/sanity/lib/divisions/get-divisions-by-department'
import { getAssistantCommissioners } from '@/sanity/lib/staff/get-assistant-commissioners'
import { getCommissioners } from '@/oracle/lib/staff/get-commissioners'
import { getSectionDivisionPairsForDepartment } from '@/sanity/lib/sections/get-section-division-pairs-for-department'
import { getInitiativeProgressForSections } from '@/sanity/lib/section-contracts/get-initiative-progress-for-sections'
import { aggregateProgress } from '@/lib/initiative-progress'
import { getCurrentFinancialYear } from '@/lib/financial-year'
import { DepartmentPageContent } from '@/features/departments/department-page-content'

export default async function DepartmentPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const department = await getDepartmentBySlug(slug)

  if (!department) notFound()

  const [divisions, allAssistantCommissioners, allCommissioners] = await Promise.all([
    getDivisionsByDepartment(department._id),
    getAssistantCommissioners(),
    getCommissioners(),
  ])

  const fy = getCurrentFinancialYear()
  const sectionPairs = await getSectionDivisionPairsForDepartment(department._id)
  const sectionIds = sectionPairs.map(p => p._id)
  const progressBySection = await getInitiativeProgressForSections(
    sectionIds,
    fy.label,
  )

  const sectionIdsByDivision = new Map<string, string[]>()
  const sectionNamesByDivision = new Map<string, string[]>()
  for (const p of sectionPairs) {
    const list = sectionIdsByDivision.get(p.divisionId) ?? []
    list.push(p._id)
    sectionIdsByDivision.set(p.divisionId, list)
    const names = sectionNamesByDivision.get(p.divisionId) ?? []
    if (p.name?.trim()) names.push(p.name.trim())
    sectionNamesByDivision.set(p.divisionId, names)
  }

  const divisionsWithMetrics = divisions.map(div => {
    const sids = sectionIdsByDivision.get(div._id) ?? []
    const parts = sids.map(
      id =>
        progressBySection.get(id) ?? { completed: 0, total: 0, percent: 0 },
    )
    const agg = aggregateProgress(
      parts.map(p => ({ completed: p.completed, total: p.total })),
    )
    return {
      ...div,
      initiativeProgressPercent: agg.percent,
      initiativeProgressCompleted: agg.completed,
      initiativeProgressTotal: agg.total,
      sectionNames: sectionNamesByDivision.get(div._id) ?? [],
    }
  })

  return (
    <DepartmentPageContent
      department={department}
      divisions={divisionsWithMetrics}
      assistantCommissioners={allAssistantCommissioners}
      assistantCommissionersDepartment={allAssistantCommissioners}
      commissionersForDepartmentEdit={allCommissioners}
    />
  )
}
