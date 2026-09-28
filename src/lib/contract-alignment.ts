/** Contract workflow alignment for a section / FY contract snapshot. */

export const CONTRACT_ALIGNMENTS = {
  itil4: 'itil4',
  pms: 'pms',
} as const

export type ContractAlignment =
  (typeof CONTRACT_ALIGNMENTS)[keyof typeof CONTRACT_ALIGNMENTS]

export const CONTRACT_ALIGNMENT_LABELS: Record<ContractAlignment, string> = {
  itil4: 'ITIL 4-Aligned',
  pms: 'PMS-Aligned',
}

export function parseContractAlignment(
  value: unknown,
): ContractAlignment {
  if (value === 'pms' || value === 'itil4') return value
  return 'itil4'
}

export function isPmsAlignment(value: unknown): boolean {
  return parseContractAlignment(value) === 'pms'
}

export function isItil4Alignment(value: unknown): boolean {
  return parseContractAlignment(value) === 'itil4'
}
