import { NextRequest, NextResponse } from 'next/server'

import {
  assertAssessmentStartable,
  buildInProgressAttemptPayload,
} from '@/lib/assessments/attempt.server'
import {
  canTakeAssessments,
  getAssessmentAccessForSection,
} from '@/lib/assessments/access.server'
import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import { getAssessmentById } from '@/sanity/lib/assessments/get-assessments-by-section'
import {
  getInProgressAttemptForOfficer,
  getSubmittedAttemptForOfficer,
} from '@/sanity/lib/assessments/get-assessment-attempts'
import { writeClient } from '@/sanity/lib/write-client'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const assessment = await getAssessmentById(id)
    const availabilityError = assessment
      ? assertAssessmentStartable(assessment)
      : { error: 'Assessment not found', status: 404 as const }
    if (!assessment || availabilityError) {
      return NextResponse.json(
        { error: availabilityError?.error ?? 'Assessment not found' },
        { status: availabilityError?.status ?? 404 },
      )
    }

    const timeLimitMinutes = assessment.timeLimitMinutes
    if (!timeLimitMinutes || timeLimitMinutes <= 0) {
      return NextResponse.json(
        { error: 'This assessment does not have a time limit' },
        { status: 400 },
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

    const existing = await getInProgressAttemptForOfficer(id, viewerStaffId)
    if (existing) {
      return NextResponse.json({ attempt: existing })
    }

    const created = await writeClient.create(
      buildInProgressAttemptPayload({
        assessmentId: id,
        sectionId: assessment.sectionId!,
        officerId: viewerStaffId,
        timeLimitMinutes,
      }),
    )

    return NextResponse.json(
      {
        attempt: {
          _id: created._id,
          assessmentId: id,
          answers: [],
          startedAt: created.startedAt,
          expiresAt: created.expiresAt,
          status: 'in_progress',
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error starting assessment attempt', error)
    return NextResponse.json(
      { error: 'Failed to start assessment' },
      { status: 500 },
    )
  }
}
