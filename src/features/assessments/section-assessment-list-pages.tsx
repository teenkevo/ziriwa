import { AssessmentsListContent } from '@/features/assessments/assessments-list-content'
import { loadSectionAssessmentsList } from '@/features/assessments/load-section-assessments.server'
import { ManagerWorkspacePage } from '@/features/manager/manager-workspace-page'

export async function ManagerAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  const data = await loadSectionAssessmentsList({ role: 'manager' })
  if (!data) {
    return <ManagerWorkspacePage view='dashboard' searchParams={searchParams} />
  }

  return (
    <AssessmentsListContent
      role='manager'
      title='Assessments'
      subtitle='Set a start time and time limit, then publish assessments for your staff'
      basePath='/manager/assessments'
      dashboardHref='/manager/dashboard'
      items={data.items}
      canManage={data.canManage}
      sectionOfficerCount={data.sectionOfficerCount}
      canViewSubmissions={data.canManage || data.canViewResults}
    />
  )
}
