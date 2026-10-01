import 'server-only'

import { getCurrentFinancialYear } from '@/lib/financial-year'
import { getActiveFinancialYear } from '@/lib/financial-year.server'
import type { SectionAccess } from '@/lib/section-access'

/** Workspace year matches the calendar year that contains today. */
export async function isWorkspaceFinancialYearWritable(): Promise<boolean> {
  const active = await getActiveFinancialYear()
  return active.label === getCurrentFinancialYear().label
}

/** Drop write capabilities while a past financial year is selected. */
export function lockSectionAccessForPastYear(
  access: SectionAccess,
): SectionAccess {
  return {
    ...access,
    isReadOnly: true,
    canManageContract: false,
    canOnboardContract: false,
    canManageSupervisorContract: false,
    canManageOfficerContract: false,
    canSuperviseDetailedTasks: false,
    canCreateSprints: false,
    canManageSectionStaff: false,
    canManageWorkstreamStaff: false,
    canSelfServiceDelegate: false,
  }
}
