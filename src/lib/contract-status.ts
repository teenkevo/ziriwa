/** Statuses that mean the contract has been released down the hierarchy. */
export const RELEASED_CONTRACT_STATUSES = new Set([
  'finalized',
  'active',
  'completed',
])

export function isReleasedContractStatus(
  status?: string | null,
): boolean {
  return Boolean(status && RELEASED_CONTRACT_STATUSES.has(status))
}
