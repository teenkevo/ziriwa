import 'server-only'

import { queueOrgWorkItemEmail } from '@/lib/email/messages/org-work-item.server'
import type { OrgWorkItemDocumentType } from '@/lib/org-work-item/types'
import { client } from '@/sanity/lib/client'

type OrgWorkItemEmailEvent =
  | 'cascade'
  | 'response_submitted'
  | 'approved'
  | 'rejected'
  | 'completed'

interface OrgWorkItemEmailMeta {
  title?: string
  description?: string
  dueDate?: string
  sectionName?: string
  divisionName?: string
  supervisorEmail?: string
  supervisorName?: string
  assigneeEmail?: string
  assigneeName?: string
  managerEmail?: string
  managerName?: string
  acEmail?: string
  acName?: string
  commissionerEmail?: string
  commissionerName?: string
}

interface NotifyOrgWorkItemEmailInput {
  docType: OrgWorkItemDocumentType
  itemId: string
  cascadeRole?: string
  event?: OrgWorkItemEmailEvent
  feedback?: string
  /** Status after the action — used to route approval emails. */
  nextStatus?: string
}

export function notifyOrgWorkItemCascadeEmail(
  input: NotifyOrgWorkItemEmailInput,
): void {
  void loadAndQueueOrgWorkItemEmail(input).catch(err => {
    console.error('[email] notifyOrgWorkItemCascadeEmail failed', err)
  })
}

async function loadAndQueueOrgWorkItemEmail(
  input: NotifyOrgWorkItemEmailInput,
): Promise<void> {
  const item = await client.fetch<OrgWorkItemEmailMeta | null>(
    /* groq */ `*[_type == $docType && _id == $itemId][0]{
      title,
      description,
      dueDate,
      "sectionName": section->name,
      "divisionName": coalesce(division->fullName, division->acronym, division->name),
      "supervisorEmail": supervisor->email,
      "supervisorName": coalesce(supervisor->fullName, supervisor->firstName + " " + supervisor->lastName),
      "assigneeEmail": assignee->email,
      "assigneeName": coalesce(assignee->fullName, assignee->firstName + " " + assignee->lastName),
      "managerEmail": section->manager->email,
      "managerName": coalesce(section->manager->fullName, section->manager->firstName + " " + section->manager->lastName),
      "acEmail": division->assistantCommissioner->email,
      "acName": coalesce(division->assistantCommissioner->fullName, division->assistantCommissioner->firstName + " " + division->assistantCommissioner->lastName),
      "commissionerEmail": department->commissioner->email,
      "commissionerName": coalesce(department->commissioner->fullName, department->commissioner->firstName + " " + department->commissioner->lastName)
    }`,
    { docType: input.docType, itemId: input.itemId },
  )

  if (!item?.title) return

  const itemKind =
    input.docType === 'boardAction' ? 'Board action' : 'Audit query'
  const event = input.event ?? 'cascade'
  const recipients = resolveRecipients(item, input, event)

  for (const recipient of recipients) {
    queueOrgWorkItemEmail({
      to: recipient.email,
      recipientName: recipient.name,
      itemKind,
      event,
      title: item.title.trim(),
      description: item.description?.trim() || '',
      dueDate: item.dueDate?.trim() || '',
      sectionName: item.sectionName?.trim() || '',
      divisionName: item.divisionName?.trim() || '',
      feedback: input.feedback?.trim() || '',
      idempotencyKey: `org-work-item:${input.docType}:${input.itemId}:${event}:${recipient.email}:${Date.now()}`,
    })
  }
}

function resolveRecipients(
  item: OrgWorkItemEmailMeta,
  input: NotifyOrgWorkItemEmailInput,
  event: OrgWorkItemEmailEvent,
): Array<{ email: string; name: string }> {
  const out: Array<{ email: string; name: string }> = []
  const push = (email?: string, name?: string) => {
    const normalized = email?.trim().toLowerCase()
    if (!normalized) return
    if (out.some(r => r.email === normalized)) return
    out.push({ email: normalized, name: name?.trim() || 'Colleague' })
  }

  if (event === 'cascade') {
    if (input.cascadeRole === 'commissioner') {
      push(item.acEmail, item.acName)
    } else if (input.cascadeRole === 'assistant_commissioner') {
      push(item.managerEmail, item.managerName)
    } else if (input.cascadeRole === 'manager') {
      push(item.supervisorEmail, item.supervisorName)
    } else if (input.cascadeRole === 'supervisor') {
      push(item.assigneeEmail, item.assigneeName)
    }
    return out
  }

  if (event === 'response_submitted') {
    push(item.supervisorEmail, item.supervisorName)
    return out
  }

  if (event === 'rejected') {
    push(item.assigneeEmail, item.assigneeName)
    return out
  }

  if (event === 'approved') {
    if (input.nextStatus === 'pending_manager_approval') {
      push(item.managerEmail, item.managerName)
    } else if (input.nextStatus === 'pending_ac_approval') {
      push(item.acEmail, item.acName)
    } else if (input.nextStatus === 'pending_commissioner_approval') {
      push(item.commissionerEmail, item.commissionerName)
    }
    return out
  }

  if (event === 'completed') {
    push(item.assigneeEmail, item.assigneeName)
    push(item.supervisorEmail, item.supervisorName)
    push(item.managerEmail, item.managerName)
    push(item.acEmail, item.acName)
    push(item.commissionerEmail, item.commissionerName)
    return out
  }

  return out
}
