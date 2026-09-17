import { getActiveFinancialYear } from '@/lib/financial-year.server'
import { getSectionContract } from './get-section-contract'

export type { SectionContract } from './get-section-contract'

/**
 * Get the section contract for a section in the active (or given) financial year.
 */
export async function getSectionContractBySection(
  sectionId: string,
  financialYearLabel?: string,
): Promise<Awaited<ReturnType<typeof getSectionContract>> | null> {
  const label =
    financialYearLabel ?? (await getActiveFinancialYear()).label
  return getSectionContract(sectionId, label)
}
