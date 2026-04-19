import 'server-only'

import { oracleQuery } from '@/lib/oracle/client'

export async function getSectionDivisionPairsForDepartmentOracle(
  departmentId: string,
): Promise<{ _id: string; divisionId: string; name: string }[]> {
  return oracleQuery<{ _id: string; divisionId: string; name: string }>(
    `
      SELECT
        s.id AS "_id",
        s.name AS "name",
        s.division_id AS "divisionId"
      FROM sections s
      JOIN divisions d ON d.id = s.division_id
      WHERE d.department_id = :departmentId
      ORDER BY lower(s.name) ASC
    `,
    { departmentId },
  )
}

