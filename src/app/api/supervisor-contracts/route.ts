import { NextRequest, NextResponse } from 'next/server'

import { getCurrentFinancialYear } from '@/lib/financial-year'
import {
  assertSupervisorContractManageAllowed,
  resolveSupervisorStaffRefForSection,
} from '@/lib/supervisor-contract-access.server'
import { getSupervisorContract } from '@/sanity/lib/supervisor-contracts/get-supervisor-contract'
import { writeClient } from '@/sanity/lib/write-client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sectionId, supervisorId: supervisorIdRaw } = body

    if (!sectionId || typeof sectionId !== 'string') {
      return NextResponse.json({ error: 'Section is required' }, { status: 400 })
    }

    const denied = await assertSupervisorContractManageAllowed(sectionId)
    if (denied) return denied

    const resolvedSupervisorId =
      await resolveSupervisorStaffRefForSection(sectionId)

    let supervisorId =
      typeof supervisorIdRaw === 'string' && supervisorIdRaw.trim()
        ? supervisorIdRaw.trim()
        : ''
    supervisorId = resolvedSupervisorId ?? supervisorId
    if (!supervisorId) {
      return NextResponse.json(
        {
          error:
            'Supervisor staff record is required — ensure you are an active supervisor for this section',
        },
        { status: 400 },
      )
    }

    const currentFY = getCurrentFinancialYear()
    const existing = await getSupervisorContract(
      sectionId,
      supervisorId,
      currentFY.label,
    )
    if (existing) {
      return NextResponse.json(
        {
          error:
            'A contract already exists for this supervisor and financial year',
        },
        { status: 409 },
      )
    }

    const result = await writeClient.create({
      _type: 'supervisorContract',
      section: { _type: 'reference', _ref: sectionId },
      financialYearLabel: currentFY.label,
      supervisor: { _type: 'reference', _ref: supervisorId },
      status: 'draft',
    })

    return NextResponse.json(
      { id: result._id, financialYearLabel: currentFY.label },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating supervisor contract', error)
    return NextResponse.json(
      { error: 'Failed to create supervisor contract' },
      { status: 500 },
    )
  }
}
