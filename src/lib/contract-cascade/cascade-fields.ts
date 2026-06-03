import type { CascadeNodeRole, CascadeSource } from './types'

export const CASCADE_KIND_CASCADED = 'cascaded' as const
export const CASCADE_KIND_OWNED = 'owned' as const

export function buildCascadeSource(
  partial: Omit<CascadeSource, 'nodeRole'> & { nodeRole: CascadeNodeRole },
  revision?: number,
): CascadeSource {
  return {
    ...partial,
    importedFromRevision: revision,
  }
}

export function cascadeSourceMatchesActivity(
  source: CascadeSource | undefined,
  sectionContractId: string,
  activityKey: string,
  nodeRole: CascadeNodeRole,
): boolean {
  if (!source) return false
  return (
    source.sectionContractId === sectionContractId &&
    source.activityKey === activityKey &&
    source.nodeRole === nodeRole
  )
}

export function cascadeSourceMatchesInitiative(
  source: CascadeSource | undefined,
  sectionContractId: string,
  initiativeKey: string,
): boolean {
  if (!source) return false
  return (
    source.sectionContractId === sectionContractId &&
    source.initiativeKey === initiativeKey &&
    source.nodeRole === 'managerInitiativeAsObjective'
  )
}
