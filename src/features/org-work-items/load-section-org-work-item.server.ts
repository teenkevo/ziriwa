import 'server-only'

import { getViewerStaffId } from '@/lib/get-viewer-staff.server'
import {
  orgWorkItemCanApprove,
  orgWorkItemCanCascadeAtStatus,
  orgWorkItemCanSubmitResponse,
} from '@/lib/org-work-item/workflow'
import type { OrgWorkItemDocumentType } from '@/lib/org-work-item/types'
import { getManagedSectionsForViewer } from '@/features/sections/load-section-workspace-data'
import { client } from '@/sanity/lib/client'
import type { BoardActionDetailPageData } from '@/features/board-actions/load-board-action-detail'

export type SectionOrgWorkItemRow = {
  _id: string
  title: string
  dueDate?: string
  status?: string
  sectionName?: string
  supervisorName?: string
  assigneeName?: string
}

const DETAIL_PROJECTION = /* groq */ `{
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
  "supervisorId": supervisor._ref,
  "supervisorName": coalesce(supervisor->fullName, supervisor->firstName + " " + supervisor->lastName),
  "assigneeId": assignee._ref,
  "assigneeName": coalesce(assignee->fullName, assignee->firstName + " " + assignee->lastName),
  "createdByName": createdBy->fullName,
  "delegatedByName": delegatedBy->fullName,
  "cascadedByManagerName": cascadedByManager->fullName,
  "cascadedBySupervisorName": cascadedBySupervisor->fullName
}`

function workspaceForRole(
  role: 'manager' | 'supervisor' | 'officer',
  kind: 'board-actions' | 'audit-queries',
) {
  const base = `/${role}`
  const label =
    kind === 'board-actions' ? 'Board Actions' : 'Audit Queries'
  return {
    roleLabel: role.charAt(0).toUpperCase() + role.slice(1),
    dashboardHref: `${base}/dashboard`,
    listHref: `${base}/${kind}`,
    listLabel: label,
    mode: role,
    apiPath: kind === 'board-actions' ? '/api/board-actions' : '/api/audit-queries',
    docType:
      kind === 'board-actions'
        ? ('boardAction' as OrgWorkItemDocumentType)
        : ('auditQuery' as OrgWorkItemDocumentType),
  }
}

export async function loadSectionOrgWorkItemsList(input: {
  role: 'manager' | 'supervisor' | 'officer'
  kind: 'board-actions' | 'audit-queries'
}): Promise<{
  items: SectionOrgWorkItemRow[]
  workspace: ReturnType<typeof workspaceForRole>
} | null> {
  const sections = await getManagedSectionsForViewer()
  const section = sections[0]
  if (!section?._id) return null

  const viewerStaffId = await getViewerStaffId()
  const ws = workspaceForRole(input.role, input.kind)
  const docType = ws.docType

  let filter = ''
  const params: Record<string, string> = { docType }

  if (input.role === 'manager') {
    filter = 'section._ref == $sectionId'
    params.sectionId = section._id
  } else if (input.role === 'supervisor') {
    filter = `(supervisor._ref == $staffId || (section._ref == $sectionId && status in ["delegated_to_section", "assigned_to_supervisor", "pending_supervisor_approval"]))`
    params.staffId = viewerStaffId ?? ''
    params.sectionId = section._id
  } else {
    filter = 'assignee._ref == $staffId'
    params.staffId = viewerStaffId ?? ''
  }

  const items = await client.fetch<SectionOrgWorkItemRow[]>(
    /* groq */ `*[_type == $docType && ${filter}] | order(dueDate asc, _createdAt desc) {
      _id,
      title,
      dueDate,
      status,
      "sectionName": section->name,
      "supervisorName": coalesce(supervisor->fullName, supervisor->firstName + " " + supervisor->lastName),
      "assigneeName": coalesce(assignee->fullName, assignee->firstName + " " + assignee->lastName)
    }`,
    params,
  )

  return { items: items ?? [], workspace: ws }
}

export async function loadSectionOrgWorkItemDetail(input: {
  itemId: string
  role: 'manager' | 'supervisor' | 'officer'
  kind: 'board-actions' | 'audit-queries'
}): Promise<
  | (BoardActionDetailPageData & {
      apiPath: string
      viewerRole: string
      supervisorOptions: { _id: string; name: string }[]
      officerOptions: { _id: string; name: string }[]
      canCascadeToSupervisor: boolean
      canCascadeToOfficer: boolean
      canSubmitResponse: boolean
      canApprove: boolean
      canReject: boolean
    })
  | null
> {
  const sections = await getManagedSectionsForViewer()
  const section = sections[0]
  if (!section?._id) return null

  const viewerStaffId = await getViewerStaffId()
  const ws = workspaceForRole(input.role, input.kind)

  const action = await client.fetch<
    BoardActionDetailPageData['action'] & {
      response?: string
      rejectionFeedback?: string
      supervisorId?: string
      assigneeId?: string
      supervisorName?: string
      assigneeName?: string
      cascadedByManagerName?: string
      cascadedBySupervisorName?: string
    } | null
  >(
    /* groq */ `*[_type == $docType && _id == $itemId][0]${DETAIL_PROJECTION}`,
    { docType: ws.docType, itemId: input.itemId },
  )

  if (!action) return null

  if (input.role === 'manager') {
    if (action.sectionId !== section._id) return null
  } else if (input.role === 'officer') {
    if (action.assigneeId !== viewerStaffId) return null
  } else if (input.role === 'supervisor') {
    const ownsItem = action.supervisorId === viewerStaffId
    const sectionInbox =
      action.sectionId === section._id &&
      [
        'delegated_to_section',
        'assigned_to_supervisor',
        'pending_supervisor_approval',
      ].includes(action.status ?? '')
    if (!ownsItem && !sectionInbox) return null
  }

  const [supervisorOptions, officerOptions] = await Promise.all([
    client.fetch<{ _id: string; name: string }[]>(
      /* groq */ `*[_type == "staff" && role == "supervisor" && status == "active" && section._ref == $sectionId] | order(fullName asc) {
        _id,
        "name": coalesce(fullName, firstName + " " + lastName)
      }`,
      { sectionId: section._id },
    ),
    client.fetch<{ _id: string; name: string }[]>(
      /* groq */ `*[_type == "staff" && role == "officer" && status == "active" && section._ref == $sectionId] | order(fullName asc) {
        _id,
        "name": coalesce(fullName, firstName + " " + lastName)
      }`,
      { sectionId: section._id },
    ),
  ])

  const status = action.status
  return {
    action,
    divisions: [],
    sectionOptions: [],
    canManage: false,
    canDelegate: false,
    workspace: {
      roleLabel: ws.roleLabel,
      dashboardHref: ws.dashboardHref,
      listHref: ws.listHref,
      mode: 'commissioner',
    },
    apiPath: ws.apiPath,
    viewerRole: input.role,
    supervisorOptions: supervisorOptions ?? [],
    officerOptions: officerOptions ?? [],
    canCascadeToSupervisor:
      input.role === 'manager' &&
      orgWorkItemCanCascadeAtStatus(status, 'manager'),
    canCascadeToOfficer:
      input.role === 'supervisor' &&
      orgWorkItemCanCascadeAtStatus(status, 'supervisor'),
    canSubmitResponse: orgWorkItemCanSubmitResponse(status, input.role),
    canApprove: orgWorkItemCanApprove(status, input.role),
    canReject: orgWorkItemCanApprove(status, input.role),
  }
}
