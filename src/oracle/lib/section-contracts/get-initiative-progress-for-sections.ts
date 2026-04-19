import 'server-only'

import { oracleQuery } from '@/lib/oracle/client'

export async function getInitiativeProgressForSectionsOracle(
  sectionIds: string[],
  financialYearLabel: string,
): Promise<Map<string, { completed: number; total: number; percent: number }>> {
  const out = new Map<string, { completed: number; total: number; percent: number }>()
  if (!sectionIds.length) return out

  const binds: Record<string, unknown> = { financialYearLabel }
  const sectionPlaceholders = sectionIds.map((id, i) => {
    const key = `s${i}`
    binds[key] = id
    return `:${key}`
  })

  const rows = await oracleQuery<{
    sectionId: string
    completedCount: number
    totalCount: number
  }>(
    `
      SELECT
        sc.section_id AS "sectionId",
        SUM(CASE WHEN ma.status = 'completed' THEN 1 ELSE 0 END) AS "completedCount",
        COUNT(ma.id) AS "totalCount"
      FROM section_contracts sc
      JOIN contract_objectives co ON co.contract_id = sc.id
      JOIN contract_initiatives ci ON ci.objective_id = co.id
      JOIN measurable_activities ma ON ma.initiative_id = ci.id
      WHERE sc.financial_year_label = :financialYearLabel
        AND sc.section_id IN (${sectionPlaceholders.join(', ')})
      GROUP BY sc.section_id
    `,
    binds,
  )

  for (const id of sectionIds) {
    out.set(id, { completed: 0, total: 0, percent: 0 })
  }
  for (const row of rows) {
    const completed = Number(row.completedCount ?? 0)
    const total = Number(row.totalCount ?? 0)
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0
    out.set(row.sectionId, { completed, total, percent })
  }
  return out
}

