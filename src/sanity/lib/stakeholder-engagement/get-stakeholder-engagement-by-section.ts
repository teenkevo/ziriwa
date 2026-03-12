import { getCurrentFinancialYear } from '@/lib/financial-year'
import { getStakeholderEngagement } from './get-stakeholder-engagement'

export type { StakeholderEngagement, StakeholderEntry } from './get-stakeholder-engagement'

/**
 * Get the stakeholder engagement for a section in the current financial year.
 */
export async function getStakeholderEngagementBySection(
  sectionId: string,
): Promise<Awaited<ReturnType<typeof getStakeholderEngagement>> | null> {
  const currentFY = getCurrentFinancialYear()
  return getStakeholderEngagement(sectionId, currentFY.label)
}
