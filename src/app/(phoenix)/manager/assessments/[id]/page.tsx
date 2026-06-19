import { AssessmentDetailPage } from '@/features/assessments/assessment-detail-page'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <AssessmentDetailPage
      assessmentId={id}
      role='manager'
      basePath='/manager/assessments'
      dashboardHref='/manager/dashboard'
    />
  )
}
