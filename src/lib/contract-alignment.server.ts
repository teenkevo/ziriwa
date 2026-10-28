import 'server-only'

import type { ContractAlignment } from '@/lib/contract-alignment'

/** New financial-year contracts are PMS. The section no longer chooses a workflow. */
export async function getSectionContractAlignment(
  _sectionId: string,
): Promise<ContractAlignment> {
  return 'pms'
}
