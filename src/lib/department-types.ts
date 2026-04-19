/** Department / sidebar shapes used across the app (Oracle-backed reads). */

export type DepartmentListRow = {
  _id: string
  name: string
  slug?: { current: string }
  fullName?: string
  acronym?: string
  isDefault?: boolean
  commissioner?: { _id: string; fullName?: string }
  staffCount?: number
  initiativeProgressPercent: number
  initiativeProgressCompleted: number
  initiativeProgressTotal: number
  divisionNames?: string[]
}

export type Department = {
  _id: string
  name: string
  slug?: { current: string }
  fullName?: string
  acronym?: string
  isDefault?: boolean
  commissioner?: { _id: string }
}

export type SidebarDivision = {
  _id: string
  name: string
  slug?: { current: string }
  fullName?: string
}

export type SidebarDepartmentWithDivisions = {
  _id: string
  name: string
  slug?: { current: string }
  fullName?: string
  acronym?: string
  isDefault?: boolean
  divisions: SidebarDivision[]
}
