import 'server-only'

import { finalizeExpiredAttemptIfNeeded } from '@/lib/assessments/attempt.server'
import type {
  AssessmentAttemptRecord,
  AssessmentRecord,
} from '@/lib/assessments/types'
import { client } from '@/sanity/lib/client'

const ATTEMPT_PROJECTION = /* groq */ `{
  _id,
  "assessmentId": assessment._ref,
  "officerId": officer._ref,
  "officerName": coalesce(officer->fullName, officer->firstName + " " + officer->lastName),
  answers[]{ questionKey, selectedAnswers },
  score,
  maxScore,
  percentScore,
  submittedAt,
  startedAt,
  expiresAt,
  status,
  submissionReason
}`

export async function getAttemptsForAssessment(
  assessmentId: string,
): Promise<AssessmentAttemptRecord[]> {
  return client.fetch<AssessmentAttemptRecord[]>(
    /* groq */ `*[_type == "assessmentAttempt" && assessment._ref == $assessmentId && status == "submitted"]
      | order(submittedAt desc) ${ATTEMPT_PROJECTION}`,
    { assessmentId },
  )
}

export async function getAllAttemptsForAssessment(
  assessmentId: string,
): Promise<AssessmentAttemptRecord[]> {
  return client.fetch<AssessmentAttemptRecord[]>(
    /* groq */ `*[_type == "assessmentAttempt" && assessment._ref == $assessmentId]
      | order(coalesce(submittedAt, startedAt, _createdAt) desc) ${ATTEMPT_PROJECTION}`,
    { assessmentId },
  )
}

export async function getSubmittedAttemptForOfficer(
  assessmentId: string,
  officerId: string,
): Promise<AssessmentAttemptRecord | null> {
  return client.fetch<AssessmentAttemptRecord | null>(
    /* groq */ `*[_type == "assessmentAttempt"
      && assessment._ref == $assessmentId
      && officer._ref == $officerId
      && status == "submitted"
    ][0]${ATTEMPT_PROJECTION}`,
    { assessmentId, officerId },
  )
}

/** @deprecated Use getSubmittedAttemptForOfficer */
export async function getAttemptForOfficer(
  assessmentId: string,
  officerId: string,
): Promise<AssessmentAttemptRecord | null> {
  return getSubmittedAttemptForOfficer(assessmentId, officerId)
}

export async function getInProgressAttemptForOfficer(
  assessmentId: string,
  officerId: string,
): Promise<AssessmentAttemptRecord | null> {
  return client.fetch<AssessmentAttemptRecord | null>(
    /* groq */ `*[_type == "assessmentAttempt"
      && assessment._ref == $assessmentId
      && officer._ref == $officerId
      && status == "in_progress"
    ][0]${ATTEMPT_PROJECTION}`,
    { assessmentId, officerId },
  )
}

export async function getOfficerAttemptState(
  assessment: AssessmentRecord,
  officerId: string,
): Promise<{
  submittedAttempt: AssessmentAttemptRecord | null
  activeAttempt: AssessmentAttemptRecord | null
}> {
  const submittedAttempt = await getSubmittedAttemptForOfficer(
    assessment._id,
    officerId,
  )
  if (submittedAttempt) {
    return { submittedAttempt, activeAttempt: null }
  }

  const inProgressAttempt = await getInProgressAttemptForOfficer(
    assessment._id,
    officerId,
  )
  if (!inProgressAttempt) {
    return { submittedAttempt: null, activeAttempt: null }
  }

  const resolvedAttempt = await finalizeExpiredAttemptIfNeeded(
    inProgressAttempt,
    assessment,
  )

  if (resolvedAttempt.status === 'submitted') {
    return {
      submittedAttempt: resolvedAttempt,
      activeAttempt: null,
    }
  }

  return {
    submittedAttempt: null,
    activeAttempt: resolvedAttempt,
  }
}

export async function getAttemptById(
  attemptId: string,
): Promise<AssessmentAttemptRecord | null> {
  return client.fetch<AssessmentAttemptRecord | null>(
    /* groq */ `*[_type == "assessmentAttempt" && _id == $attemptId][0]${ATTEMPT_PROJECTION}`,
    { attemptId },
  )
}
