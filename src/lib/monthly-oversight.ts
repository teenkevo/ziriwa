import { addDays, format, parseISO, startOfWeek } from 'date-fns'

import { isWeeklyDivisionReportReady } from '@/lib/sprint-report-readiness'
import { hasSubmittedEngagementReport } from '@/lib/stakeholder-engagement-report'
import {
  computeSprintOversightCounts,
  isSprintInCalendarMonth,
  isSprintInCurrentWeek,
} from '@/lib/sprint-oversight-counts'
import type { SectionContract } from '@/sanity/lib/section-contracts/get-section-contract'
import type { StakeholderEngagement } from '@/sanity/lib/stakeholder-engagement/get-stakeholder-engagement'
import type { WeeklySprint } from '@/sanity/lib/weekly-sprints/get-sprints-by-section'

export type MonthlyOversightBreakdown = {
  sprints: number
  engagements: number
  tasks: number
}

export type MonthlyOversightSummary = {
  monthLabel: string
  periodLabel: string
  total: number
  subtitle: string
  reportReady: boolean
  breakdown: MonthlyOversightBreakdown
  sectionsWithActivity: number
  sectionTotal: number
}

function isMonthlyDivisionReportReady(
  sectionResults: {
    engagement: StakeholderEngagement | null
  }[],
  today: string,
): boolean {
  let engagementsDue = 0

  for (const section of sectionResults) {
    for (const entry of section.engagement?.stakeholders ?? []) {
      if (
        entry.proposedDateOfEngagement &&
        isInCalendarMonth(entry.proposedDateOfEngagement, today)
      ) {
        engagementsDue++
        if (!hasSubmittedEngagementReport(entry.engagementReport)) {
          return false
        }
      }
    }
  }

  return engagementsDue > 0
}

function isInCalendarMonth(isoDate: string, today: string): boolean {
  return isoDate.slice(0, 7) === today.slice(0, 7)
}

function getCurrentWeekRange(today: string) {
  const todayDate = parseISO(today)
  const weekStartDate = startOfWeek(todayDate, { weekStartsOn: 1 })
  const weekEndDate = addDays(weekStartDate, 6)
  return {
    weekStart: format(weekStartDate, 'yyyy-MM-dd'),
    weekEnd: format(weekEndDate, 'yyyy-MM-dd'),
  }
}

function isInCurrentWeek(isoDate: string, today: string): boolean {
  const { weekStart, weekEnd } = getCurrentWeekRange(today)
  return isoDate >= weekStart && isoDate <= weekEnd
}

export function computeSectionMonthlyOversight(input: {
  contract: SectionContract | null
  sprints: WeeklySprint[]
  engagement: StakeholderEngagement | null
  today: string
}): MonthlyOversightBreakdown {
  const sprintCounts = computeSprintOversightCounts(
    input.sprints,
    sprint => isSprintInCalendarMonth(sprint, input.today),
  )

  let engagements = 0
  for (const entry of input.engagement?.stakeholders ?? []) {
    if (
      entry.proposedDateOfEngagement &&
      isInCalendarMonth(entry.proposedDateOfEngagement, input.today)
    ) {
      engagements++
    }
  }

  return {
    sprints: sprintCounts.activities,
    engagements,
    tasks: sprintCounts.tasks,
  }
}

