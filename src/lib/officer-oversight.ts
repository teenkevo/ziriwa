import type { MonthlyOversightBreakdown } from '@/lib/monthly-oversight'
import {
  computeSprintOversightCounts,
  isSprintInCalendarMonth,
  isSprintInCurrentWeek,
} from '@/lib/sprint-oversight-counts'
import type { SectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import type { WeeklySprint } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

export function computeOfficerWeeklyOversight(input: {
  contract: SectionContract | null
  sprints: WeeklySprint[]
  officerStaffId: string
  today: string
}): MonthlyOversightBreakdown {
  const sprintCounts = computeSprintOversightCounts(
    input.sprints,
    sprint =>
      sprint.status !== 'draft' && isSprintInCurrentWeek(sprint, input.today),
    task => task.assignee === input.officerStaffId,
  )

  return {
    sprints: sprintCounts.sprints,
    engagements: 0,
    tasks: sprintCounts.tasks,
  }
}

export function computeOfficerMonthlyOversight(input: {
  contract: SectionContract | null
  sprints: WeeklySprint[]
  officerStaffId: string
  today: string
}): MonthlyOversightBreakdown {
  const sprintCounts = computeSprintOversightCounts(
    input.sprints,
    sprint =>
      sprint.status !== 'draft' &&
      isSprintInCalendarMonth(sprint, input.today),
    task => task.assignee === input.officerStaffId,
  )

  return {
    sprints: sprintCounts.sprints,
    engagements: 0,
    tasks: sprintCounts.tasks,
  }
}
