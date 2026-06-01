import type { MonthlyOversightBreakdown } from '@/lib/monthly-oversight'
import type { SectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import type { WeeklySprint } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

function isInCurrentWeek(sprint: WeeklySprint, today: string): boolean {
  return Boolean(
    sprint.weekStart &&
      sprint.weekEnd &&
      sprint.weekStart <= today &&
      today <= sprint.weekEnd,
  )
}

function isInCalendarMonth(sprint: WeeklySprint, today: string): boolean {
  return Boolean(
    sprint.weekStart && sprint.weekStart.slice(0, 7) === today.slice(0, 7),
  )
}

function officerTasksInSprint(
  sprint: WeeklySprint,
  officerStaffId: string,
) {
  return (sprint.tasks ?? []).filter(task => task.assignee === officerStaffId)
}

export function computeOfficerWeeklyOversight(input: {
  contract: SectionContract | null
  sprints: WeeklySprint[]
  officerStaffId: string
  today: string
}): MonthlyOversightBreakdown {
  let sprints = 0
  let tasks = 0

  for (const sprint of input.sprints) {
    if (sprint.status === 'draft') continue
    const assigned = officerTasksInSprint(sprint, input.officerStaffId)
    if (assigned.length === 0) continue
    if (isInCurrentWeek(sprint, input.today)) {
      sprints++
      tasks += assigned.length
    }
  }

  return { sprints, engagements: 0, tasks }
}

export function computeOfficerMonthlyOversight(input: {
  contract: SectionContract | null
  sprints: WeeklySprint[]
  officerStaffId: string
  today: string
}): MonthlyOversightBreakdown {
  let sprints = 0
  let tasks = 0

  for (const sprint of input.sprints) {
    if (sprint.status === 'draft') continue
    const assigned = officerTasksInSprint(sprint, input.officerStaffId)
    if (assigned.length === 0) continue
    if (isInCalendarMonth(sprint, input.today)) {
      sprints++
      tasks += assigned.length
    }
  }

  return { sprints, engagements: 0, tasks }
}
