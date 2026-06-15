import 'server-only'

import { getAppBaseUrl } from '@/lib/app-url.server'
import { paragraphHtml, renderEmailLayout } from '@/lib/email/templates/layout'
import { cellText, renderCompactEmailTable } from '@/lib/email/templates/table'
import type { EmailTemplateDefinition } from '@/lib/email/types'

export type SprintPlanReviewOutcome =
  | 'accepted'
  | 'rejected'
  | 'revisions_requested'

export interface SprintPlanReviewOutcomeRow {
  taskDescription: string
  categoryLabel: string
  initiativeTitle: string
  activityTitle: string
  reviewStatusLabel: string
  revisionReason: string
}

export interface SprintPlanReviewOutcomeEmailData {
  supervisorName: string
  managerName: string
  sectionName: string
  weekLabel: string
  reviewOutcome: SprintPlanReviewOutcome
  row: SprintPlanReviewOutcomeRow
}

function renderOutcomeBadge(outcome: SprintPlanReviewOutcome): string {
  if (outcome === 'accepted') {
    return `<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: #ecfdf5; color: #047857; font-size: 10px; font-weight: 700;">Accepted</span>`
  }
  if (outcome === 'rejected') {
    return `<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: #fef2f2; color: #b91c1c; font-size: 10px; font-weight: 700;">Rejected</span>`
  }
  return `<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: #fffbeb; color: #b45309; font-size: 10px; font-weight: 700;">Revisions requested</span>`
}

export const sprintPlanReviewOutcomeEmailTemplate: EmailTemplateDefinition<SprintPlanReviewOutcomeEmailData> =
  {
    id: 'sprint-plan-review-outcome',
    render(data) {
      const isAccepted = data.reviewOutcome === 'accepted'
      const isRejected = data.reviewOutcome === 'rejected'
      const title = isAccepted
        ? 'Sprint task approved'
        : isRejected
          ? 'Sprint task rejected'
          : 'Sprint task revisions requested'
      const previewText = isAccepted
        ? `${data.managerName} approved ${data.row.taskDescription}`
        : isRejected
          ? `${data.managerName} rejected ${data.row.taskDescription}`
          : `${data.managerName} requested revisions on ${data.row.taskDescription}`

      const summaryText = isAccepted
        ? `Hi ${data.supervisorName}, ${data.managerName} reviewed your sprint plan in ${data.sectionName} (${data.weekLabel}) and approved the following task.`
        : isRejected
          ? `Hi ${data.supervisorName}, ${data.managerName} reviewed your sprint plan in ${data.sectionName} (${data.weekLabel}) and rejected the following task.`
          : `Hi ${data.supervisorName}, ${data.managerName} reviewed your sprint plan in ${data.sectionName} (${data.weekLabel}) and requested revisions on the following task.`

      const summary = paragraphHtml(summaryText)

      const tableHtml = renderCompactEmailTable({
        columns: [
          {
            key: 'task',
            header: 'Task',
            render: row =>
              `<span style="font-weight: 600;">${cellText(row.taskDescription)}</span>`,
          },
          {
            key: 'category',
            header: 'Category',
            render: row => cellText(row.categoryLabel),
          },
          {
            key: 'initiative',
            header: 'Initiative',
            render: row => cellText(row.initiativeTitle),
          },
          {
            key: 'activity',
            header: 'Measurable activity',
            render: row => cellText(row.activityTitle),
          },
          {
            key: 'outcome',
            header: 'Review',
            align: 'center',
            render: () => renderOutcomeBadge(data.reviewOutcome),
          },
          {
            key: 'feedback',
            header: 'Manager feedback',
            render: row => cellText(row.revisionReason),
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
          label: isAccepted ? 'View sprint plan' : 'Update sprint plan',
          href: `${getAppBaseUrl()}/supervisor/sprints`,
        },
      })

      return {
        subject: isAccepted
          ? `Sprint task approved — ${data.weekLabel}`
          : isRejected
            ? `Sprint task rejected — ${data.weekLabel}`
            : `Sprint task revisions requested — ${data.weekLabel}`,
        html,
        text,
        previewText,
      }
    },
  }
