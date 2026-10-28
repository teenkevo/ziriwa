/** Contracts use one workflow. Stored ITIL values are ignored. */

export const CONTRACT_ALIGNMENTS = {
  pms: 'pms',
} as const

export type ContractAlignment =
  (typeof CONTRACT_ALIGNMENTS)[keyof typeof CONTRACT_ALIGNMENTS]

export function parseContractAlignment(
  _value?: unknown,
): ContractAlignment {
  return 'pms'
}
