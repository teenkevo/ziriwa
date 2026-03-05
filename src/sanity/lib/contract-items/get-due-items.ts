import type { SectionContract } from '../section-contracts/get-section-contract'

export type DueItem = {
  _key: string
  title: string
  targetDate: string
  status?: string
  objectiveTitle?: string
  initiativeTitle?: string
}

/**
 * Flatten activities with targetDate from embedded objectives.
 */
export function getDueItemsFromContract(
  contract: SectionContract | null,
  filter: (date: string) => boolean,
): DueItem[] {
  if (!contract?.objectives) return []

  const items: DueItem[] = []
  for (const obj of contract.objectives) {
    for (const init of obj.initiatives ?? []) {
      for (const act of init.measurableActivities ?? []) {
        if (act.targetDate && filter(act.targetDate)) {
          items.push({
            _key: act._key,
            title: act.title,
            targetDate: act.targetDate,
            status: act.status,
            objectiveTitle: obj.title,
            initiativeTitle: init.title,
          })
        }
      }
    }
  }
  items.sort((a, b) => a.targetDate.localeCompare(b.targetDate))
  return items
}
