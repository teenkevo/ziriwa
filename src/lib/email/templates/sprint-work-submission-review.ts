import 'server-only'

import { getAppBaseUrl } from '@/lib/app-url.server'
import { paragraphHtml, renderEmailLayout } from '@/lib/email/templates/layout'
import { cellText, renderCompactEmailTable } from '@/lib/email/templates/table'
import type { EmailTemplateDefinition } from '@/lib/email/types'

export interface SprintWorkSubmissionReviewRow {
  taskDescription: string
  submissionText: string
  evidenceLabel: string
  evidenceUrl?: string
}

export interface SprintWorkSubmissionReviewEmailData {
  supervisorName: string
  officerName: string
  sectionName: string
  weekLabel: string
  row: SprintWorkSubmissionReviewRow
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
}

function renderEvidenceCell(row: SprintWorkSubmissionReviewRow): string {
  const label = cellText(row.evidenceLabel)
  if (!row.evidenceUrl) return label
  return `<a href="${escapeAttribute(row.evidenceUrl)}" style="color: #111827; text-decoration: underline;">${label}</a>`
}

export const sprintWorkSubmissionReviewEmailTemplate: EmailTemplateDefinition<SprintWorkSubmissionReviewEmailData> =
  {
    id: 'sprint-work-submission-review',
    render(data) {
      const title = 'Review sprint work submission'
      const previewText = `${data.officerName} submitted work for ${data.row.taskDescription}`

      const summary = paragraphHtml(
        `Hi ${data.supervisorName}, ${data.officerName} submitted work evidence in ${data.sectionName} (${data.weekLabel}) that needs your review.`,
      )

      const tableHtml = renderCompactEmailTable({
        columns: [
          {
            key: 'task',
            header: 'Task',
            render: row =>
              `<span style="font-weight: 600;">${cellText(row.taskDescription)}</span>`,
          },
          {
            key: 'submission',
            header: 'Work submission',
            render: row => cellText(row.submissionText),
          },
          {
            key: 'evidence',
            header: 'Evidence',
            render: row => renderEvidenceCell(row),
          },
        ],
        rows: [data.row],
      })

      const { html, text } = renderEmailLayout({
        previewText,
        title,
        bodyHtml: `${summary}${tableHtml}`,
        contentMaxWidth: 720,
        action: {
          label: 'Review submission',
          href: `${getAppBaseUrl()}/supervisor/sprints`,
        },
      })

      return {
        subject: `Review sprint work submission — ${data.weekLabel}`,
        html,
        text,
        previewText,
      }
    },
  }
