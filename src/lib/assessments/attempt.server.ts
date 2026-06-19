import 'server-only'

import {
  isQuestionAnswerCorrect,
  scoreAssessmentAttempt,
} from '@/lib/assessments/scoring'
import {
  ASSESSMENT_SUBMIT_GRACE_MS,
  computeExpiresAt,
  isAttemptExpired,
  isPastDueDate,
} from '@/lib/assessments/time-limit'
import type {
  AssessmentAttemptAnswer,
  AssessmentAttemptRecord,
  AssessmentQuestion,
  AssessmentRecord,
} from '@/lib/assessments/types'
import { writeClient } from '@/sanity/lib/write-client'

export function sanitizeAttemptAnswers(
  questions: AssessmentQuestion[],
  answers: AssessmentAttemptAnswer[],
) {
  const questionKeys = new Set(questions.map(question => question._key))
  return answers
    .filter(answer => questionKeys.has(answer.questionKey))
    .map(answer => ({
      _key: crypto.randomUUID(),
      questionKey: answer.questionKey,
      selectedAnswers: [
        ...new Set(
          (answer.selectedAnswers ?? []).map(value => value.trim().toUpperCase()),
        ),
      ],
    }))
}

export function buildQuestionResults(
  questions: AssessmentQuestion[],
  sanitizedAnswers: ReturnType<typeof sanitizeAttemptAnswers>,
) {
  const answerByQuestionKey = new Map(
    sanitizedAnswers.map(answer => [
      answer.questionKey,
      answer.selectedAnswers ?? [],
    ]),
  )

  return questions.map(question => {
    const selected = answerByQuestionKey.get(question._key) ?? []
    return {
      questionKey: question._key,
      isCorrect: isQuestionAnswerCorrect(question, selected),
      correctAnswers: question.correctAnswers ?? [],
      explanation: question.explanation,
    }
  })
}

export function assertAssessmentAvailable(assessment: AssessmentRecord) {
  if (!assessment.sectionId || assessment.status !== 'published') {
    return { error: 'Assessment not found', status: 404 as const }
  }
  if (isPastDueDate(assessment.dueDate)) {
    return { error: 'This assessment is past its due date', status: 403 as const }
  }
  return null
}

export function buildAnswersForAllQuestions(
  questions: AssessmentQuestion[],
  answers: AssessmentAttemptAnswer[],
) {
  const answerByQuestionKey = new Map(
    answers.map(answer => [answer.questionKey, answer.selectedAnswers ?? []]),
  )

  return questions.map(question => ({
    questionKey: question._key,
    selectedAnswers: answerByQuestionKey.get(question._key) ?? [],
  }))
}

interface FinalizeAttemptInput {
  attemptId: string
  assessment: AssessmentRecord
  answers: AssessmentAttemptAnswer[]
  submissionReason: 'manual' | 'timeout'
}

export async function finalizeAssessmentAttempt({
  attemptId,
  assessment,
  answers,
  submissionReason,
}: FinalizeAttemptInput) {
  const questions = assessment.questions ?? []
  const completeAnswers = buildAnswersForAllQuestions(questions, answers)
  const sanitizedAnswers = sanitizeAttemptAnswers(questions, completeAnswers)
  const scoring = scoreAssessmentAttempt({
    questions,
    answers: sanitizedAnswers,
  })
  const questionResults = buildQuestionResults(questions, sanitizedAnswers)
  const submittedAt = new Date().toISOString()

  await writeClient
    .patch(attemptId)
    .set({
      answers: sanitizedAnswers,
      score: scoring.score,
      maxScore: scoring.maxScore,
      percentScore: scoring.percentScore,
      submittedAt,
      status: 'submitted',
      submissionReason,
    })
    .commit()

  return {
    id: attemptId,
    score: scoring.score,
    maxScore: scoring.maxScore,
    percentScore: scoring.percentScore,
    submittedAt,
    submissionReason,
    questionResults,
  }
}

export function canSubmitAttempt(
  attempt: Pick<AssessmentAttemptRecord, 'expiresAt' | 'status'>,
  submissionReason: 'manual' | 'timeout',
  now = Date.now(),
) {
  if (attempt.status !== 'in_progress') {
    return { ok: false as const, error: 'Attempt is not active', status: 409 }
  }

  if (!attempt.expiresAt) {
    return { ok: true as const }
  }

  const expiresAtMs = Date.parse(attempt.expiresAt)
  if (submissionReason === 'timeout') {
    if (now < expiresAtMs - 1_000) {
      return { ok: false as const, error: 'Assessment has not expired yet', status: 400 }
    }
    return { ok: true as const }
  }

  if (now > expiresAtMs + ASSESSMENT_SUBMIT_GRACE_MS) {
    return {
      ok: false as const,
      error: 'Time limit exceeded',
      status: 403,
    }
  }

  return { ok: true as const }
}

export function buildInProgressAttemptPayload(input: {
  assessmentId: string
  sectionId: string
  officerId: string
  timeLimitMinutes?: number
}) {
  const startedAt = new Date().toISOString()
  return {
    _type: 'assessmentAttempt' as const,
    assessment: { _type: 'reference' as const, _ref: input.assessmentId },
    section: { _type: 'reference' as const, _ref: input.sectionId },
    officer: { _type: 'reference' as const, _ref: input.officerId },
    answers: [],
    status: 'in_progress' as const,
    startedAt,
    expiresAt:
      input.timeLimitMinutes != null && input.timeLimitMinutes > 0
        ? computeExpiresAt(startedAt, input.timeLimitMinutes)
        : undefined,
  }
}

export async function finalizeExpiredAttemptIfNeeded(
  attempt: AssessmentAttemptRecord,
  assessment: AssessmentRecord,
): Promise<AssessmentAttemptRecord> {
  if (attempt.status !== 'in_progress' || !attempt.expiresAt) {
    return attempt
  }

  if (!isAttemptExpired(attempt.expiresAt)) {
    return attempt
  }

  const result = await finalizeAssessmentAttempt({
    attemptId: attempt._id,
    assessment,
    answers: attempt.answers ?? [],
    submissionReason: 'timeout',
  })

  return {
    ...attempt,
    answers: buildAnswersForAllQuestions(
      assessment.questions ?? [],
      attempt.answers ?? [],
    ),
    score: result.score,
    maxScore: result.maxScore,
    percentScore: result.percentScore,
    submittedAt: result.submittedAt,
    status: 'submitted',
    submissionReason: 'timeout',
  }
}
