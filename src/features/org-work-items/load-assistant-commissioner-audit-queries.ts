import 'server-only'

import { canManageAssistantCommissionerDivision } from '@/lib/assistant-commissioner.server'
import { orgWorkItemCanApprove } from '@/lib/org-work-item/workflow'
import { client } from '@/sanity/lib/client'

import type { AssistantSectionOption } from '@/features/board-actions/load-assistant-commissioner-board-actions'

export async function loadAssistantCommissionerAuditQueries() {
  const { loadAssistantCommissionerBoardActionsData } = await import(
    '@/features/board-actions/load-assistant-commissioner-board-actions'
  )
  const base = await loadAssistantCommissionerBoardActionsData()
  if (!base) return null

  const actions = await client.fetch<
    typeof base.actions
  >(
    /* groq */ `
      *[_type == "auditQuery" && division._ref == $divisionId] | order(dueDate asc, _createdAt desc) {
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
    { divisionId: base.acWorkspace.division._id },
  )

  return { ...base, actions: actions ?? [] }
}

export async function loadAssistantCommissionerAuditQueryDetail(actionId: string) {
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
        "sectionId": section._ref,
        "sectionName": section->name,
        "sectionSlug": section->slug.current,
        "createdByName": createdBy->fullName,
        "delegatedByName": delegatedBy->fullName
      }
    `,
    { actionId },
  )

  if (!action?.divisionId) return null
  const canAccess = await canManageAssistantCommissionerDivision(action.divisionId)
  if (!canAccess) return null

  const sectionOptions = await client.fetch<AssistantSectionOption[]>(
    /* groq */ `
      *[_type == "section" && division._ref == $divisionId] | order(name asc) {
        _id,
        name,
        "divisionId": division._ref
      }
    `,
    { divisionId: action.divisionId },
  )

  const status = action.status
  return {
    action,
    divisions: [],
    sectionOptions: sectionOptions ?? [],
    canManage: false,
    canDelegate: !action.sectionId,
    canApprove: orgWorkItemCanApprove(status, 'assistant_commissioner'),
    canReject: orgWorkItemCanApprove(status, 'assistant_commissioner'),
    apiPath: '/api/audit-queries',
    workspace: {
      roleLabel: 'Assistant Commissioner',
      dashboardHref: '/assistant-commissioner/dashboard',
      listHref: '/assistant-commissioner/audit-queries',
      mode: 'assistant-commissioner' as const,
    },
  }
}
