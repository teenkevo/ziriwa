import { NextRequest, NextResponse } from 'next/server'

import { getCurrentFinancialYear } from '@/lib/financial-year'
import { buildManagerCascadeOptions } from '@/lib/contract-cascade/build-cascade-options'
import {
  assertSupervisorContractManageAllowed,
} from '@/lib/supervisor-contract-access.server'
import { getUpstreamManagerContractForSection } from '@/lib/project-upstream-contract.server'
import type { SsmartaObjective } from '@/sanity/lib/section-contracts/get-section-contract'
import { getSupervisorContract } from '@/sanity/lib/supervisor-contracts/get-supervisor-contract'
import { client } from '@/sanity/lib/client'

/**
 * GET /api/sections/[id]/manager-cascade-options
 * Optional ?supervisorContractId= for already-imported flags.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: sectionId } = await params
    const denied = await assertSupervisorContractManageAllowed(sectionId)
    if (denied) return denied

    const currentFY = getCurrentFinancialYear()
    const upstream = await getUpstreamManagerContractForSection(
      sectionId,
      currentFY.label,
    )
    if (!upstream) {
      return NextResponse.json(
        {
          error:
            'No project manager contract for this workstream and financial year',
        },
        { status: 404 },
      )
    }

    const supervisorContractId = req.nextUrl.searchParams.get(
      'supervisorContractId',
    )
    let supervisorObjectives: SsmartaObjective[] | undefined

    if (supervisorContractId) {
      const sup = await client.fetch<{ objectives?: SsmartaObjective[] } | null>(
        `*[_type == "supervisorContract" && _id == $id && section._ref == $sectionId][0]{ objectives }`,
        { id: supervisorContractId, sectionId },
      )
      supervisorObjectives = sup?.objectives
    } else {
      const supervisorId = req.nextUrl.searchParams.get('supervisorId')
      if (supervisorId) {
        const sup = await getSupervisorContract(
          sectionId,
          supervisorId,
          currentFY.label,
        )
        supervisorObjectives = sup?.objectives
      }
    }

    const options = buildManagerCascadeOptions(
      upstream._id,
      upstream.financialYearLabel ?? currentFY.label,
      upstream.cascadeRevision,
      upstream.objectives,
      supervisorObjectives,
    )

    return NextResponse.json(options)
  } catch (error) {
    console.error('Error fetching manager cascade options', error)
    return NextResponse.json(
      { error: 'Failed to fetch cascade options' },
      { status: 500 },
    )
  }
}
