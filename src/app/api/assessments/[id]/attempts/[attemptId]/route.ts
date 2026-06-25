import { NextRequest, NextResponse } from 'next/server'

import {
  canManageAssessments,
  canViewAssessmentResults,
  getAssessmentAccessForSection,
} from '@/lib/assessments/access.server'
import { getAssessmentById } from '@/sanity/lib/assessments/get-assessments-by-section'
import { getAttemptById } from '@/sanity/lib/assessments/get-assessment-attempts'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; attemptId: string }> },
) {
  try {
    const { id, attemptId } = await params
    const assessment = await getAssessmentById(id)
    if (!assessment?.sectionId) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    const { access } = await getAssessmentAccessForSection(assessment.sectionId)
    const canManage = canManageAssessments(access)
    const canViewResults = canViewAssessmentResults(access)
    if (!canManage && !canViewResults) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const attempt = await getAttemptById(attemptId)
    if (!attempt || attempt.assessmentId !== id) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }
    if (attempt.status !== 'submitted') {
      return NextResponse.json(
        { error: 'Only submitted attempts can be reviewed' },
        { status: 400 },
      )
    }

    return NextResponse.json({
      assessment: {
        _id: assessment._id,
        title: assessment.title,
        questions: (assessment.questions ?? []).map(question => ({
          ...question,
          correctAnswers: question.correctAnswers,
          explanation: question.explanation,
        })),
      },
      attempt: {
        _id: attempt._id,
        officerId: attempt.officerId,
        officerName: attempt.officerName,
        answers: attempt.answers ?? [],
        score: attempt.score,
        maxScore: attempt.maxScore,
        percentScore: attempt.percentScore,
        submittedAt: attempt.submittedAt,
        submissionReason: attempt.submissionReason,
      },
    })
  } catch (error) {
    console.error('Error loading assessment attempt', error)
    return NextResponse.json(
      { error: 'Failed to load assessment attempt' },
      { status: 500 },
    )
  }
}
