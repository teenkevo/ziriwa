import 'server-only'

import { canManageDepartmentContract } from '@/lib/department-contract-access.server'
import { client } from '@/sanity/lib/client'

import type { CommissionerDivisionOption } from './load-commissioner-board-actions'

export type BoardActionDetail = {
  _id: string
  title: string
  description?: string
  dueDate?: string
  status?: string
  departmentId: string
  departmentName: string
  divisionId?: string
  divisionName?: string
  divisionSlug?: string
  sectionId?: string
  sectionName?: string
  sectionSlug?: string
  createdByName?: string
  delegatedByName?: string
  createdAt?: string
  updatedAt?: string
}

export type BoardActionWorkspace = {
  roleLabel: string
  dashboardHref: string
  listHref: string
  mode: 'commissioner' | 'assistant-commissioner'
}

export type BoardActionDetailPageData = {
  action: BoardActionDetail
  divisions: CommissionerDivisionOption[]
  sectionOptions?: { _id: string; name: string; divisionId: string }[]
  canManage: boolean
  canDelegate?: boolean
  canApprove?: boolean
  canReject?: boolean
  apiPath?: string
  workspace?: BoardActionWorkspace
}

export async function loadBoardActionDetail(
  actionId: string,
): Promise<BoardActionDetailPageData | null> {
  const action = await client.fetch<BoardActionDetail | null>(
    /* groq */ `
      *[_type == "boardAction" && _id == $actionId][0]{
        _id,
        title,
        description,
        dueDate,
        status,
        createdAt,
        updatedAt,
        "departmentId": department._ref,
        "departmentName": coalesce(department->fullName, department->acronym, department->name),
        "divisionId": division._ref,
        "divisionName": coalesce(division->fullName, division->acronym, division->name),
        "divisionSlug": division->slug.current,
        "sectionId": section._ref,
        "sectionName": section->name,
        "sectionSlug": section->slug.current,
        "createdByName": createdBy->fullName,
        "delegatedByName": delegatedBy->fullName
      }
    `,
    { actionId },
  )

  if (!action?.departmentId) return null

  const canManage = await canManageDepartmentContract(action.departmentId)
  if (!canManage) return null

  const divisions = await client.fetch<CommissionerDivisionOption[]>(
    /* groq */ `
      *[_type == "division" && department._ref == $departmentId] | order(coalesce(fullName, name) asc){
        _id,
        "name": coalesce(fullName, acronym, name)
      }
    `,
    { departmentId: action.departmentId },
  )

  return {
    action,
    divisions: divisions ?? [],
    canManage,
    workspace: {
      roleLabel: 'Commissioner',
      dashboardHref: '/commissioner/dashboard',
      listHref: '/commissioner/board-actions',
      mode: 'commissioner',
    },
  }
}
