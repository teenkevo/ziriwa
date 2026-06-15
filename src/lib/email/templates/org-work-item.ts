import 'server-only'

import { format, parseISO } from 'date-fns'

import { getAppBaseUrl } from '@/lib/app-url.server'
import { paragraphHtml, renderEmailLayout } from '@/lib/email/templates/layout'
import { cellText, renderCompactEmailTable } from '@/lib/email/templates/table'
import type { EmailTemplateDefinition } from '@/lib/email/types'

export type OrgWorkItemEmailEvent =
  | 'cascade'
  | 'response_submitted'
  | 'approved'
  | 'rejected'
  | 'completed'

export interface OrgWorkItemEmailData {
  recipientName: string
  itemKind: string
  event: OrgWorkItemEmailEvent
  title: string
  description: string
  dueDate: string
  sectionName: string
  divisionName: string
  feedback: string
}

function formatDueDate(value: string): string {
  if (!value) return '—'
  try {
    return format(parseISO(value), 'dd MMM yyyy')
  } catch {
    return value
  }
}

function eventTitle(data: OrgWorkItemEmailData): string {
  if (data.event === 'cascade') return `${data.itemKind} assigned to you`
  if (data.event === 'response_submitted')
    return `${data.itemKind} response submitted`
  if (data.event === 'approved') return `${data.itemKind} awaiting your approval`
  if (data.event === 'rejected') return `${data.itemKind} requires updates`
  return `${data.itemKind} completed`
}

function eventSummary(data: OrgWorkItemEmailData): string {
  const scope = [data.sectionName, data.divisionName].filter(Boolean).join(' · ')
  if (data.event === 'cascade') {
    return `Hi ${data.recipientName}, a ${data.itemKind.toLowerCase()} has been cascaded to you${scope ? ` (${scope})` : ''}.`
  }
  if (data.event === 'response_submitted') {
    return `Hi ${data.recipientName}, an officer submitted a response for a ${data.itemKind.toLowerCase()} that needs your review.`
  }
  if (data.event === 'approved') {
    return `Hi ${data.recipientName}, a ${data.itemKind.toLowerCase()} has been approved and now needs your sign-off.`
  }
  if (data.event === 'rejected') {
    return `Hi ${data.recipientName}, your response for a ${data.itemKind.toLowerCase()} was rejected. Please review the feedback and resubmit.`
  }
  return `Hi ${data.recipientName}, a ${data.itemKind.toLowerCase()} has been fully approved and marked complete.`
}

export const orgWorkItemEmailTemplate: EmailTemplateDefinition<OrgWorkItemEmailData> =
  {
    id: 'org-work-item',
    render(data) {
      const title = eventTitle(data)
      const previewText = `${data.itemKind}: ${data.title}`

      const rows = [
        {
          label: data.itemKind,
          value: data.title,
        },
        {
          label: 'Due date',
          value: formatDueDate(data.dueDate),
        },
        ...(data.description
          ? [{ label: 'Description', value: data.description }]
          : []),
        ...(data.feedback
          ? [{ label: 'Feedback', value: data.feedback }]
          : []),
      ]

      const tableHtml = renderCompactEmailTable({
        columns: [
          {
            key: 'label',
            header: 'Field',
            render: row => cellText(row.label),
          },
          {
            key: 'value',
            header: 'Details',
            render: row =>
              `<span style="font-weight: 600;">${cellText(row.value)}</span>`,
          },
        ],
        rows,
      })

      const { html, text } = renderEmailLayout({
        previewText,
        title,
        bodyHtml: `${paragraphHtml(eventSummary(data))}${tableHtml}`,
        contentMaxWidth: 640,
        action: {
          label: `View ${data.itemKind.toLowerCase()}s`,
          href: `${getAppBaseUrl()}/manager/board-actions`,
        },
      })

      return {
        subject: `${title} — ${data.title}`,
        html,
        text,
        previewText,
      }
    },
  }
