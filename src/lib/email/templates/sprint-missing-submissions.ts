import 'server-only'

import { getAppBaseUrl } from '@/lib/app-url.server'
import { paragraphHtml, renderEmailLayout } from '@/lib/email/templates/layout'
import {
  cellText,
  renderCompactEmailTable,
  renderRiskBadge,
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
  const total = data.rows.length
  const atRiskCount = data.rows.filter(row => row.isAtRisk).length
  const scope =
    data.recipientRole === 'manager'
      ? 'across your sections'
      : data.recipientRole === 'supervisor'
        ? 'in sprints you created'
        : 'on activities assigned to you'

  if (atRiskCount === total) {
    const countLabel = `${atRiskCount} sprint ${atRiskCount === 1 ? 'activity has' : 'activities have'}`
    return `Hi ${data.recipientName}, ${countLabel} no work submissions yet ${scope}. These items are marked at risk until evidence is logged.`
  }

  if (atRiskCount === 0) {
    const countLabel = `${total} sprint ${total === 1 ? 'activity' : 'activities'}`
    return `Hi ${data.recipientName}, all ${countLabel} ${scope} have work submissions. None are currently at risk.`
  }

  const atRiskLabel = `${atRiskCount} of ${total} sprint ${total === 1 ? 'activity' : 'activities'}`
  return `Hi ${data.recipientName}, ${atRiskLabel} ${scope} ${atRiskCount === 1 ? 'has' : 'have'} no work submissions yet and ${atRiskCount === 1 ? 'is' : 'are'} marked at risk.`
}

export const sprintMissingSubmissionsEmailTemplate: EmailTemplateDefinition<SprintMissingSubmissionsEmailData> =
  {
    id: 'sprint-missing-submissions',
    render(data) {
      const total = data.rows.length
      const atRiskCount = data.rows.filter(row => row.isAtRisk).length
      const title =
        atRiskCount === total
          ? `Sprint activities at risk for ${data.weekLabel}`
          : `Sprint status for ${data.weekLabel}`
      const previewText =
        atRiskCount === total
          ? `${atRiskCount} sprint ${atRiskCount === 1 ? 'activity is' : 'activities are'} at risk with no work submissions`
          : `${atRiskCount} of ${total} sprint ${total === 1 ? 'activity is' : 'activities are'} at risk`

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
            render: row => renderRiskBadge(row.isAtRisk),
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
