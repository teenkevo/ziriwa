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

export interface Sprint15MinutesRemainingEmailData {
  recipientName: string
  recipientRole: SprintAtRiskRecipientRole
  sectionName: string
  weekLabel: string
  rows: SprintStatusEmailRow[]
  summary: SprintStatusSummary
}

function buildSummary(data: Sprint15MinutesRemainingEmailData): string {
  const stats = renderSprintStatusSummaryText(data.summary, '30min')

  if (data.recipientRole === 'manager') {
    return `Hi ${data.recipientName}, the sprint for ${data.sectionName} (${data.weekLabel}) closes in 15 minutes. Current status: ${stats}.`
  }

  if (data.recipientRole === 'supervisor') {
    return `Hi ${data.recipientName}, your sprint for ${data.sectionName} (${data.weekLabel}) closes in 15 minutes. Current status: ${stats}.`
  }

  return `Hi ${data.recipientName}, the sprint for ${data.sectionName} (${data.weekLabel}) closes in 15 minutes. Your assigned activities: ${stats}.`
}

export const sprint15MinutesRemainingEmailTemplate: EmailTemplateDefinition<Sprint15MinutesRemainingEmailData> =
  {
    id: 'sprint-15-minutes-remaining',
    render(data) {
      const title = '15 minutes to close the sprint'
      const previewText = `15 minutes left to close ${data.weekLabel}`

      const { html, text } = renderEmailLayout({
        previewText,
        title,
        bodyHtml: `${paragraphHtml(buildSummary(data))}${renderSprintStatusTable(data.rows)}`,
        contentMaxWidth: 720,
        action: {
          label: 'Open sprints',
          href: `${getAppBaseUrl()}${getSprintStatusLinkForRole(data.recipientRole)}`,
        },
      })

      return {
        subject: `⏰ 15 minutes to close — ${data.weekLabel}`,
        html,
        text,
        previewText,
      }
    },
  }
