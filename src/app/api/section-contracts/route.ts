import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'
import { getCurrentFinancialYear } from '@/lib/financial-year'
import { getSectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import { oracleQuery, oracleExecute } from '@/lib/oracle/client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sectionId, managerId } = body

    if (!sectionId || typeof sectionId !== 'string') {
      return NextResponse.json(
        { error: 'Section is required' },
        { status: 400 },
      )
    }
    if (!managerId || typeof managerId !== 'string') {
      return NextResponse.json(
        { error: 'Manager is required' },
        { status: 400 },
      )
    }

    const currentFY = getCurrentFinancialYear()

    if (process.env.CMS_PROVIDER === 'oracle') {
      const exists = await oracleQuery<{ id: string }>(
        `
          SELECT id AS "id"
          FROM section_contracts
          WHERE section_id = :sectionId
            AND financial_year_label = :fy
          FETCH FIRST 1 ROWS ONLY
        `,
        { sectionId, fy: currentFY.label },
      )
      if (exists.length) {
        return NextResponse.json(
          { error: 'A contract already exists for this section and financial year' },
          { status: 409 },
        )
      }

      const id = crypto.randomUUID()
      await oracleExecute(
        `
          INSERT INTO section_contracts (id, section_id, financial_year_label, manager_id, status)
          VALUES (:id, :section_id, :financial_year_label, :manager_id, :status)
        `,
        {
          id,
          section_id: sectionId,
          financial_year_label: currentFY.label,
          manager_id: managerId,
          status: 'draft',
        },
      )
      return NextResponse.json(
        { id, financialYearLabel: currentFY.label },
        { status: 201 },
      )
    }

    // One contract per section per FY
    const existing = await getSectionContract(sectionId, currentFY.label)
    if (existing) {
      return NextResponse.json(
        { error: 'A contract already exists for this section and financial year' },
        { status: 409 },
      )
    }

    const doc = {
      _type: 'sectionContract',
      section: { _type: 'reference', _ref: sectionId },
      financialYearLabel: currentFY.label,
      manager: { _type: 'reference', _ref: managerId },
      status: 'draft',
    }

    const result = await writeClient.create(doc)

    return NextResponse.json(
      { id: result._id, financialYearLabel: currentFY.label },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating section contract', error)
    return NextResponse.json(
      { error: 'Failed to create section contract' },
      { status: 500 },
    )
  }
}
