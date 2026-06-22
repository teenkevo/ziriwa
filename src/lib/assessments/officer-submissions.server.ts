import 'server-only'

import type { AssessmentOfficerSubmissionRow } from '@/lib/assessments/types'
import { getAllAttemptsForAssessment } from '@/sanity/lib/assessments/get-assessment-attempts'
import { getOfficersBySection } from '@/sanity/lib/staff/get-staff-by-section'

export async function buildAssessmentOfficerSubmissionRoster(
  sectionId: string,
  assessmentId: string,
): Promise<AssessmentOfficerSubmissionRow[]> {
  const [officers, attempts] = await Promise.all([
    getOfficersBySection(sectionId),
    getAllAttemptsForAssessment(assessmentId),
  ])

  const attemptByOfficerId = new Map(
    attempts
      .filter(attempt => attempt.officerId)
      .map(attempt => [attempt.officerId!, attempt]),
  )

  return officers.map(officer => {
    const attempt = attemptByOfficerId.get(officer._id)
    if (!attempt) {
      return {
        officerId: officer._id,
        officerName: officer.fullName,
        status: 'not_started' as const,
      }
    }

    if (attempt.status === 'in_progress') {
      return {
        officerId: officer._id,
        officerName: officer.fullName,
        status: 'in_progress' as const,
        attemptId: attempt._id,
        startedAt: attempt.startedAt,
      }
    }

    return {
      officerId: officer._id,
      officerName: officer.fullName,
      status: 'submitted' as const,
      attemptId: attempt._id,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentScore: attempt.percentScore,
      submittedAt: attempt.submittedAt,
      startedAt: attempt.startedAt,
      submissionReason: attempt.submissionReason,
    }
  })
}
