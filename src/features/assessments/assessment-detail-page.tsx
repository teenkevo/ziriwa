import 'server-only'

import { notFound } from 'next/navigation'

import { AssessmentDetailContent } from '@/features/assessments/assessment-detail-content'
import { AssessmentTakeContent } from '@/features/assessments/assessment-take-content'
import {
  canManageAssessments,
  canTakeAssessments,
  canViewAssessmentResults,
  getAssessmentAccessForSection,
} from '@/lib/assessments/access.server'
import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import { getAssessmentById } from '@/sanity/lib/assessments/get-assessments-by-section'
import {
  getOfficerAttemptState,
  getAttemptsForAssessment,
} from '@/sanity/lib/assessments/get-assessment-attempts'

export async function AssessmentDetailPage({
  assessmentId,
  role,
  basePath,
  dashboardHref,
}: {
  assessmentId: string
  role: 'manager' | 'supervisor' | 'officer'
  basePath: string
  dashboardHref: string
}) {
  const assessment = await getAssessmentById(assessmentId)
  if (!assessment?.sectionId) notFound()

  const { access } = await getAssessmentAccessForSection(assessment.sectionId)
  const canManage = canManageAssessments(access)
  const canTake = canTakeAssessments(access)
  const canViewResults = canViewAssessmentResults(access)

  if (assessment.status === 'draft' && !canManage) notFound()
  if (role === 'officer' && assessment.status !== 'published') notFound()
  if (role === 'manager' && !canManage && !access.isGlobalAdmin) notFound()
  if (role === 'supervisor' && !canViewResults) notFound()
  if (role === 'officer' && !canTake) notFound()

  if (role === 'officer') {
    const viewerStaffId = await getViewerStaffId()
    const attemptState =
      viewerStaffId != null
        ? await getOfficerAttemptState(assessment, viewerStaffId)
        : { submittedAttempt: null, activeAttempt: null }

    const existingAttempt = attemptState.submittedAttempt
    const activeAttempt = attemptState.activeAttempt

    const officerAssessment = {
      ...assessment,
      questions: (assessment.questions ?? []).map(question => ({
        ...question,
        correctAnswers: existingAttempt ? question.correctAnswers : undefined,
        explanation: existingAttempt ? question.explanation : undefined,
      })),
    }

    return (
      <AssessmentTakeContent
        basePath={basePath}
        assessment={officerAssessment}
        existingAttempt={existingAttempt}
        activeAttempt={activeAttempt}
      />
    )
  }

  const attempts =
    canManage || canViewResults
      ? await getAttemptsForAssessment(assessmentId)
      : []

  return (
    <AssessmentDetailContent
      role={role}
      basePath={basePath}
      dashboardHref={dashboardHref}
      assessment={assessment}
      attempts={attempts}
      canManage={canManage}
    />
  )
}
