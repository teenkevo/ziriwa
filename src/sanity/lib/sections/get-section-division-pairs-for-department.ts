import { defineQuery } from 'next-sanity'
import { sanityFetch } from '../client'
import { getSectionDivisionPairsForDepartmentOracle } from '@/oracle/lib/sections/get-section-division-pairs-for-department'

/** Sections in a department (via division), with division id for aggregation. */
export async function getSectionDivisionPairsForDepartment(
  departmentId: string,
): Promise<{ _id: string; divisionId: string; name: string }[]> {
  if (process.env.CMS_PROVIDER === 'oracle') {
    return getSectionDivisionPairsForDepartmentOracle(departmentId)
  }
  const query = defineQuery(`
    *[_type == "section" && division->department._ref == $departmentId]{
      _id,
      name,
      "divisionId": division._ref
    }
  `)

  try {
    const rows = await sanityFetch({
      query,
      params: { departmentId },
      revalidate: 0,
    })
    return rows || []
  } catch (e) {
    console.error('getSectionDivisionPairsForDepartment', e)
    return []
  }
}
