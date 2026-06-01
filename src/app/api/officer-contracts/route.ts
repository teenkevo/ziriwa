import { NextRequest, NextResponse } from 'next/server'

import { getCurrentFinancialYear } from '@/lib/financial-year'
import {
  assertOfficerContractManageAllowed,
  resolveOfficerStaffRefForSection,
} from '@/lib/officer-contract-access.server'
import { getOfficerContract } from '@/sanity/lib/officer-contracts/get-officer-contract'
import { writeClient } from '@/sanity/lib/write-client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sectionId, officerId: officerIdRaw } = body

    if (!sectionId || typeof sectionId !== 'string') {
      return NextResponse.json({ error: 'Section is required' }, { status: 400 })
    }

    const denied = await assertOfficerContractManageAllowed(sectionId)
    if (denied) return denied

    const resolvedOfficerId = await resolveOfficerStaffRefForSection(sectionId)

    let officerId =
      typeof officerIdRaw === 'string' && officerIdRaw.trim()
        ? officerIdRaw.trim()
        : ''
    officerId = resolvedOfficerId ?? officerId
    if (!officerId) {
      return NextResponse.json(
        {
          error:
            'Officer staff record is required — ensure you are an active officer for this section',
        },
        { status: 400 },
      )
    }

    const currentFY = getCurrentFinancialYear()
    const existing = await getOfficerContract(
      sectionId,
      officerId,
      currentFY.label,
    )
    if (existing) {
      return NextResponse.json(
        {
          error:
            'A contract already exists for this officer and financial year',
        },
        { status: 409 },
      )
    }

    const result = await writeClient.create({
      _type: 'officerContract',
      section: { _type: 'reference', _ref: sectionId },
      financialYearLabel: currentFY.label,
      officer: { _type: 'reference', _ref: officerId },
      status: 'draft',
    })

    return NextResponse.json(
      { id: result._id, financialYearLabel: currentFY.label },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating officer contract', error)
    return NextResponse.json(
      { error: 'Failed to create officer contract' },
      { status: 500 },
    )
  }
}
