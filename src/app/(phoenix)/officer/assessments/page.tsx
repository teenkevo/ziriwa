import { AssessmentsListContent } from '@/features/assessments/assessments-list-content'
import { loadSectionAssessmentsList } from '@/features/assessments/load-section-assessments.server'
import { OfficerWorkspacePage } from '@/features/manager/officer-workspace-page'

export default async function OfficerAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  const data = await loadSectionAssessmentsList({ role: 'officer' })
  if (!data) {
    return <OfficerWorkspacePage view='dashboard' searchParams={searchParams} />
  }

  return (
    <AssessmentsListContent
      role='officer'
      title='Assessments'
      subtitle='Complete published assessments assigned by your manager'
      basePath='/officer/assessments'
      dashboardHref='/officer/dashboard'
      items={data.items}
      canManage={false}
    />
  )
}
