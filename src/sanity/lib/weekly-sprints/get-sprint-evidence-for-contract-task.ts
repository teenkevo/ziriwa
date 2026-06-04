import 'server-only'

import {
  collectSprintEvidenceForContractTask,
  type CollectSprintEvidenceParams,
  type ContractTaskSprintCycleEvidence,
} from '@/lib/contract-task-sprint-evidence'
import { getSprintsBySection } from './get-sprints-by-section'

export async function getSprintEvidenceForContractTask(
  sectionId: string,
  params: CollectSprintEvidenceParams,
): Promise<ContractTaskSprintCycleEvidence[]> {
  const sprints = await getSprintsBySection(sectionId)
  return collectSprintEvidenceForContractTask(sprints, params)
}
