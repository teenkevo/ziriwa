import 'server-only'

import { cellText, renderCompactEmailTable } from '@/lib/email/templates/table'
import type {
  SprintStatusEmailRow,
  SprintStatusSummary,
} from '@/lib/sprint-status-email'

const SPRINT_LINK_BY_ROLE = {
  manager: '/manager/sprints?tab=ready',
  supervisor: '/supervisor/sprints',
  officer: '/officer/sprints',
} as const

export function getSprintStatusLinkForRole(
  role: keyof typeof SPRINT_LINK_BY_ROLE,
): string {
  return SPRINT_LINK_BY_ROLE[role]
}

export function renderSprintStatusSummaryText(
  summary: SprintStatusSummary,
  variant: '30min' | 'complete',
): string {
  const parts = [
    `${summary.done} done`,
    `${summary.inReview} in review`,
    `${summary.inProgress} in progress`,
    `${summary.toDo} to do`,
  ]

  if (variant === '30min') {
    return `${summary.total} sprint ${summary.total === 1 ? 'activity' : 'activities'} · ${parts.join(' · ')}`
  }

  const completionRate =
    summary.total > 0 ? Math.round((summary.done / summary.total) * 100) : 0

  return `${summary.done} of ${summary.total} activities completed (${completionRate}%) · ${parts.join(' · ')}`
}

export function renderSprintStatusTable(rows: SprintStatusEmailRow[]): string {
  return renderCompactEmailTable({
    columns: [
      {
        key: 'task',
        header: 'Task',
        render: row =>
          `<span style="font-weight: 600;">${cellText(row.taskDescription)}</span>`,
      },
      {
        key: 'officer',
        header: 'Officer',
        render: row => cellText(row.assigneeName),
      },
      {
        key: 'status',
        header: 'Status',
        render: row => cellText(row.statusLabel),
      },
      {
        key: 'evidence',
        header: 'Evidence',
        render: row => cellText(row.evidenceLabel),
      },
    ],
    rows,
  })
}
