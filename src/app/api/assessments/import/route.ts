import { NextRequest, NextResponse } from 'next/server'

import {
  canManageAssessments,
  getAssessmentAccessForSection,
} from '@/lib/assessments/access.server'
import { getAssessmentExcelFileError } from '@/lib/assessments/excel-file-policy'
import { parseAssessmentExcel } from '@/lib/assessments/excel-import'
import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import { writeClient } from '@/sanity/lib/write-client'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const sectionId = String(formData.get('sectionId') ?? '').trim()
    const file = formData.get('file')

    if (!sectionId) {
      return NextResponse.json({ error: 'sectionId is required' }, { status: 400 })
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Excel file is required' }, { status: 400 })
    }

    const fileError = getAssessmentExcelFileError(file)
    if (fileError) {
      return NextResponse.json({ error: fileError }, { status: 400 })
    }

    const { access, viewerStaffId } = await getAssessmentAccessForSection(sectionId)
    if (!canManageAssessments(access)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const buffer = await file.arrayBuffer()
    const parsed = parseAssessmentExcel(
      buffer,
      file.name.replace(/\.[^.]+$/, ''),
    )

    const result = await writeClient.create({
      _type: 'assessment',
      title: parsed.title,
      section: { _type: 'reference', _ref: sectionId },
      status: 'draft',
      questions: parsed.questions,
      createdBy: viewerStaffId
        ? { _type: 'reference', _ref: viewerStaffId }
        : undefined,
    })

    return NextResponse.json(
      {
        id: result._id,
        title: parsed.title,
        questionCount: parsed.questions.length,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error importing assessment', error)
    const message =
      error instanceof Error ? error.message : 'Failed to import assessment'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
