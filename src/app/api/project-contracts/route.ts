import { NextRequest, NextResponse } from 'next/server'

import { getCurrentFinancialYear } from '@/lib/financial-year'
import {
  assertProjectContractManageAllowed,
  resolveProjectManagerStaffRef,
} from '@/lib/project-contract-access.server'
import { getProjectContract } from '@/sanity/lib/project-contracts/get-project-contract'
import { writeClient } from '@/sanity/lib/write-client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, projectManagerId: projectManagerIdRaw } = body

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: 'Project is required' },
        { status: 400 },
      )
    }

    const denied = await assertProjectContractManageAllowed(projectId)
    if (denied) return denied

    const resolvedProjectManagerId =
      await resolveProjectManagerStaffRef(projectId)

    let projectManagerId =
      typeof projectManagerIdRaw === 'string' && projectManagerIdRaw.trim()
        ? projectManagerIdRaw.trim()
        : ''
    projectManagerId = resolvedProjectManagerId ?? projectManagerId
    if (!projectManagerId) {
      return NextResponse.json(
        {
          error:
            'Project manager staff record is required — assign a project manager before onboarding the contract',
        },
        { status: 400 },
      )
    }

    const currentFY = getCurrentFinancialYear()
    const existing = await getProjectContract(projectId, currentFY.label)
    if (existing) {
      return NextResponse.json(
        {
          error:
            'A contract already exists for this project and financial year',
        },
        { status: 409 },
      )
    }

    const result = await writeClient.create({
      _type: 'projectContract',
      project: { _type: 'reference', _ref: projectId },
      financialYearLabel: currentFY.label,
      projectManager: { _type: 'reference', _ref: projectManagerId },
      status: 'draft',
    })

    return NextResponse.json(
      { id: result._id, financialYearLabel: currentFY.label },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating project contract', error)
    return NextResponse.json(
      { error: 'Failed to create project contract' },
      { status: 500 },
    )
  }
}
