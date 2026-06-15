import 'server-only'

import { canManageDepartmentContract } from '@/lib/department-contract-access.server'
import { client } from '@/sanity/lib/client'

import type { CommissionerBoardActionRow, CommissionerDivisionOption } from '@/features/board-actions/load-commissioner-board-actions'

export async function loadCommissionerAuditQueriesData(options?: {
  workContext?: import('@/lib/section-access').WorkContextMode
}) {
  const { loadCommissionerBoardActionsData } = await import(
    '@/features/board-actions/load-commissioner-board-actions'
  )
  const data = await loadCommissionerBoardActionsData(options)
  if (!data) return null

  const departmentId = data.commissionerWorkspace.department._id

  const actions = await client.fetch<CommissionerBoardActionRow[]>(
    /* groq */ `
      *[_type == "auditQuery" && department._ref == $departmentId] | order(dueDate asc, _createdAt desc) {
        _id,
        title,
        dueDate,
        status,
        "divisionId": division._ref,
        "divisionName": coalesce(division->fullName, division->acronym, division->name),
        "sectionId": section._ref,
        "sectionName": section->name
      }
    `,
    { departmentId },
  )

  return {
    ...data,
    actions: actions ?? [],
  }
}

export async function loadAuditQueryDetail(actionId: string) {
  const action = await client.fetch<{
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
    response?: string
    rejectionFeedback?: string
  } | null>(
    /* groq */ `
      *[_type == "auditQuery" && _id == $actionId][0]{
        _id,
        title,
        description,
        dueDate,
        status,
        response,
        rejectionFeedback,
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
    apiPath: '/api/audit-queries',
    workspace: {
      roleLabel: 'Commissioner',
      dashboardHref: '/commissioner/dashboard',
      listHref: '/commissioner/audit-queries',
      mode: 'commissioner' as const,
    },
  }
}
