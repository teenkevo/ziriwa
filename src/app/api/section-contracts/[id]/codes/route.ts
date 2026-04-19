import { NextRequest, NextResponse } from 'next/server'
import { writeClient } from '@/sanity/lib/write-client'
import { oracleQuery } from '@/lib/oracle/client'

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
    if (process.env.CMS_PROVIDER === 'oracle') {
      const objectives = await oracleQuery<{ code: string | null; row_id: string }>(
        `
          SELECT id AS "row_id", code AS "code"
          FROM contract_objectives
          WHERE contract_id = :id
          ORDER BY objective_order ASC, code NULLS LAST, id
        `,
        { id },
      )
      const objectiveCodes = objectives
        .map(o => o.code?.trim())
        .filter(Boolean) as string[]

      const initiatives = await oracleQuery<{
        objective_id: string
        code: string | null
      }>(
        `
          SELECT objective_id AS "objective_id", code AS "code"
          FROM contract_initiatives
          WHERE objective_id IN (SELECT id FROM contract_objectives WHERE contract_id = :id)
          ORDER BY objective_id, initiative_order ASC, code NULLS LAST, id
        `,
        { id },
      )
      const byObjective: Record<string, string[]> = {}
      for (const row of initiatives) {
        const code = row.code?.trim()
        if (!code) continue
        if (!byObjective[row.objective_id]) byObjective[row.objective_id] = []
        byObjective[row.objective_id].push(code)
      }
      const initiativesByObjective: Record<number, string[]> = {}
      objectives.forEach((obj, idx) => {
        initiativesByObjective[idx] = byObjective[obj.row_id] ?? []
      })

      return NextResponse.json({ objectiveCodes, initiativesByObjective })
    }

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
