import 'server-only'

import { getAppBaseUrl } from '@/lib/app-url.server'
import { paragraphHtml, renderEmailLayout } from '@/lib/email/templates/layout'
import { cellText, renderCompactEmailTable } from '@/lib/email/templates/table'
import type { EmailTemplateDefinition } from '@/lib/email/types'

export type SprintWorkSubmissionReviewOutcome = 'approved' | 'rejected'

export interface SprintWorkSubmissionOutcomeRow {
  taskDescription: string
  submissionText: string
  evidenceLabel: string
  evidenceUrl?: string
  supervisorFeedback: string
  taskStatusLabel: string
}

export interface SprintWorkSubmissionOutcomeEmailData {
  officerName: string
  supervisorName: string
  sectionName: string
  weekLabel: string
  reviewOutcome: SprintWorkSubmissionReviewOutcome
  row: SprintWorkSubmissionOutcomeRow
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
}

function renderEvidenceCell(row: SprintWorkSubmissionOutcomeRow): string {
  const label = cellText(row.evidenceLabel)
  if (!row.evidenceUrl) return label
  return `<a href="${escapeAttribute(row.evidenceUrl)}" style="color: #111827; text-decoration: underline;">${label}</a>`
}

function renderOutcomeBadge(outcome: SprintWorkSubmissionReviewOutcome): string {
  if (outcome === 'approved') {
    return `<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: #ecfdf5; color: #047857; font-size: 10px; font-weight: 700;">Approved</span>`
  }
  return `<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: #fef2f2; color: #b91c1c; font-size: 10px; font-weight: 700;">Rejected</span>`
}

export const sprintWorkSubmissionOutcomeEmailTemplate: EmailTemplateDefinition<SprintWorkSubmissionOutcomeEmailData> =
  {
    id: 'sprint-work-submission-outcome',
    render(data) {
      const isApproved = data.reviewOutcome === 'approved'
      const title = isApproved
        ? 'Work submission approved'
        : 'Work submission requires updates'
      const previewText = isApproved
        ? `${data.supervisorName} approved your work on ${data.row.taskDescription}`
        : `${data.supervisorName} requested updates on ${data.row.taskDescription}`

      const summary = paragraphHtml(
        isApproved
          ? `Hi ${data.officerName}, ${data.supervisorName} reviewed your work submission in ${data.sectionName} (${data.weekLabel}) and approved it.`
          : `Hi ${data.officerName}, ${data.supervisorName} reviewed your work submission in ${data.sectionName} (${data.weekLabel}) and requested updates.`,
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
          {
            key: 'outcome',
            header: 'Review',
            align: 'center',
            render: () => renderOutcomeBadge(data.reviewOutcome),
          },
          {
            key: 'feedback',
            header: 'Supervisor feedback',
            render: row => cellText(row.supervisorFeedback),
          },
          {
            key: 'status',
            header: 'Task status',
            render: row => cellText(row.taskStatusLabel),
          },
        ],
        rows: [data.row],
      })

      const { html, text } = renderEmailLayout({
        previewText,
        title,
        bodyHtml: `${summary}${tableHtml}`,
        contentMaxWidth: 800,
        action: {
          label: isApproved ? 'View sprint' : 'Update submission',
          href: `${getAppBaseUrl()}/officer/sprints`,
        },
      })

      return {
        subject: isApproved
          ? `Work submission approved — ${data.weekLabel}`
          : `Work submission requires updates — ${data.weekLabel}`,
        html,
        text,
        previewText,
      }
    },
  }
