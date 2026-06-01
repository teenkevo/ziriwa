export type BoardActionOversightRow = {
  status?: string
  dueDate?: string
}

export type BoardActionsOversightBreakdown = {
  open: number
  overdue: number
  completed: number
}

export type BoardActionsOversightSummary = {
  periodLabel: string
  total: number
  subtitle: string
  breakdown: BoardActionsOversightBreakdown
}

export function computeBoardActionsOversight(
  rows: BoardActionOversightRow[],
  today: string,
): BoardActionsOversightBreakdown {
  let open = 0
  let overdue = 0
  let completed = 0

  for (const row of rows) {
    if (row.status === 'completed') {
      completed++
      continue
    }

    if (row.dueDate && row.dueDate < today) {
      overdue++
      continue
    }

    open++
  }

  return { open, overdue, completed }
}

export function buildBoardActionsOversightSummary(
  rows: BoardActionOversightRow[],
  today: string,
  periodLabel: string,
): BoardActionsOversightSummary {
  const breakdown = computeBoardActionsOversight(rows, today)
  const total = breakdown.open + breakdown.overdue + breakdown.completed

  const subtitle =
    total === 0
      ? 'No board actions assigned'
      : `${breakdown.open} open • ${breakdown.overdue} overdue • ${breakdown.completed} completed`

  return {
    periodLabel,
    total,
    subtitle,
    breakdown,
  }
}
