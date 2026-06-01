export type ContractsApiResource =
  | 'section-contracts'
  | 'department-contracts'
  | 'division-contracts'
  | 'supervisor-contracts'
  | 'officer-contracts'

export function contractsApiBase(
  resource: ContractsApiResource = 'section-contracts',
) {
  return `/api/${resource}`
}
