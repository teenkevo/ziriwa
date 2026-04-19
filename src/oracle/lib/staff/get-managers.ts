import { oracleQuery } from '@/lib/oracle/client'
import type { StaffMember } from '@/sanity/lib/staff/get-managers'

function fullNameExpr() {
  return `coalesce(full_name, first_name || ' ' || last_name)`
}

export async function getManagersOracle(): Promise<StaffMember[]> {
  const rows = await oracleQuery<any>(
    `
      SELECT
        st.id AS "_id",
        ${fullNameExpr()} AS "fullName",
        st.id_number AS "staffId"
      FROM staff st
      WHERE st.role = 'manager'
        AND st.status = 'active'
      ORDER BY ${fullNameExpr()} ASC
    `,
  )
  return (rows as StaffMember[]) ?? []
}

export async function getManagersByDivisionOracle(
  divisionId: string,
): Promise<StaffMember[]> {
  if (!divisionId) return []
  const rows = await oracleQuery<any>(
    `
      SELECT DISTINCT
        st.id AS "_id",
        ${fullNameExpr()} AS "fullName",
        st.id_number AS "staffId"
      FROM staff st
      LEFT JOIN sections s ON s.id = st.section_id
      WHERE st.role = 'manager'
        AND st.status = 'active'
        AND (st.division_id = :divisionId OR s.division_id = :divisionId)
      ORDER BY ${fullNameExpr()} ASC
    `,
    { divisionId },
  )
  return (rows as StaffMember[]) ?? []
}

