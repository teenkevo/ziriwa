import 'server-only'

import { canManageAssistantCommissionerDivision } from '@/lib/assistant-commissioner.server'
import { orgWorkItemCanApprove } from '@/lib/org-work-item/workflow'
import { client } from '@/sanity/lib/client'

import type { BoardActionDetailPageData } from './load-board-action-detail'
import type { AssistantSectionOption } from './load-assistant-commissioner-board-actions'

export async function loadAssistantCommissionerBoardActionDetail(
  actionId: string,
): Promise<BoardActionDetailPageData | null> {
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
  } | null>(
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

  if (!action?.divisionId) return null

  const canAccess = await canManageAssistantCommissionerDivision(
    action.divisionId,
  )
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

  return {
    action,
    divisions: [],
    sectionOptions: sectionOptions ?? [],
    canManage: false,
    canDelegate: !action.sectionId,
    canApprove: orgWorkItemCanApprove(action.status, 'assistant_commissioner'),
    canReject: orgWorkItemCanApprove(action.status, 'assistant_commissioner'),
    workspace: {
      roleLabel: 'Assistant Commissioner',
      dashboardHref: '/assistant-commissioner/dashboard',
      listHref: '/assistant-commissioner/board-actions',
      mode: 'assistant-commissioner',
    },
  }
}
