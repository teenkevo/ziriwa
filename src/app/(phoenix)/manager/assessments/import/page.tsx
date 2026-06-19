import { ImportAssessmentContent } from '@/features/assessments/import-assessment-content'
import { loadSectionAssessmentsList } from '@/features/assessments/load-section-assessments.server'
import { ManagerWorkspacePage } from '@/features/manager/manager-workspace-page'

export default async function ManagerImportAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ workContext?: string | string[] }>
}) {
  const data = await loadSectionAssessmentsList({ role: 'manager' })
  if (!data?.canManage) {
    return <ManagerWorkspacePage view='dashboard' searchParams={searchParams} />
  }

  return (
    <ImportAssessmentContent
      sectionId={data.sectionId}
      basePath='/manager/assessments'
      dashboardHref='/manager/dashboard'
    />
  )
}
