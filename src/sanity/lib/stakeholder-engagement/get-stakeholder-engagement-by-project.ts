import { getActiveFinancialYear } from '@/lib/financial-year.server'
import { getStakeholderEngagementByProject } from './get-stakeholder-engagement'

export type { StakeholderEngagement, StakeholderEntry } from './get-stakeholder-engagement'

/** Project stakeholder engagement for the active (or given) financial year. */
export async function getStakeholderEngagementForProject(
  projectId: string,
  financialYearLabel?: string,
): Promise<Awaited<ReturnType<typeof getStakeholderEngagementByProject>> | null> {
  const label =
    financialYearLabel ?? (await getActiveFinancialYear()).label
  return getStakeholderEngagementByProject(projectId, label)
}
