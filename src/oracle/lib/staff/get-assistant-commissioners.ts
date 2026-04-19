import 'server-only'

import { oracleQuery } from '@/lib/oracle/client'
import type { StaffMember } from '@/sanity/lib/staff/get-assistant-commissioners'

function mapRows(
  rows: Array<{ _id: string; fullName: string; staffId: string | null }>,
): StaffMember[] {
  return rows.map(r => ({
    _id: r._id,
    fullName: r.fullName,
    staffId: r.staffId ?? undefined,
  }))
}

export async function getAssistantCommissionersOracle(): Promise<
  StaffMember[]
> {
  const rows = await oracleQuery<{
    _id: string
    fullName: string
    staffId: string | null
  }>(
    `
      SELECT
        id AS "_id",
        coalesce(full_name, first_name || ' ' || last_name) AS "fullName",
        id_number AS "staffId"
      FROM staff
      WHERE role = 'assistant_commissioner'
        AND status = 'active'
      ORDER BY lower(coalesce(full_name, first_name || ' ' || last_name)) ASC
    `,
  )
  return mapRows(rows)
}

export async function getAssistantCommissionersByDivisionOracle(
  divisionId: string,
): Promise<StaffMember[]> {
  if (!divisionId) return []
  const rows = await oracleQuery<{
    _id: string
    fullName: string
    staffId: string | null
  }>(
    `
      SELECT
        id AS "_id",
        coalesce(full_name, first_name || ' ' || last_name) AS "fullName",
        id_number AS "staffId"
      FROM staff
      WHERE role = 'assistant_commissioner'
        AND status = 'active'
        AND division_id = :divisionId
      ORDER BY lower(coalesce(full_name, first_name || ' ' || last_name)) ASC
    `,
    { divisionId },
  )
  return mapRows(rows)
}

export async function getAssistantCommissionersInDepartmentOracle(
  departmentId: string,
): Promise<StaffMember[]> {
  if (!departmentId) return []
  const rows = await oracleQuery<{
    _id: string
    fullName: string
    staffId: string | null
  }>(
    `
      SELECT
        id AS "_id",
        coalesce(full_name, first_name || ' ' || last_name) AS "fullName",
        id_number AS "staffId"
      FROM staff
      WHERE role = 'assistant_commissioner'
        AND status = 'active'
        AND department_id = :departmentId
      ORDER BY lower(coalesce(full_name, first_name || ' ' || last_name)) ASC
    `,
    { departmentId },
  )
  return mapRows(rows)
}

export async function getAssistantCommissionersAvailableForDepartmentOracle(
  departmentId: string,
): Promise<StaffMember[]> {
  if (!departmentId) return []
  const rows = await oracleQuery<{
    _id: string
    fullName: string
    staffId: string | null
  }>(
    `
      SELECT
        id AS "_id",
        coalesce(full_name, first_name || ' ' || last_name) AS "fullName",
        id_number AS "staffId"
      FROM staff
      WHERE role = 'assistant_commissioner'
        AND status = 'active'
        AND department_id = :departmentId
        AND division_id IS NULL
      ORDER BY lower(coalesce(full_name, first_name || ' ' || last_name)) ASC
    `,
    { departmentId },
  )
  return mapRows(rows)
}