export function computeDivisionMonthlyOversight(
  sectionResults: {
    contract: SectionContract | null
    sprints: WeeklySprint[]
    engagement: StakeholderEngagement | null
  }[],
  today: string,
  sectionTotal: number,
): MonthlyOversightSummary {
  const breakdown: MonthlyOversightBreakdown = {
    sprints: 0,
    engagements: 0,
    tasks: 0,
  }

  let sectionsWithActivity = 0

  for (const section of sectionResults) {
    const sectionBreakdown = computeSectionMonthlyOversight({
      ...section,
      today,
    })
    breakdown.sprints += sectionBreakdown.sprints
    breakdown.engagements += sectionBreakdown.engagements
    breakdown.tasks += sectionBreakdown.tasks

    if (
      sectionBreakdown.sprints > 0 ||
      sectionBreakdown.engagements > 0 ||
      sectionBreakdown.tasks > 0
    ) {
      sectionsWithActivity++
    }
  }

  const total = breakdown.sprints + breakdown.engagements + breakdown.tasks

  let monthLabel = today.slice(0, 7)
  let periodLabel = monthLabel
  try {
    monthLabel = format(parseISO(today), 'MMMM yyyy')
    periodLabel = format(parseISO(today), 'MMMM')
  } catch {
    // keep ISO fallback
  }

  const subtitle =
    sectionTotal === 0
      ? 'No sections in this division'
      : sectionsWithActivity === 0
        ? `No scheduled activity in ${sectionTotal} sections`
        : `${sectionsWithActivity} / ${sectionTotal} sections with activity`

  return {
    monthLabel,
    periodLabel,
    total,
    subtitle,
    reportReady: isMonthlyDivisionReportReady(sectionResults, today),
    breakdown,
    sectionsWithActivity,
    sectionTotal,
  }
}

export function computeSectionWeeklyOversight(input: {
  contract: SectionContract | null
  sprints: WeeklySprint[]
  engagement: StakeholderEngagement | null
  today: string
}): MonthlyOversightBreakdown {
  const sprintCounts = computeSprintOversightCounts(
    input.sprints,
    sprint => isSprintInCurrentWeek(sprint, input.today),
  )

  let engagements = 0
  for (const entry of input.engagement?.stakeholders ?? []) {
    if (
      entry.proposedDateOfEngagement &&
      isInCurrentWeek(entry.proposedDateOfEngagement, input.today)
    ) {
      engagements++
    }
  }

  return {
    sprints: sprintCounts.activities,
    engagements,
    tasks: sprintCounts.tasks,
  }
}

export function computeDivisionWeeklyOversight(
  sectionResults: {
    contract: SectionContract | null
    sprints: WeeklySprint[]
    engagement: StakeholderEngagement | null
  }[],
  today: string,
  sectionTotal: number,
): MonthlyOversightSummary {
  const breakdown: MonthlyOversightBreakdown = {
    sprints: 0,
    engagements: 0,
    tasks: 0,
  }

  let sectionsWithActivity = 0

  for (const section of sectionResults) {
    const sectionBreakdown = computeSectionWeeklyOversight({
      ...section,
      today,
    })
    breakdown.sprints += sectionBreakdown.sprints
    breakdown.engagements += sectionBreakdown.engagements
    breakdown.tasks += sectionBreakdown.tasks

    if (
      sectionBreakdown.sprints > 0 ||
      sectionBreakdown.engagements > 0 ||
      sectionBreakdown.tasks > 0
    ) {
      sectionsWithActivity++
    }
  }

  const total = breakdown.sprints + breakdown.engagements + breakdown.tasks

  const { weekStart, weekEnd } = getCurrentWeekRange(today)
  let periodLabel = `${weekStart} - ${weekEnd}`
  try {
    periodLabel = `${format(parseISO(weekStart), 'MMM d')} - ${format(parseISO(weekEnd), 'MMM d')}`
  } catch {
    // keep ISO fallback
  }

  const subtitle =
    sectionTotal === 0
      ? 'No sections in this division'
      : sectionsWithActivity === 0
        ? `No scheduled activity in ${sectionTotal} sections`
        : `${sectionsWithActivity} / ${sectionTotal} sections with activity`

  return {
    monthLabel: `${weekStart} - ${weekEnd}`,
    periodLabel,
    total,
    subtitle,
    reportReady: isWeeklyDivisionReportReady(sectionResults, today),
    breakdown,
    sectionsWithActivity,
    sectionTotal,
  }
}
