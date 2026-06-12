import 'server-only'

import { getAppBaseUrl } from '@/lib/app-url.server'
import { paragraphHtml, renderEmailLayout } from '@/lib/email/templates/layout'
import {
  cellText,
  renderAtRiskBadge,
  renderCompactEmailTable,
} from '@/lib/email/templates/table'
import type { EmailTemplateDefinition } from '@/lib/email/types'
import type {
  SprintAtRiskRecipientRole,
  SprintMissingSubmissionRow,
} from '@/lib/sprint-missing-submissions'

export interface SprintMissingSubmissionsEmailData {
  recipientName: string
  recipientRole: SprintAtRiskRecipientRole
  weekLabel: string
  rows: SprintMissingSubmissionRow[]
}

const SPRINT_LINK_BY_ROLE: Record<SprintAtRiskRecipientRole, string> = {
  manager: '/manager/sprints?tab=ready',
  supervisor: '/supervisor/sprints',
  officer: '/officer/sprints',
}

function buildSummary(data: SprintMissingSubmissionsEmailData): string {
  const count = data.rows.length
  const countLabel = `${count} sprint ${count === 1 ? 'activity has' : 'activities have'}`

  if (data.recipientRole === 'manager') {
    return `Hi ${data.recipientName}, ${countLabel} no work submissions yet across your sections. These items are marked at risk until evidence is logged.`
  }

  if (data.recipientRole === 'supervisor') {
    return `Hi ${data.recipientName}, ${countLabel} no work submissions yet in sprints you created. These items are marked at risk until evidence is logged.`
  }

  return `Hi ${data.recipientName}, ${countLabel} no work submissions yet on activities assigned to you. These items are marked at risk until evidence is logged.`
}

export const sprintMissingSubmissionsEmailTemplate: EmailTemplateDefinition<SprintMissingSubmissionsEmailData> =
  {
    id: 'sprint-missing-submissions',
    render(data) {
      const count = data.rows.length
      const title = `Sprint activities at risk for ${data.weekLabel}`
      const previewText = `${count} sprint ${count === 1 ? 'activity is' : 'activities are'} at risk with no work submissions`

      const tableHtml = renderCompactEmailTable({
        columns: [
          {
            key: 'section',
            header: 'Section',
            render: row => cellText(row.sectionName),
          },
          {
            key: 'activity',
            header: 'Activity',
            render: row =>
              `<span style="font-weight: 600;">${cellText(row.activityLabel)}</span>`,
          },
          {
            key: 'category',
            header: 'Category',
            render: row => cellText(row.categoryLabel || '—'),
          },
          {
            key: 'officer',
            header: 'Officer',
            render: row => cellText(row.assigneeName),
          },
          {
            key: 'supervisor',
            header: 'Supervisor',
            render: row => cellText(row.supervisorName),
          },
          {
            key: 'status',
            header: 'Status',
            render: row => cellText(row.taskStatusLabel),
          },
          {
            key: 'risk',
            header: 'Risk',
            align: 'center',
            render: () => renderAtRiskBadge(),
          },
        ],
        rows: data.rows,
      })

      const { html, text } = renderEmailLayout({
        previewText,
        title,
        bodyHtml: `${paragraphHtml(buildSummary(data))}${tableHtml}`,
        contentMaxWidth: 800,
        action: {
          label: 'Review sprints',
          href: `${getAppBaseUrl()}${SPRINT_LINK_BY_ROLE[data.recipientRole]}`,
        },
      })

      return {
        subject: title,
        html,
        text,
        previewText,
      }
    },
  }
