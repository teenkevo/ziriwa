import { AssessmentsListContent } from '@/features/assessments/assessments-list-content'
import { loadSectionAssessmentsList } from '@/features/assessments/load-section-assessments.server'
import { SupervisorWorkspacePage } from '@/features/manager/supervisor-workspace-page'

export default async function SupervisorAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  const data = await loadSectionAssessmentsList({ role: 'supervisor' })
  if (!data) {
    return <SupervisorWorkspacePage view='dashboard' searchParams={searchParams} />
  }

  return (
    <AssessmentsListContent
      role='supervisor'
      title='Assessments'
      subtitle='Published assessments and officer submission results'
      basePath='/supervisor/assessments'
      dashboardHref='/supervisor/dashboard'
      items={data.items}
      canManage={false}
    />
  )
}
