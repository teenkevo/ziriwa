import 'server-only'

import { getAppBaseUrl } from '@/lib/app-url.server'
import { paragraphHtml, renderEmailLayout } from '@/lib/email/templates/layout'
import {
  getSprintStatusLinkForRole,
  renderSprintStatusSummaryText,
  renderSprintStatusTable,
} from '@/lib/email/templates/sprint-status-table'
import type { EmailTemplateDefinition } from '@/lib/email/types'
import type { SprintAtRiskRecipientRole } from '@/lib/sprint-missing-submissions'
import type {
  SprintStatusEmailRow,
  SprintStatusSummary,
} from '@/lib/sprint-status-email'

export interface SprintCompletedEmailData {
  recipientName: string
  recipientRole: SprintAtRiskRecipientRole
  sectionName: string
  weekLabel: string
  rows: SprintStatusEmailRow[]
  summary: SprintStatusSummary
}

function buildSummary(data: SprintCompletedEmailData): string {
  const stats = renderSprintStatusSummaryText(data.summary, 'complete')

  if (data.recipientRole === 'manager') {
    return `Hi ${data.recipientName}, the sprint for ${data.sectionName} (${data.weekLabel}) has ended. Final status: ${stats}.`
  }

  if (data.recipientRole === 'supervisor') {
    return `Hi ${data.recipientName}, your sprint for ${data.sectionName} (${data.weekLabel}) has ended. Final status: ${stats}.`
  }

  return `Hi ${data.recipientName}, the sprint for ${data.sectionName} (${data.weekLabel}) has ended. Your activities: ${stats}.`
}

export const sprintCompletedEmailTemplate: EmailTemplateDefinition<SprintCompletedEmailData> =
  {
    id: 'sprint-completed',
    render(data) {
      const title = `Sprint complete — ${data.weekLabel}`
      const previewText = `Sprint ended for ${data.sectionName}`

      const { html, text } = renderEmailLayout({
        previewText,
        title,
        bodyHtml: `${paragraphHtml(buildSummary(data))}${renderSprintStatusTable(data.rows)}`,
        contentMaxWidth: 720,
        action: {
          label: 'View sprint summary',
          href: `${getAppBaseUrl()}${getSprintStatusLinkForRole(data.recipientRole)}`,
        },
      })

      return {
        subject: `✅ Sprint complete — ${data.weekLabel}`,
        html,
        text,
        previewText,
      }
    },
  }
