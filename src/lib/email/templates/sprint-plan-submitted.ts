import 'server-only'

import { getAppBaseUrl } from '@/lib/app-url.server'
import { paragraphHtml, renderEmailLayout } from '@/lib/email/templates/layout'
import { cellText, renderCompactEmailTable } from '@/lib/email/templates/table'
import type { EmailTemplateDefinition } from '@/lib/email/types'

export interface SprintPlanSubmittedTaskRow {
  description: string
  categoryLabel: string
  initiativeTitle: string
  activityTitle: string
  statusLabel: string
}

export interface SprintPlanSubmittedEmailData {
  managerName: string
  supervisorName: string
  sectionName: string
  weekLabel: string
  isResubmission?: boolean
  rows: SprintPlanSubmittedTaskRow[]
}

export const sprintPlanSubmittedEmailTemplate: EmailTemplateDefinition<SprintPlanSubmittedEmailData> =
  {
    id: 'sprint-plan-submitted',
    render(data) {
      const pendingCount = data.rows.filter(
        row => row.statusLabel === 'Pending review',
      ).length
      const title = data.isResubmission
        ? 'Revised sprint task awaiting review'
        : 'Sprint plan submitted for review'
      const previewText = data.isResubmission
        ? `${data.supervisorName} resubmitted a sprint task in ${data.sectionName} (${data.weekLabel})`
        : `${data.supervisorName} submitted ${data.rows.length} sprint ${data.rows.length === 1 ? 'task' : 'tasks'} for your review in ${data.sectionName} (${data.weekLabel})`

      const intro = data.isResubmission
        ? `Hi ${data.managerName}, ${data.supervisorName} resubmitted a revised sprint task in ${data.sectionName} (${data.weekLabel}). ${pendingCount} ${pendingCount === 1 ? 'task is' : 'tasks are'} awaiting your review.`
        : `Hi ${data.managerName}, ${data.supervisorName} submitted a sprint plan in ${data.sectionName} (${data.weekLabel}) with ${data.rows.length} ${data.rows.length === 1 ? 'task' : 'tasks'} for your review.`

      const summary = paragraphHtml(intro)

      const tableHtml = renderCompactEmailTable({
        columns: [
          {
            key: 'task',
            header: 'Task',
            render: row =>
              `<span style="font-weight: 600;">${cellText(row.description)}</span>`,
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
            key: 'status',
            header: 'Review status',
            render: row => cellText(row.statusLabel),
          },
        ],
        rows: data.rows,
      })

      const { html, text } = renderEmailLayout({
        previewText,
        title,
        bodyHtml: `${summary}${tableHtml}`,
        contentMaxWidth: 800,
        action: {
          label: 'Review sprint plan',
          href: `${getAppBaseUrl()}/manager/sprints?tab=to-review`,
        },
      })

      return {
        subject: data.isResubmission
          ? `Revised sprint task awaiting review — ${data.weekLabel}`
          : `Sprint plan submitted for review — ${data.weekLabel}`,
        html,
        text,
        previewText,
      }
    },
  }
