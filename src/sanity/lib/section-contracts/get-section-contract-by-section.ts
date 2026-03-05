import { getCurrentFinancialYear } from '@/lib/financial-year'
import { getSectionContract } from './get-section-contract'

export type { SectionContract } from './get-section-contract'

/**
 * Get the section contract for a section in the current financial year.
 * Current FY is computed from today's date (e.g. FY-2025/2026).
 */
export async function getSectionContractBySection(
  sectionId: string,
): Promise<Awaited<ReturnType<typeof getSectionContract>> | null> {
  const currentFY = getCurrentFinancialYear()
  return getSectionContract(sectionId, currentFY.label)
}
