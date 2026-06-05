import { getCurrentFinancialYear } from '@/lib/financial-year'
import { getStakeholderEngagementByProject } from './get-stakeholder-engagement'

export type { StakeholderEngagement, StakeholderEntry } from './get-stakeholder-engagement'

/** Project stakeholder engagement for the current financial year. */
export async function getStakeholderEngagementForProject(
  projectId: string,
): Promise<Awaited<ReturnType<typeof getStakeholderEngagementByProject>> | null> {
  const currentFY = getCurrentFinancialYear()
  return getStakeholderEngagementByProject(projectId, currentFY.label)
}
