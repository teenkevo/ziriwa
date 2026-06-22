import { NextRequest, NextResponse } from 'next/server'

import {
  canManageAssessments,
  canTakeAssessments,
  canViewAssessmentResults,
  getAssessmentAccessForSection,
} from '@/lib/assessments/access.server'
import type { AssessmentQuestion } from '@/lib/assessments/types'
import { parseStartsAt, parseTimeLimitMinutes } from '@/lib/assessments/time-limit'
import {
  formatPublishBlockersMessage,
  getAssessmentPublishBlockers,
} from '@/lib/assessments/publish-requirements'
import { getAssessmentById } from '@/sanity/lib/assessments/get-assessments-by-section'
import { getAttemptsForAssessment } from '@/sanity/lib/assessments/get-assessment-attempts'
import { writeClient } from '@/sanity/lib/write-client'

function sanitizeQuestions(questions: AssessmentQuestion[]): AssessmentQuestion[] {
  return questions.map(question => ({
    _key: question._key || crypto.randomUUID(),
    questionId: question.questionId?.trim() || undefined,
    subtopic: question.subtopic?.trim() || undefined,
    difficulty: question.difficulty ?? 'intermediate',
    questionType: question.questionType,
    title: question.title.trim(),
    body: question.body.trim(),
    options: (question.options ?? [])
      .filter(option => option.text?.trim())
      .map(option => ({
        _key: option._key || crypto.randomUUID(),
        label: option.label,
        text: option.text.trim(),
      })),
    correctAnswers: [...new Set((question.correctAnswers ?? []).map(a => a.trim().toUpperCase()))],
    explanation: question.explanation?.trim() || undefined,
  }))
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const assessment = await getAssessmentById(id)
    if (!assessment?.sectionId) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    const { access } = await getAssessmentAccessForSection(assessment.sectionId)
    const canManage = canManageAssessments(access)
    const canTake = canTakeAssessments(access)
    const canViewResults = canViewAssessmentResults(access)

    if (assessment.status === 'draft' && !canManage) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }
    if (!canManage && !canTake && !canViewResults) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const includeAnswers = canManage || canViewResults
    const payload = {
      ...assessment,
      questions: (assessment.questions ?? []).map(question => ({
        ...question,
        correctAnswers: includeAnswers ? question.correctAnswers : undefined,
        explanation: includeAnswers ? question.explanation : undefined,
      })),
    }

    const attempts =
      canManage || canViewResults
        ? await getAttemptsForAssessment(id)
        : []

    return NextResponse.json({
      assessment: payload,
      attempts,
      permissions: { canManage, canTake, canViewResults },
    })
  } catch (error) {
    console.error('Error loading assessment', error)
    return NextResponse.json({ error: 'Failed to load assessment' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const assessment = await getAssessmentById(id)
    if (!assessment?.sectionId) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    const { access } = await getAssessmentAccessForSection(assessment.sectionId)
    if (!canManageAssessments(access)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const setPatch: Record<string, unknown> = {}
    const unsetFields: string[] = []

    if (typeof body.title === 'string' && body.title.trim()) {
      setPatch.title = body.title.trim()
    }
    if (typeof body.description === 'string') {
      setPatch.description = body.description.trim() || undefined
    }
    if (typeof body.dueDate === 'string') {
      setPatch.dueDate = body.dueDate.trim() || undefined
    }
    if (body.startsAt !== undefined) {
      const parsed = parseStartsAt(body.startsAt)
      if (parsed) {
        setPatch.startsAt = parsed
      } else {
        return NextResponse.json(
          { error: 'Start date and time is required' },
          { status: 400 },
        )
      }
    }
    if (body.timeLimitMinutes !== undefined) {
      const parsed = parseTimeLimitMinutes(body.timeLimitMinutes)
      if (parsed) {
        setPatch.timeLimitMinutes = parsed
      } else {
        return NextResponse.json(
          { error: 'Time limit is required' },
          { status: 400 },
        )
      }
    }
    if (Array.isArray(body.questions)) {
      setPatch.questions = sanitizeQuestions(body.questions as AssessmentQuestion[])
    }
    if (body.action === 'publish') {
      const publishBlockers = getAssessmentPublishBlockers({
        startsAt:
          typeof setPatch.startsAt === 'string'
            ? setPatch.startsAt
            : assessment.startsAt,
        timeLimitMinutes:
          typeof setPatch.timeLimitMinutes === 'number'
            ? setPatch.timeLimitMinutes
            : assessment.timeLimitMinutes,
        questions: Array.isArray(setPatch.questions)
          ? setPatch.questions
          : assessment.questions,
      })
      if (publishBlockers.length > 0) {
        return NextResponse.json(
          { error: formatPublishBlockersMessage(publishBlockers) },
          { status: 400 },
        )
      }
      setPatch.status = 'published'
      setPatch.publishedAt = new Date().toISOString()
    }
    if (body.action === 'archive') {
      setPatch.status = 'archived'
    }
    if (body.action === 'unpublish') {
      setPatch.status = 'draft'
      setPatch.publishedAt = undefined
    }

    if (Object.keys(setPatch).length === 0 && unsetFields.length === 0) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 })
    }

    let mutation = writeClient.patch(id)
    if (Object.keys(setPatch).length > 0) {
      mutation = mutation.set(setPatch)
    }
    if (unsetFields.length > 0) {
      mutation = mutation.unset(unsetFields)
    }

    await mutation.commit()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error updating assessment', error)
    return NextResponse.json({ error: 'Failed to update assessment' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const assessment = await getAssessmentById(id)
    if (!assessment?.sectionId) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    const { access } = await getAssessmentAccessForSection(assessment.sectionId)
    if (!canManageAssessments(access)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await writeClient.delete(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting assessment', error)
    return NextResponse.json({ error: 'Failed to delete assessment' }, { status: 500 })
  }
}
