import { NextRequest, NextResponse } from 'next/server'

import { getCurrentFinancialYear } from '@/lib/financial-year'
import {
  assertDeputyProjectContractManageAllowed,
  resolveDeputyProjectManagerStaffRef,
} from '@/lib/deputy-project-contract-access.server'
import { getDeputyProjectContract } from '@/sanity/lib/project-contracts/get-deputy-project-contract'
import { writeClient } from '@/sanity/lib/write-client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, deputyProjectManagerId: deputyIdRaw } = body

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: 'Project is required' },
        { status: 400 },
      )
    }

    const denied = await assertDeputyProjectContractManageAllowed(projectId)
    if (denied) return denied

    const resolvedId = await resolveDeputyProjectManagerStaffRef(projectId)
    let deputyProjectManagerId =
      typeof deputyIdRaw === 'string' && deputyIdRaw.trim()
        ? deputyIdRaw.trim()
        : ''
    deputyProjectManagerId = resolvedId ?? deputyProjectManagerId
    if (!deputyProjectManagerId) {
      return NextResponse.json(
        {
          error:
            'Deputy project manager staff record is required before onboarding the contract',
        },
        { status: 400 },
      )
    }

    const currentFY = getCurrentFinancialYear()
    const existing = await getDeputyProjectContract(projectId, currentFY.label)
    if (existing) {
      return NextResponse.json(
        {
          error:
            'A deputy contract already exists for this project and financial year',
        },
        { status: 409 },
      )
    }

    const result = await writeClient.create({
      _type: 'deputyProjectContract',
      project: { _type: 'reference', _ref: projectId },
      financialYearLabel: currentFY.label,
      deputyProjectManager: {
        _type: 'reference',
        _ref: deputyProjectManagerId,
      },
      status: 'draft',
    })

    return NextResponse.json(
      { id: result._id, financialYearLabel: currentFY.label },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating deputy project contract', error)
    return NextResponse.json(
      { error: 'Failed to create deputy project contract' },
      { status: 500 },
    )
  }
}
