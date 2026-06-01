import { NextRequest, NextResponse } from 'next/server'

import {
  assertOfficerContractManageAllowed,
  getOfficerStaffIdFromContract,
  getSectionIdFromOfficerContract,
} from '@/lib/officer-contract-access.server'
import { writeClient } from '@/sanity/lib/write-client'

/**
 * GET /api/officer-contracts/[id]/codes
 * Returns existing objective and initiative codes for duplicate validation.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const [sectionId, officerStaffId] = await Promise.all([
      getSectionIdFromOfficerContract(id),
      getOfficerStaffIdFromContract(id),
    ])
    if (!sectionId) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }
    const denied = await assertOfficerContractManageAllowed(
      sectionId,
      officerStaffId ?? undefined,
    )
    if (denied) return denied

    const doc = await writeClient.fetch<{
      objectives?: { code?: string; initiatives?: { code?: string }[] }[]
    }>(
      `*[_id == $id][0]{ objectives[] { code, initiatives[] { code } } }`,
      { id },
    )
    const objectives = doc?.objectives ?? []
    const objectiveCodes = objectives.map(o => o.code?.trim()).filter(Boolean) as string[]
    const initiativesByObjective: Record<number, string[]> = {}
    objectives.forEach((obj, idx) => {
      const codes = (obj.initiatives ?? []).map(i => i.code?.trim()).filter(Boolean) as string[]
      initiativesByObjective[idx] = codes
    })
    return NextResponse.json({
      objectiveCodes,
      initiativesByObjective,
    })
  } catch (error) {
    console.error('Error fetching codes', error)
    return NextResponse.json(
      { error: 'Failed to fetch codes' },
      { status: 500 },
    )
  }
}
