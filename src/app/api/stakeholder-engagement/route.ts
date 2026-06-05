import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'
import { getCurrentFinancialYear } from '@/lib/financial-year'
import { getProjectIdForSection } from '@/lib/project-access.server'
import {
  getStakeholderEngagement,
  getStakeholderEngagementByProject,
} from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const sectionId =
      typeof body.sectionId === 'string' ? body.sectionId.trim() : ''
    const projectId =
      typeof body.projectId === 'string' ? body.projectId.trim() : ''

    if (Boolean(sectionId) === Boolean(projectId)) {
      return NextResponse.json(
        { error: 'Provide exactly one of sectionId or projectId' },
        { status: 400 },
      )
    }

    const currentFY = getCurrentFinancialYear()

    if (projectId) {
      const existing = await getStakeholderEngagementByProject(
        projectId,
        currentFY.label,
      )
      if (existing) {
        return NextResponse.json(
          {
            error:
              'Stakeholder engagement already exists for this project and financial year',
          },
          { status: 409 },
        )
      }

      const result = await writeClient.create({
        _type: 'stakeholderEngagement',
        project: { _type: 'reference', _ref: projectId },
        financialYearLabel: currentFY.label,
        stakeholders: [],
      })

      return NextResponse.json(
        { id: result._id, financialYearLabel: currentFY.label },
        { status: 201 },
      )
    }

    const existing = await getStakeholderEngagement(sectionId, currentFY.label)
    if (existing) {
      return NextResponse.json(
        {
          error:
            'Stakeholder engagement already exists for this section and financial year',
        },
        { status: 409 },
      )
    }

    const parentProjectId = await getProjectIdForSection(sectionId)
    if (parentProjectId) {
      return NextResponse.json(
        {
          error:
            'Project workstreams use the project-level stakeholder engagement matrix. Create it from the project manager or deputy project manager workspace.',
        },
        { status: 400 },
      )
    }

    const result = await writeClient.create({
      _type: 'stakeholderEngagement',
      section: { _type: 'reference', _ref: sectionId },
      financialYearLabel: currentFY.label,
      stakeholders: [],
    })

    return NextResponse.json(
      { id: result._id, financialYearLabel: currentFY.label },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating stakeholder engagement', error)
    return NextResponse.json(
      { error: 'Failed to create stakeholder engagement' },
      { status: 500 },
    )
  }
}
