import { NextRequest, NextResponse } from 'next/server'

import { getCurrentFinancialYear } from '@/lib/financial-year'
import {
  assertDepartmentContractManageAllowed,
  resolveCommissionerStaffRefForDepartment,
} from '@/lib/department-contract-access.server'
import { getDepartmentContract } from '@/sanity/lib/department-contracts/get-department-contract'
import { writeClient } from '@/sanity/lib/write-client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { departmentId, commissionerId: commissionerIdRaw } = body

    if (!departmentId || typeof departmentId !== 'string') {
      return NextResponse.json(
        { error: 'Department is required' },
        { status: 400 },
      )
    }

    const denied = await assertDepartmentContractManageAllowed(departmentId)
    if (denied) return denied

    const resolvedCommissionerId =
      await resolveCommissionerStaffRefForDepartment(departmentId)

    let commissionerId =
      typeof commissionerIdRaw === 'string' && commissionerIdRaw.trim()
        ? commissionerIdRaw.trim()
        : ''
    // Prefer server-resolved commissioner identity for the signed-in user.
    commissionerId = resolvedCommissionerId ?? commissionerId
    if (!commissionerId) {
      return NextResponse.json(
        {
          error:
            'Commissioner staff record is required — set department commissioner in Sanity or pass commissionerId',
        },
        { status: 400 },
      )
    }

    const currentFY = getCurrentFinancialYear()
    const existing = await getDepartmentContract(departmentId, currentFY.label)
    if (existing) {
      return NextResponse.json(
        {
          error:
            'A contract already exists for this department and financial year',
        },
        { status: 409 },
      )
    }

    const result = await writeClient.create({
      _type: 'departmentContract',
      department: { _type: 'reference', _ref: departmentId },
      financialYearLabel: currentFY.label,
      commissioner: { _type: 'reference', _ref: commissionerId },
      status: 'draft',
    })

    return NextResponse.json(
      { id: result._id, financialYearLabel: currentFY.label },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating department contract', error)
    return NextResponse.json(
      { error: 'Failed to create department contract' },
      { status: 500 },
    )
  }
}
