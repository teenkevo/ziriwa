import { NextRequest, NextResponse } from 'next/server'

import {
  canManageAssessments,
  getAssessmentAccessForSection,
} from '@/lib/assessments/access.server'
import type { AssessmentQuestion } from '@/lib/assessments/types'
import { parseTimeLimitMinutes } from '@/lib/assessments/time-limit'
import { getAssessmentsBySection } from '@/sanity/lib/assessments/get-assessments-by-section'
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

export async function GET(req: NextRequest) {
  try {
    const sectionId = req.nextUrl.searchParams.get('sectionId')?.trim() ?? ''
    if (!sectionId) {
      return NextResponse.json({ error: 'sectionId is required' }, { status: 400 })
    }

    const { access } = await getAssessmentAccessForSection(sectionId)
    if (!canManageAssessments(access) && !access.isSectionSupervisor && !access.isSectionOfficer) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const status = access.isSectionOfficer ? 'published' : 'published_or_draft'
    const assessments = await getAssessmentsBySection(sectionId, { status })
    return NextResponse.json({ assessments })
  } catch (error) {
    console.error('Error listing assessments', error)
    return NextResponse.json({ error: 'Failed to list assessments' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const sectionId =
      typeof body.sectionId === 'string' ? body.sectionId.trim() : ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description =
      typeof body.description === 'string' ? body.description.trim() : ''
    const dueDate =
      typeof body.dueDate === 'string' ? body.dueDate.trim() : undefined
    const timeLimitMinutes = parseTimeLimitMinutes(body.timeLimitMinutes)
    const publish = body.publish === true
    const questions = Array.isArray(body.questions)
      ? sanitizeQuestions(body.questions as AssessmentQuestion[])
      : []

    if (!sectionId || !title) {
      return NextResponse.json(
        { error: 'sectionId and title are required' },
        { status: 400 },
      )
    }
    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'At least one question is required' },
        { status: 400 },
      )
    }

    const { access, viewerStaffId } = await getAssessmentAccessForSection(sectionId)
    if (!canManageAssessments(access)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await writeClient.create({
      _type: 'assessment',
      title,
      description: description || undefined,
      section: { _type: 'reference', _ref: sectionId },
      status: publish ? 'published' : 'draft',
      questions,
      createdBy: viewerStaffId
        ? { _type: 'reference', _ref: viewerStaffId }
        : undefined,
      publishedAt: publish ? new Date().toISOString() : undefined,
      dueDate: dueDate || undefined,
      timeLimitMinutes,
    })

    return NextResponse.json({ id: result._id }, { status: 201 })
  } catch (error) {
    console.error('Error creating assessment', error)
    return NextResponse.json({ error: 'Failed to create assessment' }, { status: 500 })
  }
}
