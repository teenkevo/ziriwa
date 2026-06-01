import { NextRequest, NextResponse } from 'next/server'

import { getCurrentFinancialYear } from '@/lib/financial-year'
import {
  assertDivisionContractManageAllowed,
  resolveAssistantCommissionerStaffRefForDivision,
} from '@/lib/division-contract-access.server'
import { getDivisionContract } from '@/sanity/lib/division-contracts/get-division-contract'
import { writeClient } from '@/sanity/lib/write-client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { divisionId, assistantCommissionerId: assistantCommissionerIdRaw } = body

    if (!divisionId || typeof divisionId !== 'string') {
      return NextResponse.json(
        { error: 'Division is required' },
        { status: 400 },
      )
    }

    const denied = await assertDivisionContractManageAllowed(divisionId)
    if (denied) return denied

    const resolvedAssistantCommissionerId =
      await resolveAssistantCommissionerStaffRefForDivision(divisionId)

    let assistantCommissionerId =
      typeof assistantCommissionerIdRaw === 'string' && assistantCommissionerIdRaw.trim()
        ? assistantCommissionerIdRaw.trim()
        : ''
    assistantCommissionerId =
      resolvedAssistantCommissionerId ?? assistantCommissionerId
    if (!assistantCommissionerId) {
      return NextResponse.json(
        {
          error:
            'Assistant commissioner staff record is required — set division assistant commissioner in Sanity or pass assistantCommissionerId',
        },
        { status: 400 },
      )
    }

    const currentFY = getCurrentFinancialYear()
    const existing = await getDivisionContract(divisionId, currentFY.label)
    if (existing) {
      return NextResponse.json(
        {
          error:
            'A contract already exists for this division and financial year',
        },
        { status: 409 },
      )
    }

    const result = await writeClient.create({
      _type: 'divisionContract',
      division: { _type: 'reference', _ref: divisionId },
      financialYearLabel: currentFY.label,
      assistantCommissioner: { _type: 'reference', _ref: assistantCommissionerId },
      status: 'draft',
    })

    return NextResponse.json(
      { id: result._id, financialYearLabel: currentFY.label },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating division contract', error)
    return NextResponse.json(
      { error: 'Failed to create division contract' },
      { status: 500 },
    )
  }
}
