import { NextRequest, NextResponse } from 'next/server'

import {
  assertAssessmentAvailable,
  buildInProgressAttemptPayload,
  buildQuestionResults,
  canSubmitAttempt,
  finalizeAssessmentAttempt,
  sanitizeAttemptAnswers,
} from '@/lib/assessments/attempt.server'
import {
  canTakeAssessments,
  getAssessmentAccessForSection,
} from '@/lib/assessments/access.server'
import { scoreAssessmentAttempt } from '@/lib/assessments/scoring'
import type {
  AssessmentAttemptAnswer,
  AssessmentSubmissionReason,
} from '@/lib/assessments/types'
import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import { getAssessmentById } from '@/sanity/lib/assessments/get-assessments-by-section'
import {
  getInProgressAttemptForOfficer,
  getOfficerAttemptState,
  getSubmittedAttemptForOfficer,
} from '@/sanity/lib/assessments/get-assessment-attempts'
import { writeClient } from '@/sanity/lib/write-client'

function parseSubmissionReason(value: unknown): AssessmentSubmissionReason {
  return value === 'timeout' ? 'timeout' : 'manual'
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const assessment = await getAssessmentById(id)
    if (!assessment?.sectionId || assessment.status !== 'published') {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    const { access } = await getAssessmentAccessForSection(assessment.sectionId)
    if (!canTakeAssessments(access)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const viewerStaffId = await getViewerStaffId()
    if (!viewerStaffId) {
      return NextResponse.json({ error: 'Staff profile required' }, { status: 403 })
    }

    const { submittedAttempt, activeAttempt } = await getOfficerAttemptState(
      assessment,
      viewerStaffId,
    )

    return NextResponse.json({
      attempt: submittedAttempt ?? activeAttempt,
      submittedAttempt,
      activeAttempt,
    })
  } catch (error) {
    console.error('Error loading assessment attempt', error)
    return NextResponse.json({ error: 'Failed to load attempt' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const answers = Array.isArray(body.answers)
      ? (body.answers as AssessmentAttemptAnswer[])
      : []

    const assessment = await getAssessmentById(id)
    if (!assessment?.sectionId || assessment.status !== 'published') {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    const { access } = await getAssessmentAccessForSection(assessment.sectionId)
    if (!canTakeAssessments(access)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const viewerStaffId = await getViewerStaffId()
    if (!viewerStaffId) {
      return NextResponse.json({ error: 'Staff profile required' }, { status: 403 })
    }

    const activeAttempt = await getInProgressAttemptForOfficer(id, viewerStaffId)
    if (!activeAttempt) {
      return NextResponse.json({ error: 'No active attempt found' }, { status: 404 })
    }

    const submitCheck = canSubmitAttempt(activeAttempt, 'manual')
    if (!submitCheck.ok) {
      return NextResponse.json(
        { error: submitCheck.error },
        { status: submitCheck.status },
      )
    }

    const questions = assessment.questions ?? []
    const sanitizedAnswers = sanitizeAttemptAnswers(questions, answers)

    await writeClient.patch(activeAttempt._id).set({ answers: sanitizedAnswers }).commit()

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error saving assessment attempt progress', error)
    return NextResponse.json(
      { error: 'Failed to save assessment progress' },
      { status: 500 },
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const answers = Array.isArray(body.answers)
      ? (body.answers as AssessmentAttemptAnswer[])
      : []
    const submissionReason = parseSubmissionReason(body.submissionReason)

    const assessment = await getAssessmentById(id)
    const availabilityError = assessment
      ? assertAssessmentAvailable(assessment)
      : { error: 'Assessment not found', status: 404 as const }
    if (!assessment || availabilityError) {
      return NextResponse.json(
        { error: availabilityError?.error ?? 'Assessment not found' },
        { status: availabilityError?.status ?? 404 },
      )
    }

    const questions = assessment.questions ?? []
    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'Assessment has no questions' },
        { status: 400 },
      )
    }

    const { access } = await getAssessmentAccessForSection(assessment.sectionId!)
    if (!canTakeAssessments(access)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const viewerStaffId = await getViewerStaffId()
    if (!viewerStaffId) {
      return NextResponse.json({ error: 'Staff profile required' }, { status: 403 })
    }

    const submitted = await getSubmittedAttemptForOfficer(id, viewerStaffId)
    if (submitted) {
      return NextResponse.json(
        { error: 'You have already submitted this assessment' },
        { status: 409 },
      )
    }

    const hasTimeLimit = (assessment.timeLimitMinutes ?? 0) > 0
    const activeAttempt = await getInProgressAttemptForOfficer(id, viewerStaffId)

    if (hasTimeLimit) {
      if (!activeAttempt) {
        return NextResponse.json(
          { error: 'Start the assessment before submitting' },
          { status: 400 },
        )
      }

      const submitCheck = canSubmitAttempt(activeAttempt, submissionReason)
      if (!submitCheck.ok) {
        return NextResponse.json(
          { error: submitCheck.error },
          { status: submitCheck.status },
        )
      }

      const result = await finalizeAssessmentAttempt({
        attemptId: activeAttempt._id,
        assessment,
        answers,
        submissionReason,
      })

      return NextResponse.json(result, { status: 200 })
    }

    if (activeAttempt) {
      const submitCheck = canSubmitAttempt(activeAttempt, 'manual')
      if (!submitCheck.ok) {
        return NextResponse.json(
          { error: submitCheck.error },
          { status: submitCheck.status },
        )
      }

      const result = await finalizeAssessmentAttempt({
        attemptId: activeAttempt._id,
        assessment,
        answers,
        submissionReason: 'manual',
      })

      return NextResponse.json(result, { status: 200 })
    }

    const sanitizedAnswers = sanitizeAttemptAnswers(questions, answers)
    const scoring = scoreAssessmentAttempt({
      questions,
      answers: sanitizedAnswers,
    })
    const questionResults = buildQuestionResults(questions, sanitizedAnswers)

    const result = await writeClient.create({
      _type: 'assessmentAttempt',
      assessment: { _type: 'reference', _ref: id },
      section: { _type: 'reference', _ref: assessment.sectionId! },
      officer: { _type: 'reference', _ref: viewerStaffId },
      answers: sanitizedAnswers,
      score: scoring.score,
      maxScore: scoring.maxScore,
      percentScore: scoring.percentScore,
      submittedAt: new Date().toISOString(),
      status: 'submitted',
      submissionReason: 'manual',
    })

    return NextResponse.json(
      {
        id: result._id,
        score: scoring.score,
        maxScore: scoring.maxScore,
        percentScore: scoring.percentScore,
        questionResults,
        submissionReason: 'manual',
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error submitting assessment attempt', error)
    return NextResponse.json(
      { error: 'Failed to submit assessment' },
      { status: 500 },
    )
  }
}
