import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'

/**
 * GET /api/section-contracts/[id]/codes
 * Returns existing objective and initiative codes for duplicate validation.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
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
