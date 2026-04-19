import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'
import { getCurrentFinancialYear } from '@/lib/financial-year'
import { getStakeholderEngagement } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'
import { oracleQuery, oracleExecute } from '@/lib/oracle/client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sectionId } = body

    if (!sectionId || typeof sectionId !== 'string') {
      return NextResponse.json(
        { error: 'Section is required' },
        { status: 400 },
      )
    }

    const currentFY = getCurrentFinancialYear()

    if (process.env.CMS_PROVIDER === 'oracle') {
      const exists = await oracleQuery<{ id: string }>(
        `
          SELECT id AS "id"
          FROM stakeholder_engagements
          WHERE section_id = :sectionId
            AND financial_year_label = :fy
          FETCH FIRST 1 ROWS ONLY
        `,
        { sectionId, fy: currentFY.label },
      )
      if (exists.length) {
        return NextResponse.json(
          {
            error:
              'Stakeholder engagement already exists for this section and financial year',
          },
          { status: 409 },
        )
      }

      const id = crypto.randomUUID()
      await oracleExecute(
        `
          INSERT INTO stakeholder_engagements (id, section_id, financial_year_label)
          VALUES (:id, :section_id, :financial_year_label)
        `,
        { id, section_id: sectionId, financial_year_label: currentFY.label },
      )
      return NextResponse.json(
        { id, financialYearLabel: currentFY.label },
        { status: 201 },
      )
    }

    const existing = await getStakeholderEngagement(sectionId, currentFY.label)
    if (existing) {
      return NextResponse.json(
        { error: 'Stakeholder engagement already exists for this section and financial year' },
        { status: 409 },
      )
    }

    const doc = {
      _type: 'stakeholderEngagement',
      section: { _type: 'reference', _ref: sectionId },
      financialYearLabel: currentFY.label,
      stakeholders: [],
    }

    const result = await writeClient.create(doc)

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
