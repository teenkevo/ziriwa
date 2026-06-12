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

export interface Sprint30MinutesRemainingEmailData {
  recipientName: string
  recipientRole: SprintAtRiskRecipientRole
  sectionName: string
  weekLabel: string
  rows: SprintStatusEmailRow[]
  summary: SprintStatusSummary
}

function buildSummary(data: Sprint30MinutesRemainingEmailData): string {
  const stats = renderSprintStatusSummaryText(data.summary, '30min')

  if (data.recipientRole === 'manager') {
    return `Hi ${data.recipientName}, there are 30 minutes left in the sprint for ${data.sectionName} (${data.weekLabel}). Current status: ${stats}.`
  }

  if (data.recipientRole === 'supervisor') {
    return `Hi ${data.recipientName}, there are 30 minutes left in your sprint for ${data.sectionName} (${data.weekLabel}). Current status: ${stats}.`
  }

  return `Hi ${data.recipientName}, there are 30 minutes left in the sprint for ${data.sectionName} (${data.weekLabel}). Your assigned activities: ${stats}.`
}

export const sprint30MinutesRemainingEmailTemplate: EmailTemplateDefinition<Sprint30MinutesRemainingEmailData> =
  {
    id: 'sprint-30-minutes-remaining',
    render(data) {
      const title = '30 minutes to Go'
      const previewText = `30 minutes left in ${data.weekLabel}`

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
        subject: `⏰ 30 minutes to Go — ${data.weekLabel}`,
        html,
        text,
        previewText,
      }
    },
  }
