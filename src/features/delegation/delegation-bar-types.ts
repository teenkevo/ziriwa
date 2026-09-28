export interface DelegationBarRecord {
  _id: string
  actingRole: string
  fromStaffName: string
  toStaffName: string
  endDate: string
  /** When `contract_support`, work-context switcher is hidden. */
  purpose?: string
}
