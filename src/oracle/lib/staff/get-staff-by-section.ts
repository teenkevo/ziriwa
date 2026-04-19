import { oracleQuery } from '@/lib/oracle/client'
import type { SectionStaff } from '@/sanity/lib/staff/get-staff-by-section'

function fullNameExpr() {
  return `coalesce(full_name, first_name || ' ' || last_name)`
}

async function getStaffByRoleGlobal(
  role: 'supervisor' | 'officer',
): Promise<SectionStaff[]> {
  const rows = await oracleQuery<SectionStaff>(
    `
      SELECT
        st.id AS "_id",
        ${fullNameExpr()} AS "fullName",
        st.role AS "role",
        st.id_number AS "staffId"
      FROM staff st
      WHERE st.role = :role
        AND st.status = 'active'
      ORDER BY ${fullNameExpr()} ASC
    `,
    { role },
  )
  return rows ?? []
}

export async function getSupervisorsOracle(): Promise<SectionStaff[]> {
  return getStaffByRoleGlobal('supervisor')
}

export async function getOfficersOracle(): Promise<SectionStaff[]> {
  return getStaffByRoleGlobal('officer')
}

async function getStaffByRoleAndSection(
  sectionId: string,
  role: 'supervisor' | 'officer',
): Promise<SectionStaff[]> {
  const rows = await oracleQuery<any>(
    `
      SELECT
        st.id AS "_id",
        ${fullNameExpr()} AS "fullName",
        st.role AS "role",
        st.id_number AS "staffId"
      FROM staff st
      WHERE st.role = :role
        AND st.status = 'active'
        AND st.section_id = :sectionId
      ORDER BY ${fullNameExpr()} ASC
    `,
    { role, sectionId },
  )

  return (rows as SectionStaff[]) ?? []
}

export async function getSupervisorsBySection(
  sectionId: string,
): Promise<SectionStaff[]> {
  return getStaffByRoleAndSection(sectionId, 'supervisor')
}

export async function getOfficersBySection(
  sectionId: string,
): Promise<SectionStaff[]> {
  return getStaffByRoleAndSection(sectionId, 'officer')
}

