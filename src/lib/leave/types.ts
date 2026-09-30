import type { LeaveKind, LeaveStatus } from '@/lib/leave/dates'

export interface LeaveReliefOption {
  id: string
  name: string
  role: string
}

export interface LeavePlan {
  id: string
  staffId: string
  staffName: string
  reliefStaffId: string | null
  reliefStaffName: string | null
  unitId: string | null
  unitName: string | null
  startDate: string
  endDate: string
  status: LeaveStatus
  kind: LeaveKind
  note: string
}
