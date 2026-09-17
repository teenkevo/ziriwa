import { getActiveFinancialYear } from '@/lib/financial-year.server'
import { getStakeholderEngagement } from './get-stakeholder-engagement'

export type { StakeholderEngagement, StakeholderEntry } from './get-stakeholder-engagement'

/**
 * Get the stakeholder engagement for a section in the active (or given) financial year.
 */
export async function getStakeholderEngagementBySection(
  sectionId: string,
  financialYearLabel?: string,
): Promise<Awaited<ReturnType<typeof getStakeholderEngagement>> | null> {
  const label =
    financialYearLabel ?? (await getActiveFinancialYear()).label
  return getStakeholderEngagement(sectionId, label)
}
